# Fresh Salon Platform - Master Context

**Last Updated:** January 19, 2026

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

1.  **Selection:** Categories → Services → Staff ("Any Available" or specific) → Date/Time.
2.  **Auth:** Client logs in or registers (Name, Email, Phone).
3.  **Confirmation:** Booking created (`pending` status). Notifications sent (Email/SMS).
4.  **Database:** Creates entry in `bookings` and `salon_clients`.

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
- **Folder Structure:**
  - `src/app/(auth)`: Auth pages.
  - `src/app/(public)`: Marketplace & Widget pages.
  - `src/app/dashboard`: Protected backoffice routes.
  - `src/components`: Grouped by domain (`bookings`, `calendar`, `marketing`, etc.).
  - `src/lib`: Core utilities (`api-client.js`, `db.js`, `format.js`).
- **State Management:**
  - **Server State:** TanStack Query (auto-caching, invalidation).
  - **Form State:** React Hook Form + Zod validation.
  - **Client State:** URL parameters (search filters) or local state. (NO global store like Redux/Zustand).

### Authentication

- **Method:** JWT stored in HttpOnly cookies (`token`).
- **Logic:** `src/lib/auth.js` handling session verification and role checks.
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
| **Widget**      | `/widget/[salonId]/{services,availability}` | **Public access**. Optimized for read-only wizard.                                             |
| **Marketplace** | `/marketplace/{salons,featured}`            | **Public access**. Search-optimized queries.                                                   |
| **Admin**       | `/admin/{users,salons,stats}`               | Platform-wide management.                                                                      |

## F) Database Model

**Primary DB:** PostgreSQL (Production) / MySQL (Dev/Legacy - check `db.js`).  
_Note: Phase 13 standardized on SQL scripts that are dialect-neutral or MySQL specific (check `setup_fresh_db.sql`)._

### Core Entities

- **Salons:** The root update.
- **Users:** Global identity (Clients, Staff, Owners). Personal info (Email, Phone).
- **Salon_Clients:** Join table (User <-> Salon). Stores salon-specific notes & loyalty stats.
- **Bookings:** The core transactional record.
- **Staff_Shifts:** Working hours definition.

### Data Management

- **Setup Script:** `database/setup_fresh_db.sql` (Schema + Truncate).
- **Seed Data:** `database/seed_data.sql` (Idempotent inserts).
  - Creates 6 Owners (`owner@fresh.com` ... `owner6@fresh.com`).
  - Password for all seeds: `password123`.

## G) Deployment & Environment

### Standard Setup

1.  **Install:** `npm install`
2.  **Env:** Copy `.env.example` -> `.env.local`.
    ```env
    DATABASE_URL=...
    JWT_SECRET=...
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```
3.  **Run:** `npm run dev`
4.  **Tests:** `npm run test:e2e` (Playwright).

### Deployment

- **Target:** Vercel (Recommended) or Docker/VPS.
- **Build:** `npm run build`.
- **Secrets:** Ensure `JWT_SECRET` and `STRIPE_SECRET_KEY` are set in production.

## H) Known Issues & Limitations

1.  **Mobile App:** Planned but not implemented. Dashboard is web-responsive.
2.  **Notifications:** Email/SMS logic exists (`api/campaigns`) but might require valid provider credentials (e.g., Twilio/SendGrid) to actually send in production. Logs to console in Dev.
3.  **Multi-Currency:** Supported in `format.js` but UI assumes single salon currency context mostly.

## I) Roadmap / Next Steps

1.  **Client -> Owner Upgrade:** Complete the UI flow for existing clients to become salon owners.
2.  **Validation Hardening:** Migrate manual API validation (e.g., in `register`) to Zod schemas.
3.  **CI/CD:** Enforce `test:e2e` on Pull Requests.
4.  **Marketplace SEO:** Enhance server-side metadata generation for Salon Profiles.
