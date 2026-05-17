# Implementation Plan: Products and Sales Improvements

## Overview

Incremental, test-driven build for the Products and Sales overhaul. Work proceeds
bottom-up: schema migration → shared libs → API route handlers → property-based
tests → TanStack Query hooks → components → pages → cross-cutting UI tests and
smoke tests. Implementation language is **JavaScript** (Next.js App Router, JSX,
matching the existing `jsconfig.json` codebase). Tests use **Vitest** as the
runner and **fast-check** for property-based tests, as specified in the design.

Tasks are numbered with two-level decimal notation. Sub-tasks marked with `*`
are optional (test sub-tasks: PBTs, unit tests, integration tests, smoke tests).
Each PBT sub-task references its design property number and the requirement
clauses it validates.

## Tasks

- [x] 1. Schema migration for products & sales overhaul
  - [x] 1.1 Author `database/migrations/20260601_products_sales_overhaul.sql`
    - Add `products.brand VARCHAR(120) NULL` (idempotent, `IF NOT EXISTS` pattern using `information_schema`) and `idx_products_brand`
    - Add `product_categories.deleted_at DATETIME NULL` (idempotent)
    - Extend `payments.status` ENUM with `'partially_refunded'` (idempotent, `LOCATE` guard, no UPDATE on existing rows, default kept as `'pending'`)
    - Create new `product_stock_movements` table with `product_id`, `salon_id`, `change_type` ENUM, `quantity_before/after/delta`, `reason_code` ENUM, `reason_note`, `performed_by`, `booking_id`, `created_at` plus indexes and FKs per design
    - _Requirements: 5.1, 6.4, 12.1, 22.3, 22.4, 22.5_

  - [x] 1.2 Smoke test: run migration twice and assert no error and identical schema state
    - Spin a transient MySQL, apply `database/fresh.sql`, run the migration, then run it again
    - Assert column / enum / table presence by querying `information_schema`
    - _Requirements: 5.1, 6.4, 12.1, 22.3, 22.4, 22.5_

- [x] 2. Test infrastructure and shared libraries
  - [x] 2.1 Add Vitest + fast-check devDependencies and create `vitest.config.js`
    - Configure jsdom environment for component tests, node environment for API/property tests
    - Wire `@/` alias to `src/` matching `jsconfig.json`
    - Set up `tests/` root with sub-folders `properties/`, `integration/`, `unit/`, `components/`, `smoke/`
    - Add `test` and `test:run` scripts to `package.json` (use `vitest --run` in CI)
    - _Requirements: design Testing Strategy_

  - [x] 2.2 Create `tests/properties/_arbitraries.js` shared generator library
    - Generators: salon, user, staff record, custom permissions object, product (with brand edge cases including surrogate pairs and bidi), payment, refund triple, category set, date range (with DST and year boundaries), stock movement triple `(currentQty, mode, quantity)`
    - Generators expose deterministic seed via `fc.assert(..., { seed })`
    - _Requirements: design Testing Strategy_

  - [x] 2.3 Implement `src/lib/csv.js` with RFC 4180 helpers
    - Export `csvCell(v)` returning `''` for `null`/`undefined`, doubling internal `"` and wrapping in quotes when `[,"\n\r]` is present
    - Export `csvRow(values)` joining cells with `,` and terminating with `\r\n`
    - _Requirements: 17.7_

  - [x] 2.4 Unit tests for `csv.js`
    - Cover null/undefined, plain strings, strings with comma, strings with newline, strings with embedded quotes
    - _Requirements: 17.7_

  - [x] 2.5 Extend `src/lib/permissions.js` with `products_manage` and `sales_manage` keys plus `assertSalonAccess` helper
    - Add the two permission keys with `roleDefault: (role) => hasMinRole(role, 'manager')`
    - Add alias map `{ 'products.manage': 'products_manage', 'sales.manage': 'sales_manage' }` inside `resolvePermission`
    - Implement `assertSalonAccess({ session, salonId, perm, ownerOnly })` returning `{ ok, code, status }` covering 401 (no session), 400 (`MISSING_SALON_ID` / `INVALID_SALON_ID`), 403 (denied), and 200 (allowed) per the matrix in the design
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 2.1, 2.2, 2.4, 2.5, 4.3, 6.6, 14.9, 15.1, 15.2, 15.3_

  - [x] 2.6 Unit tests for `resolvePermission` alias map and `assertSalonAccess` matrix
    - Cover admin / owner / staff with permission / staff without permission / no session / malformed salon_id / cross-salon
    - _Requirements: 1.3, 1.4, 2.1, 2.2, 15.1, 15.2_

- [x] 3. Stock API: history, adjust, and checkout integration
  - [x] 3.1 Implement `src/app/api/products/[productId]/stock/route.js`
    - `GET`: paginated history (`page` ≥ 1 default 1, `limit` 1–100 default 20), JOIN `users` for `performed_by_name`, ordered `created_at DESC`, response shape `{ data, meta: { page, limit, total, totalPages } }`
    - `PUT`: validate `mode ∈ {set,add,subtract}`, `quantity` non-negative integer, `reason_code` ∈ allowed manual codes (reject `sale`/`refund`), `reason_note` ≤ 500 chars
    - Run inside `transaction(async conn => ...)`: lock product row, compute clamp-at-zero arithmetic, `UPDATE products`, `INSERT product_stock_movements`, `INSERT audit_logs` with `action='stock_change'`, all-or-nothing
    - Return `{ id, stock_quantity, movement_id }` within 2,000 ms
    - 404 cross-salon body shape identical to genuine-not-found
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 4.1, 4.2, 4.3, 4.6, 4.7, 20.2, 20.4, 20.5_

  - [x] 3.2 Extend `src/lib/checkout.js` so `processCheckout` and `addProductToBooking` insert stock movement rows
    - In the same `conn` as the booking-products / products UPDATE, INSERT `product_stock_movements` with `reason_code='sale'` (signed delta) on checkout and `reason_code='refund'` on negative-quantity refund path
    - On INSERT failure, the entire checkout / refund transaction rolls back (no payment marked paid, no stock decrement)
    - Sale and refund paths SHALL NOT call into `audit_logs` (booking/payment flow is audited at a higher level)
    - _Requirements: 4.5, 20.3, 22.1, 22.2_

  - [x] 3.3 PBT for stock arithmetic clamp
    - **Property 6: Stock arithmetic with clamp at zero**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
    - `fc.assert(fc.property(...))` over `(currentQty ≥ 0, mode ∈ {set,add,subtract}, quantity ≥ 0)`; assert post-write `stock_quantity` and `delta = quantity_after - quantity_before`
    - File: `tests/properties/stock-clamp.pbt.test.js`

  - [x] 3.4 PBT for stock movement transaction rollback
    - **Property 7: Stock movement insert is transactional with the products update**
    - **Validates: Requirements 3.6, 22.2**
    - Inject simulated failure between UPDATE products and INSERT product_stock_movements (mock at db layer); assert pre-call state preserved and 5xx response
    - File: `tests/properties/stock-tx-rollback.pbt.test.js`

  - [x] 3.5 PBT for sales-driven and refund-driven movements exclusivity
    - **Property 14: Sales-driven and refund-driven stock movements are exclusive and exhaustive**
    - **Validates: Requirements 4.5, 14.7, 20.3, 22.1**
    - Generate booking-product sets, run `processCheckout` and refund flows, assert exactly one movement per affected booking-product with correct `reason_code`, signed `delta`, and `booking_id`; assert no other code path mutates `products.stock_quantity`
    - File: `tests/properties/sales-driven-movements.pbt.test.js`

  - [x] 3.6 Integration tests for Stock_API auth, validation, and 404 shape
    - Cover 401 (no session), 403 (cross-salon staff), 400 (`mode`/`quantity`/`reason_code`/`reason_note` invalid), 404 cross-salon body shape parity
    - _Requirements: 3.7, 3.9, 4.3, 4.6, 4.7_

- [x] 4. Product Categories API
  - [x] 4.1 Implement `src/app/api/product-categories/route.js`
    - `GET`: `salon_id` required positive integer, return non-deleted categories ordered `display_order ASC, name ASC`, empty array on no rows
    - `POST`: validate `salon_id`, `name` (1–100 chars after trim), optional `display_order` (0–9999); return created row
    - Apply `assertSalonAccess` with `perm='products_manage'` for POST and `perm='products'` for GET
    - _Requirements: 6.1, 6.2, 6.6, 6.11_

  - [x] 4.2 Implement `src/app/api/product-categories/[id]/route.js`
    - `PUT`: rename / update `display_order`; cross-salon target → 404
    - `DELETE`: single transaction setting `product_categories.deleted_at = NOW()` and `UPDATE products SET category_id = NULL WHERE category_id = ?`; rollback on any failure
    - Affected products remain visible (not hidden / deactivated) as a side effect
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.11_

  - [x] 4.3 Integration tests for Categories API
    - CRUD happy paths, transactional rollback on simulated failure, cross-salon 404 shape, `name`/`display_order` bounds
    - _Requirements: 6.1, 6.3, 6.5, 6.11_

- [x] 5. Products API: listing, mutations, stats, and CSV export
  - [x] 5.1 Refactor `src/app/api/products/route.js` listing
    - Require auth (Req 1.1); apply `assertSalonAccess` with `perm='products'`; admin without `salon_id` returns all non-deleted products across salons
    - Always `WHERE deleted_at IS NULL`
    - Validate `page`, `limit` (max 100, no silent clamp), `search` (0–100 chars), `category_id` (positive int), `stock` ∈ `{in,low,out,all}`, `is_active` (bool), `sort` ∈ enum mapped server-side to a fixed `ORDER BY` clause
    - Search joins on `name | sku | barcode | brand` (case-insensitive substring)
    - Response envelope `{ data: [...], meta: { page, limit, total, totalPages } }` with empty `data` and real `meta` when `page > totalPages && total > 0`
    - JOIN `product_categories` for `category_name` (null when `category_id` is null)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.4, 6.9, 6.12, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.10, 8.11_

  - [x] 5.2 Refactor `src/app/api/products/[productId]/route.js` (PUT and DELETE)
    - `PUT`: validate `brand` (trim, 1–120 chars; `null`/empty → SQL NULL; non-string non-null → 400), `category_id` belongs to the same salon (else 400), `image_url` accepts string or null, all other product fields per existing contract
    - `DELETE`: soft-delete only — `UPDATE products SET deleted_at = NOW(), is_active = 0 WHERE id = ? AND deleted_at IS NULL`; return 404 when already soft-deleted
    - Authorization via `products_manage` per `assertSalonAccess`
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 5.2, 5.3, 5.5, 6.10, 7.7_

  - [x] 5.3 Implement `src/app/api/products/stats/route.js`
    - Single SQL with conditional aggregates over `salon_id = ? AND deleted_at IS NULL AND is_active = 1`
    - Response `{ totalProducts, lowStockCount, outOfStockCount, totalInventoryValue }`, all numeric ≥ 0
    - Same authorization matrix as the listing endpoint; reject missing/invalid `salon_id` with `INVALID_SALON_ID`
    - _Requirements: 9.1, 9.2, 9.4_

  - [x] 5.4 Implement `src/app/api/products/export.csv/route.js`
    - Stream `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="products-{salonId}-{YYYYMMDD-HHmm}.csv"` via `ReadableStream` for bounded memory
    - Header row: `id,name,brand,sku,barcode,category,price,cost_price,stock_quantity,low_stock_threshold,is_active,created_at`
    - Apply same filters and authorization as the listing endpoint; empty result still emits the header row
    - Use `csvRow`/`csvCell` from `src/lib/csv.js`
    - _Requirements: 17.1, 17.2, 17.5, 17.6, 17.7, 17.8, 17.9_

  - [x] 5.5 PBT for pagination envelope and ordering invariants
    - **Property 5: Pagination envelope and ordering invariants**
    - **Validates: Requirements 4.1, 4.7, 8.3, 8.11**
    - Generate `(total, page, limit)`; assert `data.length ≤ limit`, `totalPages = ceil(total/limit)` (or 0), `page > totalPages && total > 0` returns 200 with empty data
    - File: `tests/properties/pagination-invariants.pbt.test.js`

  - [x] 5.6 PBT for listing filters AND composition
    - **Property 11: Listing filters compose as a logical AND, server-side**
    - **Validates: Requirements 5.4, 6.1, 6.9, 6.12, 8.4, 8.5, 8.6, 11.1, 11.2, 11.3, 11.5, 11.8**
    - Generate filter combos against a seeded fixture; rows returned must equal model reducer result (case-insensitive substring across `name|sku|barcode|brand`, exact enum match, inclusive date boundaries server-tz)
    - File: `tests/properties/listing-filters.pbt.test.js`

  - [x] 5.7 PBT for product field round-trip persistence
    - **Property 12: Round-trip persistence for product fields**
    - **Validates: Requirements 5.2, 6.10, 7.7, 14.2**
    - Generate POST/PUT bodies with brand edge cases, image_url null/empty, category_id same-salon; read back via GET and assert byte-equality after documented normalisation
    - File: `tests/properties/field-roundtrip.pbt.test.js`

  - [x] 5.8 PBT for CSV RFC 4180 round-trip
    - **Property 13: CSV output is RFC 4180 round-trip clean**
    - **Validates: Requirements 17.2, 17.4, 17.6, 17.7, 17.9**
    - Stream the CSV, parse with a strict RFC 4180 parser, assert resulting 2D array equals the source rows after the documented projection; assert headers, content-type, and content-disposition match
    - File: `tests/properties/csv-rfc4180.pbt.test.js`

- [x] 6. Payments API: listing, detail, daily totals, and CSV export
  - [x] 6.1 Refactor `src/app/api/payments/route.js` listing
    - Accept both `salon_id` and `salonId`; reject conflicting values with `ERROR_400`
    - Filters: `status`, `method` (canonical enums, case-sensitive, reject unknown), `start_date`/`end_date` (`YYYY-MM-DD`, inclusive 00:00:00 / 23:59:59 server tz, reject `start > end`), `search`, `page`, `limit`, `sort`; combine with AND
    - Canonical snake_case row shape per design; numeric fields default to `0` when DB is `NULL`
    - Walk-in / orphan client mapping: `client_id = null`, `client_name = "Walk-in Guest"`, `client_email = null`
    - Owner scoped to owned salons; staff scoped to salons with Active_Staff_Record
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 13.1, 13.5_

  - [x] 6.2 Refactor `src/app/api/payments/[id]/route.js` detail
    - Return canonical snake_case + full breakdown (`services_amount, products_amount, subtotal, discount_amount, discount_code, gift_card_amount, tip_amount, amount, refunded_amount, stripe_payment_intent_id`) computed identically to `calculateBookingTotal()` in `src/lib/checkout.js`
    - `discount_code` defaults to `null` when no discount applied
    - `PUT` for status changes restricted to canonical 4-value enum
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 6.3 Implement `src/app/api/payments/daily-totals/route.js`
    - Date-spine CTE / generated series from `start_date` to `end_date` LEFT JOINed against the same revenue computation as the KPI card
    - Range capped at 366 days; reject malformed dates / `start > end` / span > 366 with `ERROR_400`
    - Response `[{ date, revenue, transactions, refunded }]` ordered ASC, exactly one entry per inclusive day, zeros for days without transactions
    - Same authorization as listing endpoint
    - _Requirements: 16.1, 16.2, 16.5_

  - [x] 6.4 Implement `src/app/api/payments/export.csv/route.js`
    - Stream CSV with header `id,booking_id,client_name,client_email,amount,refunded_amount,tip_amount,method,status,created_at` and filename `payments-{salonId}-{YYYYMMDD-HHmm}.csv`
    - Same filters and authorization as the payments listing; empty result still emits the header row
    - _Requirements: 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9_

  - [x] 6.5 PBT for revenue / transactions / refunded / average / daily totals match a model reducer
    - **Property 9: Revenue, transaction count, refund total, average ticket, and daily-totals match a model implementation**
    - **Validates: Requirements 9.1, 12.4, 12.5, 12.6, 12.7, 16.1**
    - Reference reducer in JS applies the documented formulas; assert API responses byte-equal the reducer output for any generated W
    - File: `tests/properties/revenue-aggregates.pbt.test.js`

  - [x] 6.6 PBT for walk-in / orphan client mapping
    - **Property 15: Walk-in / orphan client mapping preserves rows and shape**
    - **Validates: Requirements 13.1, 13.5**
    - Generate payments whose joined `users` row is missing or soft-deleted; assert row preserved with the documented null/Walk-in-Guest mapping
    - File: `tests/properties/walkin-mapping.pbt.test.js`

  - [x] 6.7 PBT for payment listing & detail canonical snake_case shape
    - **Property 16: Payment listing & detail expose the canonical snake_case shape with documented defaults**
    - **Validates: Requirements 13.1, 13.2, 13.3**
    - Assert key set equality, monetary defaults to 0, `discount_code` default null, `stripe_payment_intent_id === stripe_payment_id`, ISO 8601 UTC for `booking_datetime`/`created_at`; detail breakdown equals `calculateBookingTotal()` over the same DB rows
    - File: `tests/properties/payment-shape.pbt.test.js`

- [x] 7. Refund API
  - [x] 7.1 Refactor `src/app/api/checkout/refund/route.js`
    - Auth required; authorization via `sales_manage` per `assertSalonAccess` (owner / admin always allowed)
    - Body validation: `paymentId` positive int, `amount > 0` with ≤ 2 decimals, `reason` 1–100 chars trimmed, `notes` 0–2000 chars
    - Persist composed reason: `final_reason = reason + (notes ? '\n' + notes : '')` into `refunds.reason`
    - Validate `previousRefundedAmount + amount ≤ payment.amount` else `REFUND_EXCEEDS_REMAINING` (no Stripe call, no DB write)
    - On Stripe failure: no DB write, no audit log row
    - Decide final status: `'partially_refunded'` when `< amount` after refund applies, `'refunded'` when `>= amount`
    - Insert one `audit_logs` row with `entity_type='payment'`, `action='refund'`, `new_data={ amount, reason, isPartial, refundId }` in the same transaction
    - Stock reversal for booking-products: delegate to `addProductToBooking()` with negative quantity (writes `'refund'` movement via task 3.2)
    - Reject any attempt to write a status outside the canonical 4-value enum with `INVALID_STATUS`
    - _Requirements: 12.2, 12.9, 12.10, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 15.1, 15.2, 15.3, 20.1, 20.4, 20.5_

  - [x] 7.2 PBT for audit-log transactionality with originating change
    - **Property 8: Audit log write is transactional with the originating change**
    - **Validates: Requirements 14.4, 14.5, 20.1, 20.2, 20.3, 20.4, 20.5**
    - Force failures at each tx phase (validation / Stripe / forced rollback); assert exactly one `audit_logs` row on success and zero on failure for refund and manual stock change paths; assert zero audit rows for sale/refund-driven movements
    - File: `tests/properties/audit-log-tx.pbt.test.js`

  - [x] 7.3 PBT for refund status transition rule
    - **Property 10: Refund status transition rule**
    - **Validates: Requirements 12.2, 12.9, 12.10, 14.6**
    - Generate `(amount, previousRefunded, refundAmount)`; assert resulting status is `'partially_refunded'` or `'refunded'` per the boundary rule; over-refund returns `REFUND_EXCEEDS_REMAINING` with no DB write; non-canonical status writes are rejected
    - File: `tests/properties/refund-status.pbt.test.js`

- [x] 8. Checkpoint - Server-side ready
  - Ensure all server-side and PBT tests pass, ask the user if questions arise.

- [x] 9. Cross-cutting authorization and validation property tests
  - [x] 9.1 PBT for read-endpoint authorization decision is total and consistent
    - **Property 1: Authorization decision is total and consistent for read endpoints**
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 4.3, 6.6, 9.2, 10.2, 10.3, 16.2, 17.5, 17.8**
    - Generate caller (no session / admin / owner / staff with custom permission combos) × endpoint set; assert response code/body matches the decision matrix and every returned row's salon scope is permitted
    - File: `tests/properties/authz-listing.pbt.test.js`

  - [x] 9.2 PBT for mutating-endpoint authorization decision is total and consistent
    - **Property 2: Authorization decision is total and consistent for mutating endpoints**
    - **Validates: Requirements 2.1, 2.2, 2.4, 2.5, 4.3, 6.6, 14.9, 15.1, 15.2, 15.3**
    - Same generator over POST/PUT/DELETE endpoints; assert no DB row mutates on denial paths
    - File: `tests/properties/authz-mutation.pbt.test.js`

  - [x] 9.3 PBT for input validation totality and side-effect-freeness
    - **Property 3: Input validation is total and side-effect-free**
    - **Validates: Requirements 1.6, 3.1, 3.7, 5.5, 6.10, 6.11, 8.2, 8.10, 9.4, 10.5, 10.6, 11.3, 11.4, 11.6, 11.7, 14.1, 14.6, 14.8, 16.5**
    - Generate body/query violations across all endpoints; assert 400 with code in the documented vocabulary and `parameter` field present when ambiguous; assert no INSERT/UPDATE/DELETE statement executed
    - File: `tests/properties/validation-400.pbt.test.js`

  - [x] 9.4 PBT for cross-salon 404 / 403 body-shape non-leaking
    - **Property 4: 404 vs 403 cross-salon body shape is non-leaking**
    - **Validates: Requirements 1.3, 3.9, 4.6, 6.3**
    - For every single-resource endpoint, assert byte-equal body shape between cross-salon access and genuine-not-found
    - File: `tests/properties/cross-salon-404-shape.pbt.test.js`

- [x] 10. TanStack Query hooks layer
  - [x] 10.1 Create `src/hooks/use-product-categories.js`
    - `useProductCategories(salonId)` (list), `useCreateProductCategory`, `useUpdateProductCategory`, `useDeleteProductCategory`
    - Invalidate `['products']` on category mutations so the listing refreshes when products lose `category_id`
    - _Requirements: 6.7, 6.8_

  - [x] 10.2 Extend `src/hooks/use-products.js`
    - Update `useProducts(salonId, filters)` to pass `search/category_id/stock/is_active/sort/page/limit` to the API; use `placeholderData: keepPreviousData`
    - Add `useProductStats(salonId)` invalidated on product create/update/delete
    - Add `useStockHistory(productId, { page, limit })`
    - Extend `useUpdateProductStock` to take `{ id, mode, quantity, reason_code, reason_note }`
    - Remove the hardcoded `PRODUCT_CATEGORIES` constant and the static `getCategoryLabel` lookup; rely on `category_name` from the API row
    - _Requirements: 3.8, 4.1, 4.4, 6.8, 6.9, 6.12, 8.1, 8.7, 8.8, 9.3_

  - [x] 10.3 Extend `src/hooks/use-payments.js`
    - Canonicalise on snake_case for `usePayments` and `usePaymentDetail`; remove camelCase destructuring fallbacks
    - Add `useDailyTotals(salonId, { start_date, end_date })` with refetch within 500 ms on date-range change
    - Continue to expose `useProcessRefund` with `{ paymentId, amount, reason, notes }` body
    - _Requirements: 13.1, 13.4, 14.1, 16.3, 16.4, 16.6_

- [x] 11. Product UI components
  - [x] 11.1 Build `src/components/products/stock-history.jsx`
    - Drawer / section listing movements via `useStockHistory(productId)`; columns: timestamp, actor, change_type, signed delta, before, after, reason_code, reason_note
    - Sale and refund rows visually decorated and read-only
    - _Requirements: 4.4_

  - [x] 11.2 Refactor `src/components/products/stock-update.jsx`
    - Add `mode` Select (`set/add/subtract`), `reason_code` Select (manual codes only), `reason_note` Textarea (≤ 500 chars), and embed the Stock_History panel
    - Submit via the extended `useUpdateProductStock` signature
    - _Requirements: 3.1, 3.7, 3.8, 4.4_

  - [x] 11.3 Build `src/components/products/manage-categories.jsx`
    - List, create, rename, reorder via drag handle (updates `display_order`), and soft-delete; bound to `useProductCategories` hook family
    - _Requirements: 6.7_

  - [x] 11.4 Refactor `src/components/products/product-form.jsx`
    - Image upload via `<ImageInput />` POSTing to `/api/upload` with `type=products`, storing returned URL in `image_url`; clearing image and saving persists `null`; non-blocking error indicator on 4xx that keeps prior `image_url`
    - Save button disabled while upload is in flight
    - Brand input (1–120 chars trimmed)
    - Category Select bound to `useProductCategories(salonId)` submitting numeric `category_id`; remove all references to the hardcoded constants
    - Currency: every `formatCurrency(amount, salon.currency)` call passes the second arg
    - _Requirements: 5.2, 6.8, 7.1, 7.7, 7.8, 7.9, 19.1_

- [x] 12. Products_Page refactor
  - [x] 12.1 Refactor `src/app/dashboard/salon/[salonId]/products/page.js`
    - Server-side filters and pagination control (prev / next disabled at edges; ignore click/keyboard/touch when disabled)
    - KPI cards bound to `useProductStats` (re-fetch on create/update/delete); error indicator on each card on stats failure
    - Image rendering: square aspect, rounded corners (12 px row, 16 px form preview); `Package` icon placeholder when `image_url` null; `onError` hides broken image element with no placeholder fallback
    - "Manage categories" entry in list header opens `ManageCategoriesDialog`
    - "Export CSV" action hits `/api/products/export.csv` with active filters as query params
    - Currency: `formatCurrency(amount, salon.currency)` everywhere; warn once per session when `salon.currency` is missing
    - Affordance gating: omit Add / Edit / Delete / Update Stock from the DOM when `products.manage` resolves false (page-guard remains via `<RequirePermission page="products" />`)
    - Render `category_name` directly from API rows
    - _Requirements: 6.7, 6.9, 6.12, 7.4, 7.5, 7.6, 8.7, 8.8, 8.9, 8.12, 9.3, 9.5, 17.1, 19.1, 19.5, 21.2, 21.3, 21.4_

- [x] 13. Sales UI components
  - [x] 13.1 Build `src/components/sales/daily-revenue-chart.jsx`
    - Recharts line chart bound to `useDailyTotals`; skeleton placeholder of identical width/height while loading; previous chart hidden until new response arrives; single retry button on error
    - _Requirements: 16.3, 16.4, 16.7_

  - [x] 13.2 Refactor `src/components/sales/payment-detail.jsx`
    - Read canonical snake_case keys only; remove camelCase fallbacks
    - Render full breakdown rows from the detail endpoint (`services_amount, products_amount, subtotal, discount_amount, discount_code, gift_card_amount, tip_amount, amount, refunded_amount`)
    - Currency via `formatCurrency(amount, salon.currency)`
    - "Print Receipt" button navigates to `/dashboard/salon/[salonId]/sales/[paymentId]/receipt` within 1 s
    - Remove the "Email Receipt" button entirely
    - _Requirements: 13.2, 13.4, 18.1, 18.6, 19.2, 19.3_

  - [x] 13.3 Refactor `src/components/sales/refund-dialog.jsx`
    - Currency-derived prefix (strip digits from `formatCurrency(0, salon.currency)`); literal `$` is forbidden
    - Submits `{ paymentId, amount, reason, notes }` to `useProcessRefund`
    - Hidden in DOM (not just disabled) when `sales.manage` is false (gating handled by Sales_Page; component itself accepts `salon.currency` prop / `useSalon()`)
    - _Requirements: 14.1, 19.2, 19.3, 19.4_

- [x] 14. Sales_Page refactor
  - [x] 14.1 Refactor `src/app/dashboard/salon/[salonId]/sales/page.js`
    - Status filter dropdown: exactly five options (All, Pending, Paid, Refunded, Partially refunded), default "All"
    - KPI cards: revenue = `SUM(amount - COALESCE(refunded_amount, 0))` over `status IN ('paid','partially_refunded')`; transactions = COUNT over the same set; refunded = `SUM(COALESCE(refunded_amount, 0))` over filtered window; average = `revenue / transactions` (0 when count = 0, no division)
    - Pass active salon id under both `salon_id` and `salonId` (any one works after task 6.1)
    - Pass date / method / status / search filters server-side; remove all client-side filtering
    - Mount `<DailyRevenueChart>` under the four KPI cards
    - "Export CSV" action hits `/api/payments/export.csv` with active filters
    - Refund row-action: visible iff `status IN ('paid','partially_refunded')` AND `(amount - refunded_amount) > 0` AND `sales.manage` resolves true (or owner/admin); otherwise omitted from DOM
    - Currency: `formatCurrency(amount, salon.currency)` everywhere; warn once per session when missing
    - Remove all camelCase destructuring of legacy keys (`clientName`, `bookingId`, `bookingDatetime`, `createdAt`, `stripePaymentId`)
    - _Requirements: 10.4, 11.x (filter wiring), 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 13.4, 16.3, 16.6, 17.3, 19.2, 19.3, 19.5, 21.1, 21.3_

- [x] 15. Receipt route
  - [x] 15.1 Create `src/app/dashboard/salon/[salonId]/sales/[paymentId]/receipt/page.js`
    - Fetch salon (via `useSalon`) and payment detail (via `usePaymentDetail`); render salon name + address, payment id, booking id, client name, line items grouped by services and products (`{ name, quantity, unit price, line total }`), aggregate rows (discount / gift card / tip omitted when null or 0), total paid, refunded amount, payment method, timestamp
    - Currency: `formatCurrency(amount, salon.currency)` everywhere
    - Print stylesheet `@media print` hiding chrome / sidebar; `@page { size: A4; margin: 12mm; }`; per-page header repeating for > 20 line items
    - `useEffect` invokes `window.print()` within 500 ms once both salon and payment loaded successfully
    - On 404 / 403 from the detail endpoint, render inline `<DataError>` and never call `window.print()`
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.7, 18.8_

  - [x] 15.2 Component test for receipt navigation timing and conditional `window.print()`
    - Cover successful render firing `window.print()` within 500 ms and 404/403 paths suppressing it
    - _Requirements: 18.1, 18.2, 18.8_

- [x] 16. UI property tests
  - [x] 16.1 PBT for affordance gating in Products_Page and Sales_Page
    - **Property 17: Affordance-gating in the Products and Sales pages**
    - **Validates: Requirements 8.9, 8.12, 12.8, 21.1, 21.2, 21.3, 21.4**
    - Generate `(staffRole, customPermissions, row)`; assert gated affordances absent from DOM (not merely disabled) iff permission resolves false; refund button additionally requires `status ∈ {paid, partially_refunded}` and `amount - refunded_amount > 0`; pagination disabled buttons ignore click/keyboard/touch
    - File: `tests/properties/affordance-gating.pbt.test.js`

  - [x] 16.2 PBT for currency consistency across Products & Sales surfaces
    - **Property 18: Currency consistency across Products & Sales surfaces**
    - **Validates: Requirements 18.4, 19.1, 19.2, 19.3, 19.4, 19.5**
    - Assert every monetary render equals `formatCurrency(amount, salon.currency)`; single-arg shape never emitted; `$` literal never appears in RefundDialog; missing `salon.currency` falls back to `'DZD'` and warns at most once per page session
    - File: `tests/properties/currency-consistency.pbt.test.js`

- [x] 17. Smoke and example tests
  - [x] 17.1 ESLint rule (or grep step) rejecting single-arg `formatCurrency` under products / sales pages
    - Rule scope: `src/app/dashboard/salon/[salonId]/products/**` and `.../sales/**`
    - _Requirements: 19.1, 19.2_

  - [x] 17.2 ESLint rule (or grep step) rejecting camelCase destructuring of legacy payment keys on Sales_Page
    - Forbidden identifiers: `clientName`, `bookingId`, `bookingDatetime`, `createdAt`, `stripePaymentId`
    - _Requirements: 13.4_

  - [x] 17.3 Performance smoke test for `/api/products/stats`
    - Seed 10,000 products fixture, assert response within 2,000 ms
    - _Requirements: 9.1_

  - [x] 17.4 Example test: admin without `salon_id` returns all non-deleted products
    - _Requirements: 1.7_

  - [x] 17.5 Example test: status filter dropdown options + default
    - Five options in order; default "All"
    - _Requirements: 12.3_

  - [x] 17.6 Example tests for image upload form behaviour
    - 4xx response keeps prior `image_url` and form submittable; Save button disabled while upload in flight; clearing image persists `null`
    - _Requirements: 7.1, 7.7, 7.8, 7.9_

  - [x] 17.7 Example test: daily-totals refetch on date-range change within 500 ms
    - _Requirements: 16.3, 16.6_

  - [x] 17.8 Example test: no Email Receipt button on PaymentDetailDialog
    - _Requirements: 18.6_

  - [x] 17.9 Example test: Manage Categories dialog flows
    - Create / rename / reorder / soft-delete; deleted category nullifies `category_id` on affected products which remain visible
    - _Requirements: 6.5, 6.7_

- [x] 18. Final checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. The 18 PBTs map 1:1 to the design's correctness properties; each is its own sub-task tagged with the property number and the requirement clauses it validates.
- Each implementation task lists the exact file(s) it touches so file-conflict ordering is unambiguous in the dependency graph.
- All dates are server-timezone with inclusive `00:00:00` / `23:59:59` boundaries (Reqs 11.1, 11.2). All ISO 8601 timestamps in API responses are UTC (Req 13.1).
- Authorization is centralised in `assertSalonAccess` (task 2.5); endpoint tasks reference it rather than re-implement the matrix.
- Stripe is mocked at module level in the refund-test path so `/api/checkout/refund` runs end-to-end against the local DB without external calls.
- The migration is idempotent: tasks 1.1 and 1.2 verify a re-run is a no-op, satisfying Reqs 12.1, 22.3, 22.4, 22.5.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.3"] },
    { "id": 1, "tasks": ["1.2", "2.2", "2.4", "2.5"] },
    { "id": 2, "tasks": ["2.6", "3.1", "3.2", "4.1", "4.2", "5.1", "5.2", "5.3", "5.4", "6.1", "6.2", "6.3", "6.4", "7.1"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.5", "3.6", "4.3", "5.5", "5.6", "5.7", "5.8", "6.5", "6.6", "6.7", "7.2", "7.3", "9.1", "9.2", "9.3", "9.4"] },
    { "id": 4, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 5, "tasks": ["11.1", "11.3", "11.4", "13.1", "13.2", "13.3"] },
    { "id": 6, "tasks": ["11.2", "15.1"] },
    { "id": 7, "tasks": ["12.1", "14.1"] },
    { "id": 8, "tasks": ["15.2", "16.1", "16.2", "17.1", "17.2", "17.3", "17.4", "17.5", "17.6", "17.7", "17.8", "17.9"] }
  ]
}
```
