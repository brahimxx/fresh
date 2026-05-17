# Requirements Document

## Introduction

This feature overhauls the salon dashboard's **Products** and **Sales** pages. The current
implementation has correctness, security, and data-integrity defects that make both pages
unreliable: the Products listing has no authentication, the stock-update endpoint is a
404, the form persists fields that don't exist in the database, and the category vocabulary
is decoupled from the per-salon `product_categories` table. The Sales page filters on a
status string (`'completed'`) that the database never stores, sends a `salon_id` parameter
the API silently ignores, and renders camelCase response fields the dashboard reads as
snake_case — making KPIs, refunds, and the breakdown dialog effectively non-functional.

The primary goal is to turn the Products page into a real inventory system that owners and
managers can trust: secure CRUD, server-side filtering and pagination, image upload, real
per-salon categories, a brand column, image upload, and a stock-movement audit trail. The
secondary goal is to make the Sales page work end-to-end: correct status vocabulary, real
server-side filtering, accurate KPIs, a daily-revenue chart, working full and partial
refunds with proper enum support, payment-detail breakdown that reads what the API actually
returns, browser-printable receipts, and CSV export.

Walk-in (booking-less) sales, marketplace product listings, and Stripe Connect onboarding
changes are explicitly out of scope.

## Glossary

- **Products_API**: The HTTP endpoints under `/api/products` and `/api/products/[productId]`.
- **Stock_API**: The HTTP endpoint at `/api/products/[productId]/stock` that adjusts stock
  and writes a movement record. Currently does not exist; will be added.
- **Categories_API**: The HTTP endpoints under `/api/product-categories` and
  `/api/product-categories/[id]` that manage per-salon categories.
- **Payments_API**: The HTTP endpoints under `/api/payments` and `/api/payments/[id]`.
- **Refund_API**: The existing `/api/checkout/refund` endpoint that processes Stripe refunds
  and writes the `refunds` table.
- **Upload_API**: The existing `/api/upload` endpoint that accepts a multipart `file` and
  optional `type` and returns a relative URL under `public/uploads/{type}/`.
- **Products_Page**: The page at `/dashboard/salon/[salonId]/products`.
- **Sales_Page**: The page at `/dashboard/salon/[salonId]/sales`.
- **Permission_Engine**: The role-based + per-staff override engine in
  `/lib/permissions.js`. The keys `products` and `sales` already exist and gate the pages.
- **Stock_Movement**: A new row in `product_stock_movements` that records every change to
  `products.stock_quantity`, including the actor, the reason, the delta, and the before
  and after values.
- **Salon_Currency**: The `currency` column on `salons`. All monetary display MUST use
  `formatCurrency(amount, salon.currency)` from `/lib/format.js`.
- **Canonical_Status**: One of the values stored in `payments.status`. After this spec the
  enum is `('pending', 'paid', 'refunded', 'partially_refunded')`.
- **Stock_Reason_Code**: One of `('manual_set', 'manual_adjustment', 'restock', 'waste',
  'correction', 'sale', 'refund')`. The first five are user-initiated; the last two are
  written automatically by the existing checkout flow and are read-only from the UI.
- **Active_Staff_Record**: A row in `staff` where `user_id = session.userId`, `salon_id =
  requested_salon_id`, `deleted_at IS NULL`, and `is_active = 1`.

## Requirements

---

### Requirement 1: Secure the Products Listing Endpoint

**User Story:** As a salon owner, I want the products listing endpoint to require
authentication and verify that the caller has access to the requested salon, so that
competitors cannot read my inventory by guessing a salon id.

#### Acceptance Criteria

1. WHEN a request is sent to the Products_API listing endpoint with missing credentials,
   malformed credentials, or expired or revoked credentials, THE Products_API SHALL
   return HTTP 401 with code `UNAUTHORIZED` and SHALL NOT include any product records
   in the response body.
2. WHEN an authenticated request is sent to the Products_API listing endpoint without a
   `salon_id` query parameter and the caller is not an admin, THE Products_API SHALL
   return HTTP 400 with code `MISSING_SALON_ID`.
3. WHEN an authenticated non-admin caller requests products for a salon they do not own
   and where they have no Active_Staff_Record, THE Products_API SHALL return HTTP 403
   with code `FORBIDDEN`. THE 403 response body SHALL be identical in shape regardless
   of whether the requested salon exists, so no information about salon existence is
   leaked through 403 vs 404 differentiation.
4. WHEN an admin caller, the salon owner, or an active `staff` row (any role, including
   `staff` and `receptionist`) requests products for the salon, THE Products_API SHALL
   return HTTP 200 with the products list scoped to that salon.
5. THE Products_API SHALL exclude rows where `deleted_at IS NOT NULL` from every listing
   response.
6. IF the `salon_id` query parameter is empty or malformed (non-numeric, negative, or
   zero), THEN THE Products_API SHALL return HTTP 400 with code `INVALID_SALON_ID` and
   SHALL NOT execute any catalog query.
7. WHEN the caller is an admin and `salon_id` is not supplied, THE Products_API SHALL
   return HTTP 200 with all non-deleted products across salons, still excluding rows
   where `deleted_at IS NOT NULL`.

---

### Requirement 2: Align Authorization Across Product Mutations

**User Story:** As a manager who can create products, I want to also be able to update,
delete, and adjust stock for those products, so that my permission set is internally
consistent.

#### Acceptance Criteria

1. WHEN an authenticated caller has the `products.manage` permission resolved as `true`
   by the Permission_Engine for the salon owning the product, OR is the salon owner, OR
   is an admin, THE Products_API SHALL allow `PUT /api/products/[productId]` and
   `DELETE /api/products/[productId]` to proceed and SHALL return the resulting product
   record (or HTTP 204 for `DELETE`) within the same response.
2. IF the caller is not an admin, not the salon owner, and does not have
   `products.manage` for the salon owning the product, THEN THE Products_API SHALL
   return HTTP 403 with code `FORBIDDEN` and SHALL NOT modify any product or stock row.
3. WHEN a `DELETE /api/products/[productId]` request succeeds, THE Products_API SHALL
   set `products.deleted_at = NOW()` and `is_active = 0` and SHALL NOT execute
   `DELETE FROM products`. THE target row SHALL exist with `deleted_at IS NULL` as a
   precondition. WHERE the target row is already soft-deleted, THE Products_API SHALL
   return HTTP 404.
4. THE Products_API SHALL apply the same authorization rule (1 and 2) to the Stock_API.
5. WHEN no authenticated session is present, THE Products_API SHALL return HTTP 401
   with code `UNAUTHORIZED` for `PUT`, `DELETE`, and Stock_API calls; the 401 path is
   distinct from the 403 path.

---

### Requirement 3: Fix the Stock Update Endpoint and the Stock Update Dialog

**User Story:** As a manager, I want the "Update Stock" dialog to actually persist my
change and to record who, when, and why the stock was adjusted, so that I can trust the
inventory numbers and trace any discrepancy.

#### Acceptance Criteria

1. THE Stock_API SHALL accept `PUT /api/products/[productId]/stock` with a JSON body
   containing `mode` (one of `'set'`, `'add'`, `'subtract'`), `quantity` (a non-negative
   integer), `reason_code` (a Stock_Reason_Code), and an optional `reason_note` string of
   up to 500 characters.
2. WHEN `mode` is `'set'`, THE Stock_API SHALL set `products.stock_quantity` to
   `quantity`.
3. WHEN `mode` is `'add'`, THE Stock_API SHALL set `products.stock_quantity` to
   `current + quantity`.
4. WHEN `mode` is `'subtract'`, THE Stock_API SHALL set `products.stock_quantity` to
   `MAX(0, current - quantity)`.
5. IF the resolved new quantity is negative, THEN THE Stock_API SHALL clamp it to `0` and
   record the actual delta written.
6. WHEN a stock change succeeds, THE Stock_API SHALL insert exactly one
   Stock_Movement row recording `product_id`, `salon_id`, `change_type` (matching
   `mode`), `quantity_before`, `quantity_after`, `delta` (signed),
   `reason_code`, `reason_note`, and `performed_by` (the session userId), all in a
   single database transaction with the products UPDATE. IF the Stock_Movement insert
   fails, THEN the entire transaction SHALL roll back so `products.stock_quantity`
   remains unchanged.
7. IF the request omits `reason_code`, supplies an invalid `mode`, supplies a
   non-integer or negative `quantity`, supplies a `reason_note` longer than 500
   characters, or supplies a `reason_code` set to a reserved sale-driven code
   (`'sale'` or `'refund'`), THEN THE Stock_API SHALL return HTTP 400 with code
   `ERROR_400` and SHALL NOT modify any row.
8. THE Stock_API SHALL be reachable from the existing `useUpdateProductStock` hook
   without changing the hook's call signature beyond adding `mode`, `reason_code`, and
   `reason_note` parameters.
9. IF the product does not exist or `deleted_at IS NOT NULL`, THEN THE Stock_API SHALL
   return HTTP 404 with code `NOT_FOUND` and SHALL NOT mutate any row. THE 404 response
   shape SHALL be identical for "not found" and "wrong salon" cases so no cross-salon
   existence is leaked.
10. WHEN a stock change succeeds, THE Stock_API SHALL respond within 2,000 ms with
    `{ id, stock_quantity, movement_id }`.

---

### Requirement 4: Stock Movement History View

**User Story:** As an owner, I want to see a chronological log of every stock change for
a product, so that I can investigate shrinkage, audit team adjustments, and reconcile
purchase orders.

#### Acceptance Criteria

1. THE Stock_API SHALL expose `GET /api/products/[productId]/stock` returning an array
   of Stock_Movement rows for the product, ordered by `created_at DESC`, paginated by
   `page` (≥ 1, default `1`) and `limit` (1–100, default `20`) query parameters. THE
   response SHALL be shaped as `{ data, meta: { page, limit, total, totalPages } }`.
2. THE Stock_API SHALL include the actor's display name (joined from `users`) in each
   returned row.
3. IF the caller does not have the `products` permission for the salon owning the
   product, THEN THE Stock_API SHALL return HTTP 403 with code `FORBIDDEN`.
4. THE Products_Page SHALL provide a "Stock history" view (drawer or dedicated section
   within the Stock Update dialog) that renders the movements list for a single product,
   showing timestamp, actor, change_type, delta with sign, before, after, reason_code,
   and reason_note.
5. WHEN a sale or refund causes a stock change via the existing
   `addProductToBooking()` and `processCheckout()` flow in `/lib/checkout.js`, THE
   checkout flow SHALL also insert a Stock_Movement row with `reason_code = 'sale'` or
   `'refund'` so the history captures sales-driven stock changes.
6. IF the product does not exist or belongs to a salon the caller cannot access, THEN
   THE Stock_API SHALL return HTTP 404 with the same response shape as cross-salon
   access denials.
7. IF `page` or `limit` are out of bounds or non-integer, THEN THE Stock_API SHALL
   return HTTP 400 with code `ERROR_400` and SHALL NOT execute the query.

---

### Requirement 5: Persist a Brand Column

**User Story:** As a manager, I want to record a brand for each product, so that I can
search and filter by brand and produce branded reports.

#### Acceptance Criteria

1. THE products schema SHALL include a `brand VARCHAR(120) NULL` column added via a
   timestamped migration file under `database/migrations/`.
2. WHEN `POST /api/products` or `PUT /api/products/[productId]` is received, THE
   Products_API SHALL persist the trimmed `brand` value (1–120 characters after trim)
   to `products.brand`.
3. THE Products_API SHALL include `brand` in every product response payload.
4. THE Products_Page search input SHALL match against `name`, `sku`, `barcode`, and
   `brand` (case-insensitive substring).
5. IF the supplied `brand` exceeds 120 characters after trimming, OR is a non-string
   non-null value, THEN THE Products_API SHALL return HTTP 400 with code `ERROR_400`
   and SHALL NOT mutate any row. WHEN `brand` is supplied as explicit `null` or as an
   empty string, THE Products_API SHALL persist it as SQL `NULL`.

---

### Requirement 6: Real Per-Salon Categories Backed by `product_categories`

**User Story:** As an owner, I want to define my own product categories per salon and
attach them to my products, so that my categorisation matches my real inventory rather
than a hardcoded list.

#### Acceptance Criteria

1. THE Categories_API SHALL expose `GET /api/product-categories?salon_id={id}` returning
   non-deleted category rows for the salon, ordered by `display_order ASC, name ASC`.
   THE endpoint SHALL apply the `deleted_at IS NULL` filter explicitly and SHALL
   require `salon_id` to be a positive integer. WHEN the salon has no categories, THE
   endpoint SHALL return an empty array.
2. THE Categories_API SHALL expose `POST /api/product-categories` to create a category
   with `salon_id` and `name` (1–100 characters after trim) and an optional
   `display_order` (0–9999), returning the new row.
3. THE Categories_API SHALL expose `PUT /api/product-categories/[id]` to rename a
   category and update `display_order` (subject to the same `name` and `display_order`
   bounds as in (2)). WHEN the supplied `id` belongs to a different salon than the
   caller, THE Categories_API SHALL return HTTP 404.
4. THE Categories_API SHALL expose `DELETE /api/product-categories/[id]` to soft-delete a
   category. WHERE the `product_categories` table has no `deleted_at` column today, the
   migration adding stock movements SHALL also add `deleted_at TIMESTAMP NULL` to
   `product_categories`.
5. WHEN a category is soft-deleted, THE Categories_API SHALL set `products.category_id =
   NULL` for every product currently referencing it in a single transaction. THE
   affected products SHALL remain visible in the listing with no category, and
   SHALL NOT be hidden or deactivated as a side effect of the category deletion. IF
   any statement in the soft-delete + product nullify transaction fails, THEN the
   entire transaction SHALL roll back so neither `product_categories.deleted_at` nor
   `products.category_id` change.
6. THE Categories_API SHALL apply the same authorization rule as Requirement 2 (the
   `products` permission).
7. THE Products_Page SHALL render a "Manage categories" dialog (create / rename / reorder
   / soft-delete) reachable from the product list header.
8. THE product form SHALL render the category select from the Categories_API response
   for the active salon, SHALL submit `category_id` (a numeric id, not a string slug),
   and SHALL no longer reference the hardcoded `PRODUCT_CATEGORIES` constant.
9. THE products listing on Products_Page SHALL display the joined `category_name` field
   from the API response and SHALL NOT call any client-side category-label lookup.
10. THE Products_API SHALL validate that any provided `category_id` belongs to the same
    salon as the product. IF the category belongs to a different salon, THEN the
    Products_API SHALL reject the request with HTTP 400 and code `ERROR_400` and
    SHALL NOT mutate the product row.
11. IF `name` is empty after trim, longer than 100 characters, or `display_order` is
    out of bounds, THEN THE Categories_API SHALL return HTTP 400 with code `ERROR_400`
    and SHALL NOT mutate any row.
12. WHERE the products listing returns a product whose `category_id` is `NULL`, THE
    `category_name` field SHALL be `null` and the row SHALL still be displayed.

---

### Requirement 7: Product Image Upload

**User Story:** As a manager, I want to upload an image for each product from the product
form, so that the listing is visually scannable and I can train new staff faster.

#### Acceptance Criteria

1. WHEN the user selects a file in the product form image input, THE product form SHALL
   POST that file to the Upload_API with `type=products` and SHALL store the returned
   URL in `image_url`.
2. IF the uploaded file exceeds 5 MB, THEN THE Upload_API SHALL return HTTP 400
   (existing behaviour).
3. IF the MIME type does not start with `image/`, THEN THE Upload_API SHALL return HTTP
   400 (existing behaviour).
4. WHILE a product has a non-null `image_url`, THE Products_Page SHALL render that
   image at a square aspect ratio with rounded corners consistent with the existing
   design tokens (12 px in the row, 16 px in the form preview).
5. WHILE a product has no `image_url`, THE Products_Page SHALL render a `Package` icon
   placeholder occupying the same square footprint as the image.
6. IF a product image fails to load (HTTP error, broken URL, network failure), THEN
   THE Products_Page SHALL hide the broken image element and leave the space empty,
   and SHALL NOT fall back to a placeholder icon nor display a broken-image artifact.
7. WHEN the user clears the image in the form and saves, THE Products_API SHALL persist
   `image_url = NULL` regardless of whether any prior upload attempt succeeded; the
   cleared state SHALL be applied immediately on save.
8. IF an upload returns a 4xx error from the Upload_API, THEN THE product form SHALL
   surface a non-blocking error indicator on the image input, SHALL NOT clear any
   previously saved `image_url`, and SHALL keep the form submittable with the existing
   `image_url`.
9. WHILE an image upload is in flight, THE product form SHALL disable the Save button
   so submit cannot fire mid-upload.

---

### Requirement 8: Server-Side Filtering and Pagination for Products

**User Story:** As an owner with a large catalog, I want the products page to filter and
paginate on the server, so that the page stays responsive when I have hundreds of
products.

#### Acceptance Criteria

1. THE Products_API SHALL accept `page` (default `1`), `limit` (default `25`, max
   `100`), `search` (0–100 characters; case-insensitive substring match over `name`,
   `sku`, `barcode`, `brand`), `category_id` (a positive integer when supplied),
   `stock` (one of `'in'`, `'low'`, `'out'`, `'all'`), `is_active` (boolean), and
   `sort` (one of `'name_asc'`, `'name_desc'`, `'price_asc'`, `'price_desc'`,
   `'stock_asc'`, `'stock_desc'`, `'created_desc'`, default `'name_asc'`).
2. IF `limit` is supplied with a value greater than `100`, THEN THE Products_API SHALL
   return HTTP 400 with code `ERROR_400` and SHALL NOT clamp the value silently.
3. THE Products_API SHALL return `{ data: Product[], meta: { page, limit, total,
   totalPages } }` for paginated responses.
4. WHEN `stock=low`, THE Products_API SHALL filter to rows where `stock_quantity > 0 AND
   stock_quantity <= low_stock_threshold`.
5. WHEN `stock=out`, THE Products_API SHALL filter to rows where `stock_quantity = 0`.
6. WHEN `stock=in`, THE Products_API SHALL filter to rows where `stock_quantity >
   low_stock_threshold`.
7. THE Products_Page SHALL pass search, category, stock, and active filters as URL
   parameters to the Products_API and SHALL no longer perform any of the four filters
   client-side.
8. THE Products_Page SHALL use TanStack Query's `placeholderData: keepPreviousData` so
   filter and page changes do not flash an empty state.
9. THE Products_Page SHALL render a pagination control showing current page, total
   pages, and previous/next buttons; the previous button SHALL be disabled on page 1 and
   the next button SHALL be disabled on the last page.
10. IF any of `page`, `limit`, `stock`, `sort`, `is_active`, or `category_id` is
    supplied with an invalid value (out of bounds, wrong type, unknown enum), THEN
    THE Products_API SHALL return HTTP 400 with code `ERROR_400` and SHALL NOT execute
    the query. THE error indication SHALL identify the offending parameter name.
11. WHEN `page > totalPages` and `total > 0`, THE Products_API SHALL return HTTP 200
    with `data: []` and the actual `meta` so clients can paginate back.
12. WHILE the previous-page button is disabled (page = 1) or the next-page button is
    disabled (page = totalPages, or totalPages = 0), THE Products_Page SHALL ignore
    click, keyboard, and touch activations on those buttons.

---

### Requirement 9: KPI Aggregates Endpoint for Products

**User Story:** As an owner, I want the four product KPI cards (total products, low
stock, out of stock, inventory value) to reflect the entire catalog rather than only the
current paginated page, so that the cards remain accurate when filtering or paginating.

#### Acceptance Criteria

1. THE Products_API SHALL expose `GET /api/products/stats?salon_id={id}` returning
   `{ totalProducts, lowStockCount, outOfStockCount, totalInventoryValue }` with all
   four values numeric and `>= 0`, where `outOfStockCount` counts non-deleted active
   products with `stock_quantity = 0`, `lowStockCount` counts non-deleted active
   products with `stock_quantity > 0 AND stock_quantity <= low_stock_threshold`,
   `totalInventoryValue = SUM(price * stock_quantity)` over the same set, and
   `totalProducts` counts the same set; THE response SHALL be delivered within 2,000 ms
   for catalogs of up to 10,000 products.
2. IF the caller does not satisfy Requirement 1 criteria 4 and 5 for the supplied
   `salon_id`, THEN THE Products_API SHALL return HTTP 403 with code `FORBIDDEN` and
   SHALL NOT include any aggregate values.
3. WHEN the Products_Page loads, AND WHEN a product belonging to that salon is created,
   updated, or deleted via the page, THE Products_Page SHALL re-fetch the stats
   endpoint and bind the four KPI cards to the returned values; THE Products_Page SHALL
   NOT compute the four KPIs from the paginated listing or from any client-side filter.
4. IF `salon_id` is absent, empty, malformed, or does not correspond to an existing
   salon, THEN THE Products_API SHALL return HTTP 400 with code `INVALID_SALON_ID` and
   SHALL NOT include any aggregate values.
5. IF the stats endpoint fails or does not complete within 10 seconds, THEN THE
   Products_Page SHALL render an error indicator on each of the four KPI cards and
   SHALL NOT display values from a prior successful response as authoritative.

---

### Requirement 10: Fix the Salon Filter Mismatch on Payments

**User Story:** As an owner with multiple salons, I want the sales page to show
transactions only for the salon I'm currently viewing, so that I'm not leaking data
across locations and so my totals are scoped correctly.

#### Acceptance Criteria

1. THE Payments_API listing endpoint SHALL accept the salon id under both `salon_id` and
   `salonId` query parameters and SHALL treat them as equivalent.
2. WHEN a non-admin caller is not the salon owner, THE Payments_API SHALL return only
   payments where the joined booking's `salon_id` matches a salon in which the caller
   has an Active_Staff_Record.
3. WHEN the salon owner queries the endpoint without specifying a salon, THE Payments_API
   SHALL still scope results to salons owned by the caller (current behaviour) but SHALL
   NOT return payments from unrelated salons.
4. THE Sales_Page SHALL pass the active salon id to the hook in a way that the
   Payments_API receives it (after Requirement 10.1, both names work).
5. IF the supplied `salon_id` / `salonId` is malformed (non-numeric or `<= 0`) or does
   not correspond to an existing salon, THEN THE Payments_API SHALL return HTTP 400
   with code `INVALID_SALON_ID`.
6. IF both `salon_id` and `salonId` are supplied with conflicting values, THEN THE
   Payments_API SHALL return HTTP 400 with code `ERROR_400`.

---

### Requirement 11: Honor Date and Method Filters Server-Side

**User Story:** As an owner, I want my date-range and payment-method filters to actually
filter the data returned, so that the page reflects what I'm asking for and the totals
are bounded by the chosen window.

#### Acceptance Criteria

1. WHEN `start_date` is supplied as `YYYY-MM-DD`, THE Payments_API SHALL filter to rows
   where `payments.created_at >= start_date 00:00:00` interpreted in the server
   timezone (boundary inclusive at the start of day).
2. WHEN `end_date` is supplied as `YYYY-MM-DD`, THE Payments_API SHALL filter to rows
   where `payments.created_at <= end_date 23:59:59` interpreted in the server timezone
   (boundary inclusive at the end of day).
3. WHEN `method` is supplied and equal (case-sensitive) to one of the values in the
   canonical method enum (`'card'`, `'cash'`), THE Payments_API SHALL filter to rows
   whose `payments.method` equals the value.
4. IF `method` is supplied with a value that is not in the canonical method enum,
   THEN THE Payments_API SHALL return HTTP 400 with code `ERROR_400`.
5. WHEN `status` is supplied as a Canonical_Status, THE Payments_API SHALL filter to
   rows whose `payments.status` equals the value (case-sensitive).
6. IF `start_date` or `end_date` is malformed, an invalid calendar date, or
   `start_date > end_date`, THEN THE Payments_API SHALL return HTTP 400 with code
   `ERROR_400` identifying the offending parameter and SHALL NOT execute the listing
   query.
7. IF `status` is supplied with a value that is not a Canonical_Status, THEN THE
   Payments_API SHALL return HTTP 400 with code `ERROR_400`.
8. WHEN multiple filter parameters are supplied, THE Payments_API SHALL combine them
   with logical AND.

---

### Requirement 12: Canonical Status Vocabulary on the Sales Page

**User Story:** As an owner, I want the Sales_Page status filter, status badges, and KPI
totals to reflect the values the database actually stores, so that revenue and refund
counts are not silently zero.

#### Acceptance Criteria

1. THE payments schema SHALL include `'partially_refunded'` in the `payments.status`
   enum, added via a timestamped migration file under `database/migrations/`. THE full
   enum after migration SHALL be `('pending', 'paid', 'refunded', 'partially_refunded')`.
   THE migration SHALL be idempotent so re-running it SHALL NOT raise an error and
   SHALL NOT duplicate the enum value.
2. WHEN a refund operation completes with `refunded_amount < amount` after the refund
   applies, THE Refund_API SHALL set `payments.status = 'partially_refunded'`.
3. THE Sales_Page status filter dropdown SHALL offer exactly five options in this
   order: All, Pending, Paid, Refunded, Partially refunded. THE Sales_Page status
   filter dropdown SHALL default to "All" on initial page load.
4. WHILE the Sales_Page is rendered, THE revenue KPI card SHALL compute
   `SUM(amount) - SUM(COALESCE(refunded_amount, 0))` over rows in the filtered window
   where `status IN ('paid', 'partially_refunded')`, treating `NULL` `refunded_amount`
   as `0`, and SHALL display the result rounded to 2 decimal places.
5. WHILE the Sales_Page is rendered, THE transaction-count KPI card SHALL count rows
   in the filtered window where `status IN ('paid', 'partially_refunded')`.
6. WHILE the Sales_Page is rendered, THE refund KPI card SHALL sum
   `COALESCE(refunded_amount, 0)` across all rows in the filtered window, treating
   `NULL` as `0`, and SHALL display the result rounded to 2 decimal places.
7. THE Sales_Page average-ticket KPI card SHALL compute `revenue ÷ transaction count`
   rounded to 2 decimal places. IF transaction count = 0, THEN THE average-ticket
   card SHALL display `0` and SHALL NOT perform the division.
8. THE Sales_Page row-action SHALL render the refund button for a row when
   `status IN ('paid', 'partially_refunded')` AND
   `(amount - COALESCE(refunded_amount, 0)) > 0`. Otherwise, THE refund button SHALL
   be hidden for that row.
9. WHEN a refund operation completes with `refunded_amount >= amount`, THE Refund_API
   SHALL set `payments.status = 'refunded'`.
10. IF the Refund_API attempts to write a `payments.status` value not in
    `('pending', 'paid', 'refunded', 'partially_refunded')`, THEN THE Refund_API SHALL
    reject the write, leave `payments.status` unchanged, and surface an error
    indicating an invalid status value.

---

### Requirement 13: Align Payments API Field Names With the UI

**User Story:** As a developer maintaining the Sales_Page, I want the Payments_API
response fields to match what the page reads, so that client names, booking ids, dates,
and the breakdown dialog stop rendering "Walk-in Guest" and "Invalid Date" for every
row.

#### Acceptance Criteria

1. THE Payments_API listing response SHALL include each payment as
   `{ id, booking_id, client_id, client_name, client_email, booking_datetime,
   amount, method, status, refunded_amount, tip_amount, stripe_payment_id,
   notes, created_at }`, all in snake_case for keys that the existing dashboard reads.
   `booking_datetime` and `created_at` SHALL be ISO 8601 strings in UTC. Numeric
   fields (`amount`, `refunded_amount`, `tip_amount`) SHALL default to `0` when the
   underlying database value is `NULL`.
2. THE Payments_API single-payment endpoint (`GET /api/payments/[id]`) SHALL include
   the full breakdown:
   `{ services_amount, products_amount, subtotal, discount_amount, discount_code,
   gift_card_amount, tip_amount, amount, refunded_amount }`. These values SHALL be
   computed from `booking_services`, `booking_products`, applied discounts, and
   applied gift cards in the same way `calculateBookingTotal()` in `/lib/checkout.js`
   computes them. `discount_code` SHALL default to `null` when no discount was
   applied.
3. THE Payments_API single-payment endpoint SHALL include `stripe_payment_intent_id`
   (mirroring `stripe_payment_id`) and `client_email` so the existing detail dialog
   does not need changes to those keys.
4. THE Sales_Page SHALL no longer destructure both camelCase and snake_case shapes of
   the same field; one shape (snake_case) SHALL be canonical for this page after this
   change. THE Sales_Page SHALL no longer destructure the camelCase variants
   `clientName`, `bookingId`, `bookingDatetime`, `createdAt`, or `stripePaymentId`.
5. WHEN the joined client row is missing or soft-deleted (a "walk-in" or orphan), THE
   Payments_API SHALL return `client_id = null`, `client_name = "Walk-in Guest"`, and
   `client_email = null` in the listing payload, without throwing or omitting the row.

---

### Requirement 14: Refund Endpoint Contract Alignment

**User Story:** As a manager processing a refund, I want the refund to actually run with
my reason and notes intact, and I want partial refunds to land in a status the rest of
the application recognises, so that the audit trail and the badges are correct.

#### Acceptance Criteria

1. THE Refund_API SHALL accept request bodies containing
   `{ paymentId, amount, reason, notes }` (the existing `useProcessRefund` hook
   payload), where `paymentId` is a positive integer, `amount` is a positive decimal
   with `<= 2` decimal places, `reason` is 1–100 characters after trim, and `notes`
   is 0–2000 characters.
2. THE Refund_API SHALL persist `notes` to `refunds.reason` by setting
   `refunds.reason = reason + (notes ? '\n' + notes : '')` (no migration needed). THE
   selected approach SHALL preserve `reason` as a non-null short label.
3. THE Refund_API SHALL write to the `refunds` table for every refund (already does)
   with `processed_by = session.userId`.
4. WHEN the refund succeeds, THE Refund_API SHALL insert one row into `audit_logs` with
   `entity_type='payment'`, `entity_id=paymentId`, `action='refund'`, and `new_data`
   containing `{ amount, reason, isPartial }`, where `isPartial` is defined as
   `(previousRefundedAmount + amount) < paymentAmount`.
5. THE Refund_API SHALL NOT write an `audit_logs` entry for refund attempts that fail
   validation, fail Stripe, or otherwise do not produce a `refunds` row; the failure
   path SHALL NOT insert any row into `audit_logs`.
6. IF the requested refund amount exceeds the remaining refundable amount
   (`amount - refunded_amount`), THEN THE Refund_API SHALL return HTTP 400 with code
   `REFUND_EXCEEDS_REMAINING` and SHALL NOT call Stripe nor mutate any row.
7. WHEN a refund causes booking products to need stock reversal, THE Refund_API SHALL
   delegate to existing checkout helpers (`addProductToBooking()` with negative
   quantity is the existing pattern) rather than directly mutating
   `products.stock_quantity`. WHERE the refund does not include any booking-product
   line items, THE Refund_API MAY skip stock adjustment and document this in an
   inline comment.
8. IF `paymentId` is missing or invalid, `amount <= 0`, `reason` is empty after trim,
   or any field violates the bounds in (1), THEN THE Refund_API SHALL return HTTP 400
   with code `ERROR_400` and SHALL NOT call Stripe nor mutate any row.
9. WHEN no authenticated session is present, THE Refund_API SHALL return HTTP 401 with
   code `UNAUTHORIZED` and SHALL NOT call Stripe nor mutate any row.

---

### Requirement 15: Authorize Refunds for Managers

**User Story:** As a manager with the `sales` permission, I want to be able to issue
refunds, so that I don't have to escalate every refund to the owner.

#### Acceptance Criteria

1. WHEN an authenticated caller has the `sales.manage` permission resolved as `true`
   by the Permission_Engine for the salon owning the payment, OR is the salon owner,
   OR is an admin, THE Refund_API SHALL allow the refund to proceed.
2. IF the caller is not an admin, not the salon owner, and lacks `sales.manage` for
   the salon owning the payment, THEN THE Refund_API SHALL return HTTP 403 with code
   `FORBIDDEN` leaving the payment record unmodified.
3. WHEN no authenticated session is present, THE Refund_API SHALL return HTTP 401
   with code `UNAUTHORIZED`.

---

### Requirement 16: Daily Revenue Chart on the Sales Page

**User Story:** As an owner, I want to see a small line chart of my daily revenue over
the selected date range, so that I can spot trends and anomalies at a glance.

#### Acceptance Criteria

1. THE Payments_API SHALL expose `GET /api/payments/daily-totals?salonId={id}&
   start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` returning an array of
   `{ date: 'YYYY-MM-DD', revenue: number, transactions: number, refunded: number }`,
   one entry per day in the inclusive range, with `0` values for days without
   transactions. THE rows SHALL be ordered by `date ASC` with exactly one entry per
   day, and `revenue` SHALL match the net-revenue computation in Requirement 12
   criterion 4.
2. THE Payments_API daily-totals endpoint SHALL apply the same authorization as
   Requirement 10.
3. THE Sales_Page SHALL render a line chart of `revenue` per day under the four KPI
   cards, sized to the existing card width and using **Recharts** (already in
   dependencies). THE chart SHALL re-fetch when the date range changes.
4. WHILE the daily-totals query is loading, THE Sales_Page SHALL show a skeleton
   placeholder of the same width and same height as the chart; the previous chart
   SHALL be hidden until the new response arrives.
5. IF `salon_id`/`salonId` is missing or invalid, OR `start_date > end_date`, OR
   `start_date` and `end_date` span more than 366 days, OR either date is malformed,
   THEN THE daily-totals endpoint SHALL return HTTP 400 with code `ERROR_400`.
6. WHEN the date range changes on the Sales_Page, THE Sales_Page SHALL trigger a
   re-fetch within 500 ms.
7. IF the daily-totals query fails, THEN THE Sales_Page SHALL render a single retry
   button in place of the chart and SHALL NOT keep showing stale data as
   authoritative.

---

### Requirement 17: CSV Export

**User Story:** As an owner, I want to export my products and my sales transactions as
CSV, so that I can do offline analysis, share with my accountant, and back up critical
data.

#### Acceptance Criteria

1. THE Products_Page SHALL provide an "Export CSV" action that calls
   `GET /api/products/export.csv?salon_id={id}` with the active filters as query
   parameters. THE active filter URL parameters SHALL include `search`, `category_id`,
   `stock`, `is_active`, and `sort` (matching the listing endpoint's contract).
2. THE Products_API CSV endpoint SHALL stream a CSV with header row
   `id,name,brand,sku,barcode,category,price,cost_price,stock_quantity,
   low_stock_threshold,is_active,created_at` and one row per non-deleted product
   matching the filters.
3. THE Sales_Page CSV button SHALL call `GET /api/payments/export.csv` with the active
   filters and SHALL no longer be a no-op.
4. THE Payments_API CSV endpoint SHALL stream a CSV with header row
   `id,booking_id,client_name,client_email,amount,refunded_amount,tip_amount,method,
   status,created_at`.
5. THE CSV endpoints SHALL apply the same authorization as the corresponding listing
   endpoints (Requirements 1 and 10).
6. THE CSV endpoints SHALL set
   `Content-Type: text/csv; charset=utf-8` and
   `Content-Disposition: attachment; filename="..."` headers using the filename
   pattern `products-{salonId}-{YYYYMMDD-HHmm}.csv` for the products endpoint and
   `payments-{salonId}-{YYYYMMDD-HHmm}.csv` for the payments endpoint.
7. THE CSV endpoints SHALL escape values that contain `,`, `"`, or newlines by
   wrapping them in double quotes and doubling internal double quotes (RFC 4180).
8. IF the calling user does not satisfy the listing-endpoint authorization
   (Requirements 1 and 10), THEN THE CSV endpoint SHALL return HTTP 403 (or HTTP 401
   when no session) with the same code as the listing endpoint and SHALL NOT stream
   any rows.
9. WHEN the result set is empty, THE CSV endpoint SHALL still return the header row
   with HTTP 200.

---

### Requirement 18: Browser-Printable Receipt

**User Story:** As a receptionist, I want to print a receipt for a customer at checkout,
so that I can hand them a paper copy without a thermal printer integration.

#### Acceptance Criteria

1. WHEN the user clicks "Print Receipt" inside the Payment Detail dialog, THE
   Sales_Page SHALL navigate to a dedicated print view at
   `/dashboard/salon/[salonId]/sales/[paymentId]/receipt` within 1 second.
2. WHEN the receipt route has fetched salon, payment, and line items, THE receipt
   view SHALL fire `window.print()` within 500 ms.
3. THE receipt view SHALL render salon name, salon address, payment id, booking id,
   client name, line items grouped by services and products with per-line-item shape
   `{ name, quantity, unit price, line total }`, and aggregate rows for discount,
   gift card, tip, total paid, refunded amount, payment method, and timestamp.
   Optional aggregate rows (discount, gift card, tip) SHALL be omitted when their
   value is `null` or `0`.
4. THE receipt view SHALL format every monetary value with `formatCurrency(amount,
   salon.currency)`.
5. THE receipt view SHALL render in a print-optimised stylesheet that hides app
   chrome and the sidebar (no animations) and SHALL fit on a single A4 page
   (210 × 297 mm) for receipts with up to 20 line items.
6. THE Sales_Page SHALL NOT render an Email Receipt button.
7. WHEN there are more than 20 line items, THE receipt view SHALL paginate across
   multiple A4 pages, repeating the header on each page.
8. IF `paymentId` does not exist, belongs to another salon, or the caller is not
   authorized, THEN THE receipt view SHALL render an inline error and SHALL NOT
   trigger `window.print()`.

---

### Requirement 19: Currency Consistency

**User Story:** As an owner trading in DZD or any currency that is not the EUR default, I
want every monetary value on Products and Sales pages to display in my salon currency,
so that no card or dialog quietly assumes EUR.

#### Acceptance Criteria

1. WHEN the Products_Page renders any monetary value, THE Products_Page SHALL pass
   `salon.currency` to every `formatCurrency()` call, including the inventory value
   KPI, the price column, the discounted price column, and the product form labels.
   THE single-argument signature `formatCurrency(amount)` is forbidden on this page.
2. WHEN the Sales_Page renders any monetary value, THE Sales_Page SHALL pass
   `salon.currency` to every `formatCurrency()` call, including the four KPI cards,
   the row amount column, the tip badge, the PaymentDetailDialog breakdown, and the
   RefundDialog summary. THE single-argument signature `formatCurrency(amount)` is
   forbidden on this page.
3. THE PaymentDetailDialog and RefundDialog SHALL accept the salon currency as a prop
   (or via the `useSalon()` hook) and SHALL no longer call `formatCurrency(amount)`
   with the default first-argument-only signature that picks the app default DZD.
4. THE RefundDialog partial-amount input prefix SHALL match the leading symbol/code
   that `formatCurrency(0, salon.currency)` produces; the literal `$` is forbidden as
   a prefix.
5. WHERE `salon.currency` is missing or empty, THE Products_Page and the Sales_Page
   SHALL fall back to the existing default in `/lib/format.js` (`'DZD'`) and SHALL
   log a single console warning per page session.

---

### Requirement 20: Audit Logging for Financial and Stock-Correction Actions

**User Story:** As an admin investigating a discrepancy, I want every refund and every
manual stock correction to leave an entry in `audit_logs`, so that I can reconstruct
who did what and when.

#### Acceptance Criteria

1. WHEN a refund is processed (full or partial) and succeeds, THE Refund_API SHALL
   insert one row into `audit_logs` with `user_id=session.userId`,
   `entity_type='payment'`, `entity_id=paymentId`, `action='refund'`, and `new_data`
   JSON containing `{ amount, reason, isPartial, refundId }`. THE insert SHALL occur
   in the same database transaction as the originating refund.
2. WHEN a manual stock correction (`reason_code IN ('manual_set',
   'manual_adjustment', 'restock', 'waste', 'correction')`) is recorded by the
   Stock_API and succeeds, THE Stock_API SHALL insert one row into `audit_logs` with
   `user_id=session.userId`, `entity_type='product'`, `entity_id=productId`,
   `action='stock_change'`, and `new_data` JSON containing `{ before, after, delta,
   reasonCode, reasonNote }`. THE insert SHALL occur in the same database
   transaction as the originating stock movement.
3. WHEN a stock change is sale-driven or refund-driven (`reason_code IN ('sale',
   'refund')`), THE Stock_API SHALL NOT insert any row into `audit_logs` for that
   movement, because the originating checkout / refund flow is already audited at
   the booking and payment level. THE Stock_Movement row SHALL still be written.
4. IF the `audit_logs` insert fails, THEN the entire originating transaction SHALL
   roll back; payment status SHALL NOT be changed and stock SHALL NOT be modified,
   and the API SHALL return HTTP 500.
5. IF `session.userId` is missing or does not correspond to an existing user, THEN
   no `audit_logs` row SHALL be written and the API SHALL return HTTP 401.

---

### Requirement 21: Role-Based UI Affordances

**User Story:** As a receptionist who can view sales but cannot refund, I want the
refund button to be hidden so I don't see actions I can't perform.

#### Acceptance Criteria

1. THE Sales_Page SHALL render the refund button on a row only when the resolved
   `sales.manage` permission is `true` (or the caller is the salon owner or an
   admin) AND the row's status meets Requirement 12 (8). For non-owners and
   non-admins, the resolved permission depends on the per-staff override. WHERE the
   condition is not met, the affordance SHALL be omitted from the DOM (not merely
   disabled).
2. THE Products_Page SHALL render the "Add product", "Edit", "Delete", and "Update
   stock" affordances only when the resolved `products.manage` permission is `true`
   (or the caller is the salon owner or an admin). WHERE the user is restricted to
   view-only by a permission override, THE Products_Page SHALL still render the
   table and the search/filter bar. WHERE the condition is not met, the affordances
   SHALL be omitted from the DOM (not merely disabled).
3. THE existing `<RequirePermission page="products" />` and
   `<RequirePermission page="sales" />` page guards SHALL remain in place; this
   requirement adds in-page affordance gating beneath the page-level guard.
4. WHILE the caller has `products.view = true`, `products.manage = false`, AND is
   not an owner or admin, THE Products_Page SHALL render the table, search, filter
   bar, and KPIs in read-only mode and SHALL NOT render any row-level Edit, Delete,
   or Update Stock affordances.

---

### Requirement 22: Backwards Compatibility With the Booking Checkout

**User Story:** As an existing customer of the platform with live bookings in flight, I
want the checkout and stock decrement flows to keep working unchanged through this
migration, so that introducing stock movements and the new payments status doesn't
break in-progress sales.

#### Acceptance Criteria

1. THE existing canonical entry points `calculateBookingTotal()`,
   `addProductToBooking()`, and `processCheckout()` in `/lib/checkout.js` SHALL
   continue to be the only paths that decrement product stock during a sale.
2. WHEN `processCheckout()` runs, THE checkout flow SHALL insert a Stock_Movement row
   per affected booking-product, with `reason_code = 'sale'` and `booking_id` set, in
   the same transaction as the existing booking-product writes. IF the Stock_Movement
   insert fails, THEN the transaction SHALL roll back and the entire checkout SHALL
   fail; the payment SHALL NOT be marked `paid` and product stock SHALL NOT be
   decremented.
3. THE migration adding `partially_refunded` to `payments.status` SHALL be additive
   only, defined as: no `UPDATE` on existing rows, no rewriting of historical
   statuses, and no change to the column's `DEFAULT`.
4. THE migration adding `brand` to `products` SHALL default the column to `NULL` and
   SHALL NOT touch any existing row.
5. THE migration adding `product_stock_movements` SHALL not backfill historical sales
   into the table; the table starts empty and grows from the deploy date forward.

---

### Requirement 23: Out of Scope (explicit)

**User Story:** As the team scoping this work, I want a clear list of things that are
intentionally not delivered by this spec, so that the design phase doesn't accidentally
expand scope.

#### Acceptance Criteria

1. THE spec SHALL NOT introduce a walk-in / booking-less point-of-sale flow on the
   UI.
2. THE `payments.booking_id` column SHALL remain `NOT NULL UNIQUE`.
3. THE spec SHALL NOT introduce CSV import or any other file-based bulk import for
   products. Bulk creation is deferred.
4. THE spec SHALL NOT introduce bulk multi-select operations (bulk price update, bulk
   stock update). Deferred to a future spec.
5. THE spec SHALL NOT introduce receipt sending over email, SMS, in-app, or any
   non-print channel. Print-only.
6. THE spec SHALL NOT modify Stripe Connect onboarding, payouts, or marketplace
   product listing.
7. THE spec SHALL NOT add a per-staff sales/cashier filter on the Sales_Page.
8. THE spec SHALL NOT add a cashier column on the `payments` table; tracking the
   cashier is deferred.
