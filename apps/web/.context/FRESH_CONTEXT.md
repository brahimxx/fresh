# Fresh Platform — Complete Project Context

> Last updated: 2026-04-22 (Hybrid Fulfillment service-flag model integrated) | Branch: devalop (HEAD unpushed)

---

## Table of Contents

1. [What is Fresh?](#1-what-is-fresh)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Directory Structure](#3-project-directory-structure)
4. [The 5 User Roles](#4-the-5-user-roles)
5. [Database Schema — All 40 Tables](#5-database-schema--all-40-tables)
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

Fresh is a **multi-tenant SaaS operating system** for salons (like Fresha/Treatwell) and a **consumer-facing marketplace** for booking services. It has three distinct surfaces:

| Surface                    | URL Pattern                    | Audience                           |
| -------------------------- | ------------------------------ | ---------------------------------- |
| **Dashboard (Backoffice)** | `/dashboard/salon/[salonId]/*` | Owners, Managers, Staff            |
| **Booking Widget**         | `/book/[salonId]`              | Clients — embeddable 4-step wizard |
| **Marketplace**            | `/` `/salons` `/salon/[id]`    | Clients — public discovery         |

The platform supports **hybrid fulfillment**: a salon can operate physically (in-person), as mobile (travelling to the client), and/or virtually (video call). Each is configured independently at both the salon level and per-service level.

---

## 2. Tech Stack & Dependencies

### Core

| Layer          | Technology                   | Version    |
| -------------- | ---------------------------- | ---------- |
| Framework      | Next.js App Router           | 16.1.1     |
| Runtime        | React                        | 19.2.3     |
| Styling        | Tailwind CSS                 | 4.x        |
| UI Components  | shadcn/ui (Radix primitives) | Various    |
| Data Fetching  | TanStack Query (React Query) | v5.x       |
| Forms          | React Hook Form + Zod        | 7.x / 4.x  |
| Database       | MySQL (raw queries)          | mysql2 3.x |
| Auth           | JWT via `jose` + bcryptjs    | 6.x / 3.x  |
| Email          | Resend                       | 6.x        |
| Payments       | Stripe                       | 20.x       |
| Calendar       | FullCalendar                 | 6.x        |
| Charts         | Recharts                     | 3.x        |
| Animations     | Framer Motion                | 12.x       |
| Icons          | Lucide React                 | 0.562.x    |
| Maps           | @react-google-maps/api       | 2.x        |
| Date utilities | date-fns                     | 4.x        |
| Toasts         | Sonner                       | 2.x        |

### State Management Strategy

- **Server State:** TanStack Query (auto-caching, background refetch, invalidation)
- **Form State:** React Hook Form + Zod schemas
- **Client State:** URL params (search/filters) or `useState`. **No Redux/Zustand.**

---

## 3. Project Directory Structure

```
apps/web/
├── .context/                       ← YOU ARE HERE
├── .agent/
│   ├── rules/
│   │   ├── project-brief.md        ← Agent rules & architecture constraints
│   │   └── project-guidelines.md  ← Golden rules & execution checklist
│   └── skills/                    ← Agent skill packs
├── database/
│   ├── fresh_structure.sql        ← AUTHORITATIVE schema dump (2026-04-21)
│   ├── fresh.sql                  ← Full dump with seed data
│   └── migrations/                ← Versioned ALTER TABLE scripts (see §15)
├── docs/
│   ├── FRESH_DOCUMENTATION.md     ← Master documentation (Feb 2026)
│   └── archive/
│       └── PHASE_1.md … PHASE_13.md  ← Historical build logs
├── notebooklm/
│   ├── Project_Structure.md       ← Full file tree + directory responsibilities
│   ├── Admin_Dashboard_Spec.md    ← Admin panel feature spec
│   └── Core_Logic_Review.md       ← Core lib annotated review with code snippets
├── src/
│   ├── app/
│   │   ├── (auth)/                ← Login, Register, Forgot/Reset Password
│   │   ├── (marketplace)/         ← Public: Home, /salons, /salon/[id], /bookings
│   │   │                            Legal pages: /contact, /help, /privacy, /terms
│   │   ├── api/                   ← All REST API route handlers (see §7)
│   │   ├── auth/choose/           ← Role-selection after OAuth (client vs owner)
│   │   ├── book/[salonId]/        ← Embeddable widget page
│   │   ├── dashboard/
│   │   │   ├── page.js            ← Owner hub (salon switcher, multi-salon)
│   │   │   ├── layout.js          ← Root dashboard layout (spacing, sidebar)
│   │   │   ├── admin/             ← Platform admin pages
│   │   │   ├── locations/new/     ← Create new salon location
│   │   │   ├── salon/support/     ← Salon-level support tickets
│   │   │   └── salon/[salonId]/   ← Per-salon backoffice modules (see §8)
│   │   ├── invite/                ← Staff invitation acceptance flow
│   │   ├── onboarding/            ← New salon onboarding wizard
│   │   └── verify-email/          ← Email verification landing
│   │
│   ├── components/
│   │   ├── booking-widget/        ← Widget steps: service, staff, datetime, auth, confirm
│   │   ├── bookings/              ← booking-detail.jsx, booking-form.jsx
│   │   ├── calendar/              ← calendar-view.jsx, event-quick-actions.jsx
│   │   ├── checkout/              ← add-product-dialog.jsx, payment-success.jsx
│   │   ├── clients/               ← client-form.jsx, client-booking-history.jsx
│   │   ├── marketing/             ← campaign, discount, gift-card, package forms
│   │   ├── onboarding/            ← onboarding-wizard.jsx
│   │   ├── products/              ← product-form.jsx, stock-update.jsx
│   │   ├── sales/                 ← payment-detail.jsx, refund-dialog.jsx
│   │   ├── services/              ← service-form.jsx, category-form.jsx
│   │   ├── staff/                 ← Full staff profile tabs (12 components)
│   │   ├── layout/                ← header.jsx, sidebar.jsx, notification-popover.jsx
│   │   ├── ui/                    ← 40+ shadcn/ui primitives (button, dialog, tabs…)
│   │   ├── ImpersonationBanner.jsx
│   │   ├── EmailVerificationBanner.jsx
│   │   └── command-palette.jsx
│   │
│   ├── hooks/                     ← 21 TanStack Query hooks (see §9)
│   ├── lib/                       ← Core business logic (see §6)
│   ├── providers/                 ← auth-provider, query-provider, salon-provider,
│   │                                theme-provider, toast-provider
│   ├── styles/
│   │   └── calendar.css           ← FullCalendar style overrides
│   └── middleware.js              ← Next.js middleware (route protection)
│
├── next.config.mjs                ← Security headers, image domains, bundle opts
├── package.json                   ← Dependencies manifest
└── run_migration.js               ← Helper to run SQL migrations
```

---

## 4. The 5 User Roles

### Role → Database Mapping (Critical Distinction)

| Role             | Global `users.role` | Salon-level `staff.role` | Access                                                                |
| ---------------- | ------------------- | ------------------------ | --------------------------------------------------------------------- |
| **Admin**        | `'admin'`           | N/A                      | All salons, bypasses all ownership checks                             |
| **Owner**        | `'owner'`           | `'owner'`                | Full dashboard for their salons (`salons.owner_id = users.id`)        |
| **Manager**      | `'staff'` (global)  | `'manager'`              | Dashboard reports, all clients, settings (except billing/danger zone) |
| **Receptionist** | `'staff'` (global)  | `'receptionist'`         | Calendar, bookings, clients — NOT financials                          |
| **Staff**        | `'staff'` (global)  | `'staff'`                | Own calendar and assigned clients only                                |
| **Client**       | `'client'`          | N/A                      | Widget + marketplace booking                                          |

> ⚠️ **CRITICAL:** "Manager" is NOT in `users.role` ENUM. It is exclusively `staff.role`. Never check `users.role = 'manager'`.

### Admin Fast-Return Pattern

```javascript
// Used throughout API routes
if (session.role === "admin") return true; // bypasses ownership checks
```

### Staff Role Hierarchy (for `lib/permissions.js`)

```
staff (rank 1) → receptionist (rank 2) → manager (rank 3) → owner (rank 4)
```

---

## 5. Database Schema — All 40 Tables

### Soft Delete Rules

| Table            | Soft Delete Method                            |
| ---------------- | --------------------------------------------- |
| `users`          | `deleted_at` datetime (IS NULL = active)      |
| `salons`         | `deleted_at` + `deleted_by`                   |
| `bookings`       | `deleted_at`                                  |
| `services`       | `deleted_at`                                  |
| `products`       | `deleted_at`                                  |
| `discounts`      | `deleted_at`                                  |
| `reviews`        | `deleted_at`                                  |
| `user_addresses` | `deleted_at`                                  |
| `salon_clients`  | `is_active` tinyint(1) — **NOT `deleted_at`** |
| All other tables | No soft delete — permanent or use `is_active` |

> ⚠️ Never use `DELETE FROM` unless explicitly for cleanup scripts.

---

### Core Identity & Tenancy

#### `users`

```sql
id, email (UNIQUE), phone, password_hash,
first_name, last_name, role ENUM('client','owner','staff','admin'),
gender, date_of_birth, address, city, postal_code, country,
email_verified, avatar_url, last_login_at,
reset_token, reset_token_expires,
created_at, updated_at, deleted_at
-- Indexes: uq_users_email, idx_users_phone, idx_users_first_name,
--          idx_users_last_name, idx_users_role, idx_users_deleted_at
```

#### `salons`

```sql
id, owner_id → users.id, name, description, phone, email,
address, city, state, postal_code, country, latitude, longitude,
is_marketplace_enabled, is_active, status varchar(20),
plan_tier ENUM('basic','pro','enterprise'),
currency varchar(3) DEFAULT 'EUR', timezone DEFAULT 'Europe/Paris',
logo_url, cover_image_url, website, price_level,
stripe_account_id,
-- Hybrid fulfillment:
is_physical, is_mobile, is_virtual,
travel_radius, travel_fee_type ENUM('fixed','per_km','none'), travel_fee_amount,
min_booking_amount, virtual_meeting_link, covered_zip_codes, travel_buffer_time,
-- Soft delete:
deleted_at, deleted_by → users.id,
created_at
```

#### `salon_clients` (relationship table — uses is_active, NOT deleted_at)

```sql
(salon_id, client_id) PRIMARY KEY,
first_visit_date, last_visit_date, total_visits,
is_active tinyint(1) DEFAULT 1,
notes text,  -- salon-specific notes, NOT in users table
updated_at
-- Key: ON DUPLICATE KEY UPDATE is_active=1 for returning clients
```

#### `user_addresses`

```sql
id, user_id, label, icon_name (Lucide), full_address, lat, lng,
is_default, created_at, updated_at, deleted_at
```

---

### Bookings & Scheduling

#### `bookings`

```sql
id, salon_id, client_id, staff_id (primary staff),
start_datetime, end_datetime,
status ENUM('pending','confirmed','completed','cancelled','no_show'),
source ENUM('marketplace','direct'),
notes, internal_notes,
cancelled_at, cancelled_by, cancellation_reason,
-- Hybrid fulfillment:
fulfillment_type ENUM('physical','mobile','virtual'),
service_location_address, service_lat, service_lng,
client_timezone, virtual_meeting_link,
-- Travel fee snapshot (← ADDED 2026-04-21 — avoids JOIN for reporting):
travel_fee_amount decimal(10,2) NOT NULL DEFAULT 0.00,
travel_distance_km decimal(8,2) DEFAULT NULL,
deleted_at, created_at
-- Index: idx_bookings_fulfillment (fulfillment_type)
```

#### `booking_travel_fees` (← NEW TABLE 2026-04-21)

```sql
id bigint unsigned AUTO_INCREMENT,
booking_id bigint unsigned NOT NULL,  -- FK: bookings.id ON DELETE CASCADE
fee_type ENUM('fixed','per_km') DEFAULT 'fixed',
distance_km decimal(8,2) DEFAULT NULL,  -- populated for per_km type
amount decimal(10,2) NOT NULL DEFAULT 0.00,
created_at datetime
-- UNIQUE: uq_booking_travel_fee (booking_id) — one fee row per booking
-- Populated by createSafeBooking() INSIDE the transaction — never by frontend
-- Consumed by calculateBookingTotal() to build the authoritative total
```

#### `booking_services` (per-service staff assignment — KEY TABLE)

```sql
(booking_id, service_id) PRIMARY KEY,
staff_id → staff.id,   -- individual staff per service
start_datetime, end_datetime, price, duration_minutes
-- This is how multi-service bookings with different staff work
```

#### `booking_products`

```sql
id, booking_id, product_id, quantity, unit_price, total_price, created_at
```

#### `booking_discounts`

```sql
id, booking_id, discount_id, discount_code, discount_type, discount_value, amount_saved, created_at
```

#### `booking_gift_cards`

```sql
id, booking_id, gift_card_id, amount_used, created_at
```

#### `booking_resources`

```sql
id, (booking_id, resource_id) UNIQUE, created_at
```

#### `last_minute_slots`

```sql
id, salon_id, service_id, staff_id,
start_time, end_time, original_price, discounted_price, discount_percent,
is_booked, expires_at, created_at
```

#### `waitlist`

```sql
id, salon_id, client_id, service_id, staff_id,
preferred_date, preferred_time_start, preferred_time_end,
status ENUM('pending','notified','booked','expired','cancelled'),
notified_at, notes, created_at
```

#### `salon_closures`

```sql
id, salon_id, date DATE (full-day closure), reason, created_at
-- UNIQUE KEY: (salon_id, date)
```

#### `business_hours`

```sql
id, salon_id, day_of_week (0=Sun, 6=Sat),
open_time, close_time, is_closed
-- UNIQUE KEY: (salon_id, day_of_week)
```

#### `salon_settings`

```sql
salon_id (PK),
cancellation_policy_hours, no_show_fee,
deposit_required, deposit_percentage,
working_hours_start, working_hours_end,
online_booking_enabled, booking_advance_min_hours, booking_advance_max_days,
auto_confirm_bookings, send_reminders, reminder_hours_before
```

---

### Staff & HR

#### `staff`

```sql
id, salon_id, user_id,
first_name, last_name,
role ENUM('staff','manager','owner','receptionist'),
is_active, is_visible,
bio, avatar_url, color varchar(7) DEFAULT '#3B82F6',
display_order, title, phone_secondary,
country, birthday, start_date, end_date,
employment_type ENUM('employee','self_employed'),
notes,
permissions JSON DEFAULT NULL,  -- ← ADDED 2026-04-20: custom permission overrides
-- Hybrid fulfillment capability flags (← ADDED 2026-04-21):
can_physical tinyint(1) NOT NULL DEFAULT 1,  -- 1=default: all existing staff unaffected
can_mobile   tinyint(1) NOT NULL DEFAULT 0,  -- opt-in: set 1 for mobile-capable staff
can_virtual  tinyint(1) NOT NULL DEFAULT 0,  -- opt-in: set 1 for virtual-capable staff
travel_radius int DEFAULT NULL,              -- km override (NULL = use salon default)
home_lat decimal(10,7) DEFAULT NULL,
home_lng decimal(10,7) DEFAULT NULL,
created_at, updated_at
-- UNIQUE: (salon_id, user_id)
```

#### `staff_working_hours`

```sql
id, staff_id, day_of_week,
start_time, end_time
-- UNIQUE: (staff_id, day_of_week, start_time, end_time)
```

#### `staff_time_off`

```sql
id, staff_id, start_datetime, end_datetime, reason
```

#### `staff_timesheets`

```sql
id, staff_id, salon_id,
clock_in, clock_out, break_duration, total_hours,
status ENUM('clocked_in','clocked_out','approved','disputed'),
approved_by, approved_at, notes, created_at, updated_at
```

#### `staff_commissions`

```sql
id, staff_id,
commission_type ENUM('percentage','fixed'),
service_commission, product_commission, tip_commission,
effective_from, effective_to, created_at
```

#### `staff_wages`

```sql
id, staff_id,
wage_type ENUM('hourly','salary','commission_only'),
hourly_rate, salary_amount,
salary_period ENUM('weekly','biweekly','monthly','annual'),
currency, effective_from, effective_to, notes
```

#### `staff_pay_runs`

```sql
id, salon_id,
pay_period_start, pay_period_end, pay_date,
status ENUM('draft','processing','completed','cancelled'),
total_amount, currency, notes, created_by, created_at, updated_at
```

#### `staff_pay_run_items`

```sql
id, pay_run_id, staff_id,
base_pay, commission_amount, bonus_amount, tips_amount,
deductions_amount, total_pay, hours_worked, notes
```

#### `staff_addresses`

```sql
id, staff_id,
address_type ENUM('home','work','other'),
street_address, city, state, postal_code, country,
is_primary, created_at, updated_at
```

#### `staff_emergency_contacts`

```sql
id, staff_id,
contact_name, relationship, phone_primary, phone_secondary,
email, is_primary, notes, created_at, updated_at
```

#### `staff_invitations`

```sql
id (char 36 UUID), salon_id, email,
role ENUM('staff','manager','owner','receptionist'),
token (UNIQUE), status ENUM('pending','accepted','expired','revoked'),
expires_at, message varchar(255),  -- ← ADDED 2026-04-14
created_at, updated_at
```

---

### Services & Inventory

#### `services`

```sql
id, salon_id, category_id,
name, duration_minutes, price,
is_active, description, buffer_time_minutes, display_order,
is_popular,
-- Service fulfillment capability flags (source of truth, ADDED 2026-04-22):
can_physical tinyint(1) NOT NULL DEFAULT 1,
can_mobile   tinyint(1) NOT NULL DEFAULT 1,
can_virtual  tinyint(1) NOT NULL DEFAULT 1,
-- Legacy/deprecated enum kept temporarily for backward compatibility:
offering_type ENUM('physical','mobile','virtual','hybrid'),
-- Price overrides for hybrid fulfillment (← ADDED 2026-04-21):
mobile_price_override  decimal(10,2) DEFAULT NULL,  -- NULL = use base price
virtual_price_override decimal(10,2) DEFAULT NULL,  -- NULL = use base price
deleted_at
-- Indexes: idx_services_offering (legacy), idx_services_fulfillment_flags (can_physical, can_mobile, can_virtual)
```

#### `service_categories`

```sql
id, salon_id, name, display_order
-- UNIQUE: (salon_id, name)
```

#### `service_staff` (many-to-many: which staff perform which service)

```sql
(service_id, staff_id) PRIMARY KEY
```

#### `products`

```sql
id, salon_id, category_id,
name, description, price, cost_price,
sku, barcode, stock_quantity, low_stock_threshold,
is_active, image_url, deleted_at, created_at, updated_at
```

#### `product_categories`

```sql
id, salon_id, name, display_order, created_at
```

#### `resources` (rooms, chairs, equipment)

```sql
id, salon_id, name,
type ENUM('room','chair','equipment','other'),
description, capacity, color, is_active, created_at
```

#### `resource_blocks`

```sql
id, resource_id, start_time, end_time, reason, created_at
```

---

### Financials

#### `payments`

```sql
id, booking_id (UNIQUE),
amount, method ENUM('card','cash'),
status ENUM('pending','paid','refunded'),
stripe_payment_id, tip_amount, refunded_amount,
client_package_id, notes, created_at
-- UNIQUE: uq_payments_booking (one payment per booking)
```

#### `refunds`

```sql
id, payment_id, amount, reason,
stripe_refund_id,
status ENUM('pending','processing','completed','failed'),
processed_by, failure_reason, created_at, processed_at
```

#### `payouts`

```sql
id, salon_id, amount, currency DEFAULT 'EUR',
status ENUM('pending','processing','completed','failed'),
method ENUM('bank_transfer','stripe','manual'),
reference, bank_account_last4,
period_start, period_end, bookings_count,
gross_amount, platform_fees, refunds_amount, net_amount,
failure_reason, processed_at, created_at
```

#### `platform_fees`

```sql
id, booking_id, salon_id,
type ENUM('new_client','payment_processing'),
amount, is_paid
-- Populated automatically: 20% fee for marketplace new client bookings
-- Global promo codes → negative fee to absorb platform cost
```

#### `platform_settings`

```sql
id, setting_key (UNIQUE), setting_value, value_type ENUM('string','number','boolean','json'),
description, created_at, updated_at
-- DB-driven config: maintenance_mode, fee percentages, registration toggles, etc.
```

---

### Marketing

#### `discounts`

```sql
id, salon_id, code, name, description,
type ENUM('percentage','fixed'), value,
min_purchase, max_discount,
start_date, end_date,
max_uses, max_uses_per_client, current_uses,
is_active, applies_to_services, applies_to_products, first_booking_only,
deleted_at, created_at, updated_at
-- UNIQUE: (salon_id, code)
```

#### `discount_services` / `discount_products` (junction tables)

```sql
(discount_id, service_id/product_id) PRIMARY KEY
```

#### `global_discounts` (platform-funded promos like FRESH2026)

```sql
id, code (UNIQUE), type ENUM('fixed','percentage'), value,
min_purchase, max_uses, current_uses, is_active,
start_date, end_date, created_at, updated_at
-- Cost absorbed via negative platform_fees entries, NOT the salon
```

#### `gift_cards`

```sql
id, salon_id, code (UNIQUE), initial_balance, remaining_balance,
purchased_by → users.id, recipient_email, recipient_name, recipient_message,
status ENUM('active','used','expired','cancelled'),
expires_at, created_at
```

#### `packages`

```sql
id, salon_id, name, description,
original_price, discounted_price, validity_days,
max_uses, is_active, image_url, created_at
```

#### `package_services` (junction)

```sql
id, (package_id, service_id) UNIQUE, quantity
```

#### `client_packages`

```sql
id, client_id, package_id, salon_id,
purchase_price, remaining_uses,
status ENUM('active','expired','used','cancelled'),
expires_at, payment_id, created_at
```

#### `campaigns`

```sql
id, salon_id, name,
type ENUM('email','sms','push'),
subject, content, target_audience ENUM('all','new','returning','inactive'),
status ENUM('draft','scheduled','sending','completed','cancelled'),
scheduled_at, completed_at,
recipient_count, sent_count, open_count, click_count,
created_at
```

---

### Platform & Misc

#### `audit_logs` (IMMUTABLE — never UPDATE or DELETE)

```sql
id, user_id, action varchar(50), entity_type, entity_id,
old_data JSON, new_data JSON,
ip_address, user_agent, created_at
-- Written for: Stripe transfers, refunds, admin impersonation start/stop,
--              any bulk financial action
```

#### `notifications`

```sql
id, user_id, type ENUM('email','sms','push'),
title, message, data JSON,
sent_at, is_read, read_at,
is_system_banner  -- platform-wide banners shown at top of dashboards
```

#### `reviews`

```sql
id, salon_id, client_id, booking_id,
rating, comment, status ENUM('pending','approved','flagged','removed'),
moderation_note, moderated_by, moderated_at,
owner_reply, owner_reply_at,
staff_id, service_id, deleted_at, created_at
```

#### `salon_amenities`

```sql
id, salon_id, name
```

#### `salon_categories` (marketplace filtering — ADDED 2026-04-08)

```sql
id, salon_id, category_name, is_primary, created_at
```

#### `salon_gallery` / `salon_photos`

```sql
id, salon_id, image_url, [display_order / is_cover]
```

#### `widget_settings`

```sql
salon_id (PK),
enabled, primary_color, secondary_color, button_text,
show_services, show_staff, show_prices,
require_phone, require_email, allow_notes,
terms_url, success_message
```

#### `support_tickets`

```sql
id, user_id, subject, description,
status ENUM('open','in_progress','resolved','closed'),
priority ENUM('low','normal','high','urgent'),
created_at, updated_at
```

---

### Migration History (chronological)

| File                                                    | Date   | Description                                                                                                                     |
| ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `20260120_add_performance_indexes.sql`                  | Jan 20 | Performance indexes                                                                                                             |
| `20260121_add_default_working_hours.sql`                | Jan 21 | Default staff hours                                                                                                             |
| `20260121_add_staff_to_booking_services.sql`            | Jan 21 | `booking_services.staff_id`                                                                                                     |
| `20260219_add_salon_soft_delete.sql`                    | Feb 19 | `salons.deleted_at` + `deleted_by`                                                                                              |
| `20260222_add_client_search_indexes.sql`                | Feb 22 | Phone/name search indexes                                                                                                       |
| `20260222_add_salon_clients_soft_delete.sql`            | Feb 22 | `salon_clients.is_active` + `updated_at`                                                                                        |
| `20260226_add_financial_operations.sql`                 | Feb 26 | Payouts, platform fees, audit logs                                                                                              |
| `20260301_add_soft_deletes.sql`                         | Mar 1  | Additional soft deletes                                                                                                         |
| `20260301_create_user_addresses.sql`                    | Mar 1  | `user_addresses` table                                                                                                          |
| `20260330_add_sub_times_to_booking_services.sql`        | Mar 30 | Sub-service timestamps                                                                                                          |
| `20260408_create_salon_categories.sql`                  | Apr 8  | `salon_categories` table                                                                                                        |
| `20260412_add_hybrid_fulfillment.sql`                   | Apr 12 | Mobile/virtual booking support                                                                                                  |
| `20260412_phase2_buffer_zips.sql`                       | Apr 12 | Covered ZIP codes for mobile                                                                                                    |
| `20260413_create_staff_invitations.sql`                 | Apr 13 | `staff_invitations` table                                                                                                       |
| `20260414_add_message_to_staff_invitations.sql`         | Apr 14 | `staff_invitations.message`                                                                                                     |
| `20260420_add_staff_permissions.sql`                    | Apr 20 | `staff.permissions JSON` column                                                                                                 |
| `20260422_hybrid_fulfillment_phase3.sql`                | Apr 21 | Staff capability flags, `booking_travel_fees` table, service price overrides, booking travel snapshot cols, fulfillment indexes |
| `20260422_replace_service_offering_enum_with_flags.sql` | Apr 22 | Adds `services.can_physical/can_mobile/can_virtual`, backfills from `offering_type`, adds fulfillment flags index               |

---

## 6. Core Library (`/src/lib`)

### `lib/db.js` — Database Connection

```javascript
// Pool config: connectionLimit=10, dateStrings=true
// Env: MYSQL_URL (priority) or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME

pool.query(sql, params); // use for SELECT with LIMIT/OFFSET (type coercion)
pool.execute(sql, params); // use for INSERT/UPDATE (strict types)

// Exported helpers:
query(sql, params); // returns rows array
getOne(sql, params); // returns first row or null
transaction(callback); // beginTransaction → callback(conn) → commit or rollback
```

### `lib/auth.js` — JWT Authentication

```javascript
// JWT: HS256, 7-day expiry, stored in HttpOnly cookie 'token'
// Also accepts Authorization: Bearer <token> for API/mobile use
// bcrypt cost factor: 12

hashPassword(password)          // bcrypt hash
verifyPassword(pass, hash)      // bcrypt compare
createToken(payload)            // sign JWT
verifyToken(token)              // verify JWT, returns payload or null
getSession()                    // reads from Bearer header OR cookie
requireAuth()                   // throws if no session
requireRole(allowedRoles[])     // throws if role not in list
verifyAuth(request)             // for route handlers (takes Request object)
```

### `lib/booking.js` — Safe Booking Creation (THE ONLY BOOKING PATH)

```javascript
createSafeBooking({
  salonId,
  clientId,
  primaryStaffId,
  startDatetime,
  services: [{ serviceId, staffId, price, duration, bufferTime }],
  source,
  discountCode,
  giftCardCode,
  // Hybrid fulfillment (all optional — default to physical/null):
  fulfillmentType, // 'physical' | 'mobile' | 'virtual'
  serviceLocationAddress, // required for mobile bookings
  clientTimezone,
  virtualMeetingLink, // auto-resolved from salon row if omitted
  notes,
});
// Flow:
// 1.  SERVICE_FULFILLMENT_MISMATCH guard — rejects if any service capability
//     flags are incompatible with fulfillmentType (fast-fail, pre-transaction).
//     Fallback to legacy offering_type is retained for pre-migration rows.
// 2.  Check staff working hours PRE-transaction
//     (mobile: extends window by ±travel_buffer_time/2 for transit)
// 3.  BEGIN TRANSACTION
// 4.  SELECT … FOR UPDATE on overlapping booking_services (concurrency lock)
// 5.  Check staff time-off INSIDE transaction
// 6.  Apply discounts / gift-cards if provided (FOR UPDATE)
// 7.  INSERT bookings row (fulfillment_type, service_location_address,
//     virtual_meeting_link, client_timezone, travel_fee_amount=0 placeholder)
// 8.  INSERT booking_services (one per service, sequential schedule)
// 9.  [Mobile only] Fetch travel fee config from salons INSIDE tx →
//     INSERT booking_travel_fees + UPDATE bookings.travel_fee_amount snapshot
// 10. UPSERT salon_clients (ON DUPLICATE KEY UPDATE is_active=1)
// 11. INSERT platform_fees if source='marketplace' AND new client (20%)
// 12. COMMIT or ROLLBACK on any error
```

### `lib/client.js` — Client Deduplication (THE ONLY USER INSERT PATH)

```javascript
findOrCreateClient({ firstName, lastName, email, phone, salonId });
// Resolution order:
// 1. Phone → SELECT FOR UPDATE → found: patch name via COALESCE, reuse
// 2. Email → SELECT FOR UPDATE → found: patch name+phone, reuse
// 3. Neither → INSERT (role='client', password_hash='')
//    ER_DUP_ENTRY race: re-SELECT winning row (no retry loop)
// 4. salonId → INSERT salon_clients ON DUPLICATE KEY UPDATE is_active=1
// Returns: { userId, isNew, isNewToSalon }

normalizePhone(raw); // strips spaces, dashes, dots
ClientError; // typed HTTP error class
```

### `lib/checkout.js` — Financial Calculation (NEVER TRUST FRONTEND MATH)

```javascript
calculateBookingTotal(bookingId, conn);
// Total = SUM(booking_services.price)
//       + SUM(booking_products.total_price)
//       + SUM(booking_travel_fees.amount)   ← ADDED 2026-04-21
//       - SUM(booking_discounts.amount_saved)
//       - SUM(booking_gift_cards.amount_used)
// Always computed from DB, never from client payload.
// Travel fees are written by createSafeBooking() inside the transaction —
// the frontend never passes a travel fee value directly.

addProductToBooking(bookingId, productId, quantity, conn);
// Validates product belongs to salon, inserts at DB price, decrements stock

processCheckout(bookingId, method, tipAmount, conn);
// SELECT FOR UPDATE on booking → validate status='confirmed'
// compute total → INSERT payments → UPDATE booking status='completed'
// Enforces: pending → confirmed → completed (no backwards transitions)
// One payment per booking (UNIQUE constraint on payments.booking_id)
```

### `lib/permissions.js` — RBAC Engine (ADDED 2026-04-20)

```javascript
// Role hierarchy: staff(1) < receptionist(2) < manager(3) < owner(4)
// Permission keys: dashboard_full, calendar_all, bookings_all, clients,
//   services_edit, team, products, sales, marketing, reports,
//   settings_business, settings_hours, settings_billing, add_location

resolvePermission(staffRole, customPermissions, key);
// 1. staffRole === 'owner' → always true
// 2. customPermissions[key] === boolean → use it (override)
// 3. PERMISSION_KEYS[key].roleDefault(staffRole) → fallback

getVisibleSidebarItems(navItems, staffRole, customPermissions);
getVisibleSettingsItems(settingsNav, staffRole, customPermissions);
canAccessPage(staffRole, pageName, customPermissions);
(canEditServices,
  canSeeAllBookings,
  canSeeFinancials,
  canManageTeam,
  canAddLocation);
canAccessDangerZone(staffRole); // owner only
```

### `lib/validate.js` — Zod Schemas

All API inputs have Zod schemas:
`createBookingSchema`, `createClientSchema`, `updateClientSchema`,
`checkoutSchema`, `addBookingProductSchema`, `createCampaignSchema`,
`replyReviewSchema`, `updateSalonStatusSchema`, etc.

### `lib/notifications.js` — Notification Dispatch

```javascript
sendNotification({ userId, type, title, message, data });
// 1. Inserts into notifications table (always)
// 2. Sends via Resend email if RESEND_API_KEY set (fallback: console.log)
// Used for: booking confirmations, cancellations, reminders (cron), campaigns
```

### `lib/rate-limit.js` — In-Memory Rate Limiter

```javascript
// Login: 5 attempts / 15 min per email
// Register: 5 attempts / 15 min per IP
// Forgot Password: 10 attempts / 15 min per IP
// ⚠️ In-memory only — not safe for multi-server production (needs Redis)
```

### `lib/format.js` — Formatting Utilities

```javascript
formatCurrency(amount, currency); // uses salon.currency
(formatDate(date), formatTime(time), formatDuration(minutes));
```

### `lib/api-client.js` — Frontend Fetch Wrapper

```javascript
// Auto-injects JWT from cookie on every request
// Used by all hooks in /src/hooks/
apiClient.get(url), .post(url, body), .put(url, body), .delete(url)
```

---

## 7. API Routes Map (`/src/app/api`)

### Auth (`/api/auth/`)

| Endpoint                | Method | Description                    |
| ----------------------- | ------ | ------------------------------ |
| `/auth/login`           | POST   | JWT login, rate limited        |
| `/auth/register`        | POST   | Client or Owner registration   |
| `/auth/logout`          | POST   | Clear cookie                   |
| `/auth/me`              | GET    | Current session user           |
| `/auth/me/password`     | PUT    | Change password                |
| `/auth/forgot-password` | POST   | Send reset token               |
| `/auth/reset-password`  | POST   | Consume token, set new pass    |
| `/auth/upgrade`         | POST   | Client → Owner account upgrade |
| `/auth/refresh`         | POST   | Refresh JWT                    |

### Bookings (`/api/bookings/`)

| Endpoint                      | Method         | Description                                                                                                        |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/bookings`                   | GET/POST       | List / create (routes through `createSafeBooking`); POST accepts fulfillment fields                                |
| `/bookings/[id]`              | GET/PUT/DELETE | GET returns `fulfillmentType`, `serviceLocationAddress`, `virtualMeetingLink`, `travelFeeAmount`, `clientTimezone` |
| `/bookings/[id]/reschedule`   | PUT            | Reschedule with conflict check                                                                                     |
| `/bookings/[id]/confirm`      | POST           | Mark confirmed                                                                                                     |
| `/bookings/[id]/no-show`      | POST           | Mark no-show                                                                                                       |
| `/bookings/[id]/checkout`     | POST           | Process checkout (`processCheckout`)                                                                               |
| `/bookings/[id]/total`        | GET            | Read-only total (`calculateBookingTotal` — incl. travel fees)                                                      |
| `/bookings/[id]/products`     | POST           | Add retail product at checkout                                                                                     |
| `/bookings/[id]/assign-staff` | PUT            | Re-assign staff                                                                                                    |
| `/bookings/[id]/permanent`    | DELETE         | Hard delete (admin only)                                                                                           |

### Salons (`/api/salons/[id]/`)

| Endpoint                            | Description                        |
| ----------------------------------- | ---------------------------------- |
| `GET/PUT/DELETE /api/salons/[id]`   | Read, update, soft-delete salon    |
| `/availability`                     | Slot availability                  |
| `/calendar`                         | Calendar events feed               |
| `/clients`                          | Salon CRM (active `is_active=1`)   |
| `/clients/[clientId]`               | Individual client in salon context |
| `/staff`                            | Team list                          |
| `/staff/[staffId]`                  | Staff profile CRUD                 |
| `/services`                         | Service catalog                    |
| `/products`                         | Retail products                    |
| `/discounts` `/discounts/[code]`    | Promo codes                        |
| `/gift-cards`                       | Gift card management               |
| `/packages`                         | Service bundles                    |
| `/campaigns` `/campaigns/[id]/send` | Email/SMS marketing                |
| `/reviews` `/reviews/[id]/reply`    | Review management                  |
| `/settings`                         | Salon settings & policies          |
| `/photos`                           | Gallery / cover images             |
| `/resources`                        | Rooms/chairs/equipment             |
| `/waitlist`                         | Client waitlist                    |
| `/widget`                           | Widget config read/write           |
| `/payouts`                          | Payout history                     |
| `/dashboard`                        | KPI aggregates                     |
| `/last-minute`                      | Flash deals                        |
| `/marketplace/enable` `/disable`    | Toggle marketplace listing         |

### Clients (`/api/clients/`)

| Endpoint                 | Method         | Description                                |
| ------------------------ | -------------- | ------------------------------------------ |
| `/clients`               | POST           | Create/find via `findOrCreateClient()`     |
| `/clients`               | GET            | Smart search (phone/email/name)            |
| `/clients/[id]`          | GET/PUT/DELETE | Profile, edit, soft-delete (`is_active=0`) |
| `/clients/[id]/bookings` | GET            | Paginated booking history                  |

### Widget (PUBLIC — no auth required)

| Endpoint                         | Description                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/widget/[salonId]`              | Salon info (incl. `is_mobile`, `is_virtual`, `travel_fee_type`, `covered_zip_codes`)                                                              |
| `/widget/[salonId]/services`     | Services with `availableStaff`; filtered by service `can_physical/can_mobile/can_virtual` + staff capability compatibility with `fulfillmentType` |
| `/widget/[salonId]/staff`        | Staff list (incl. `canMobile`, `canVirtual`, `travelRadius`)                                                                                      |
| `/widget/[salonId]/availability` | Available slots; filters staff by `can_mobile`/`can_virtual` capability when fulfillmentType matches                                              |
| `/widget/[salonId]/book`         | POST booking; validates address for mobile, resolves meeting link for virtual, passes all fulfillment fields to `createSafeBooking`               |

### Marketplace (PUBLIC)

| Endpoint                            | Description                                          |
| ----------------------------------- | ---------------------------------------------------- |
| `/marketplace/salons`               | Search with location, price, rating, openNow filters |
| `/marketplace/salons/[id]`          | Public salon profile                                 |
| `/marketplace/salons/[id]/services` | Public service list                                  |
| `/marketplace/salons/[id]/reviews`  | Approved reviews                                     |
| `/marketplace/salons/[id]/staff`    | Public staff list                                    |

### Admin (admin role only)

| Endpoint                                                 | Description                                  |
| -------------------------------------------------------- | -------------------------------------------- |
| `/admin/users` `/admin/users/[id]`                       | User management                              |
| `/admin/salons` `/admin/salons/[salonId]/status` `/tier` | Salon control                                |
| `/admin/fees` `/admin/fees/[feeId]/resolve`              | Platform fee tracking                        |
| `/admin/reviews` `/admin/reviews/[reviewId]`             | Global review moderation                     |
| `/admin/bookings` `/admin/bookings/[id]/refund`          | Admin booking/refund                         |
| `/admin/payouts`                                         | Global payout dashboard                      |
| `/admin/audit-logs`                                      | Immutable event log                          |
| `/admin/impersonate` `/admin/impersonate/stop`           | Impersonation                                |
| `/admin/settings`                                        | Platform config (maintenance, fees, toggles) |
| `/admin/global-discounts`                                | Platform promo codes                         |
| `/admin/broadcasts`                                      | Multi-channel admin blasts                   |
| `/admin/analytics/gmv` `/engagement` `/churn`            | Platform metrics                             |
| `/admin/tickets` `/admin/tickets/[id]`                   | Support ticket triage                        |
| `/admin/onboarding`                                      | At-risk salon detection                      |

### Other Routes

| Endpoint                                                                | Description                  |
| ----------------------------------------------------------------------- | ---------------------------- |
| `/notifications`                                                        | GET (list), DELETE (batch)   |
| `/notifications/read`                                                   | POST (mark read)             |
| `/cron/reminders`                                                       | Reminder emails (24h window) |
| `/payments` `/payments/intent` `/payments/confirm`                      | Stripe payment intents       |
| `/checkout/refund` `/checkout/[bookingId]`                              | Refund processing            |
| `/reports/overview` `/revenue` `/bookings` `/clients` `/staff`          | Analytics                    |
| `/invitations`                                                          | Staff invitation management  |
| `/staff/[staffId]/schedule` `/working-hours` `/time-off` `/commissions` | HR data                      |
| `/webhooks/stripe` `/webhooks/sms`                                      | Stripe + SMS webhooks        |
| `/upload`                                                               | File/image upload            |

---

## 8. Frontend Pages Map

### Dashboard — Admin

| Route                         | Purpose                   |
| ----------------------------- | ------------------------- |
| `/dashboard/admin`            | Platform overview         |
| `/dashboard/admin/users`      | User list + management    |
| `/dashboard/admin/salons`     | Salon list + toggle       |
| `/dashboard/admin/analytics`  | GMV, heatmaps, churn      |
| `/dashboard/admin/fees`       | Platform fee tracker      |
| `/dashboard/admin/reviews`    | Global review moderation  |
| `/dashboard/admin/payouts`    | Payout approval           |
| `/dashboard/admin/audit-logs` | JSON diff audit trail     |
| `/dashboard/admin/support`    | Support ticket queue      |
| `/dashboard/admin/marketing`  | Global promos             |
| `/dashboard/admin/settings`   | DB-driven platform config |

### Dashboard — Salon Owner/Staff

| Route                                               | Purpose                                                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/dashboard`                                        | Salon switcher hub                                                                                               |
| `/dashboard/salon/[salonId]`                        | KPI overview (revenue, bookings, reviews)                                                                        |
| `/dashboard/salon/[salonId]/calendar`               | FullCalendar drag-and-drop                                                                                       |
| `/dashboard/salon/[salonId]/bookings`               | Booking list & detail drawer                                                                                     |
| `/dashboard/salon/[salonId]/clients`                | CRM table + client profile                                                                                       |
| `/dashboard/salon/[salonId]/clients/[clientId]`     | Client detail + history                                                                                          |
| `/dashboard/salon/[salonId]/services`               | Service catalog by category                                                                                      |
| `/dashboard/salon/[salonId]/team`                   | Staff list                                                                                                       |
| `/dashboard/salon/[salonId]/team/[staffId]`         | Staff profile (tabs: personal, schedule, services, wages, commissions, addresses, emergency, pay-runs, settings) |
| `/dashboard/salon/[salonId]/products`               | Inventory management                                                                                             |
| `/dashboard/salon/[salonId]/sales`                  | Payment history + refunds                                                                                        |
| `/dashboard/salon/[salonId]/reports`                | Revenue, bookings, clients, staff reports                                                                        |
| `/dashboard/salon/[salonId]/reviews`                | Review response panel                                                                                            |
| `/dashboard/salon/[salonId]/marketing`              | Hub for sub-sections below                                                                                       |
| `/dashboard/salon/[salonId]/marketing/campaigns`    | Email/SMS campaigns                                                                                              |
| `/dashboard/salon/[salonId]/marketing/discounts`    | Promo codes                                                                                                      |
| `/dashboard/salon/[salonId]/marketing/gift-cards`   | Gift card management                                                                                             |
| `/dashboard/salon/[salonId]/marketing/packages`     | Service bundles                                                                                                  |
| `/dashboard/salon/[salonId]/marketing/waitlist`     | Waitlist queue                                                                                                   |
| `/dashboard/salon/[salonId]/support`                | Help tickets                                                                                                     |
| `/dashboard/salon/[salonId]/checkout/[bookingId]`   | Checkout flow                                                                                                    |
| `/dashboard/salon/[salonId]/settings/general`       | Info, danger zone (delete salon)                                                                                 |
| `/dashboard/salon/[salonId]/settings/hours`         | Business hours                                                                                                   |
| `/dashboard/salon/[salonId]/settings/account`       | Profile settings                                                                                                 |
| `/dashboard/salon/[salonId]/settings/marketplace`   | Marketplace listing config                                                                                       |
| `/dashboard/salon/[salonId]/settings/widget`        | Widget designer                                                                                                  |
| `/dashboard/salon/[salonId]/settings/notifications` | Notification preferences                                                                                         |
| `/dashboard/salon/[salonId]/settings/policies`      | Cancellation, deposit policies                                                                                   |
| `/dashboard/salon/[salonId]/settings/reviews`       | Review settings                                                                                                  |
| `/dashboard/salon/[salonId]/settings/billing`       | Subscription & plan                                                                                              |

### Marketplace (Public)

| Route                                  | Purpose                       |
| -------------------------------------- | ----------------------------- |
| `/`                                    | Homepage with featured salons |
| `/salons`                              | Search with filters           |
| `/salon/[id]`                          | Public salon profile          |
| `/bookings`                            | Client's booking history      |
| `/contact` `/help` `/privacy` `/terms` | Legal pages                   |

### Auth

| Route              | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `/login`           | Email/password login                                |
| `/register`        | Client or Owner registration (`?type=professional`) |
| `/forgot-password` | Password reset request                              |
| `/reset-password`  | Token-based password reset                          |

### Other

| Route                   | Purpose                          |
| ----------------------- | -------------------------------- |
| `/book/[salonId]`       | Embeddable 4-step booking widget |
| `/onboarding`           | New salon setup wizard           |
| `/invite/[token]`       | Staff invitation acceptance      |
| `/verify-email/[token]` | Email verification               |

---

## 9. Components & Hooks

### TanStack Query Hooks (`/src/hooks/`)

Each hook wraps API calls with caching, optimistic updates, and invalidation:

| Hook                    | Manages                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `use-bookings.js`       | Bookings CRUD, status updates, calendar data                 |
| `use-clients.js`        | Client search, create, edit, delete, history                 |
| `use-staff.js`          | Staff CRUD, working hours, services, time-off                |
| `use-services.js`       | Services + categories CRUD                                   |
| `use-products.js`       | Product inventory                                            |
| `use-payments.js`       | Payment history, refunds                                     |
| `use-sales.js`          | Sales transactions                                           |
| `use-reports.js`        | Analytics data (overview, revenue, bookings, clients, staff) |
| `use-settings.js`       | Salon settings, hours, widget, `useDeleteSalon`              |
| `use-discounts.js`      | Promo codes                                                  |
| `use-gift-cards.js`     | Gift cards                                                   |
| `use-packages.js`       | Service packages                                             |
| `use-campaigns.js`      | Marketing campaigns                                          |
| `use-reviews.js`        | Reviews + moderation                                         |
| `use-notifications.js`  | In-app notifications (30s polling)                           |
| `use-waitlist.js`       | Waitlist entries                                             |
| `use-marketplace.js`    | Public marketplace search                                    |
| `use-my-profile.js`     | Current user profile                                         |
| `use-support.js`        | Support tickets                                              |
| `use-salon-closures.js` | Salon closure management                                     |
| `use-debounce.js`       | Search debouncing helper                                     |

### Key Components

| Component                   | Location      | Purpose                                    |
| --------------------------- | ------------- | ------------------------------------------ |
| `sidebar.jsx`               | `layout/`     | Dashboard navigation (permission-filtered) |
| `header.jsx`                | `layout/`     | Top bar with notification bell + user menu |
| `notification-popover.jsx`  | `layout/`     | In-app notification popover                |
| `booking-form.jsx`          | `bookings/`   | Create/edit booking drawer                 |
| `booking-detail.jsx`        | `bookings/`   | Booking detail side panel                  |
| `calendar-view.jsx`         | `calendar/`   | FullCalendar with staff columns            |
| `staff-creation-wizard.jsx` | `staff/`      | Multi-step staff onboarding                |
| `onboarding-wizard.jsx`     | `onboarding/` | New salon setup flow                       |
| `command-palette.jsx`       | root          | Global search (⌘K)                         |
| `ImpersonationBanner.jsx`   | root          | Admin impersonation warning                |

---

## 10. Golden Rules (Strict Business Logic)

### A — Never bypass these entry points

| Operation               | Required Entry Point                           |
| ----------------------- | ---------------------------------------------- |
| Create/update a booking | `createSafeBooking()` in `lib/booking.js`      |
| Create a client         | `findOrCreateClient()` in `lib/client.js`      |
| Calculate totals        | `calculateBookingTotal()` in `lib/checkout.js` |
| Checkout payment        | `processCheckout()` in `lib/checkout.js`       |

### B — Soft Delete Rules

```sql
-- Standard entities:
WHERE deleted_at IS NULL  -- salons, bookings, services, products, users, discounts, reviews

-- Relationship tables (salon_clients):
WHERE is_active = 1

-- NEVER:
DELETE FROM <any_table>  -- forbidden without explicit admin cleanup script approval
```

### C — Booking Concurrency

```sql
-- Inside transaction, always lock conflicting rows:
SELECT b.id FROM bookings b
WHERE b.staff_id = ? AND b.status NOT IN ('cancelled', 'no_show')
AND b.start_datetime < ? AND b.end_datetime > ?
FOR UPDATE
```

### D — Financial Integrity

- Backend computes totals from DB aggregates — never from request body
- Global promo codes → negative `platform_fees` entry (salon unaffected)
- Marketplace new-client bookings → 20% platform fee inserted at commit
- Every Stripe action → write to `audit_logs`

### E — Client Deduplication

- Only `lib/client.js` may INSERT into `users`
- Phone-first `SELECT FOR UPDATE` → email fallback → INSERT + `ER_DUP_ENTRY` catch
- `salon_clients` always upserted with `ON DUPLICATE KEY UPDATE is_active=1`

### F — Hybrid Fulfillment Invariants (ADDED 2026-04-21)

- **Service compatibility guard:** `createSafeBooking()` fast-fails before the transaction if any service's `can_physical/can_mobile/can_virtual` flags are incompatible with `fulfillmentType`. Legacy fallback to `service.offering_type` is retained for pre-migration compatibility.
- **Travel fee integrity:** Travel fees are **never passed from the frontend**. `createSafeBooking()` fetches `salons.travel_fee_type` and `travel_fee_amount` **inside the DB transaction** and writes them to `booking_travel_fees`. The `bookings.travel_fee_amount` snapshot column is updated in the same transaction.
- **Travel buffer:** For mobile bookings, staff working hours are extended by `±(salon.travel_buffer_time / 2)` minutes before the availability check.
- **Address validation:** The widget book route validates that `serviceLocationAddress` is present for mobile bookings. If `salon.covered_zip_codes` is set, the ZIP must appear in that list.
- **Service + staff capability gating:** Widget services and availability APIs both gate by selected fulfillment type. Services require matching service capability flags and staff require `can_mobile=1` (mobile) or `can_virtual=1` (virtual). Physical uses `can_physical=1` and active visible staff.
- **Uniform fulfillment per booking:** A single booking must have one `fulfillment_type`. Mixing physical/mobile/virtual services in one booking is not supported.
- **Price overrides:** `services.mobile_price_override` and `virtual_price_override` are surfaced by the services API and the service form UI (gated on salon `is_mobile`/`is_virtual`). When non-NULL they should be used as the line-item price for the respective fulfillment type.

---

## 11. Permission System

Introduced 2026-04-20 via `staff.permissions JSON` column + `lib/permissions.js`.

### Permission Keys & Role Defaults

| Key                 | staff | receptionist | manager | owner |
| ------------------- | ----- | ------------ | ------- | ----- |
| `dashboard_full`    | ✗     | ✗            | ✓       | ✓     |
| `calendar_all`      | ✗     | ✓            | ✓       | ✓     |
| `bookings_all`      | ✗     | ✓            | ✓       | ✓     |
| `clients`           | ✗     | ✓            | ✓       | ✓     |
| `services_edit`     | ✗     | ✗            | ✓       | ✓     |
| `team`              | ✗     | ✗            | ✓       | ✓     |
| `products`          | ✗     | ✗            | ✓       | ✓     |
| `sales`             | ✗     | ✗            | ✓       | ✓     |
| `marketing`         | ✗     | ✗            | ✓       | ✓     |
| `reports`           | ✗     | ✗            | ✓       | ✓     |
| `settings_business` | ✗     | ✗            | ✗       | ✓     |
| `settings_hours`    | ✗     | ✗            | ✓       | ✓     |
| `settings_billing`  | ✗     | ✗            | ✗       | ✓     |
| `add_location`      | ✗     | ✗            | ✗       | ✓     |

**Custom overrides:** When `staff.permissions` JSON has an explicit boolean for a key, it overrides the role default (except for owner — always full access).

**UI enforcement:** `getVisibleSidebarItems()` and `getVisibleSettingsItems()` filter navigation based on resolved permissions.

> ⚠️ The permission library is implemented but API route middleware enforcement may be incomplete (see §17).

---

## 12. Authentication Flow

```
Client Request
    │
    ├─ Authorization: Bearer <JWT> header? → verifyToken() → session
    │
    └─ Cookie 'token'? → verifyToken() → session

JWT Payload contains:
{
  userId, role,         // from users table
  staffId?,             // present for staff/owner/manager in salon context
  salonId?,             // salon context
  impersonatorAdminId?  // present if admin is impersonating
}

Token expiry: 7 days (HS256)
Cookie: HttpOnly, SameSite=Strict
```

### Impersonation

- Admin hits `POST /api/admin/impersonate` → new token with `impersonatorAdminId`
- `ImpersonationBanner.jsx` shown (cannot be dismissed)
- `POST /api/admin/impersonate/stop` → restore original admin token
- Both events written to `audit_logs`

---

## 13. Database Connection & Query Patterns

```javascript
// lib/db.js exports:
pool; // raw mysql2 pool (never export to route files — use via lib only)
query(); // for SELECT + LIMIT/OFFSET (type-safe coercion)
getOne(); // single row SELECT
transaction(); // automatic BEGIN/COMMIT/ROLLBACK wrapper

// Env:
MYSQL_URL; // takes priority (e.g. PlanetScale, Railway)
(DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME); // fallback

// All queries use parameterized placeholders — no string interpolation
// dateStrings: true → dates returned as strings, not Date objects
```

---

## 14. Security Configuration

### `next.config.mjs` Security Headers (applied globally)

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

### Additional Security

- JWT_SECRET: min 32 chars enforced at startup (throws if not set)
- bcrypt cost factor: 12
- Request body size limit: 2MB (serverActions.bodySizeLimit)
- Input validation: Zod schemas on ALL API routes
- IDOR protection: strict numeric ID validation before any query
- Rate limiting on auth routes (in-memory, 5–10 attempts / 15 min)
- XSS: React auto-escaping on all rendered user content

---

## 15. Git History & Recent Changes

### Current State

```
Branch: devalop
HEAD:   4a165b5 — "New design for the dashboard" (NOT YET PUSHED to origin)
Origin: b2d7c69 — "added permissions settings for roles, added support system, avatar customization"
```

### Last 10 Commits

```
4a165b5  (HEAD → devalop)  New design for the dashboard
b2d7c69  (origin/devalop)  added permissions settings for roles, added support system, avatar customization
6af7a4b                    Now users can join a business
4761eae  (origin/main)     Upgraded login / registration flows
f573125                    Fixed url was using simple ID, finished onboarding
1ff467c                    Enhanced onboarding
50189ec                    Enhanced SEO, added email verification, fixed categories, enhanced onboarding
ad8ba21                    Added promo codes, fixed working hours for salons, changed currency system
c8017ec                    Redesigned landing page
7cc4663                    Redesigned calendar, bookings page for clients
```

### HEAD Commit (4a165b5) — Dashboard Visual Redesign

Touched **32 files** (+5,433 / −3,824 lines). Affected pages:

- `dashboard/layout.js` — layout spacing & container
- `dashboard/page.js` — owner hub
- `salon/[salonId]/page.js` — KPI dashboard
- `salon/[salonId]/bookings/page.js`
- `salon/[salonId]/calendar/page.js`
- `salon/[salonId]/clients/page.js`
- `salon/[salonId]/products/page.js` ← (currently open)
- `salon/[salonId]/reports/page.js`
- `salon/[salonId]/reviews/page.js`
- `salon/[salonId]/sales/page.js`
- `salon/[salonId]/services/page.js`
- `salon/[salonId]/settings/` (all sub-pages + layout)
- `salon/[salonId]/support/page.js`
- `salon/[salonId]/team/page.js` + `[staffId]/page.js`
- `components/ui/progress.jsx`

### Commit b2d7c69 Changes Summary

- `staff.permissions JSON` column (migration `20260420_add_staff_permissions.sql`)
- `lib/permissions.js` — Full RBAC engine with sidebar/settings/page filtering
- `staff_invitations.message` field (`20260414`)
- `staff_invitations` table (`20260413`)
- Hybrid fulfillment schema for bookings & services (`20260412`)
- Buffer ZIP codes for mobile service coverage (`20260412`)
- `salon_categories` table (`20260408`)
- Support system UI
- Avatar customization

---

## 16. Known Issues & Limitations

| Issue                               | Severity  | Notes                                                                                                                                                                          |
| ----------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rate limiter is in-memory           | ⚠️ Medium | Single-server only — needs Redis for production scale                                                                                                                          |
| Stripe payments not live            | ⚠️ High   | `lib/stripe.js` is ~465 bytes (stub). Payouts & refunds wired but full Stripe Connect online payments not implemented                                                          |
| Permission enforcement at API level | ⚠️ Medium | `lib/permissions.js` exists but individual route handlers may not yet call it consistently                                                                                     |
| `users.deleted_at` UI               | Low       | Column exists, no admin UI to actually soft-delete users yet                                                                                                                   |
| No salon recovery UI                | Low       | Soft-deleted salons can only be restored via DB query                                                                                                                          |
| Phone normalization                 | Low       | `normalizePhone()` strips formatting but doesn't convert Algerian 0555→+2135 (E.164)                                                                                           |
| Account settings mock               | Low       | `useCurrentUser()` hook uses some mock data paths                                                                                                                              |
| No 2FA                              | Low       | On roadmap                                                                                                                                                                     |
| Push notifications                  | Low       | Not implemented (email + in-app only)                                                                                                                                          |
| Multi-currency edge cases           | Low       | `format.js` supports it but UI assumes single salon currency                                                                                                                   |
| Hybrid fulfillment — frontend       | ⚠️ Medium | Backend fully done. Remaining: staff profile can_mobile/can_virtual toggles, calendar event fulfillment badges, booking-detail drawer fulfillment badge + address/meeting link |

---

## 17. Roadmap & Next Tasks

Based on git history, schema gaps, and known issues:

### High Priority (likely next)

1. **Push dashboard redesign** — QA the HEAD commit, push `devalop` to origin
2. **Wire `lib/permissions.js` into API routes** — ensure route handlers enforce per-staff permission overrides
3. **Hybrid fulfillment — remaining frontend** — ✅ Backend done (2026-04-21). Pending UI: staff profile capability toggles, calendar event fulfillment badges, booking-detail drawer context (address / join link)
4. **Staff invitation end-to-end verification** — confirm email send → token validate → staff account creation is complete

### Medium Priority

5. **Stripe Connect online payments** — implement full card payment flow using the Stripe SDK (currently manual cash/card recording only)
6. **User soft-delete UI** — admin interface to deactivate user accounts using `users.deleted_at`
7. **Redis rate limiter** — replace in-memory limiter for multi-server safety

### Lower Priority (Roadmap items)

8. **Salon recovery UI** — admin ability to restore soft-deleted salons
9. **Phone normalization to E.164** — country-code aware conversion in `normalizePhone()`
10. **Client bulk CSV import** — via `findOrCreateClient()` (dedup-safe by design)
11. **2FA** — for admin/owner accounts
12. **CI/CD** — enforce `test:e2e` on Pull Requests
13. **Permanent purge job** — background cron to hard-delete after 90-day retention window
14. **Marketplace SEO** — server-side metadata for salon profile pages

---

## Environment Variables Required

```env
# Required
JWT_SECRET=<min 32 chars>
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (use MYSQL_URL OR individual vars)
MYSQL_URL=mysql://user:pass@host/fresh
# OR:
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=fresh

# Optional but recommended
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

---

## Seed Data

- 6 Owner accounts: `owner@fresh.com` through `owner6@fresh.com`
- Password for all seed accounts: `password123`
- Admin account: seeded directly in DB

---

_This file was generated by AI analysis on 2026-04-21 and reflects the state of the `devalop` branch at that time._
