# Core Logic & Flow Review

This document outlines the "Internal Brain" and the "Golden Rules" of the Fresh app.

## 1. Booking Flow

**How does a guest interaction in the 'Widget' create a record in the database?**
All booking creation routes into a single authoritative function: `createSafeBooking()` in `src/lib/booking.js`. The flow guarantees safety and prevents double bookings via strict transaction controls:
1. **Validation & Fast-Fail**: Input is validated and staff working hours are checked outside the transaction.
2. **Transaction & Locking**: A transaction begins and uses `SELECT ... FOR UPDATE` to lock conflicting booking rows. This prevents concurrent requests from double-booking the same staff member.
3. **Internal Checks**: Staff time-off is checked *inside* the transaction to ensure it hasn't changed concurrently. 
4. **Discounts & Gift Cards**: Verified and applied dynamically.
5. **Atomic Insert**: The `bookings` row, `booking_services` rows, and `salon_clients` relationship are all atomically inserted. Platform fees are dynamically generated if it's a new client from the marketplace.

```javascript
// snippet from src/lib/booking.js
export async function createSafeBooking({ salonId, clientId, primaryStaffId, startDatetime, services, ... }) {
  // ... validation ...
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    // Lock overlapping bookings
    const [conflicts] = await conn.execute(
      `SELECT b.id FROM bookings b WHERE ... AND b.start_datetime < ? AND b.end_datetime > ? FOR UPDATE`,
      [endFmt, startFmt]
    );
    if (conflicts.length > 0) throw new BookingError("BOOKING_CONFLICT", "...");

    // ... atomic inserts for bookings, booking_services, salon_clients ...
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  }
}
```

## 2. Permissions

**How are the 5 roles (Admin, Owner, Manager, Staff, Client) enforced in the code?**
Authentication is built on stateless JWTs handled in `src/lib/auth.js`. The system checks `Authorization: Bearer` headers first (for API/mobile access) and falls back to HTTP-only cookies for the Next.js frontend.
Role enforcement works symmetrically across the platform:
- `requireRole(allowedRoles)` restricts server actions and page renders.
- Within Route Handlers (`src/app/api/...`), a fast-return pattern is heavily utilised. For example, `if (role === 'admin') return true;` bypasses standard salon ownership checks, giving Mission Control personnel global access.
- **Manager Role**: Note that "Manager" is *not* a global user role in the `users` table ENUM. Rather, it is an employment tier stored in the `staff` table. When impersonating or defining manager access, the system looks up `staff.role = 'manager'` and enriches the session token with the relevant `staffId` and `salonId`.

```javascript
// snippet from src/lib/auth.js
export async function requireRole(allowedRoles) {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    throw new Error("Forbidden");
  }
  return session;
}
```

## 3. Data Integrity

**Soft Delete Logic:**
Instead of destroying records, the application relies on soft delete sentinels.
- **Users**: User accounts utilize a standard `deleted_at` timestamp in the `users` table. The old `role != 'deleted'` logic has been fully migrated to use `deleted_at IS NULL`.
- **Relationship Tables**: Mapping tables, such as `salon_clients`, use an `is_active` boolean column (e.g., `is_active = 1`) to flag active relationships rather than a timestamp.

**Client Deduplication:**
Deduplication is strictly centralized in `src/lib/client.js` via `findOrCreateClient()`.
It ensures:
1. **Phone-First Resolution**: Uses `SELECT ... FOR UPDATE` by normalized phone number to serialize concurrent client creations.
2. **Email Fallback**: Attempts email matching if phone isn't present.
3. **Constraint Recovery**: If two concurrent inserts race and hit the `uq_users_email` unique constraint, it catches the `ER_DUP_ENTRY` error and re-fetches the winning row, preventing phantom duplicate accounts.

```javascript
// snippet from src/lib/client.js
if (insertErr.code === "ER_DUP_ENTRY" && email) {
  const [[raceRow]] = await conn.execute(
    "SELECT id FROM users WHERE email = ? LIMIT 1", [email]
  );
  insertId = raceRow.id;
}
```

## 4. Financials

**How are payouts and GMV currently calculated in the backend?**
Checkout and total computations *never* trust the frontend. In `src/lib/checkout.js`, `calculateBookingTotal()` aggregates values strictly from database rows:
`Total = SUM(services) + SUM(products) - SUM(discounts) - SUM(gift_cards)`.

For GMV and Payout logic, the system relies on `platform_fees` generated at booking and checkout, and interacts directly with Stripe Connect:
- **Acquisition Fees**: If a new client is generated via the marketplace (`source === 'marketplace'`), a 20% platform fee is automatically inserted into `platform_fees` during transaction commit.
- **Promotional Absorption**: Platform-wide promo codes (`global_discounts`) are recorded as negative `platform_fees` to subsidize the discount. During payouts, the `(- (-amountSaved))` calculation ensures the salon receives full price while the platform absorbs the financial hit.
- **Stripe Transfers & Refunds**: `src/app/api/admin/payouts/route.js` and `src/app/api/admin/bookings/[id]/refund/route.js` map directly to `stripe.transfers.create` and `stripe.refunds.create`. The platform uses live Stripe Webhooks to asynchronously listen for `payout.paid` or `payout.failed` and updates the database payload statuses accordingly.
- **Audit Logging**: Any bulk or administrative financial action explicitly writes an immutable tracking record to the `audit_logs` table (capturing user_id, action, entity_id, and JSON new_data) to maintain accountability.

```javascript
// snippet from src/lib/checkout.js
export async function calculateBookingTotal(bookingId, conn) {
  const [[servicesRow]] = await conn.query("SELECT COALESCE(SUM(price), 0) AS total FROM booking_services WHERE booking_id = ?", [bookingId]);
  const [[productsRow]] = await conn.query("SELECT COALESCE(SUM(total_price), 0) AS total FROM booking_products WHERE booking_id = ?", [bookingId]);
  // ... calculates and returns definitive finalTotal
}
```
