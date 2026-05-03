# Fresh Platform — Complete Project Context

> Last updated: 2026-04-30 — Hybrid fulfillment + dashboard redesign | Branch: `devalop` @ `3a6ed66`

---

## Table of Contents

1. [What is Fresh?](#1-what-is-fresh)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Directory Structure](#3-project-directory-structure)
4. [The 5 User Roles](#4-the-5-user-roles)
5. [Database Schema — All 42 Tables](#5-database-schema--all-42-tables)
6. [Core Library (`/src/lib`)](#6-core-library-srclib)
7. [API Routes Map (`/src/app/api`)](#7-api-routes-map-srcappapi)
8. [Frontend Pages Map](#8-frontend-pages-map)
9. [Components & Hooks](#9-components--hooks)
10. [Golden Rules (Strict Business Logic)](#10-golden-rules-strict-business-logic)
11. [Permission System](#11-permission-system)
12. [Authentication Flow](#12-authentication-flow)
13. [Database Connection & Query Patterns](#13-database-connection--query-patterns)
14. [Security Configuration](#14-security-configuration)
15. [Git History & Recent Changes](#15-git-history--recent-changes)
16. [Known Issues & Limitations](#16-known-issues--limitations)
17. [Roadmap & Next Tasks](#17-roadmap--next-tasks)

---

## 1. What is Fresh?

Fresh is a **multi-tenant SaaS operating system for salons** and a **consumer-facing marketplace** — comparable to Fresha/Treatwell. It lets salon owners manage bookings, staff, inventory, payments, and marketing from a single dashboard, while clients discover and book services through a public marketplace.

**Key operational mode: Hybrid Fulfillment** — services can be delivered physically (at salon), mobile (staff travels to client), or virtually (video call).

| Surface | URL Pattern | Audience |
|---------|-------------|----------|
| Marketplace (Landing + Search) | `/`, `/salons`, `/[category]/[city]` | Consumers |
| Salon Public Page | `/salon/[slug]` | Consumers |
| Booking Widget | `/book/[salonId]` | Consumers |
| Client Dashboard | `/profile`, `/bookings` | Logged-in clients |
| Salon Dashboard | `/dashboard/salon/[salonId]/*` | Owner / Manager / Staff |
| Admin Dashboard | `/dashboard/admin/*` | Platform admins |
| Onboarding | `/onboarding/*` | New owners |
| Auth | `/login`, `/register`, `/forgot-password` | All |

---

## 2. Tech Stack & Dependencies

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.1 |
| Runtime | React | 19.2.3 |
| Language | JavaScript (JSX) | ES2022+ |
| Database | MySQL (raw queries via mysql2) | 9.3.0 server |
| ORM | None — raw `pool.query` / `pool.execute` | — |
| Styling | Tailwind CSS | v4 |
| UI Components | shadcn/ui (Radix primitives) | Various |
| State (Server) | TanStack React Query | 5.90.16 |
| State (Forms) | React Hook Form + Zod | 7.70.0 / 4.3.5 |
| Tables | TanStack React Table | 8.21.3 |
| Calendar | FullCalendar | 6.1.20 |
| Charts | Recharts | 3.7.0 |
| Animations | Framer Motion | 12.35.0 |
| Auth | jose (JWT) + bcryptjs | 6.1.3 / 3.0.3 |
| Payments | Stripe | 20.1.0 |
| Email | Resend | 6.10.0 |
| Maps | @react-google-maps/api | 2.20.8 |
| Date Handling | date-fns | 4.1.0 |
| Theming | next-themes | 0.4.6 |
| Icons | lucide-react | 0.562.0 |
| Fonts | Geist + Geist Mono (Google Fonts) | — |

### State Management Strategy

- **Server state**: TanStack React Query manages all API data fetching, caching, and mutations via custom hooks in `/src/hooks/`.
- **Form state**: React Hook Form with Zod schema validation — forms are never backed by global state.
- **Client state**: React Context for auth (`AuthProvider`) and salon context (`SalonProvider`). There is **no Redux, Zustand, or Jotai**.
- **Theme**: `next-themes` manages dark/light mode.

---

## 3. Project Directory Structure

```
apps/web/
├── .context/                    ← Project context docs (this file)
├── .env.local                   ← Environment variables
├── database/
│   ├── fresh.sql                ← Full DB dump (data + structure)
│   ├── fresh_structure.sql      ← Schema-only dump (42 tables)
│   └── migrations/              ← Chronological migration scripts
├── next.config.mjs              ← Next.js config + security headers
├── package.json                 ← Dependencies and scripts
├── public/                      ← Static assets (favicon, og-image, etc.)
├── src/
│   ├── app/
│   │   ├── (auth)/              ← Auth pages (login, register, forgot-password, reset-password)
│   │   ├── (marketplace)/       ← Public marketplace pages (home, search, salon profile)
│   │   ├── api/                 ← All API route handlers (~165 routes)
│   │   │   ├── admin/           ← Admin-only endpoints (salons, users, fees, analytics)
│   │   │   ├── auth/            ← Auth endpoints (login, register, me, verify, etc.)
│   │   │   ├── bookings/        ← Booking CRUD + checkout + reschedule
│   │   │   ├── campaigns/       ← Marketing campaigns
│   │   │   ├── clients/         ← Client management
│   │   │   ├── marketplace/     ← Public marketplace API (search, salon details)
│   │   │   ├── salons/          ← Salon CRUD + sub-resources (staff, services, etc.)
│   │   │   ├── services/        ← Service CRUD
│   │   │   ├── staff/           ← Staff management
│   │   │   ├── widget/          ← Booking widget API (public, per-salon)
│   │   │   └── ... (discounts, gift-cards, invoices, packages, payments, etc.)
│   │   ├── auth/                ← Auth choice page
│   │   ├── book/[salonId]/      ← Standalone booking widget page
│   │   ├── dashboard/
│   │   │   ├── admin/           ← Admin dashboard pages (11 pages)
│   │   │   ├── salon/[salonId]/ ← Salon dashboard (bookings, calendar, clients, etc.)
│   │   │   │   ├── settings/    ← Settings sub-pages (general, hours, widget, etc.)
│   │   │   │   ├── marketing/   ← Marketing sub-pages (campaigns, discounts, etc.)
│   │   │   │   └── reports/     ← Report sub-pages (revenue, bookings, staff, clients)
│   │   │   └── locations/       ← Multi-location management
│   │   ├── invite/              ← Staff invitation acceptance page
│   │   ├── onboarding/          ← Owner onboarding wizard
│   │   └── verify-email/        ← Email verification page
│   ├── components/
│   │   ├── booking-widget/      ← Multi-step booking widget (7 components)
│   │   ├── bookings/            ← Booking detail + form
│   │   ├── calendar/            ← FullCalendar wrappers (4 components)
│   │   ├── checkout/            ← Checkout flow (add product, payment success)
│   │   ├── clients/             ← Client forms + history + notes
│   │   ├── layout/              ← Dashboard layout (sidebar, header, notifications, permissions)
│   │   ├── marketplace/         ← Salon cards, search, map
│   │   ├── marketing/           ← Campaign, discount, gift card, package forms
│   │   ├── onboarding/          ← Onboarding wizard
│   │   ├── products/            ← Product form + stock update
│   │   ├── sales/               ← Payment detail + refund dialog
│   │   ├── services/            ← Service + category forms
│   │   ├── staff/               ← Staff management (12 tab components)
│   │   └── ui/                  ← shadcn/ui primitives (~40 components)
│   ├── hooks/                   ← TanStack Query hooks (21 files)
│   ├── lib/                     ← Core business logic ("Internal Brain")
│   │   ├── auth.js              ← JWT creation/verification, session management
│   │   ├── booking.js           ← createSafeBooking() — THE booking entry point
│   │   ├── checkout.js          ← calculateBookingTotal(), processCheckout()
│   │   ├── client.js            ← findOrCreateClient() — dedup logic
│   │   ├── db.js                ← MySQL pool + query/getOne/transaction helpers
│   │   ├── permissions.js       ← Role-based permission engine
│   │   ├── validate.js          ← Zod schemas for all entities
│   │   ├── travel.js            ← Travel time estimation + bidirectional feasibility
│   │   ├── geo.js               ← Haversine distance + geocoding
│   │   ├── notifications.js     ← Email/SMS dispatch + contextual templates
│   │   ├── security.js          ← XSS sanitization, password strength, CSRF
│   │   ├── rate-limit.js        ← In-memory rate limiter
│   │   ├── response.js          ← Standardized API response helpers
│   │   ├── format.js            ← Currency, percentage, duration formatters
│   │   ├── id.js                ← URL-safe ID encoding/decoding
│   │   ├── stripe.js            ← Stripe client initialization
│   │   ├── email.js             ← Resend email client
│   │   ├── api-client.js        ← Frontend HTTP client (cookie-based auth)
│   │   ├── utils.js             ← cn() + generateSalonSlug()
│   │   └── constants/           ← Categories, countries, email templates
│   └── providers/               ← React context providers (auth, query, salon, theme, toast)
```

---

## 4. The 5 User Roles

| Role | `users.role` (Global) | `staff.role` (Salon-level) | Access |
|------|----------------------|---------------------------|--------|
| Admin | `admin` | N/A | Full platform access. Bypasses all ownership checks. |
| Owner | `owner` | `owner` | Full access to owned salons. `salons.owner_id = users.id`. |
| Manager | `owner` or `staff` | `manager` | Salon proxy for owner. Most dashboard features. |
| Receptionist | `staff` | `receptionist` | Calendar, bookings, clients. Limited financial access. |
| Staff | `staff` | `staff` | Own schedule, own bookings, timesheets only. |
| Client | `client` | N/A | Book services, view own bookings, write reviews. |

> [!CAUTION]
> **"Manager" is NOT a global `users.role` value.** It exists ONLY in the `staff.role` ENUM. A user with `users.role = 'staff'` can be a manager at one salon and basic staff at another. Admin impersonation must target a specific `staff_id`, not just `user_id`.

### Admin Fast-Return Pattern
```javascript
// Used in route handlers for admin bypass:
if (session.role === 'admin') return true;
```

### Role Hierarchy (permissions.js)
```javascript
export const ROLE_RANK = {
  staff: 1,
  receptionist: 2,
  manager: 3,
  owner: 4,
};
```

---

## 5. Database Schema — All 42 Tables

### Soft-Delete Rules

| Table | Soft-Delete Method |
|-------|-------------------|
| `users` | `deleted_at` timestamp (⚠️ was previously `role='deleted'` which BREAKS the ENUM) |
| `salons` | `deleted_at` timestamp + `deleted_by` FK |
| `bookings` | `deleted_at` timestamp |
| `services` | `deleted_at` timestamp |
| `products` | `deleted_at` timestamp |
| `discounts` | `deleted_at` timestamp |
| `reviews` | `deleted_at` timestamp |
| `user_addresses` | `deleted_at` timestamp |
| `salon_clients` | `is_active` boolean (⚠️ NOT timestamp — uses `tinyint(1)`) |

> [!WARNING]
> **Never use `DELETE FROM` on any core table.** Always set `deleted_at = NOW()` or `is_active = 0`.
> The `users.role` ENUM is strictly `('client','owner','staff','admin')` — attempting to set `role='deleted'` will cause a MySQL strict mode error.

### Core Identity

```sql
-- users — All platform users (clients, owners, staff, admins)
CREATE TABLE users (
  id              bigint unsigned NOT NULL AUTO_INCREMENT,
  email           varchar(255) NOT NULL,           -- UNIQUE (uq_users_email)
  phone           varchar(30) DEFAULT NULL,
  gender          varchar(20) DEFAULT NULL,
  date_of_birth   date DEFAULT NULL,
  address         varchar(255) DEFAULT NULL,
  city            varchar(100) DEFAULT NULL,
  postal_code     varchar(20) DEFAULT NULL,
  notes           text,
  password_hash   varchar(255) NOT NULL,
  first_name      varchar(100) DEFAULT NULL,
  last_name       varchar(100) DEFAULT NULL,
  country         varchar(100) DEFAULT NULL,
  role            enum('client','owner','staff','admin') NOT NULL DEFAULT 'client',
  created_at      datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  email_verified  tinyint(1) NOT NULL DEFAULT 0,
  reset_token     varchar(255) DEFAULT NULL,
  reset_token_expires datetime DEFAULT NULL,
  avatar_url      varchar(500) DEFAULT NULL,
  last_login_at   datetime DEFAULT NULL,
  deleted_at      datetime DEFAULT NULL,            -- Soft delete
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
);

-- salons — Business entities
CREATE TABLE salons (
  id                      bigint unsigned NOT NULL AUTO_INCREMENT,
  owner_id                bigint unsigned NOT NULL,     -- FK → users.id
  name                    varchar(255) NOT NULL,
  description             text,
  phone                   varchar(30),
  email                   varchar(255),
  address                 text,
  city                    varchar(100),
  country                 varchar(100),
  latitude                decimal(10,7),
  longitude               decimal(10,7),
  is_marketplace_enabled  tinyint(1) NOT NULL DEFAULT 0,
  is_active               tinyint(1) NOT NULL DEFAULT 1,
  stripe_account_id       varchar(255),
  timezone                varchar(50) DEFAULT 'Europe/Paris',
  currency                varchar(3) DEFAULT 'EUR',
  logo_url                varchar(500),
  cover_image_url         varchar(500),
  website                 varchar(255),
  price_level             tinyint DEFAULT 2,
  state                   varchar(100),
  postal_code             varchar(20),
  status                  varchar(20) DEFAULT 'active',
  plan_tier               enum('basic','pro','enterprise') DEFAULT 'basic',
  deleted_at              datetime,
  deleted_by              bigint unsigned,
  -- Hybrid fulfillment columns
  is_physical             tinyint(1) NOT NULL DEFAULT 1,
  is_mobile               tinyint(1) NOT NULL DEFAULT 0,
  is_virtual              tinyint(1) NOT NULL DEFAULT 0,
  travel_radius           int DEFAULT NULL,              -- km
  travel_fee_type         enum('fixed','per_km','none') DEFAULT 'none',
  travel_fee_amount       decimal(10,2) DEFAULT 0.00,
  min_booking_amount      decimal(10,2) DEFAULT 0.00,
  virtual_meeting_link    text,
  covered_zip_codes       text,                          -- Comma-separated
  travel_buffer_time      int DEFAULT 0,                 -- Minutes before/after mobile
  mobile_base_address     varchar(255),
  PRIMARY KEY (id)
);

-- user_addresses — Saved client addresses for mobile bookings
CREATE TABLE user_addresses (
  id            bigint unsigned AUTO_INCREMENT,
  user_id       bigint unsigned NOT NULL,    -- FK → users.id
  label         varchar(100) NOT NULL,       -- e.g. 'Home', 'Work'
  icon_name     varchar(50) DEFAULT 'MapPin',
  full_address  varchar(255) NOT NULL,
  lat           decimal(10,7) NOT NULL,
  lng           decimal(10,7) NOT NULL,
  is_default    tinyint(1) DEFAULT 0,
  deleted_at    datetime DEFAULT NULL,
  PRIMARY KEY (id)
);
```

### Staff & HR

```sql
-- staff — Salon-level employee records
CREATE TABLE staff (
  id              bigint unsigned AUTO_INCREMENT,
  salon_id        bigint unsigned NOT NULL,
  user_id         bigint unsigned NOT NULL,
  first_name      varchar(100),
  last_name       varchar(100),
  role            enum('staff','manager','owner','receptionist') NOT NULL DEFAULT 'staff',
  is_active       tinyint(1) NOT NULL DEFAULT 1,
  bio             text,
  avatar_url      varchar(500),
  color           varchar(7) DEFAULT '#3B82F6',
  display_order   int DEFAULT 0,
  title           varchar(100),
  employment_type enum('employee','self_employed') DEFAULT 'employee',
  permissions     json DEFAULT NULL,        -- Custom permission overrides
  -- Fulfillment capabilities
  can_physical    tinyint(1) NOT NULL DEFAULT 1,
  can_mobile      tinyint(1) NOT NULL DEFAULT 0,
  can_virtual     tinyint(1) NOT NULL DEFAULT 0,
  travel_radius   int DEFAULT NULL,         -- Staff-specific override (km)
  home_lat        decimal(10,7),            -- For travel distance calc
  home_lng        decimal(10,7),
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_salon_user (salon_id, user_id)
);

-- staff_working_hours — Per-staff schedule
-- staff_time_off — Time-off periods
-- staff_timesheets — Clock in/out records
-- staff_wages — Hourly/salary/commission wage records
-- staff_commissions — Commission percentages per staff
-- staff_pay_runs / staff_pay_run_items — Payroll batches
-- staff_addresses — Staff home/work addresses
-- staff_emergency_contacts — Emergency contact info
-- staff_invitations — Invite tokens for joining a salon (UUID PK, token-based)
```

### Bookings & Scheduling

```sql
-- bookings — Core booking records
CREATE TABLE bookings (
  id                        bigint unsigned AUTO_INCREMENT,
  salon_id                  bigint unsigned NOT NULL,
  client_id                 bigint unsigned NOT NULL,
  staff_id                  bigint unsigned NOT NULL,    -- Primary staff
  start_datetime            datetime NOT NULL,
  end_datetime              datetime NOT NULL,
  status                    enum('pending','confirmed','completed','cancelled','no_show'),
  source                    enum('marketplace','direct') DEFAULT 'direct',
  notes                     text,
  internal_notes            text,
  cancelled_at              datetime,
  cancelled_by              bigint unsigned,
  cancellation_reason       text,
  deleted_at                datetime,
  -- Hybrid fulfillment
  fulfillment_type          enum('physical','mobile','virtual') DEFAULT 'physical',
  service_location_address  text,            -- Client address for mobile
  service_lat               decimal(10,7),
  service_lng               decimal(10,7),
  client_timezone           varchar(50),     -- For virtual bookings
  virtual_meeting_link      text,
  travel_fee_amount         decimal(10,2) DEFAULT 0.00,  -- Snapshot
  travel_distance_km        decimal(8,2),                -- Snapshot
  PRIMARY KEY (id)
);

-- booking_services — Per-service line items with individual staff + time windows
CREATE TABLE booking_services (
  booking_id      bigint unsigned NOT NULL,
  service_id      bigint unsigned NOT NULL,
  staff_id        bigint unsigned,           -- Per-service staff override
  start_datetime  datetime NOT NULL,         -- Sequential service start
  end_datetime    datetime NOT NULL,         -- Sequential service end
  price           decimal(10,2) NOT NULL,
  duration_minutes int NOT NULL,
  PRIMARY KEY (booking_id, service_id)
);

-- booking_travel_fees — Travel fee line items (mobile only)
-- booking_discounts — Applied discount records
-- booking_gift_cards — Applied gift card records
-- booking_products — Products added at checkout
-- booking_resources — Room/chair/equipment reservations
```

### Services & Inventory

```sql
-- services — Salon service catalog
CREATE TABLE services (
  id                      bigint unsigned AUTO_INCREMENT,
  salon_id                bigint unsigned NOT NULL,
  category_id             bigint unsigned,
  name                    varchar(255) NOT NULL,
  duration_minutes        int NOT NULL,
  price                   decimal(10,2) NOT NULL,
  is_active               tinyint(1) DEFAULT 1,
  description             text,
  buffer_time_minutes     int DEFAULT 0,
  display_order           int DEFAULT 0,
  deleted_at              datetime,
  is_popular              tinyint(1) DEFAULT 0,
  offering_type           enum('physical','mobile','virtual','hybrid') DEFAULT 'hybrid', -- DEPRECATED
  mobile_price_override   decimal(10,2),     -- NULL = use base price
  virtual_price_override  decimal(10,2),     -- NULL = use base price
  -- Explicit capability flags (source of truth, replaces offering_type)
  can_physical            tinyint(1) NOT NULL DEFAULT 1,
  can_mobile              tinyint(1) NOT NULL DEFAULT 1,
  can_virtual             tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);

-- service_categories — Grouping for services (per-salon)
-- service_staff — Many-to-many: which staff can perform which service
-- products — Physical products for retail sale
-- product_categories — Product grouping
-- salon_categories — Business type categories (Hair, Nails, Spa, etc.)
```

### Financials

```sql
-- payments — One per booking (UNIQUE on booking_id)
CREATE TABLE payments (
  id                bigint unsigned AUTO_INCREMENT,
  booking_id        bigint unsigned NOT NULL,    -- UNIQUE
  amount            decimal(10,2) NOT NULL,
  method            enum('card','cash') NOT NULL,
  status            enum('pending','paid','refunded') DEFAULT 'pending',
  stripe_payment_id varchar(255),
  tip_amount        decimal(10,2) DEFAULT 0.00,
  refunded_amount   decimal(10,2) DEFAULT 0.00,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_booking (booking_id)
);

-- refunds — Refund records linked to payments
-- payouts — Salon payout batches
-- platform_fees — Platform fees (new_client acquisition, promo absorption)
-- global_discounts — Platform-wide promo codes (admin-managed)
-- discounts — Salon-specific discount codes
-- discount_services / discount_products — Discount targeting
-- gift_cards — Salon gift cards
-- packages / package_services / client_packages — Service bundles
```

### Marketing & Engagement

```sql
-- campaigns — Email/SMS marketing campaigns
-- reviews — Client reviews with owner replies
-- waitlist — Waitlist entries for specific services/dates
-- last_minute_slots — Discounted last-minute availability
-- notifications — All notification records (email, SMS, push)
```

### Platform & Config

```sql
-- salon_settings — Per-salon booking policies
-- salon_closures — Full-day closure dates
-- widget_settings — Booking widget appearance config
-- business_hours — Salon-level operating hours
-- salon_gallery / salon_photos — Image management
-- salon_amenities — Amenity tags
-- salon_clients — Client↔Salon relationship (PK: salon_id, client_id; uses is_active)
-- resources / resource_blocks — Room/equipment management
-- platform_settings — Global platform config key-value store
-- audit_logs — Immutable audit trail
-- support_tickets — Support ticket system
```

### Migration History

| Date | Migration | Description |
|------|-----------|-------------|
| 2026-03-01 | `20260301_add_soft_deletes.sql` | Added `deleted_at` to core tables |
| 2026-03-01 | `20260301_create_user_addresses.sql` | Created `user_addresses` table for mobile bookings |
| 2026-03-30 | `20260330_add_sub_times_to_booking_services.sql` | Added `start_datetime`/`end_datetime` to `booking_services` |
| 2026-04-08 | `20260408_create_salon_categories.sql` | Created `salon_categories` table |
| 2026-04-12 | `20260412_add_hybrid_fulfillment.sql` | Added fulfillment columns to `bookings` + `salons` |
| 2026-04-12 | `20260412_phase2_buffer_zips.sql` | Added `travel_buffer_time` + `covered_zip_codes` to salons |
| 2026-04-13 | `20260413_create_staff_invitations.sql` | Created `staff_invitations` table |
| 2026-04-14 | `20260414_add_message_to_staff_invitations.sql` | Added `message` column |
| 2026-04-20 | `20260420_add_staff_permissions.sql` | Added `permissions` JSON column to `staff` |
| 2026-04-22 | `20260422_add_mobile_base_address.sql` | Added `mobile_base_address` to salons |
| 2026-04-22 | `20260422_replace_service_offering_enum_with_flags.sql` | Added `can_physical/mobile/virtual` flags to services |
| 2026-04-22 | `20260422_fix_invalid_service_fulfillment_flags.sql` | Fixed all-false flag rows |
| 2026-04-22 | `20260422_hybrid_fulfillment_phase3.sql` | Staff capabilities, `booking_travel_fees`, price overrides |

---

## 6. Core Library (`/src/lib`)

### `auth.js` — Authentication & Session Management

```javascript
export async function hashPassword(password)          // bcrypt.hash(password, 12)
export async function verifyPassword(password, hash)  // bcrypt.compare
export async function createToken(payload, { expiresIn = "7d" })  // SignJWT HS256
export async function verifyToken(token)              // jwtVerify → payload | null
export async function getSession()                    // Bearer header → cookie fallback
export async function requireAuth()                   // getSession() or throw "Unauthorized"
export async function requireRole(allowedRoles)       // requireAuth() + role check
export async function verifyAuth(request)             // For route handlers (req object)
```

### `booking.js` — Booking Creation (1200 lines)

```javascript
export class BookingError extends Error { code, httpStatus }

export async function createSafeBooking({
  salonId, clientId, primaryStaffId, startDatetime, endDatetime,
  services: [{ serviceId, staffId?, price, duration, bufferTime? }],
  notes?, status?, source?, isMarketplaceEnabled?,
  discountCode?, giftCardCode?,
  fulfillmentType?, serviceLocationAddress?, serviceLat?, serviceLng?,
  clientTimezone?, virtualMeetingLink?
})
// Returns: { bookingId, totalPrice, totalDuration, isNewClient, discountAmount, ... }
// 
// CRITICAL STEPS:
//   1. Input validation + service fulfillment compatibility guard
//   1.5. "Anyone Available" smart staff assignment (load balancer)
//   2. Working hours check (pre-transaction, with travel buffer for mobile)
//   2b. Staff–service authorization (batch query)
//   3. SELECT ... FOR UPDATE conflict check (per-service windows)
//   3.5. In-transaction travel validation (mobile: bidirectional feasibility)
//   4. Staff time-off check (inside transaction)
//   5.5. Discounts & gift cards (locked read + atomic update)
//   6. INSERT booking + booking_services + travel fees + salon_clients upsert
//   7. Platform fee for marketplace new clients (20%)
```

### `checkout.js` — Financial Calculations

```javascript
export class CheckoutError extends Error { code, httpStatus }

export async function calculateBookingTotal(bookingId, conn)
// Total = SUM(services) + SUM(products) + SUM(travel_fees) - SUM(discounts) - SUM(gift_cards)
// NEVER trusts frontend math. All from DB aggregates.

export async function addProductToBooking(bookingId, productId, quantity, conn)
// Validates product, checks stock, inserts at DB price, decrements stock

export async function processCheckout(bookingId, { method, tipAmount, promoCode }, conn)
// 1. Lock booking FOR UPDATE → 2. Validate status='confirmed'
// 3. Calculate total from DB → 4. Handle global promo (negative platform_fee)
// 5. Insert payment → 6. Mark booking 'completed' → 7. Update salon_clients stats
```

### `client.js` — Client Deduplication

```javascript
export class ClientError extends Error { code, httpStatus }
export function normalizePhone(raw)  // Strip spaces, dashes, dots

export async function findOrCreateClient({
  phone, email, firstName, lastName, gender, dateOfBirth,
  address, city, postalCode, salonId, notes
})
// Returns: { userId, isNew, isNewToSalon }
// 
// Dedup: Phone-first SELECT FOR UPDATE → Email fallback FOR UPDATE
// → INSERT with ER_DUP_ENTRY recovery → salon_clients upsert
```

### `permissions.js` — Role-Based Permission Engine

```javascript
export const ROLE_RANK = { staff: 1, receptionist: 2, manager: 3, owner: 4 }
export function hasMinRole(currentRole, requiredRole)
export function resolvePermission(staffRole, customPermissions, key)  // Custom → role default
export function getDefaultPermissions(role)
export function getPermissionsByCategory()
export function getVisibleSidebarItems(navItems, staffRole, customPermissions)
export function getVisibleSettingsItems(settingsNav, staffRole, customPermissions)
export function canAccessPage(staffRole, pageName, customPermissions)
// + Feature helpers: canEditServices, canSeeAllBookings, canManageTeam, etc.
```

### `travel.js` — Mobile Travel Estimation

```javascript
export const ROAD_CORRECTION_FACTOR = 1.4
export const AVERAGE_SPEED_KMH = 30
export const SETUP_BUFFER_MINUTES = 10

export function calculateTravelTimeMinutes(fromLat, fromLng, toLat, toLng)
export function totalTimeRequired(fromLat, fromLng, toLat, toLng) // travel + setup
export function resolveOrigin(bookingLat, bookingLng, baseLat, baseLng) // Priority chain
export function checkBidirectionalTravel({ prev*, new*, next*, base* })
// Checks BOTH arrival (prev→new) and departure (new→next) feasibility
```

### Other Lib Files

| File | Purpose |
|------|---------|
| `db.js` | MySQL pool + `query()`, `getOne()`, `transaction()` helpers |
| `validate.js` | All Zod schemas (register, login, booking, salon, service, staff, etc.) |
| `geo.js` | `haversineDistanceKm()`, `geocodeAddress()` (Nominatim), `isValidCoordinatePair()` |
| `notifications.js` | `sendNotification()`, `sendContextualBookingConfirmation()` (physical/mobile/virtual templates) |
| `rate-limit.js` | In-memory `RateLimiter` class with presets (AUTH: 5/15min, API: 20/1min) |
| `security.js` | `sanitizeInput()`, `validatePasswordStrength()`, `generateCSRFToken()`, `maskSensitiveData()` |
| `response.js` | `success()`, `error()`, `created()`, `unauthorized()`, `forbidden()`, `notFound()`, `serverError()` |
| `format.js` | `formatCurrency(amount, currency='DZD')`, `formatDuration()`, `formatPercentage()` |
| `id.js` | `encodeId(num)` / `decodeId(str)` — URL-safe obfuscated IDs |
| `stripe.js` | Stripe client init (API version `2023-10-16`) |
| `email.js` | `sendEmail({ to, subject, html })` via Resend |
| `api-client.js` | Frontend `ApiClient` class — `get/post/put/patch/delete` with cookie auth |
| `utils.js` | `cn()` (clsx+twMerge), `generateSalonSlug()` |

---

## 7. API Routes Map (`/src/app/api`)

### Auth (Public)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account (client or owner) |
| `/api/auth/login` | POST | Login → JWT + HttpOnly cookie |
| `/api/auth/logout` | POST | Clear auth cookie |
| `/api/auth/me` | GET | Current user profile + staff context |
| `/api/auth/me/password` | PATCH | Change password |
| `/api/auth/check` | GET | Quick auth status check |
| `/api/auth/refresh` | POST | Refresh token |
| `/api/auth/verify-email` | POST | Email verification |
| `/api/auth/resend-verification` | POST | Resend verification email |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Reset with token |
| `/api/auth/upgrade` | POST | Upgrade client → owner |

### Bookings (Authenticated)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bookings` | GET/POST | List/create bookings |
| `/api/bookings/[id]` | GET/PATCH/DELETE | Booking CRUD |
| `/api/bookings/[id]/checkout` | POST | Process checkout |
| `/api/bookings/[id]/reschedule` | POST | Reschedule booking |
| `/api/bookings/[id]/confirm` | POST | Confirm pending booking |
| `/api/bookings/[id]/no-show` | POST | Mark as no-show |
| `/api/bookings/[id]/assign-staff` | POST | Reassign staff |
| `/api/bookings/[id]/products` | POST | Add product to booking |
| `/api/bookings/[id]/total` | GET | Get calculated total |

### Salons (Authenticated)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/salons` | GET/POST | List/create salons |
| `/api/salons/[id]` | GET/PUT/DELETE | Salon CRUD |
| `/api/salons/[id]/staff` | GET/POST | Staff management |
| `/api/salons/[id]/staff/[staffId]` | GET/PUT/DELETE | Individual staff |
| `/api/salons/[id]/staff/invite` | POST | Send staff invitation |
| `/api/salons/[id]/services` | GET/POST | Service management |
| `/api/salons/[id]/clients` | GET/POST | Client management |
| `/api/salons/[id]/calendar` | GET | Calendar data |
| `/api/salons/[id]/dashboard` | GET | Dashboard stats |
| `/api/salons/[id]/settings` | GET/PUT | Salon settings |
| `/api/salons/[id]/widget` | GET/PUT | Widget settings |
| `/api/salons/[id]/reviews` | GET | Salon reviews |
| `/api/salons/[id]/closures` | GET/POST | Closure management |
| ... | ... | + discounts, gift-cards, packages, products, etc. |

### Widget (Public — per-salon)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/widget/[salonId]` | GET | Widget config + salon info |
| `/api/widget/[salonId]/services` | GET | Available services (filtered by fulfillment) |
| `/api/widget/[salonId]/staff` | GET | Available staff |
| `/api/widget/[salonId]/availability` | GET | Time slot availability |
| `/api/widget/[salonId]/book` | POST | Create booking (uses createSafeBooking) |

### Marketplace (Public)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/marketplace/salons` | GET | Search salons (geo, category, filters) |
| `/api/marketplace/salons/[id]` | GET | Salon public profile |
| `/api/marketplace/salons/[id]/services` | GET | Public service list |
| `/api/marketplace/salons/[id]/staff` | GET | Public staff list |
| `/api/marketplace/salons/[id]/reviews` | GET | Public reviews |
| `/api/marketplace/cities` | GET | Cities with salons |

### Admin (Admin-only)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/salons` | GET | All salons |
| `/api/admin/users` | GET | All users |
| `/api/admin/bookings` | GET | All bookings |
| `/api/admin/fees` | GET | Platform fees |
| `/api/admin/payouts` | GET/POST | Payout management |
| `/api/admin/impersonate` | POST | Start impersonation |
| `/api/admin/impersonate/stop` | POST | Stop impersonation |
| `/api/admin/global-discounts` | GET/POST | Platform promo codes |
| `/api/admin/analytics/*` | GET | GMV, churn, engagement |
| `/api/admin/reviews` | GET | Review moderation |
| `/api/admin/tickets` | GET | Support tickets |

---

## 8. Frontend Pages Map

### Auth
| Route | Purpose |
|-------|---------|
| `/login` | Login page |
| `/register` | Registration page |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset with token |
| `/verify-email` | Email verification |
| `/auth/choose` | Auth method selection |

### Marketplace
| Route | Purpose |
|-------|---------|
| `/` | Landing page with search |
| `/salons` | Salon search results |
| `/[category]/[city]` | Category + city filtered search |
| `/salon/[slug]` | Salon public profile |
| `/book/[salonId]` | Booking widget (standalone) |
| `/bookings` | Client's booking history |
| `/profile` | Client profile |
| `/contact`, `/help`, `/privacy`, `/terms` | Static pages |

### Salon Dashboard (`/dashboard/salon/[salonId]/`)
| Route | Purpose |
|-------|---------|
| `.../` (root) | Dashboard overview (stats, charts) |
| `.../calendar` | FullCalendar staff calendar |
| `.../bookings` | Booking list + management |
| `.../clients` | Client database + CRM |
| `.../services` | Service catalog management |
| `.../team` | Staff list |
| `.../team/[staffId]` | Staff detail (tabs: personal, schedule, services, permissions, etc.) |
| `.../products` | Product inventory |
| `.../sales` | Payment history |
| `.../reviews` | Review management |
| `.../support` | Support tickets |
| `.../checkout/[bookingId]` | Checkout flow |
| `.../marketing/*` | Campaigns, discounts, gift cards, packages, waitlist |
| `.../reports/*` | Revenue, bookings, staff, client reports |
| `.../settings/*` | General, hours, policies, notifications, widget, marketplace, account, billing, reviews |

### Admin Dashboard (`/dashboard/admin/`)
| Route | Purpose |
|-------|---------|
| `.../` | Admin overview |
| `.../salons` | Salon management |
| `.../users` | User management |
| `.../bookings` | Booking oversight |
| `.../fees` | Platform fee management |
| `.../payouts` | Payout processing |
| `.../marketing` | Global discounts |
| `.../reviews` | Review moderation |
| `.../analytics` | Platform analytics |
| `.../settings` | Platform settings |
| `.../support` | Support tickets |
| `.../audit-logs` | Audit trail |

---

## 9. Components & Hooks

### TanStack Query Hooks (`/src/hooks/`)
| Hook | What it manages |
|------|----------------|
| `use-bookings.js` | Booking CRUD, reschedule, confirm, cancel |
| `use-clients.js` | Client list, create, update, delete |
| `use-services.js` | Service CRUD + category management |
| `use-staff.js` | Staff CRUD, working hours, time-off |
| `use-settings.js` | Salon settings, widget settings, business hours |
| `use-products.js` | Product CRUD + stock management |
| `use-payments.js` | Payment history, refunds |
| `use-reports.js` | Revenue, booking, staff, client reports |
| `use-campaigns.js` | Marketing campaign CRUD + send |
| `use-discounts.js` | Discount code CRUD + validation |
| `use-gift-cards.js` | Gift card CRUD |
| `use-packages.js` | Package CRUD + purchase |
| `use-waitlist.js` | Waitlist management |
| `use-reviews.js` | Review management |
| `use-my-profile.js` | Client's own profile + bookings |
| `use-marketplace.js` | Marketplace search |
| `use-notifications.js` | Notification bell |
| `use-support.js` | Support ticket management |
| `use-salon-closures.js` | Closure date management |
| `use-debounce.js` | Debounce utility hook |
| `use-toast.js` | Toast notification hook |

### Key Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `booking-widget/*` | `/components/booking-widget/` | 7-step booking flow (fulfillment → service → staff → datetime → details → auth → confirmation) |
| `sidebar.jsx` | `/components/layout/` | Dashboard navigation (permission-filtered) |
| `header.jsx` | `/components/layout/` | Dashboard header with search + notifications |
| `require-permission.jsx` | `/components/layout/` | Permission guard wrapper |
| `onboarding-wizard.jsx` | `/components/onboarding/` | Multi-step salon creation wizard |
| `command-palette.jsx` | `/components/` | Cmd+K global command palette |
| `ImpersonationBanner.jsx` | `/components/` | Admin impersonation indicator |
| `EmailVerificationBanner.jsx` | `/components/` | Unverified email warning |

---

## 10. Golden Rules (Strict Business Logic)

> [!CAUTION]
> These rules are **non-negotiable**. Violating any of them can cause data corruption, financial inconsistency, or security breaches. Read every rule before writing any code.

### A. Required Entry Points

| Operation | Required Entry Point | Location | Bypass Consequence |
|-----------|---------------------|----------|-------------------|
| Create a booking | `createSafeBooking()` | `/lib/booking.js` | Double-bookings, no conflict detection |
| Create/find a client | `findOrCreateClient()` | `/lib/client.js` | Phantom duplicate users |
| Calculate totals | `calculateBookingTotal()` | `/lib/checkout.js` | Financial discrepancies |
| Process checkout | `processCheckout()` | `/lib/checkout.js` | Missing payments, wrong totals |

### B. Soft Delete Rules

```sql
-- ✅ CORRECT: Standard entities
SELECT * FROM users WHERE deleted_at IS NULL;
SELECT * FROM bookings WHERE deleted_at IS NULL AND status IN ('pending','confirmed');
SELECT * FROM services WHERE deleted_at IS NULL AND is_active = 1;
SELECT * FROM products WHERE deleted_at IS NULL;

-- ✅ CORRECT: Relationship tables (salon_clients)
SELECT * FROM salon_clients WHERE is_active = 1;

-- ❌ FORBIDDEN: Never use DELETE FROM on core tables
DELETE FROM users WHERE id = ?;     -- NEVER
DELETE FROM bookings WHERE id = ?;  -- NEVER
DELETE FROM services WHERE id = ?;  -- NEVER

-- ⚠️ CRITICAL: users.role ENUM constraint
UPDATE users SET role = 'deleted' WHERE id = ?;  -- THIS WILL CRASH (not in ENUM)
-- Instead: UPDATE users SET deleted_at = NOW() WHERE id = ?;
```

### C. Booking Concurrency — SELECT ... FOR UPDATE

```javascript
// INSIDE a transaction — locks staff rows to prevent race conditions:
await conn.execute(
  `SELECT id FROM staff WHERE id IN (?) FOR UPDATE`,
  [staffIds]
);

// Then check for conflicts per-service window:
const [conflicts] = await conn.execute(
  `SELECT b.id FROM bookings b
   JOIN booking_services bs ON bs.booking_id = b.id
   WHERE b.status IN ('pending','confirmed') AND b.deleted_at IS NULL
     AND bs.start_datetime < ? AND bs.end_datetime > ?
     AND COALESCE(bs.staff_id, b.staff_id) = ?
   FOR UPDATE`,
  [winEndFmt, winStartFmt, staffId]
);
```

### D. Financial Integrity Rules

- **Never trust frontend math.** All totals calculated server-side from DB aggregates.
- **Checkout formula:** `SUM(services) + SUM(products) + SUM(travel_fees) - SUM(discounts) - SUM(gift_cards)`
- **Global promo codes** absorb salon costs by injecting **negative values** into `platform_fees` during checkout.
- **Live money movement** (Stripe payouts, refunds) must write to `audit_logs` with `user_id`, `action`, `entity_id`, `new_data`.
- **Travel fees** are computed inside the transaction from `salons.travel_fee_type/amount`, never from the frontend payload.
- **Platform new-client fee** = 20% of service total for first-time marketplace clients.

### E. Client Deduplication Rules

1. **Phone-first:** `SELECT ... FOR UPDATE` on `users WHERE phone = ?` — serializes concurrent requests.
2. **Email fallback:** Same `FOR UPDATE` when no phone match found.
3. **ER_DUP_ENTRY recovery:** If INSERT hits `uq_users_email`, re-fetch the winning row. No duplicates ever created.
4. **salon_clients:** Upserted via `ON DUPLICATE KEY UPDATE` in the same transaction. PK `(salon_id, client_id)` makes duplicates structurally impossible.

### F. Hybrid Fulfillment Invariants

- **Service compatibility:** Every service in a booking must support the requested `fulfillmentType` (checked via `can_physical/can_mobile/can_virtual` flags).
- **Staff capability:** Staff must have matching `can_physical/can_mobile/can_virtual` flags for their assigned fulfillment type.
- **Travel validation is bidirectional:** Both arrival (prev booking → new) AND departure (new → next booking) must be feasible.
- **Travel time formula:** `haversine_distance × 1.4 (road correction) / 30 km/h + 10 min setup buffer`.
- **Mobile bookings:** Must include `service_lat/lng` for travel calculations and `service_location_address` for the confirmation email.
- **Price overrides:** `services.mobile_price_override` / `virtual_price_override` take precedence over base price when non-NULL.
- **`offering_type` is DEPRECATED.** Code reads/writes `can_*` flags as the source of truth.

---

## 11. Permission System

Fresh uses a **custom role-based permission engine** with JSON-level per-staff overrides. There is no third-party RBAC library.

### How It Works

1. **Role defaults** are defined in `/lib/permissions.js` as a static map keyed by `staff.role` ('staff', 'receptionist', 'manager', 'owner').
2. **Custom overrides** are stored in `staff.permissions` (JSON column). When non-NULL, specific keys override role defaults.
3. **Resolution order:** `customPermissions[key]` → `roleDefaults[role][key]` → `false`.
4. **Owners always have full access** — they bypass the permission check entirely.

### Permission Categories

| Category | Keys | Default: Staff | Default: Manager |
|----------|------|---------------|------------------|
| Calendar | `calendar.view`, `calendar.manage` | ✅/❌ | ✅/✅ |
| Bookings | `bookings.view`, `bookings.create`, `bookings.edit`, `bookings.cancel` | own only | ✅ all |
| Clients | `clients.view`, `clients.manage` | ❌ | ✅ |
| Services | `services.view`, `services.manage` | ✅/❌ | ✅/✅ |
| Products | `products.view`, `products.manage` | ❌ | ✅ |
| Team | `team.view`, `team.manage` | ❌ | ✅ |
| Reports | `reports.view` | ❌ | ✅ |
| Marketing | `marketing.view`, `marketing.manage` | ❌ | ✅ |
| Settings | `settings.view`, `settings.manage` | ❌ | ✅ |
| Sales | `sales.view`, `sales.manage` | ❌ | ✅ |

### Frontend Enforcement

```jsx
// Sidebar items are filtered by permission:
const visibleItems = getVisibleSidebarItems(navItems, staffRole, permissions);

// Page-level guard:
<RequirePermission permission="clients.manage">
  <ClientForm />
</RequirePermission>
```

---

## 12. Authentication Flow

### Token Lifecycle

```
1. POST /api/auth/login
   → Verify password (bcrypt.compare)
   → Generate JWT (jose.SignJWT, HS256, 7-day expiry, 32-char+ secret)
   → Set HttpOnly cookie ("fresh_token") + return token in body

2. Every API request:
   → getSession() checks Authorization: Bearer header first
   → Falls back to cookies.get("fresh_token")
   → Verifies with jose.jwtVerify()
   → Returns { userId, role, email, salonId?, staffId? }

3. POST /api/auth/logout
   → Clears "fresh_token" cookie
```

### JWT Payload Fields

```javascript
{
  userId: Number,       // users.id
  role: String,         // 'client' | 'owner' | 'staff' | 'admin'
  email: String,        // users.email
  salonId?: Number,     // Active salon context (for owner/staff)
  staffId?: Number,     // staff.id (for staff/manager)
  // Impersonation fields:
  originalUserId?: Number,  // Real admin's user ID
  originalRole?: String,    // 'admin'
  isImpersonating?: Boolean
}
```

### Frontend Auth Flow

```
AuthProvider (React Context) → calls /api/auth/me on mount
  → Stores { user, staff, salon } in context
  → Exposes login(), logout(), switchSalon()
  → ApiClient sends credentials: "include" (HttpOnly cookies)
  → 401 responses redirect to /login
```

---

## 13. Database Connection & Query Patterns

### Connection Pool (`/lib/db.js`)

```javascript
const pool = mysql.createPool({
  uri: process.env.MYSQL_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;  // pool.query(sql, params) or pool.execute(sql, params)

// Convenience helpers:
export async function query(sql, params)       // pool.execute → rows
export async function getOne(sql, params)      // pool.execute → rows[0] || null
export async function transaction(callback)    // conn.beginTransaction → callback(conn) → commit/rollback
```

### Standard Query Patterns

```javascript
// READ — Always filter soft deletes:
const [rows] = await pool.execute(
  `SELECT * FROM services WHERE salon_id = ? AND deleted_at IS NULL AND is_active = 1`,
  [salonId]
);

// WRITE — Using transaction helper:
const result = await transaction(async (conn) => {
  const [rows] = await conn.execute(
    `SELECT id FROM staff WHERE id = ? FOR UPDATE`,
    [staffId]
  );
  // ... do work ...
  return result;
});  // Auto-commits on success, auto-rollbacks on throw
```

### API Response Pattern

```javascript
import { success, error, notFound } from '@/lib/response';
import { verifyAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  const session = await verifyAuth(request);
  if (!session) return error('Unauthorized', 401);

  const data = await getOne('SELECT ...', [params.id]);
  if (!data) return notFound('Resource not found');

  return success(data);
}
```

---

## 14. Security Configuration

### Next.js Security Headers (`next.config.mjs`)

```javascript
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
```

### Application Security

| Layer | Implementation |
|-------|---------------|
| Password hashing | bcrypt with cost factor **12** |
| JWT signing | HS256 via `jose`, 32-char minimum secret |
| Cookie auth | HttpOnly, Secure, SameSite=Lax |
| Rate limiting | In-memory sliding window (AUTH: 5 req/15min, API: 20 req/1min) |
| Input sanitization | `sanitizeInput()` strips HTML/script tags |
| Password validation | Min 8 chars, upper + lower + number + special required |
| CSRF protection | Token-based via `generateCSRFToken()` |
| Sensitive data | `maskSensitiveData()` for logging |

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `MYSQL_URL` | ✅ | MySQL connection string |
| `JWT_SECRET` | ✅ | JWT signing secret (≥32 chars) |
| `STRIPE_SECRET_KEY` | ✅ | Stripe payments |
| `STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe frontend |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook verification |
| `NEXT_PUBLIC_APP_URL` | ✅ | Application base URL |
| `RESEND_API_KEY` | ⚠️ | Email delivery (dev skips if missing) |
| `FROM_EMAIL` | ⚠️ | Email sender identity |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ⚠️ | Google Maps for address autocomplete |

---

## 15. Git History & Recent Changes

### Current State
- **Branch:** `devalop`
- **HEAD:** `3a6ed66`

### Major Recent Work

1. **Dashboard UI Redesign** — Complete visual overhaul of all salon dashboard pages (bookings, clients, services, products, sales, reports, reviews, settings, support, team). 30 files changed, ~9,000 lines modified.
2. **Hybrid Fulfillment System** — Full implementation of physical/mobile/virtual service delivery:
   - Salon-level capability flags (`is_physical`, `is_mobile`, `is_virtual`)
   - Service-level capability flags (`can_physical`, `can_mobile`, `can_virtual`)
   - Staff-level capability flags + travel radius + home coordinates
   - Travel fee computation (fixed or per-km) inside booking transaction
   - Bidirectional travel feasibility validation
   - Booking-level fulfillment metadata (location, timezone, meeting link)
3. **Permission Engine** — Custom JSON permission overrides per staff member, integrated into sidebar navigation and page guards.
4. **Staff Invitations** — Token-based invitation flow for adding staff to salons.
5. **User Addresses** — Saved address management for mobile booking convenience.

---

## 16. Known Issues & Limitations

| Issue | Severity | Details |
|-------|----------|---------|
| In-memory rate limiting | ⚠️ Medium | Uses `Map()` — clears on server restart. Not suitable for horizontal scaling. Replace with Redis/Upstash for production. |
| `users.role` ENUM gap | ⚠️ Medium | ENUM is `('client','owner','staff','admin')` — no `'deleted'` value. Any legacy code attempting `role='deleted'` will crash in MySQL strict mode. Use `deleted_at` instead. |
| `offering_type` column | 🔵 Low | Deprecated but still present in `services` table. Code uses `can_*` flags as source of truth. Can be removed in a future migration. |
| Geocode caching | 🔵 Low | In-memory `Map()` in `geo.js` — same concern as rate limiter, clears on restart. |
| `salon_closures` FK type mismatch | 🔵 Low | Uses `int unsigned` for `salon_id` while `salons.id` is `bigint unsigned`. Works in practice but could cause issues with very large IDs. |

---

## 17. Roadmap & Next Tasks

| Priority | Task | Context |
|----------|------|---------|
| 🔴 P0 | Production deployment checklist | Verify all env vars, security headers, rate limit infra |
| 🔴 P0 | Redis-backed rate limiting | Replace in-memory `Map()` with `@upstash/ratelimit` or similar |
| 🟡 P1 | SMS notification support | Extend `notifications.js` for active SMS delivery (currently email-only) |
| 🟡 P1 | Stripe Connect onboarding | Full salon Stripe account onboarding flow |
| 🟡 P1 | Multi-location management | Location overview, service copy, staff transfer (APIs exist, UI partially built) |
| 🟢 P2 | Remove `offering_type` column | Migration to drop deprecated ENUM after verifying no code references |
| 🟢 P2 | ICS calendar export improvements | Better compatibility with specific calendar clients |
| 🟢 P2 | Webhook SMS status tracking | `/api/webhooks/sms/route.js` exists but needs provider integration |

---

*Generated by deep codebase analysis on 2026-04-30. Source files: 42 database tables, ~165 API routes, ~100 components, 20 lib modules, 13 migrations.*
