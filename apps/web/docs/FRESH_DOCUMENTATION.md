# Fresh Salon Platform - Complete Documentation

**Last Updated:** February 24, 2026

---

## Table of Contents

1. [Product Summary](#a-product-summary)
2. [User Roles & Permissions](#b-user-roles--permissions)
3. [Key Flows](#c-key-flows)
4. [Architecture Overview](#d-architecture-overview)
5. [API Contract](#e-api-contract)
6. [Database Model](#f-database-model)
7. [Deployment & Environment](#g-deployment--environment)
8. [Security](#h-security)
9. [Recent Updates & Features](#i-recent-updates--features)
10. [Changelog](#j-changelog)
11. [Known Issues & Limitations](#k-known-issues--limitations)
12. [Roadmap](#l-roadmap)

---

## A) Product Summary

**Fresh** is a comprehensive SaaS platform for salon management and booking. It connects salon owners, staff, and clients through three distinct surfaces:

1. **Dashboard (Backoffice):** `/dashboard/salon/[id]/*`
   - For Owners, Managers, and Staff.
   - Manages calendar, bookings, clients, staff, inventory, payments, and marketing.

2. **Booking Widget:** `/book/[salonId]`
   - For Clients.
   - Embeddable 4-step wizard for online appointment booking.

3. **Marketplace:** `/` (Home), `/salons` (Search), `/salon/[id]` (Profile)
   - For Clients.
   - Public directory to discover salons, view profiles, and access booking widgets.

---

## B) User Roles & Permissions

| Role        | Access Level                                        | Registration Flow                                          |
| :---------- | :-------------------------------------------------- | :--------------------------------------------------------- |
| **Client**  | Booking Widget, Marketplace.                        | `/register` (Standard)                                     |
| **Owner**   | Full Dashboard access.                              | `/register?type=professional` (Includes country selection) |
| **Manager** | Dashboard (Reports, All Clients, Settings).         | Created by Owner in Dashboard.                             |
| **Staff**   | Limited Dashboard (Own Calendar, Assigned Clients). | Created by Owner in Dashboard.                             |
| **Admin**   | Platform Administration (All Salons).               | Seeded db / Backdoor.                                      |

---

## C) Key Flows

### 1. Booking Flow (Public)

1. **Selection:** Categories → Services (with per-service staff assignment) → Date/Time.
2. **Auth:** Client logs in or registers (Name, Email, Phone).
3. **Confirmation:** Booking created (`pending` status). Notifications sent (Email/SMS).
4. **Database:** Creates entry in `bookings`, `booking_services` (with individual staff assignments), and `salon_clients`.

**Multi-Service Feature (Fresha-style):**

- Clients can select multiple services in a single booking
- Each service can be assigned to a different staff member
- Staff selector appears per service showing available staff with color indicators
- Availability API checks that ALL selected staff are free at the chosen time
- Total duration calculated across all services
- Individual staff assignments saved in `booking_services.staff_id`

### 2. Walk-in / Manual Booking (Dashboard)

1. Receptionist opens Calendar or Clients panel.
2. **Find or Create Client:** Calls `POST /api/clients`. The request goes through `findOrCreateClient()` in `src/lib/client.js` — the single authoritative dedup path:
   - Phone match → `SELECT … FOR UPDATE` returns existing user.
   - Email match → same.
   - Neither → `INSERT` with `ER_DUP_ENTRY` race recovery.
   - `salon_clients` row upserted in the same transaction (`ON DUPLICATE KEY UPDATE`).
3. **Create Booking:** Selects Client + Service(s) + Staff + Time. Status defaults to `confirmed`.
4. **Notes:** Per-salon notes live in `salon_clients.notes`, not in `users`.

**Dedup guarantees:**

- Same phone + concurrent POST → second request blocks on `FOR UPDATE` lock, reuses existing row.
- Hard duplicate impossible: no route other than `lib/client.js` may INSERT into `users`.
- Soft-deleted client re-books → `is_active = 1` set automatically in the same upsert.

### 3. Checkout & Payment

1. Status Flow: `pending` → `confirmed` (arrived) → `completed` (checkout).
2. **Checkout Screen:** Staff confirms services, adds retail products/tips/discounts.
3. **Payment:** Records payment method (Cash/Card/Terminal). Status `paid`.
4. **Refunds:** Supports partial/full refunds via Sales history.

### 4. Marketplace Discovery

1. **Search:** By service name, location, price, rating.
2. **Results:** Listings powered by SQL search (not mock data).
3. **Profile:** Shows services, team, reviews (read-only), about/amenities.

### 5. Salon Deletion (Soft Delete)

1. Owner navigates to Settings → General → Danger Zone.
2. System checks for blockers (pending bookings, active gift cards, packages).
3. If blockers exist, owner can cancel them manually or "Force Delete".
4. Confirmation dialog requires typing salon name to proceed.
5. Soft delete: `deleted_at` timestamp set, salon hidden from all queries.
6. Staff deactivated, pending bookings cancelled automatically.

---

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
  - `src/lib`: Core utilities (`api-client.js`, `db.js`, `format.js`, `validate.js`, `rate-limit.js`, `notifications.js`, `checkout.js`).
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

---

## E) API Contract

All routes prefixed with `/api`. Authenticated via Cookie/Bearer token.

| Domain             | Key Endpoints                                                                         | Notes                                                                                                                                           |
| :----------------- | :------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**           | `/auth/{login,register,me,logout}`                                                    | `register` supports `type=professional` param.                                                                                                  |
| **Salons**         | `/salons/[id]/{settings,hours,photos}`                                                | Includes soft delete via DELETE. Supports `?force=true` param.                                                                                  |
| **Bookings**       | `/salons/[id]/bookings/[id]`                                                          | Supports `reschedule`, `confirm`. Status: `pending, confirmed, completed, cancelled, no_show`. Permanent delete available.                      |
| **Clients**        | `/api/clients` (POST, GET)                                                            | Create/find client via `findOrCreateClient()`. Smart search: phone→`idx_users_phone`, email→`uq_users_email`, name→prefix LIKE.                 |
| **Client**         | `/api/clients/[id]` (GET, PUT, DELETE)                                                | GET: profile + salon stats. PUT: explicit-presence fields only, phone/email conflict checks (409). DELETE: soft-delete (`is_active=0`).         |
| **Client History** | `/api/clients/[id]/bookings?salonId=`                                                 | Paginated booking history with services and staff names. `COUNT(*) OVER()` single round-trip.                                                   |
| **CRM List**       | `/api/salons/[id]/clients`                                                            | Active clients only (`is_active=1`). Any active staff may access (manager AND receptionist).                                                    |
| **Staff**          | `/salons/[id]/staff/{availability}`                                                   | Manages profiles and working shifts.                                                                                                            |
| **Services**       | `/salons/[id]/services`                                                               | Grouped by Categories (`/api/categories`).                                                                                                      |
| **Payments**       | `/salons/[id]/payments`                                                               | Includes refunds and product sales.                                                                                                             |
| **Checkout**       | `/bookings/[id]/{total,checkout,products}`                                            | Server-computed totals, transactional checkout (cash/card), add products at checkout.                                                           |
| **Marketing**      | `/salons/[id]/{discounts,gift-cards}`                                                 | Also `campaigns` (Email/SMS) and `waitlist`.                                                                                                    |
| **Campaigns**      | `/salons/[id]/campaigns/[id]/send`                                                    | Create draft campaigns, blast to audience (all/new/returning/inactive).                                                                         |
| **Notifications**  | `/notifications` (GET, POST, DELETE), `/notifications/read` (POST), `/cron/reminders` | GET: paginated list with `isRead` + `unreadCount`. POST `/read`: mark all or specific as read. DELETE: batch delete. Cron reminders via Resend. |
| **Reviews**        | `/salons/[id]/reviews/[id]/reply`                                                     | Client reviews linked to bookings. Owner reply endpoint.                                                                                        |
| **Widget**         | `/widget/[salonId]/{services,availability}`                                           | **Public access**. Optimized for read-only wizard. Services return `availableStaff` array.                                                      |
| **Marketplace**    | `/marketplace/{salons,featured}`                                                      | **Public access**. Search-optimized queries.                                                                                                    |
| **Admin**          | `/admin/{users,salons,stats,fees,reviews,settings}`                                   | Platform-wide management. Salon toggle. Fees tracking, Review moderation, Global DB settings (maintenance, reg toggles).                        |

---

## F) Database Model

**Primary DB:** MySQL  
**Migrations:** `database/migrations/` directory

### Core Entities

- **Salons:** The root entity. Supports soft delete via `deleted_at` column.
- **Users:** Global identity (Clients, Staff, Owners). Personal info (Email, Phone).
- **Salon_Clients:** Join table (User <-> Salon). Stores salon-specific notes & loyalty stats.
- **Bookings:** The core transactional record. Contains `start_datetime`, `end_datetime`, `total_price`, `status`. Supports `deleted_at` for soft delete.
- **Booking_Services:** Junction table linking bookings to services with individual `staff_id` per service.
- **Staff:** Staff members with `color` field for calendar visualization.
- **Service_Staff:** Many-to-many relationship between services and staff.
- **Staff_Shifts:** Working hours definition.

### Soft Delete Fields

| Table         | Soft Delete Column         | Added       |
| ------------- | -------------------------- | ----------- |
| salons        | `deleted_at`, `deleted_by` | Feb 19 2026 |
| bookings      | `deleted_at`               | Jan 2026    |
| services      | `deleted_at`               | Jan 2026    |
| products      | `deleted_at`               | Jan 2026    |
| salon_clients | `is_active` (0 = removed)  | Feb 22 2026 |

> `salon_clients` uses `is_active` instead of `deleted_at` because the row must be re-activated (not re-inserted) when a removed client returns. `ON DUPLICATE KEY UPDATE is_active = 1` in a single upsert covers both the new-client and returning-client paths.

### Migrations History

| Date       | Migration                                    | Description                         |
| ---------- | -------------------------------------------- | ----------------------------------- |
| 2026-01-20 | `20260120_add_performance_indexes.sql`       | Performance indexes                 |
| 2026-01-21 | `20260121_add_default_working_hours.sql`     | Default staff hours                 |
| 2026-01-21 | `20260121_add_staff_to_booking_services.sql` | Per-service staff assignment        |
| 2026-02-19 | `20260219_add_salon_soft_delete.sql`         | Salon soft delete support           |
| 2026-02-22 | `20260222_add_client_search_indexes.sql`     | Client search indexes (phone, name) |
| 2026-02-22 | `20260222_add_salon_clients_soft_delete.sql` | `is_active` + `updated_at` + index  |

### Data Management

- **Setup Script:** `database/setup_fresh_db.sql` (Schema + Truncate).
- **Seed Data:** `database/seed_data.sql` (Idempotent inserts).
  - Creates 6 Owners (`owner@fresh.com` ... `owner6@fresh.com`).
  - Password for all seeds: `password123`.

---

## G) Deployment & Environment

### Standard Setup

1. **Install:** `npm install`
2. **Env:** Copy `.env.example` -> `.env.local`.
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
3. **Run:** `npm run dev`
4. **Tests:** `npm run test:e2e` (Playwright).

### Deployment

- **Target:** Vercel (Recommended) or Docker/VPS.
- **Build:** `npm run build`.
- **Secrets:** Ensure `JWT_SECRET` (min 32 chars) and `STRIPE_SECRET_KEY` are set in production.
- **Security Headers:** HSTS, CSP, X-Frame-Options configured in `next.config.mjs`.
- **Rate Limiting:** In-memory rate limiter active (consider Redis for production scale).

---

## H) Security

### Security Status: EXCELLENT ✅

All 11 identified vulnerabilities have been fixed (January 21, 2026).

#### Critical Fixes

- ✅ JWT secret validation (no weak fallback, min 32 chars required)
- ✅ IDOR prevention (strict Number validation, blocks type confusion)
- ✅ SQL injection protection (integer validation before dynamic queries)

#### High Priority Fixes

- ✅ Rate limiting on all authentication endpoints
  - Login: 5 attempts per 15 min per email
  - Register: 5 attempts per 15 min per IP
  - Forgot Password: 10 attempts per 15 min per IP
- ✅ Strict email validation (regex, normalization, length limits)
- ✅ Salon existence validation (verified before access checks)

#### Medium Priority Fixes

- ✅ Password complexity enforcement (upper, lower, number, special char)
- ✅ Input length limits (all text fields have max lengths)
- ✅ Cookie security (SameSite=Strict for CSRF protection)

#### Low Priority Fixes

- ✅ Request size limits (2MB max in Next.js config)
- ✅ Error message sanitization (generic errors to clients)

#### Security Features

- JWT authentication with HttpOnly cookies
- Bcrypt password hashing (cost factor 12)
- Role-based access control (RBAC)
- Parameterized SQL queries (all endpoints)
- XSS protection via React auto-escaping
- HSTS, CSP, X-Frame-Options headers
- Comprehensive Zod schema validation

---

## I) Recent Updates & Features

### Client Management System (February 22, 2026)

**Overview:** Full production-safe client management built across 9 steps. Covers creation, search, edit, history, deletion, deduplication, and performance.

#### Core Library — `src/lib/client.js`

The single authoritative path for finding or creating a client. No route file may INSERT into `users` directly.

**`findOrCreateClient(data)`** — exported function:

```
phone provided → SELECT FOR UPDATE → found: patch name via COALESCE, reuse
no match, email → SELECT FOR UPDATE → found: patch name+phone, reuse
no match        → INSERT INTO users (role='client', password_hash='')
                  ER_DUP_ENTRY race: re-SELECT winning row, no retry
salonId given   → INSERT INTO salon_clients ON DUPLICATE KEY UPDATE is_active=1
```

Returns `{ userId, isNew, isNewToSalon }`.

Also exports: `normalizePhone(raw)` (strips spaces/dashes/dots), `ClientError` (typed HTTP error).

#### API Endpoints

**`POST /api/clients`**

- Validates: `salonId`, `firstName`, at least one of `phone` / `email`.
- Delegates entirely to `findOrCreateClient()`. Route has zero INSERT logic.
- Accepts camelCase and snake_case field names.
- Response includes `isNew` and `isNewToSalon` flags.

**`GET /api/clients?salonId=&search=&page=&limit=`**

- Smart driving-table strategy based on input type:
  - **Phone** (`/^[\d\s+\-.]+$/`) → drives `FROM users`, hits `idx_users_phone`
  - **Email** (contains `@`) → drives `FROM users`, hits `uq_users_email`
  - **Name / empty** → drives `FROM salon_clients`, hits `idx_salon_clients_active`
- All LIKE patterns are `term%` (prefix) — never `%term%`.
- `COUNT(*) OVER()` returns total in same query (no second round-trip).
- Limit capped at 50. `is_active = 1` filter on all paths.

**`GET /api/clients/[id]?salonId=`**

- Returns user profile + `salonStats` (first visit, last visit, total visits).

**`PUT /api/clients/[id]`**

- Explicit-presence semantics: only fields sent are updated (missing fields untouched).
- Phone/email conflict checks inside `FOR UPDATE` transaction → 409 `PHONE_TAKEN` / `EMAIL_TAKEN`.
- Notes live in `salon_clients` (per-salon), not in `users`.

**`DELETE /api/clients/[id]?salonId=`**

- **Never hard-deletes.** Sets `salon_clients.is_active = 0`.
- `users` row and all `bookings` rows untouched — history preserved.
- Re-booking the same client auto-sets `is_active = 1` via upsert.

**`GET /api/clients/[id]/bookings?salonId=`**

- Paginated booking history: two-query strategy (bookings with window count + services batch IN()).

#### Access Control

All client endpoints accept **any active staff member** (manager or receptionist). The old `AND role='manager'` guard has been removed from every client route.

#### Duplicate Prevention — Guarantee Map

| Scenario                              | Mechanism                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Same phone, concurrent POST           | `SELECT … FOR UPDATE` serialises — second request blocks, reuses winner row |
| Same email, no phone, concurrent POST | `FOR UPDATE` + `ER_DUP_ENTRY` catch + re-SELECT                             |
| Staff writes own INSERT               | `pool` not exported to route files — only `lib/client.js` holds it          |
| Duplicate `salon_clients` row         | `PRIMARY KEY (salon_id, client_id)` + `ON DUPLICATE KEY UPDATE`             |
| Removed client returns                | `is_active = 1` in every upsert — re-activated automatically                |

#### Indexes Added (Migration `20260222_add_client_search_indexes.sql`)

| Index                             | Table         | Used by                              |
| --------------------------------- | ------------- | ------------------------------------ |
| `idx_users_phone`                 | users         | Phone search fast path               |
| `idx_users_first_name`            | users         | Name search                          |
| `idx_users_last_name`             | users         | Name search                          |
| `idx_bookings_client_salon_start` | bookings      | Client booking history               |
| `idx_salon_clients_active`        | salon_clients | CRM list + name search driving table |

---

### Salon Soft Delete (February 19, 2026)

**Overview:** Implemented soft delete for salons to preserve financial records and allow recovery.

**Key Changes:**

1. **Database Schema:**
   - Added `deleted_at` (DATETIME) and `deleted_by` (FK to users) to `salons` table
   - Index: `idx_salons_deleted` for efficient filtering
   - Migration: `20260219_add_salon_soft_delete.sql`

2. **API Endpoint** (`DELETE /api/salons/[id]`):
   - Pre-deletion checks for:
     - Pending/confirmed future bookings
     - Active gift cards with balance
     - Active packages with remaining sessions
   - Optional `?force=true` to override blockers
   - Auto-cancels pending bookings on delete
   - Deactivates all staff members
   - Sets `is_active=0`, `is_marketplace_enabled=0`, `status='deleted'`

3. **Query Filters:**
   - All salon queries include `AND deleted_at IS NULL`
   - Deleted salons hidden from marketplace and owner dashboard

4. **UI Components:**
   - "Danger Zone" section in Settings → General
   - Confirmation dialog requiring salon name to be typed
   - Displays blockers with option to force delete
   - Redirects to `/dashboard/settings` after deletion

5. **Hook:**
   - `useDeleteSalon()` in `src/hooks/use-settings.js`
   - Returns blockers on 409 conflict

---

### Multi-Salon Management (February 2026)

**Overview:** Owners can now manage multiple salons from a single account.

**Key Changes:**

- Salon switcher in header shows ALL user salons (not just current)
- Navigation between salons via dropdown
- Cache invalidation after creating new salon
- Query: `['user-salons', userId]`

---

### Booking Detail Redesign (February 2026)

**Overview:** Complete redesign of booking detail drawer with card-based layout.

**Key Changes:**

- Card-based sections for client info, services, staff, notes
- Improved spacing and padding
- Support for permanent delete of bookings
- Fixed date validation errors

---

### Multi-Service Booking System (January 22, 2026)

**Overview:** Fresha-style multi-service bookings where each service can be assigned to a different staff member.

**Key Changes:**

1. **Database Schema:**
   - Added `staff_id` column to `booking_services` table
   - Migration: `20260121_add_staff_to_booking_services.sql`

2. **API Updates:**
   - Widget Services API returns `availableStaff` array per service
   - Availability API accepts `?services=36:9,38:13` format
   - Finds overlapping working hours for all staff
   - Booking creation validates all staff assignments

3. **UI Components:**
   - Staff dropdown per service
   - Color indicators for staff
   - Reduced widget from 5 steps to 4

4. **Calendar & Display:**
   - Staff colors for event backgrounds
   - Status via border styles (pending: dashed, confirmed: solid)

---

## J) Changelog

### February 26, 2026

**Part 8: Financial Operations & Subscriptions (Admin & Salon)**
- ✅ Implemented `plan_tier` on salons (`basic`, `pro`, `enterprise`) to gate features.
- ✅ Built subscription manager UI allowing self-serve upgrades (`/dashboard/salon/subscriptions`).
- ✅ Created `payouts` table and Payout Calculator to automate salon disbursements (amount = booking - platform_fee).
- ✅ Built Global Payout Dashboard for Admin review and approval (`/dashboard/admin/payouts`).
- ✅ Created `refunds` table and UI for Admins to trigger Global Refunds, properly reversing platform fees.

**Part 2: Platform Analytics & Growth Metrics (Admin)**
- ✅ Created Admin Analytics dashboard (`/dashboard/admin/analytics`).
- ✅ Added GMV (Gross Merchandise Value) Tracker pulling aggregate success data minus refunds/cash.
- ✅ Added Marketplace Engagement Heatmaps mapping booking frequency by 4-hour timeblocks.
- ✅ Built Salon Churn & Retention list highlighting salons with zero bookings in 30 days.

**Part 3: Marketing & Communications (Admin)**
- ✅ Deployed Platform-Funded Global Promos (`global_discounts` table). Users can redeem platform codes (e.g. `FRESH2026`) that absorb the cost via lower platform fees without hurting the Salon's bottom line.
- ✅ Created multi-channel Admin Broadcast System (`/api/admin/broadcasts`) targeting owner/staff segments.
- ✅ Updated the generic `notifications` schema with `is_system_banner` flags to display platform-wide alerts persistently at the top of Owner dashboards.

**Part 4: Security & Audit Logging (Admin)**
- ✅ Formalized an Immutable System Audit Ledger (`audit_logs`) featuring colored JSON diffing (`old_data` vs `new_data`) for strict oversight (`/dashboard/admin/audit-logs`).
- ✅ Built **Admin Impersonation**: Admins can securely "Login As" any Owner (`/api/admin/impersonate`).
- ✅ Impersonation tokens feature `impersonatorAdminId` claim, which triggers a persistent un-closable security banner with a secure "Stop Impersonating" revert switch.
- ✅ Impersonation starts/stops explicitly write to the `audit_logs` to maintain zero-trust integrity.

**Part 5: Support & Ticketing (Platform-Wide)**
- ✅ Created `support_tickets` table schema enforcing relational links back to users.
- ✅ Built Salon-facing Support Dashboard for Owners to file tickets and track their status.
- ✅ Built Admin-facing Support UI featuring a Global Ticket Queue triage board.
- ✅ Built the **Onboarding Concierge**: Automated tab detecting At-Risk active Salons that are failing to generate `services` or `business_hours`, enabling 1-click Admin Intervention.

### February 25, 2026

**Admin Panel Expansion & API Fixes**

- ✅ Created `/dashboard/admin/fees` to track platform revenue, pending collections, and disputed amounts.
- ✅ Created `/dashboard/admin/reviews` for global review moderation with the ability to delete reviews violating guidelines.
- ✅ Created `/dashboard/admin/settings` allowing admins to toggle Maintenance Mode, New Registrations, Email Verification, and configure Platform Fee Percentages / Legal URLs dynamically via the DB.
- ✅ Fixed `GET /api/admin/fees` to query `is_paid` and `type` instead of non-existent schema columns, resolving 500 errors.
- ✅ Fixed `GET /api/admin/reviews` mapping to correctly format reviewer names and align with DB schema.
- ✅ Updated sidebar navigation to include the new "Fees", "Reviews", and "Settings" pages.

### February 23, 2026

- ✅ `GET /api/marketplace/salons` — finalized `searchSalons()` (Level 4 Step 7)
  - Added `total` count via subquery for proper pagination
  - Implemented `openNow` filter using `business_hours` table (day_of_week + time range)
  - Explicit field mapping in response (no spread of raw DB row)
  - Response shape: `{ data[], total, limit, offset, hasMore }`
  - All 4 safety gates hardcoded: `status='active'`, `is_active=1`, `deleted_at IS NULL`, `is_marketplace_enabled=1`
  - N+1 eliminated: services preview inlined via `GROUP_CONCAT`

### February 23, 2026

**Notifications & Email Integration**

- ✅ Built `src/lib/notifications.js` — `sendNotification()` with Resend email integration + console fallback
- ✅ Integrated booking confirmation emails into booking creation flow
- ✅ Integrated cancellation emails into `PUT /api/bookings/[id]` (status=cancelled)
- ✅ Created `GET /api/cron/reminders` — triggers upcoming appointment reminders (24h window)

**Discounts & Gift Cards**

- ✅ `GET /api/salons/[id]/discounts/[code]` — validate discount code (active dates, usage limits, min purchase)
- ✅ `GET /api/gift-cards/[code]` — validate gift card balance
- ✅ Updated `createSafeBooking()` in `src/lib/booking.js` to apply discounts and gift cards during booking
- ✅ Writes to `booking_discounts`, `booking_gift_cards` tables; increments usage / decrements balance

**Marketing Campaigns (MVP)**

- ✅ `POST /api/salons/[id]/campaigns` — create campaign draft with Zod validation
- ✅ `GET /api/salons/[id]/campaigns` — list campaigns with status filter
- ✅ `POST /api/salons/[id]/campaigns/[id]/send` — blast to audience (all/new/returning/inactive via `salon_clients`)
- ✅ Uses `sendNotification()` for dispatch, tracks `recipient_count` and `sent_count`

**Reviews (MVP)**

- ✅ Updated `POST /api/salons/[id]/reviews` — now links review to `booking_id`, validates completed booking ownership
- ✅ `PATCH /api/salons/[id]/reviews/[id]/reply` — salon owner/manager reply endpoint
- ✅ Public reviews already filtered by `status='approved'` in marketplace API

**Admin Platform Controls (MVP)**

- ✅ `PATCH /api/admin/salons/[salonId]/status` — activate/deactivate salons (admin-only)
- ✅ Existing `GET /api/admin/salons` and `GET /api/admin/users` cover list + metrics

**Level 2 — Money Flow (Checkout & Payment Recording)**

- ✅ Built `src/lib/checkout.js` — core money logic library:
  - `calculateBookingTotal()` — server-computed from DB (services + products − discounts − gift cards)
  - `addProductToBooking()` — validates product, inserts at DB price, decrements stock
  - `processCheckout()` — transactional checkout with `SELECT ... FOR UPDATE` row locking
- ✅ `GET /api/bookings/[id]/total` — read-only total breakdown
- ✅ `POST /api/bookings/[id]/products` — add products at checkout
- ✅ `POST /api/bookings/[id]/checkout` — full transactional checkout (lock → validate → compute → pay → complete)
- ✅ Strict booking status lifecycle enforced: `pending → confirmed → completed` (no backward transitions)
- ✅ One payment per booking enforced (code + `UNIQUE(booking_id)` DB constraint)
- ✅ All money logic uses `db.transaction()` with `ROLLBACK` on any failure

**Validation Schemas Added**

- ✅ `createCampaignSchema`, `replyReviewSchema`, `updateSalonStatusSchema`
- ✅ `addBookingProductSchema`, `checkoutSchema`

### February 24, 2026

**Notification System (Frontend)**

- ✅ Created `src/hooks/use-notifications.js` hook — fetches, marks read, deletes notifications with 30s polling
- ✅ Created `src/components/layout/notification-popover.jsx` — popover with unread badge, scrollable list, mark-all-read, per-notification mark-read/delete actions, empty state
- ✅ Replaced static bell button in `header.jsx` with `NotificationPopover` component
- ✅ Updated `GET /api/notifications` to include `isRead` field and `unreadCount` in response

**Bug Fixes**

- ✅ Fixed infinite re-render loop on Account Settings page (`switch.jsx` crash)
  - Root cause: `useCurrentUser()` returned a new object literal every render, causing `useEffect([user])` to fire infinitely
  - Fix: Added `useRef` initialization guard so effect only runs once
- ✅ Fixed `products?.filter is not a function` crash on Products page
  - Root cause: `useProducts` hook `select` transform didn't handle nested API response `{success:true, data:{data:[...]}}`
  - Fix: Updated `select` to correctly extract the array from nested response
- ✅ Fixed `/profile` 404 error — link now points to `/dashboard/settings` instead
- ✅ Removed global CSS transition rule from `globals.css` that conflicted with component transitions

**UI/UX Improvements**

- ✅ Removed all emojis from marketplace homepage (✨ sparkle badge, 💇 fallback icon → replaced with text/Scissors icon)
- ✅ Created footer pages: `/contact`, `/help`, `/privacy`, `/terms`
- ✅ Fixed login page button spacing (`mt-6` on CardFooter)
- ✅ Fixed cursor pointer on all interactive elements via `globals.css`

### February 22, 2026

- ✅ Built full client management system (`src/lib/client.js` + 4 route files)
- ✅ `findOrCreateClient()` — single dedup path, phone FOR UPDATE → email FOR UPDATE → INSERT + race recovery
- ✅ `POST /api/clients` — delegates entirely to lib, zero inline INSERT logic
- ✅ `GET /api/clients` — smart driving-table search (phone/email drive FROM users, name/empty drive FROM salon_clients)
- ✅ `PUT /api/clients/[id]` — explicit-presence fields, `PHONE_TAKEN`/`EMAIL_TAKEN` 409 conflict errors
- ✅ `DELETE /api/clients/[id]` — soft-delete (`is_active=0`), never hard-deletes
- ✅ `GET /api/clients/[id]/bookings` — paginated history, `COUNT(*) OVER()` single round-trip
- ✅ `salon_clients` soft-delete: added `is_active`, `updated_at`, `idx_salon_clients_active`
- ✅ Migrations: `20260222_add_client_search_indexes.sql`, `20260222_add_salon_clients_soft_delete.sql`
- ✅ Removed `AND role='manager'` guard from all client routes — receptionists now have full access
- ✅ `normalizePhone()` and `ClientError` exported from `lib/client.js`

### February 19, 2026

- ✅ Implemented salon soft delete with pre-deletion checks
- ✅ Added "Danger Zone" UI in settings
- ✅ Created migration `20260219_add_salon_soft_delete.sql`
- ✅ Updated all salon queries to filter deleted

### February 2026 (Earlier)

- ✅ Fixed salon switcher to show ALL user salons
- ✅ Redesigned booking detail drawer
- ✅ Added permanent delete for bookings
- ✅ Fixed Tailwind CSS deprecation warnings (flex-shrink-0 → shrink-0)
- ✅ Fixed booking.id.slice error (id is number)
- ✅ Fixed "Invalid time value" with isValid() checks

### January 22, 2026

- ✅ Implemented multi-service booking system
- ✅ Per-service staff assignment
- ✅ Availability API for multiple staff

### January 21, 2026

- ✅ Security audit completed
- ✅ All 11 vulnerabilities fixed
- ✅ Rate limiting implemented
- ✅ Password complexity enforced

### January 19, 2026

- ✅ Secure logging for password reset
- ✅ Auth upgrade API fix
- ✅ Centralized formatting utilities
- ✅ Unified toast system

---

## K) Known Issues & Limitations

1. **Mobile App:** Planned but not implemented. Dashboard is web-responsive.
2. **Notifications:** In-app notification popover is fully implemented (fetch, mark-read, delete, 30s polling). Email integration via Resend requires `RESEND_API_KEY` env var; falls back to console logging without it. Push notifications not yet implemented.
3. **Multi-Currency:** Supported in `format.js` but UI assumes single salon currency.
4. **Rate Limiter:** In-memory (single-server). Consider Redis for production.
5. **Payments:** Manual cash/card recording is production-ready. Stripe online payments, partial payments, split payments, and refund flows are not yet implemented.
6. **Soft Delete Recovery:** No UI for restoring deleted salons (admin-only via DB).
7. **Phone normalization:** `normalizePhone()` strips spaces/dashes/dots but does not convert local Algerian format (`0555…`) to E.164 (`+2135…`). Stored format depends on what the receptionist typed first.
8. **Account Settings:** Uses a mock `useCurrentUser()` hook with hardcoded data. In production, integrate with auth context to pull real user data.

---

## L) Roadmap

1. **Salon Recovery UI:** Admin interface to restore deleted salons
2. **Enhanced Rate Limiting:** Redis-based for multi-server deployments
3. **2FA Implementation:** Two-factor authentication for admin/owner accounts
4. **CI/CD:** Enforce `test:e2e` on Pull Requests
5. **Marketplace SEO:** Server-side metadata for salon profiles
6. **Security Monitoring:** Logging for rate limit hits and failed auth attempts
7. **Permanent Purge:** Background job to permanently delete after 90-day retention
8. **Phone Normalization:** E.164 conversion (`+213…`) with country-code awareness for dedup across formats
9. **Client Import:** Bulk CSV import via `findOrCreateClient()` (dedup-safe by design)
10. **Salon Recovery UI:** Restore soft-deleted `salon_clients` rows (currently admin-only via DB update)

---

## Archived Documentation

Previous documentation files have been consolidated into this document:

- `AUDIT_AND_FIXES.md`
- `FRESH_MASTER_CONTEXT.md`
- `SECURITY_AUDIT.md`
- `SECURITY_AUDIT_SUMMARY.md`
- `SECURITY_FIXES_APPLIED.md`
- `SECURITY_FIXES_COMPLETE.md`

These files can be found in `docs/archive/` for reference.
