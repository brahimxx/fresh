# Fresh Salon Platform - Master Context

**Last Updated:** January 22, 2026

## A) Product Summary

**Fresh** is a comprehensive SaaS platform for salon management and booking. It connects salon owners, staff, and clients through three distinct surfaces:

1.  **Dashboard (Backoffice):** `/dashboard/salon/[id]/*`
    - For Owners, Managers, and Staff.
    - Manages calendar, bookings, clients, staff, inventory, payments, and marketing.
2.  **Booking Widget:** `/book/[salonId]`
    - For Clients.
    - Embeddable 5-step wizard for online appointment booking.
3.  **Marketplace:** `/` (Home), `/salons` (Search), `/salon/[id]` (Profile)
    - For Clients.
    - Public directory to discover salons, view profiles, and access booking widgets.

## B) User Roles & Permissions

| Role        | Access Level                                        | Registration Flow                                          |
| :---------- | :-------------------------------------------------- | :--------------------------------------------------------- |
| **Client**  | Booking Widget, Marketplace.                        | `/register` (Standard)                                     |
| **Owner**   | Full Dashboard access.                              | `/register?type=professional` (Includes country selection) |
| **Manager** | Dashboard (Reports, All Clients, Settings).         | Created by Owner in Dashboard.                             |
| **Staff**   | Limited Dashboard (Own Calendar, Assigned Clients). | Created by Owner in Dashboard.                             |
| **Admin**   | Platform Administration (All Salons).               | Seeded db / Backdoor.                                      |

## C) Key Flows

### 1. Booking Flow (Public)

1.  **Selection:** Categories → Services (with per-service staff assignment) → Date/Time.
2.  **Auth:** Client logs in or registers (Name, Email, Phone).
3.  **Confirmation:** Booking created (`pending` status). Notifications sent (Email/SMS).
4.  **Database:** Creates entry in `bookings`, `booking_services` (with individual staff assignments), and `salon_clients`.

**Multi-Service Feature (Fresha-style):**
- Clients can select multiple services in a single booking
- Each service can be assigned to a different staff member
- Staff selector appears per service showing available staff with color indicators
- Availability API checks that ALL selected staff are free at the chosen time
- Total duration calculated across all services
- Individual staff assignments saved in `booking_services.staff_id`

### 2. Walk-in / Manual Booking (Dashboard)

1.  Receptionist/Staff opens Calendar or Clients.
2.  **Add Client:** Creates User (with optional placeholder email) + `salon_clients` record.
3.  **Create Booking:** Selects Client + Service + Time. Status defaults to `confirmed`.

### 3. Checkout & Payment

1.  Status Flow: `pending` → `confirmed` (arrived) → `completed` (checkout).
2.  **Checkout Screen:** Staff confirms services, adds retail products/tips/discounts.
3.  **Payment:** Records payment method (Cash/Card/Terminal). Status `paid`.
4.  **Refunds:** Supports partial/full refunds via Sales history.

### 4. Marketplace Discovery

1.  **Search:** By service name, location, price, rating.
2.  **Results:** Listings powered by SQL search (not mock data).
3.  **Profile:** Shows services, team, reviews (read-only), about/amenities.

## D) Architecture Overview

### Frontend (Next.js 16.1 App Router)

- **Tech Stack:** React 19, Tailwind 4, shadcn/ui (Radix), TanStack Query v5.
- **Security:** 
  - Input validation via Zod schemas (`src/lib/validate.js`)
  - SQL injection prevention (parameterized queries)
  - XSS protection (React auto-escaping)
  - Request size limits (2MB max)
  - Comprehensive length limits on all text inputs
- **Folder Structure:**
  - `src/app/(auth)`: Auth pages.
  - `src/app/(public)`: Marketplace & Widget pages.
  - `src/app/dashboard`: Protected backoffice routes.
  - `src/components`: Grouped by domain (`bookings`, `calendar`, `marketing`, etc.).
  - `src/lib`: Core utilities (`api-client.js`, `db.js`, `format.js`, `validate.js`, `rate-limit.js`).
- **State Management:**
  - **Server State:** TanStack Query (auto-caching, invalidation).
  - **Form State:** React Hook Form + Zod validation.
  - **Client State:** URL parameters (search filters) or local state. (NO global store like Redux/Zustand).

### Authentication

- **Method:** JWT stored in HttpOnly cookies (`token`).
- **Security:** 
  - Strong JWT secret validation (min 32 chars, no fallback)
  - Bcrypt password hashing (cost factor 12)
  - Rate limiting: 5 attempts per 15 min on login/register
  - SameSite=Strict cookies (CSRF protection)
  - IDOR protection with strict ID validation
- **Password Requirements:**
  - Minimum 8 characters, maximum 128
  - Must contain: lowercase, uppercase, number, special character
- **Email Validation:** Strict regex, normalized to lowercase, max 255 chars
- **Logic:** `src/lib/auth.js` handling session verification and role checks.
- **Rate Limiter:** `src/lib/rate-limit.js` (in-memory, auto-cleanup)
- **Helpers:** `useAuth` hook, `api-client.js` (auto-injects token).

## E) API Contract (High Level)

All routes prefixed with `/api`. Authenticated via Cookie/Bearer token.

| Domain          | Key Endpoints                               | Notes                                                                                          |
| :-------------- | :------------------------------------------ | :--------------------------------------------------------------------------------------------- |
| **Auth**        | `/auth/{login,register,me,logout}`          | `register` supports `type=professional` param.                                                 |
| **Salons**      | `/salons/[id]/{settings,hours,photos}`      | Includes onboarding and widget config.                                                         |
| **Bookings**    | `/salons/[id]/bookings/[id]`                | Supports `reschedule`, `confirm`. Status: `pending, confirmed, completed, cancelled, no_show`. |
| **Clients**     | `/salons/[id]/clients`                      | Links Users to Salons unique notes/history.                                                    |
| **Staff**       | `/salons/[id]/staff/{availability}`         | Manages profiles and working shifts.                                                           |
| **Services**    | `/salons/[id]/services`                     | Grouped by Categories (`/api/categories`).                                                     |
| **Payments**    | `/salons/[id]/payments`                     | Includes refunds and product sales.                                                            |
| **Marketing**   | `/salons/[id]/{discounts,gift-cards}`       | Also `campaigns` (Email/SMS) and `waitlist`.                                                   |
| **Widget**      | `/widget/[salonId]/{services,availability}` | **Public access**. Optimized for read-only wizard. Services return `availableStaff` array. Availability accepts `services` parameter with staff assignments. |
| **Marketplace** | `/marketplace/{salons,featured}`            | **Public access**. Search-optimized queries.                                                   |
| **Admin**       | `/admin/{users,salons,stats}`               | Platform-wide management.                                                                      |

## F) Database Model

**Primary DB:** PostgreSQL (Production) / MySQL (Dev/Legacy - check `db.js`).  
_Note: Phase 13 standardized on SQL scripts that are dialect-neutral or MySQL specific (check `setup_fresh_db.sql`)._

### Core Entities

- **Salons:** The root entity.
- **Users:** Global identity (Clients, Staff, Owners). Personal info (Email, Phone).
- **Salon_Clients:** Join table (User <-> Salon). Stores salon-specific notes & loyalty stats.
- **Bookings:** The core transactional record. Contains `start_datetime`, `end_datetime`, `total_price`, `status`.
- **Booking_Services:** Junction table linking bookings to services with individual `staff_id` per service (supports multi-service bookings with different staff).
- **Staff:** Staff members with `color` field for calendar visualization.
- **Service_Staff:** Many-to-many relationship between services and staff (composite primary key: service_id, staff_id).
- **Staff_Shifts:** Working hours definition.

### Data Management

- **Setup Script:** `database/setup_fresh_db.sql` (Schema + Truncate).
- **Migrations:** `database/migrations/` directory
  - `20260118_add_missing_owners_to_staff.sql` - Ensures all staff have owner_id
  - `20260118_add_staff_services_table.sql` - Creates service_staff junction table
  - `20260121_add_staff_to_booking_services.sql` - Adds staff_id to booking_services for per-service staff assignment
- **Seed Data:** `database/seed_data.sql` (Idempotent inserts).
  - Creates 6 Owners (`owner@fresh.com` ... `owner6@fresh.com`).
  - Password for all seeds: `password123`.

## G) Deployment & Environment

### Standard Setup

1.  **Install:** `npm install`
2.  **Env:** Copy `.env.example` -> `.env.local`.
    ```env
    DATABASE_URL=...
    JWT_SECRET=...  # REQUIRED: Min 32 chars, no weak fallback
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    STRIPE_SECRET_KEY=...
    ```
    **Generate secure JWT_SECRET:**
    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```
3.  **Run:** `npm run dev`
4.  **Tests:** `npm run test:e2e` (Playwright).

### Deployment

- **Target:** Vercel (Recommended) or Docker/VPS.
- **Build:** `npm run build`.
- **Secrets:** Ensure `JWT_SECRET` (min 32 chars) and `STRIPE_SECRET_KEY` are set in production.
- **Security Headers:** HSTS, CSP, X-Frame-Options configured in `next.config.mjs`.
- **Rate Limiting:** In-memory rate limiter active (consider Redis for production scale).

## H) Security

### Comprehensive Security Audit (January 21, 2026)

All 11 identified vulnerabilities have been fixed. Security status: **EXCELLENT** ✅

**Critical Fixes:**
- ✅ JWT secret validation (no weak fallback, min 32 chars required)
- ✅ IDOR prevention (strict Number validation, blocks type confusion)
- ✅ SQL injection protection (integer validation before dynamic queries)

**High Priority Fixes:**
- ✅ Rate limiting on all authentication endpoints
  - Login: 5 attempts per 15 min per email
  - Register: 5 attempts per 15 min per IP
  - Forgot Password: 10 attempts per 15 min per IP
- ✅ Strict email validation (regex, normalization, length limits)
- ✅ Salon existence validation (verified before access checks)

**Medium Priority Fixes:**
- ✅ Password complexity enforcement (upper, lower, number, special char)
- ✅ Input length limits (all text fields have max lengths)
- ✅ Cookie security (SameSite=Strict for CSRF protection)

**Low Priority Fixes:**
- ✅ Request size limits (2MB max in Next.js config)
- ✅ Error message sanitization (generic errors to clients)

**Security Features:**
- JWT authentication with HttpOnly cookies
- Bcrypt password hashing (cost factor 12)
- Role-based access control (RBAC)
- Parameterized SQL queries (all endpoints)
- XSS protection via React auto-escaping
- HSTS, CSP, X-Frame-Options headers
- Comprehensive Zod schema validation

**Documentation:**
- [SECURITY_AUDIT.md](SECURITY_AUDIT.md) - Complete audit report
- [SECURITY_FIXES_COMPLETE.md](SECURITY_FIXES_COMPLETE.md) - All fixes documented
- [SECURITY_AUDIT_SUMMARY.md](SECURITY_AUDIT_SUMMARY.md) - Executive summary

---

## I) Recent Updates & Features

### Multi-Service Booking System (January 22, 2026)

**Overview:** Implemented Fresha-style multi-service bookings where each service can be assigned to a different staff member.

**Key Changes:**

1. **Database Schema:**
   - Added `staff_id` column to `booking_services` table
   - Migration: `20260121_add_staff_to_booking_services.sql`
   - Enables different staff per service in the same booking
   - Migrated existing data from `bookings.staff_id` to `booking_services.staff_id`

2. **API Updates:**
   - **Widget Services API** (`/api/widget/[salonId]/services/route.js`):
     - Returns `availableStaff` array for each service
     - Only shows services with assigned staff (INNER JOIN on service_staff)
     - Each staff includes: id, name, firstName, lastName, title, avatarUrl, color
   
   - **Availability API** (`/api/widget/[salonId]/availability/route.js`):
     - Changed from `?serviceId=X&staffId=Y` to `?services=36:9,38:13` format
     - Accepts multiple services with staff assignments
     - Calculates total duration across all services
     - Finds overlapping working hours for all staff
     - Only returns time slots where ALL selected staff are available
     - Checks conflicts for all involved staff simultaneously
   
   - **Booking Creation API** (`/api/widget/[salonId]/book/route.js`):
     - Accepts `services` array: `[{ serviceId, staffId, price, duration }, ...]`
     - Validates all services and staff assignments
     - Checks conflicts for ALL involved staff
     - Saves individual staff_id per service in booking_services table

3. **UI Components:**
   - **Service Selection** (`service-selection.jsx`):
     - Added staff dropdown per service
     - Shows staff name, title, and color indicator
     - Auto-selects first available staff
     - Visual: colored dots next to staff names
   
   - **Booking Widget** (`book/[salonId]/page.js`):
     - Reduced from 5 steps to 4 (removed separate staff selection)
     - Removed `selectedStaff` state variable
     - Validation: all services must have staff selected
     - Data structure: `{ ...service, staffId, staffName }`
   
   - **DateTime Selection** (`datetime-selection.jsx`):
     - Sends all services with staff assignments to availability API
     - Format: `services=serviceId:staffId,serviceId:staffId`

4. **Calendar & Display:**
   - Calendar uses staff colors for event backgrounds
   - Status shown via border styles (pending: dashed, confirmed: solid, cancelled: strikethrough)
   - Staff filter shows names and color indicators
   - Bookings page displays all services and correct staff names

**Technical Details:**
- Timezone: Algeria UTC+1 (TIMEZONE_OFFSET = 60 minutes)
- Slot generation: 15-minute intervals
- Availability logic: Finds overlapping working hours across all staff
- Conflict detection: Checks all staff schedules simultaneously

---

## J) Known Issues & Limitations

1.  **Mobile App:** Planned but not implemented. Dashboard is web-responsive.
2.  **Notifications:** Email/SMS logic exists (`api/campaigns`) but might require valid provider credentials (e.g., Twilio/SendGrid) to actually send in production. Logs to console in Dev.
3.  **Multi-Currency:** Supported in `format.js` but UI assumes single salon currency context mostly.
4.  **Rate Limiter:** Currently in-memory (single-server). Consider Redis for multi-server production deployments.

## K) Roadmap / Next Steps

1.  **Client -> Owner Upgrade:** Complete the UI flow for existing clients to become salon owners.
2.  **Enhanced Rate Limiting:** Consider Redis-based solution for multi-server deployments.
3.  **CI/CD:** Enforce `test:e2e` on Pull Requests.
4.  **Marketplace SEO:** Enhance server-side metadata generation for Salon Profiles.
5.  **Security Monitoring:** Implement logging for rate limit hits and failed auth attempts.
6.  **2FA Implementation:** Add two-factor authentication for admin and owner accounts.
