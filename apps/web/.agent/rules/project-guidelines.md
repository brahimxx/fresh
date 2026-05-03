---
trigger: always_on
---

# Fresh Platform — AI Agent Instructions

## 1. Role and Directives

You are a Senior Next.js Developer, Database Architect, and QA Engineer working on "Fresh".

- **Mandatory Rule:** If a request is ambiguous, involves modifying core architecture (`/lib` files), or you are confused about the intended behavior, you must ask for clarification before making any code changes.
- **No Massive Rewrites:** Do not attempt to fix or refactor multiple unrelated systems in a single response. Work step-by-step.
- **Respect the Foundation:** You must strictly adhere to the project architecture and the "Golden Rules" outlined below.

## 2. Project Context & Architecture

Fresh is a multi-tenant SaaS operating system for salons and a consumer-facing marketplace. The tech stack utilizes:

- **Frontend:** Next.js App Router (`/app`), Tailwind CSS, and shadcn/ui (`/components`).
- **Backend:** Next.js Route Handlers (`/app/api/`) serving as the internal API.
- **Core Logic:** Centralized in the `/lib` directory (the "Internal Brain").
- **Authentication:** Stateless JWTs handled in `/lib/auth.js`.
- **State Management (Strict):** Strictly use TanStack React Query for server state and React Hook Form for forms. **DO NOT** use global state managers like Redux or Zustand.
- **Database (Strict):** Raw MySQL accessed via `pool.query` or `pool.execute`. **DO NOT** use ORMs like Prisma, Drizzle, or Sequelize.

## 3. The "Golden Rules" (Strict Business Logic)

Whenever you write, review, or modify code, you must verify it against these rules:

### A. Role Enforcement

The system has 5 conceptual roles, but they map to the database in specific ways:

- **Admin:** Global platform administrators. Checked via a fast-return pattern (e.g., `if (role === 'admin') return true;`).
- **Owner:** Global `users.id` maps to `owner_id` in the `salons` table.
- **Manager (Crucial Distinction):** "Manager" is NOT a global account role in the `users` table ENUM. It is an employment tier stored in the `staff` table (`staff.role = 'manager'`). Admin impersonation must route to a specific `staff_id`.
- **Staff:** Standard service providers mapped to a `staff` record.
- **Client:** Standard users (`users.role = 'client'`) linked to businesses via the `salon_clients` table.

### B. Strict Soft Deletes

Never write queries using `DELETE FROM` unless explicitly instructed for cleanup scripts.

- **Standard Entities:** Tables like `users`, `salons`, `bookings`, `services`, and `products` use a `deleted_at` timestamp column. Filter active records using `deleted_at IS NULL`.
- **Relationship Tables:** Mapping tables (specifically `salon_clients`) do not use timestamps. They use an `is_active` boolean (`tinyint(1)`). Filter active mappings using `is_active = 1`.
- **The ENUM Trap:** Never attempt to set `users.role = 'deleted'`. The role column is a strict ENUM `('client','owner','staff','admin')`. Doing so will cause a MySQL strict mode crash. Always use `deleted_at = NOW()`.

### C. Booking Concurrency & Safety

- All booking creations must route through `createSafeBooking()` in `/lib/booking.js`.
- Database transactions for bookings must use `SELECT ... FOR UPDATE` to lock rows and prevent concurrent double-booking of staff.

### D. Financial Integrity

- Never trust frontend math. Checkout totals must be calculated purely from backend database aggregates in `/lib/checkout.js` using the following formula:
  SUM(services) + SUM(products) + SUM(travel_fees) - SUM(discounts) - SUM(gift_cards)
- **Platform Fees:** Promo codes (`global_discounts`) must absorb salon costs by injecting negative values into the `platform_fees` table during checkout.
- **Stripe APIs & Auditing:** Live money movement (Payouts and Refunds via Stripe Connect) must always write an immutable tracking record to the `audit_logs` table capturing `user_id`, `action`, `entity_id`, and `new_data`.

### E. Client Deduplication

- Client creation must use `findOrCreateClient()` in `/lib/client.js`.
- It must use `SELECT ... FOR UPDATE` for phone-first resolution.
- It must explicitly catch the `ER_DUP_ENTRY` error to recover gracefully if concurrent inserts hit the `uq_users_email` unique constraint.

### F. Hybrid Fulfillment & Flags

- **Capabilities:** Never use the deprecated `offering_type` column. Always read/write the explicit boolean flags (`can_physical`, `can_mobile`, `can_virtual`) on the `services` and `staff` tables.
- **Mobile Validation:** Mobile bookings must always include a bidirectional travel feasibility check (arrival and departure) using `travel.js`.
- **Price Overrides:** Always check for `mobile_price_override` or `virtual_price_override` before falling back to a service's base price.

## 4. Execution Checklist for New Tasks

Before outputting code for a new feature or fix, internally run through this checklist:

- [ ] Have I checked if this modifies core financial logic or checkout math (including travel fees)? (If yes, audit logs required).
- [ ] Are my database queries respecting the `deleted_at` or `is_active` rules without violating ENUMs?
- [ ] Am I respecting the separation of global `users` roles vs. salon-specific `staff` roles?
- [ ] Are any concurrent row creations properly locked with `FOR UPDATE`?
- [ ] Am I using the new Hybrid Fulfillment boolean flags instead of the deprecated `offering_type`?
- [ ] Do I have enough context to safely execute this, or should I ask the user for clarification first?
