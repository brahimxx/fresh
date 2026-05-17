// Feature: products-and-sales-improvements
//
// Shared generator library for property-based tests under `tests/properties/`.
//
// All generators are vanilla `fc.Arbitrary` values, so callers control
// determinism by passing `seed` (and optionally `path`) to `fc.assert`:
//
//   fc.assert(fc.property(productArb, (p) => /* ... */), { seed: 1234, numRuns: 100 });
//
// The CI suite pins `seed` for reproducibility; locally tests can omit it
// to broaden coverage.
//
// References:
//  - design.md "Testing Strategy" (PBT layout, fast-check stack)
//  - permissions.js (role enum + permission keys)
//  - tasks.md task 2.2

import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Constants — kept in sync with the codebase's enums.
// ---------------------------------------------------------------------------

export const STAFF_ROLES = ['owner', 'manager', 'receptionist', 'staff'];

/**
 * Permission keys mirrored from `src/lib/permissions.js#PERMISSION_KEYS`,
 * plus the two granular keys introduced by this spec (task 2.5):
 * `products_manage` and `sales_manage`.
 *
 * Kept as a literal so generators don't take a runtime dependency on the
 * module under test (lets `validation-400.pbt` exercise the permission
 * engine without import cycles).
 */
export const PERMISSION_KEYS = Object.freeze([
  'analytics',
  'calendar_all',
  'bookings_all',
  'clients',
  'services_edit',
  'team',
  'products',
  'products_manage',
  'sales',
  'sales_manage',
  'marketing',
  'reports',
  'settings_business',
  'settings_hours',
  'settings_billing',
  'add_location',
  'gallery',
]);

export const PAYMENT_STATUSES = ['pending', 'paid', 'refunded', 'partially_refunded'];
export const PAYMENT_METHODS = ['card', 'cash'];
export const STOCK_MODES = ['set', 'add', 'subtract'];
export const STOCK_REASON_CODES_MANUAL = [
  'manual_set',
  'manual_adjustment',
  'restock',
  'waste',
  'correction',
];
export const STOCK_REASON_CODES_AUTOMATED = ['sale', 'refund'];
export const STOCK_REASON_CODES_ALL = [
  ...STOCK_REASON_CODES_MANUAL,
  ...STOCK_REASON_CODES_AUTOMATED,
];

// ISO-4217 currency codes the dashboard renders today (DZD is the legacy
// default — see Requirement 19). The list is intentionally short; property
// tests only need representative coverage, not exhaustiveness.
export const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'DZD', 'JPY', 'CAD'];

// ---------------------------------------------------------------------------
// Money & numeric helpers
// ---------------------------------------------------------------------------

/**
 * A non-negative monetary amount with at most 2 decimal places, stored as a
 * regular `number`. Values are bounded so multiplication / aggregation in
 * downstream properties stays within safe-integer range.
 */
export const moneyArb = fc
  .integer({ min: 0, max: 1_000_000_00 }) // cents
  .map((cents) => Math.round(cents) / 100);

/** A strictly positive monetary amount (≥ 0.01). */
export const positiveMoneyArb = fc
  .integer({ min: 1, max: 1_000_000_00 })
  .map((cents) => cents / 100);

// ---------------------------------------------------------------------------
// String generators — names, emails, brand edge cases.
// ---------------------------------------------------------------------------

const printableAsciiCharArb = fc
  .integer({ min: 0x20, max: 0x7e })
  .map((c) => String.fromCharCode(c));

const printableAsciiArb = fc.stringOf(printableAsciiCharArb, {
  minLength: 1,
  maxLength: 60,
});

/**
 * Brand strings exercise the surrogate-pair, bidi-override, and
 * non-Latin-script edges called out by tasks 2.2 and the field round-trip
 * property (Property 12). The generator is a `oneof` over:
 *   - plain ASCII (most common path)
 *   - full-Unicode (includes surrogate pairs by construction)
 *   - hand-picked nasty literals: RTL/LTR overrides, ZWJ, NBSP, emoji
 *     joiners, bidi marks, mathematical script alphabet (surrogate pair
 *     backed), and trailing whitespace that the API trims.
 */
const brandLiteralsArb = fc.constantFrom(
  "L'Oréal",
  'KÉRASTASE',
  'مرحبا', // Arabic, RTL
  'שלום', // Hebrew, RTL
  '资生堂', // CJK
  '𝒩𝒶𝓂𝑒', // Mathematical script (surrogate pairs)
  '🦄💅 Brand', // Emoji + ZWJ-adjacent
  '\u202Eevil\u202C', // RTL override sandwich
  '\u200Fbrand\u200E', // Bidi marks
  '  spaced  ', // Trim semantics
  'A'.repeat(120), // Boundary: max length after trim
);

export const brandArb = fc.oneof(
  { weight: 4, arbitrary: printableAsciiArb },
  { weight: 2, arbitrary: fc.fullUnicodeString({ minLength: 1, maxLength: 120 }) },
  { weight: 2, arbitrary: brandLiteralsArb },
  // Explicit null — `null` and empty string both persist as SQL NULL
  // (Requirement 5.5).
  { weight: 1, arbitrary: fc.constant(null) },
  { weight: 1, arbitrary: fc.constant('') },
);

const emailLocalArb = fc
  .stringOf(printableAsciiCharArb, { minLength: 1, maxLength: 24 })
  .map((s) => s.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24) || 'user');

const emailArb = fc
  .tuple(emailLocalArb, fc.constantFrom('example.com', 'test.io', 'salon.fr', 'mail.dev'))
  .map(([local, domain]) => `${local}@${domain}`);

const personNameArb = fc.oneof(
  printableAsciiArb,
  fc.constantFrom('Sami T.', 'Léa Dubois', '小林 花子', 'محمد علي'),
);

// ---------------------------------------------------------------------------
// Domain entities
// ---------------------------------------------------------------------------

/** A salon row sufficient for permission and currency-sensitive property tests. */
export const salonArb = fc.record({
  id: fc.integer({ min: 1, max: 1_000_000 }),
  name: fc.string({ minLength: 1, maxLength: 80 }),
  currency: fc.constantFrom(...CURRENCY_CODES),
  owner_id: fc.integer({ min: 1, max: 1_000_000 }),
});

/** A user row. `is_admin` exercises the admin branch in `assertSalonAccess`. */
export const userArb = fc.record({
  id: fc.integer({ min: 1, max: 1_000_000 }),
  name: personNameArb,
  email: emailArb,
  is_admin: fc.boolean(),
});

/**
 * A `staff.permissions` JSON column value. The generator yields:
 *   - `null` (no overrides — fall through to role default)
 *   - a partial object with a random subset of permission keys flipped to
 *     explicit booleans, so the resolver's "override beats default" path is
 *     exercised in both directions.
 */
export const customPermissionsArb = fc.oneof(
  { weight: 1, arbitrary: fc.constant(null) },
  {
    weight: 4,
    arbitrary: fc
      .subarray(PERMISSION_KEYS, { minLength: 0, maxLength: PERMISSION_KEYS.length })
      .chain((keys) =>
        fc
          .tuple(...keys.map(() => fc.boolean()))
          .map((values) => Object.fromEntries(keys.map((k, i) => [k, values[i]]))),
      ),
  },
);

/**
 * An `Active_Staff_Record` (or a soft-deleted/inactive variant). Generators
 * for cross-salon authorization tests rely on `is_active` and `deleted_at`
 * to construct denial paths.
 */
export const staffRecordArb = fc.record({
  id: fc.integer({ min: 1, max: 1_000_000 }),
  user_id: fc.integer({ min: 1, max: 1_000_000 }),
  salon_id: fc.integer({ min: 1, max: 1_000_000 }),
  role: fc.constantFrom(...STAFF_ROLES),
  is_active: fc.boolean(),
  deleted_at: fc.oneof(
    { weight: 4, arbitrary: fc.constant(null) },
    {
      weight: 1,
      arbitrary: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    },
  ),
  permissions: customPermissionsArb,
});

/**
 * A category set — non-deleted categories for a single salon, ordered by
 * `display_order ASC, name ASC` (Requirement 6.1).
 */
export const categorySetArb = fc
  .uniqueArray(
    fc.record({
      id: fc.integer({ min: 1, max: 1_000_000 }),
      name: fc
        .string({ minLength: 1, maxLength: 100 })
        .map((s) => {
          const trimmed = s.trim();
          // Guarantee 1–100 chars after trim so the row is API-valid.
          return trimmed.length === 0 ? 'Category' : trimmed.slice(0, 100);
        }),
      display_order: fc.integer({ min: 0, max: 9_999 }),
    }),
    {
      minLength: 0,
      maxLength: 12,
      selector: (c) => c.id,
    },
  )
  .map((items) =>
    [...items].sort((a, b) => {
      if (a.display_order !== b.display_order) return a.display_order - b.display_order;
      return a.name.localeCompare(b.name);
    }),
  );

/**
 * A product row, in the canonical snake_case shape returned by the listing
 * endpoint (design § Components / Listing). Brand exercises the edge cases
 * called out by task 2.2; `category_id` may be `null` (Requirement 6.12).
 */
export const productArb = fc.record({
  id: fc.integer({ min: 1, max: 1_000_000 }),
  salon_id: fc.integer({ min: 1, max: 1_000_000 }),
  category_id: fc.option(fc.integer({ min: 1, max: 1_000_000 }), { nil: null, freq: 3 }),
  brand: brandArb,
  name: fc.string({ minLength: 1, maxLength: 200 }),
  sku: fc.option(fc.string({ minLength: 1, maxLength: 60 }), { nil: null }),
  barcode: fc.option(fc.string({ minLength: 1, maxLength: 60 }), { nil: null }),
  price: positiveMoneyArb,
  cost_price: moneyArb,
  stock_quantity: fc.nat({ max: 1_000_000 }),
  low_stock_threshold: fc.nat({ max: 1_000 }),
  is_active: fc.constantFrom(0, 1),
  image_url: fc.option(
    fc.string({ minLength: 1, maxLength: 200 }).map((s) => `/uploads/products/${s}`),
    { nil: null, freq: 2 },
  ),
});

/**
 * A payment row in the canonical snake_case shape (Requirement 13.1) with
 * monetary defaults coerced to non-null numbers.
 */
export const paymentArb = fc
  .record({
    id: fc.integer({ min: 1, max: 1_000_000 }),
    booking_id: fc.integer({ min: 1, max: 1_000_000 }),
    salon_id: fc.integer({ min: 1, max: 1_000_000 }),
    client_id: fc.option(fc.integer({ min: 1, max: 1_000_000 }), { nil: null, freq: 4 }),
    client_name: personNameArb,
    client_email: fc.option(emailArb, { nil: null, freq: 4 }),
    booking_datetime: fc.date({
      min: new Date('2023-01-01T00:00:00Z'),
      max: new Date('2027-12-31T23:59:59Z'),
    }),
    amount: positiveMoneyArb,
    method: fc.constantFrom(...PAYMENT_METHODS),
    status: fc.constantFrom(...PAYMENT_STATUSES),
    refunded_amount: moneyArb,
    tip_amount: moneyArb,
    stripe_payment_id: fc.option(
      fc.string({ minLength: 10, maxLength: 32 }).map((s) => `pi_${s}`),
      { nil: null },
    ),
    notes: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
    created_at: fc.date({
      min: new Date('2023-01-01T00:00:00Z'),
      max: new Date('2027-12-31T23:59:59Z'),
    }),
  })
  // Maintain the invariant `refunded_amount <= amount` so the generator
  // doesn't produce impossible rows for the aggregates property test
  // (negative refund-status triples have their own arbitrary below).
  .map((p) => ({
    ...p,
    refunded_amount: Math.min(p.refunded_amount, p.amount),
  }));

/**
 * A refund triple `(amount, previousRefunded, refundAmount)` covering the
 * status-transition property (Property 10) and the over-refund branch.
 *
 * `refundAmount` may exceed `amount - previousRefunded` so the
 * `REFUND_EXCEEDS_REMAINING` path is exercised; callers filter as needed.
 */
export const refundTripleArb = fc
  .record({
    amount: positiveMoneyArb,
    // previousRefunded ∈ [0, amount]
    previousRefunded: moneyArb,
    // refundAmount ∈ (0, 2*amount] so over-refund is reachable
    refundAmount: positiveMoneyArb,
  })
  .map(({ amount, previousRefunded, refundAmount }) => ({
    amount,
    previousRefunded: Math.min(previousRefunded, amount),
    refundAmount,
  }));

/**
 * Stock-movement triple `(currentQty, mode, quantity)` — the input space
 * for Property 6 (clamp-at-zero arithmetic).
 */
export const stockMovementTripleArb = fc.record({
  currentQty: fc.nat({ max: 1_000_000 }),
  mode: fc.constantFrom(...STOCK_MODES),
  quantity: fc.nat({ max: 1_000_000 }),
});

// ---------------------------------------------------------------------------
// Date ranges with DST and year boundaries.
// ---------------------------------------------------------------------------

// US DST transitions (second Sunday of March / first Sunday of November)
// and EU DST transitions (last Sunday of March / last Sunday of October)
// for a few representative years, plus year boundaries. Including these
// concretely in the generator's pool guarantees we hit them at low
// `numRuns` rather than relying on uniform sampling to find them.
const DST_AND_YEAR_EDGES = Object.freeze([
  '2023-03-12', // US spring forward 2023
  '2023-11-05', // US fall back 2023
  '2023-03-26', // EU spring forward 2023
  '2023-10-29', // EU fall back 2023
  '2023-12-31',
  '2024-01-01',
  '2024-02-29', // Leap day
  '2024-03-10', // US spring forward 2024
  '2024-03-31', // EU spring forward 2024
  '2024-10-27', // EU fall back 2024
  '2024-11-03', // US fall back 2024
  '2024-12-31',
  '2025-01-01',
  '2025-03-09',
  '2025-11-02',
  '2025-12-31',
  '2026-01-01',
  '2026-12-31',
]);

const isoDateArb = fc.oneof(
  { weight: 1, arbitrary: fc.constantFrom(...DST_AND_YEAR_EDGES) },
  {
    weight: 2,
    arbitrary: fc
      .date({ min: new Date('2023-01-01'), max: new Date('2027-12-31') })
      .map((d) => d.toISOString().slice(0, 10)),
  },
);

/**
 * An inclusive `{ start_date, end_date }` pair as `YYYY-MM-DD` strings,
 * with `start_date <= end_date` and the span capped at 366 days
 * (Requirement 16.5). Heavily samples DST and year-boundary dates.
 */
export const dateRangeArb = fc
  .tuple(isoDateArb, isoDateArb)
  .map(([a, b]) => (a <= b ? { start_date: a, end_date: b } : { start_date: b, end_date: a }))
  .filter(({ start_date, end_date }) => {
    const ms = Date.parse(`${end_date}T00:00:00Z`) - Date.parse(`${start_date}T00:00:00Z`);
    return ms >= 0 && ms / 86_400_000 <= 366;
  });

// ---------------------------------------------------------------------------
// Convenience: a bundle that other PBT files can `import * as arb from`
// without listing names. Re-exports cover the full surface.
// ---------------------------------------------------------------------------

export const arbitraries = Object.freeze({
  brand: brandArb,
  money: moneyArb,
  positiveMoney: positiveMoneyArb,
  salon: salonArb,
  user: userArb,
  customPermissions: customPermissionsArb,
  staffRecord: staffRecordArb,
  categorySet: categorySetArb,
  product: productArb,
  payment: paymentArb,
  refundTriple: refundTripleArb,
  stockMovementTriple: stockMovementTripleArb,
  dateRange: dateRangeArb,
});
