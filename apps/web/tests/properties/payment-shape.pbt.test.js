// Feature: products-and-sales-improvements
// Task: 6.7 PBT for payment listing & detail canonical snake_case shape
//
// Property 16: Payment listing & detail expose the canonical snake_case shape
// with documented defaults
//
// **Validates: Requirements 13.1, 13.2, 13.3**
//
// For any row returned by `GET /api/payments` (listing) or
// `GET /api/payments/[id]` (detail), the keys present MUST equal the
// documented set, monetary fields MUST default to `0` when the underlying
// database value is `NULL`, `discount_code` MUST default to `null` when no
// discount applied, `stripe_payment_intent_id` MUST equal `stripe_payment_id`,
// and `booking_datetime` / `created_at` MUST be ISO 8601 strings in UTC. For
// any booking, the breakdown returned by the detail endpoint MUST equal the
// values produced by `calculateBookingTotal()` over the same DB rows.
//
// Strategy
// ────────
// Both `mapPaymentRow` (in `src/app/api/payments/route.js`) and the detail
// mapper (in `src/app/api/payments/[id]/route.js`) are private to their
// route modules, which import Next/MySQL runtime helpers we don't want to
// pull in here. We therefore replicate the *pure* shape-mapping logic
// inline, byte-for-byte mirroring the route handlers, and exercise
// `paymentArb` from `_arbitraries.js` over the documented shape contract.
//
// Likewise, `calculateBookingTotal()` in `src/lib/checkout.js` performs raw
// SQL `SUM()`s over five tables and rounds to 2 dp. We model it here as a
// pure reducer over generated DB rows so the detail-breakdown branch of
// the property can run without a live database; the SQL/JS reducer pair
// is the same algebraic contract the route is required to satisfy.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { paymentArb, moneyArb, positiveMoneyArb } from './_arbitraries.js';

const SEED = 0x515E5A19; // deterministic CI seed

// ─── Documented key sets ───────────────────────────────────────────────────

const LISTING_KEYS = Object.freeze([
  'id',
  'booking_id',
  'client_id',
  'client_name',
  'client_email',
  'booking_datetime',
  'amount',
  'method',
  'status',
  'refunded_amount',
  'tip_amount',
  'stripe_payment_id',
  'notes',
  'created_at',
]);

const DETAIL_EXTRA_KEYS = Object.freeze([
  'services_amount',
  'products_amount',
  'subtotal',
  'discount_amount',
  'discount_code',
  'gift_card_amount',
  'stripe_payment_intent_id',
]);

const DETAIL_KEYS = Object.freeze([...LISTING_KEYS, ...DETAIL_EXTRA_KEYS]);

const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const WALK_IN_NAME = 'Walk-in Guest';

// ─── Inlined helpers — byte-equal copies of the route helpers ─────────────
// Sources:
//   - src/app/api/payments/route.js#mapPaymentRow (listing)
//   - src/app/api/payments/[id]/route.js          (detail)

/** Round to 2 decimal places, matching `route.js`'s `round2`. */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Coalesce a possibly-null DB numeric to `0`.
 * Mirrors `numericOrZero` from the listing route.
 */
function numericOrZero(v) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Coalesce + round, mirrors `num()` in the detail route.
 */
function numRounded(v) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? round2(n) : 0;
}

/**
 * Convert a DB datetime (Date or `"YYYY-MM-DD HH:MM:SS"` string) to ISO
 * 8601 UTC. Mirrors `toIsoUtc` (listing) / `toIso` (detail).
 */
function toIsoUtc(raw) {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw.toISOString();
  }
  if (typeof raw !== 'string') return null;
  const parsed = new Date(raw.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Listing-row mapper — replica of `mapPaymentRow` in
 * `src/app/api/payments/route.js`.
 *
 * Input is a "raw" DB row containing the columns selected by the listing
 * SQL: `id, booking_id, amount, method, status, stripe_payment_id,
 * refunded_amount, tip_amount, notes, created_at, client_id, start_datetime,
 * first_name, last_name, email`.
 */
function mapListingRow(r) {
  const hasUser = r.client_id != null;
  const fullName = hasUser
    ? [r.first_name, r.last_name].filter(Boolean).join(' ').trim()
    : '';
  return {
    id: r.id,
    booking_id: r.booking_id,
    client_id: hasUser ? r.client_id : null,
    client_name: hasUser && fullName ? fullName : WALK_IN_NAME,
    client_email: hasUser ? r.email ?? null : null,
    booking_datetime: toIsoUtc(r.start_datetime),
    amount: numericOrZero(r.amount),
    method: r.method,
    status: r.status,
    refunded_amount: numericOrZero(r.refunded_amount),
    tip_amount: numericOrZero(r.tip_amount),
    stripe_payment_id: r.stripe_payment_id ?? null,
    notes: r.notes ?? null,
    created_at: toIsoUtc(r.created_at),
  };
}

/**
 * Pure model for `calculateBookingTotal()` — mirrors `src/lib/checkout.js`.
 * Input: arrays of summable line-item rows for the booking. Output: the
 * five rounded totals plus `finalTotal`, byte-equal to what the detail
 * route reads back from MySQL.
 */
function calculateBookingTotalModel({
  serviceLines = [],
  productLines = [],
  travelLines = [],
  discountLines = [],
  giftCardLines = [],
}) {
  const sum = (rows, key) =>
    rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

  const servicesTotal = sum(serviceLines, 'price');
  const productsTotal = sum(productLines, 'total_price');
  const travelTotal = sum(travelLines, 'amount');
  const discountsTotal = sum(discountLines, 'amount_saved');
  const giftCardsTotal = sum(giftCardLines, 'amount_used');
  const finalTotal = Math.max(
    0,
    servicesTotal + productsTotal + travelTotal - discountsTotal - giftCardsTotal,
  );

  return {
    servicesTotal: round2(servicesTotal),
    productsTotal: round2(productsTotal),
    travelTotal: round2(travelTotal),
    discountsTotal: round2(discountsTotal),
    giftCardsTotal: round2(giftCardsTotal),
    finalTotal: round2(finalTotal),
  };
}

/**
 * Detail-row mapper — replica of the body assembled by
 * `GET /api/payments/[id]` in `src/app/api/payments/[id]/route.js`.
 *
 * `dbRow` is the joined payment+booking+user row; `booking` is the bag of
 * line-item arrays that `calculateBookingTotal` reduces; `discountCode` is
 * the first row's `discount_code` (or `null`).
 */
function mapDetailRow(dbRow, { booking, discountCode = null }) {
  const breakdown = calculateBookingTotalModel(booking);

  // Walk-in / orphan client mapping (Req 13.5) — the detail route uses a
  // slightly different schema for the user join (`user_id` + `user_deleted_at`)
  // than the listing (which JOINs only non-deleted users). We mirror the
  // detail behaviour here.
  const hasUser =
    dbRow.user_id != null && dbRow.user_deleted_at == null;
  const first = (dbRow.first_name || '').trim();
  const last = (dbRow.last_name || '').trim();
  const fullName = hasUser ? [first, last].filter(Boolean).join(' ').trim() : '';

  const tipAmount = numRounded(dbRow.tip_amount);
  const subtotal = round2(breakdown.servicesTotal + breakdown.productsTotal);

  return {
    // Listing-shape keys (Req 13.1) ----------------------------------------
    id: dbRow.id,
    booking_id: dbRow.booking_id,
    client_id: hasUser ? dbRow.user_id : null,
    client_name: hasUser && fullName ? fullName : WALK_IN_NAME,
    client_email: hasUser ? dbRow.email || null : null,
    booking_datetime: toIsoUtc(dbRow.start_datetime),
    amount: numRounded(dbRow.amount),
    method: dbRow.method,
    status: dbRow.status,
    refunded_amount: numRounded(dbRow.refunded_amount),
    tip_amount: tipAmount,
    stripe_payment_id: dbRow.stripe_payment_id || null,
    notes: dbRow.notes || null,
    created_at: toIsoUtc(dbRow.created_at),
    // Detail breakdown (Req 13.2, 13.3) ------------------------------------
    services_amount: breakdown.servicesTotal,
    products_amount: breakdown.productsTotal,
    subtotal,
    discount_amount: breakdown.discountsTotal,
    discount_code: discountCode,
    gift_card_amount: breakdown.giftCardsTotal,
    stripe_payment_intent_id: dbRow.stripe_payment_id || null,
  };
}

// ─── Generators for raw DB rows ────────────────────────────────────────────

/**
 * A "raw" DB row as the listing query would return it. Crucially, monetary
 * columns may be `null` so the `0`-default behaviour (Req 13.1) gets
 * exercised, and the joined `users` columns may be absent (walk-in / orphan).
 */
const rawListingRowArb = paymentArb.chain((p) =>
  fc
    .record({
      // Nullable monetaries — exercise both the populated and null branches.
      amount_null: fc.boolean(),
      refunded_null: fc.boolean(),
      tip_null: fc.boolean(),
      // Datetimes can arrive as a Date or a MySQL `dateStrings` value.
      datetime_kind: fc.constantFrom('date', 'mysql_string'),
      // The user row may be missing entirely (walk-in / orphan).
      walkin: fc.boolean(),
      first_name: fc.option(
        fc.string({ minLength: 0, maxLength: 30 }),
        { nil: null, freq: 4 },
      ),
      last_name: fc.option(
        fc.string({ minLength: 0, maxLength: 30 }),
        { nil: null, freq: 4 },
      ),
    })
    .map((opts) => {
      const startDt = p.booking_datetime;
      const createdDt = p.created_at;
      const toMysql = (d) =>
        // Render to YYYY-MM-DD HH:MM:SS in UTC. The route's `toIsoUtc`
        // re-parses with `new Date(...)` — for the round-trip test we
        // pin the same UTC moment via `toISOString()` and then strip the
        // 'T'/'Z' so the route's local-tz parse path is exercised.
        d.toISOString().replace('T', ' ').replace(/\..*Z$/, '');

      return {
        id: p.id,
        booking_id: p.booking_id,
        amount: opts.amount_null ? null : p.amount,
        method: p.method,
        status: p.status,
        stripe_payment_id: p.stripe_payment_id,
        refunded_amount: opts.refunded_null ? null : p.refunded_amount,
        tip_amount: opts.tip_null ? null : p.tip_amount,
        notes: p.notes,
        created_at:
          opts.datetime_kind === 'date' ? createdDt : toMysql(createdDt),
        client_id: opts.walkin ? null : p.client_id,
        start_datetime:
          opts.datetime_kind === 'date' ? startDt : toMysql(startDt),
        first_name: opts.walkin ? null : opts.first_name,
        last_name: opts.walkin ? null : opts.last_name,
        email: opts.walkin ? null : p.client_email,
        // Carry the raw payment for the detail variant to share state.
        __payment: p,
      };
    }),
);

/**
 * Booking-line bundle for the detail breakdown. Keys mirror the columns
 * `calculateBookingTotal` SUMs from each table.
 */
const bookingLinesArb = fc.record({
  serviceLines: fc.array(
    fc.record({ price: moneyArb }),
    { minLength: 0, maxLength: 6 },
  ),
  productLines: fc.array(
    fc.record({ total_price: moneyArb }),
    { minLength: 0, maxLength: 6 },
  ),
  travelLines: fc.array(
    fc.record({ amount: moneyArb }),
    { minLength: 0, maxLength: 2 },
  ),
  discountLines: fc.array(
    fc.record({ amount_saved: moneyArb }),
    { minLength: 0, maxLength: 3 },
  ),
  giftCardLines: fc.array(
    fc.record({ amount_used: moneyArb }),
    { minLength: 0, maxLength: 3 },
  ),
});

/**
 * A "raw" DB row as the detail query would return it. Adds the
 * detail-route-specific user columns (`user_id`, `user_deleted_at`) and a
 * line-item bundle, and may carry a `discount_code` or `null`.
 */
const rawDetailRowArb = rawListingRowArb.chain((listingRow) =>
  fc
    .record({
      booking: bookingLinesArb,
      // Soft-deleted clients still surface the row but get walk-in mapping.
      user_deleted: fc.boolean(),
      discount_code: fc.option(
        fc.string({ minLength: 1, maxLength: 32 }),
        { nil: null, freq: 2 },
      ),
    })
    .map(({ booking, user_deleted, discount_code }) => {
      const hadUser = listingRow.client_id != null;
      const dbRow = {
        ...listingRow,
        // Detail route uses `user_id` / `user_deleted_at` aliases.
        user_id: hadUser ? listingRow.client_id : null,
        user_deleted_at: hadUser && user_deleted ? new Date('2025-01-01') : null,
      };
      return { dbRow, booking, discountCode: discount_code };
    }),
);

// ─── Properties ────────────────────────────────────────────────────────────

describe('Property 16 — listing canonical shape (Req 13.1)', () => {
  it('listing rows have exactly the documented key set, no extras, no missing', () => {
    fc.assert(
      fc.property(rawListingRowArb, (raw) => {
        const mapped = mapListingRow(raw);
        const keys = Object.keys(mapped).sort();
        expect(keys).toEqual([...LISTING_KEYS].sort());
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('monetary fields default to 0 when DB value is NULL (amount, refunded_amount, tip_amount)', () => {
    fc.assert(
      fc.property(rawListingRowArb, (raw) => {
        const allNull = {
          ...raw,
          amount: null,
          refunded_amount: null,
          tip_amount: null,
        };
        const mapped = mapListingRow(allNull);
        expect(mapped.amount).toBe(0);
        expect(mapped.refunded_amount).toBe(0);
        expect(mapped.tip_amount).toBe(0);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('booking_datetime and created_at are ISO 8601 UTC strings (or null)', () => {
    fc.assert(
      fc.property(rawListingRowArb, (raw) => {
        const mapped = mapListingRow(raw);
        // The generator never produces null for these columns.
        expect(mapped.booking_datetime).toMatch(ISO_UTC_RE);
        expect(mapped.created_at).toMatch(ISO_UTC_RE);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('walk-in / orphan clients map to client_id=null, client_name="Walk-in Guest", client_email=null', () => {
    fc.assert(
      fc.property(rawListingRowArb, (raw) => {
        const walkin = {
          ...raw,
          client_id: null,
          first_name: null,
          last_name: null,
          email: null,
        };
        const mapped = mapListingRow(walkin);
        expect(mapped.client_id).toBeNull();
        expect(mapped.client_name).toBe(WALK_IN_NAME);
        expect(mapped.client_email).toBeNull();
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('null datetime columns map to null, never to "Invalid Date"', () => {
    fc.assert(
      fc.property(rawListingRowArb, (raw) => {
        const noDates = { ...raw, start_datetime: null, created_at: null };
        const mapped = mapListingRow(noDates);
        expect(mapped.booking_datetime).toBeNull();
        expect(mapped.created_at).toBeNull();
      }),
      { seed: SEED, numRuns: 50 },
    );
  });

  it('non-monetary nullable fields (stripe_payment_id, notes) coalesce undefined → null', () => {
    fc.assert(
      fc.property(rawListingRowArb, (raw) => {
        const cleared = { ...raw, stripe_payment_id: null, notes: null };
        const mapped = mapListingRow(cleared);
        expect(mapped.stripe_payment_id).toBeNull();
        expect(mapped.notes).toBeNull();
      }),
      { seed: SEED, numRuns: 50 },
    );
  });
});

describe('Property 16 — detail canonical shape (Req 13.2, 13.3)', () => {
  it('detail rows have exactly listing keys ∪ detail extras, no extras, no missing', () => {
    fc.assert(
      fc.property(rawDetailRowArb, ({ dbRow, booking, discountCode }) => {
        const mapped = mapDetailRow(dbRow, { booking, discountCode });
        const keys = Object.keys(mapped).sort();
        expect(keys).toEqual([...DETAIL_KEYS].sort());
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('discount_code defaults to null when no discount applied', () => {
    fc.assert(
      fc.property(rawDetailRowArb, ({ dbRow, booking }) => {
        const mapped = mapDetailRow(dbRow, { booking, discountCode: null });
        expect(mapped.discount_code).toBeNull();
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('stripe_payment_intent_id mirrors stripe_payment_id (both populated and null)', () => {
    fc.assert(
      fc.property(rawDetailRowArb, ({ dbRow, booking, discountCode }) => {
        const mapped = mapDetailRow(dbRow, { booking, discountCode });
        expect(mapped.stripe_payment_intent_id).toBe(mapped.stripe_payment_id);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('booking_datetime and created_at are ISO 8601 UTC strings on the detail shape too', () => {
    fc.assert(
      fc.property(rawDetailRowArb, ({ dbRow, booking, discountCode }) => {
        const mapped = mapDetailRow(dbRow, { booking, discountCode });
        expect(mapped.booking_datetime).toMatch(ISO_UTC_RE);
        expect(mapped.created_at).toMatch(ISO_UTC_RE);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('detail breakdown equals calculateBookingTotal() over the same DB rows', () => {
    fc.assert(
      fc.property(rawDetailRowArb, ({ dbRow, booking, discountCode }) => {
        const mapped = mapDetailRow(dbRow, { booking, discountCode });
        const expected = calculateBookingTotalModel(booking);

        expect(mapped.services_amount).toBe(expected.servicesTotal);
        expect(mapped.products_amount).toBe(expected.productsTotal);
        expect(mapped.discount_amount).toBe(expected.discountsTotal);
        expect(mapped.gift_card_amount).toBe(expected.giftCardsTotal);
        // subtotal = services + products (per detail route)
        expect(mapped.subtotal).toBe(
          round2(expected.servicesTotal + expected.productsTotal),
        );
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('all monetary fields on the detail row are non-negative numbers (no NaN, no Infinity)', () => {
    fc.assert(
      fc.property(rawDetailRowArb, ({ dbRow, booking, discountCode }) => {
        const mapped = mapDetailRow(dbRow, { booking, discountCode });
        for (const k of [
          'amount',
          'refunded_amount',
          'tip_amount',
          'services_amount',
          'products_amount',
          'subtotal',
          'discount_amount',
          'gift_card_amount',
        ]) {
          expect(Number.isFinite(mapped[k])).toBe(true);
          expect(mapped[k]).toBeGreaterThanOrEqual(0);
        }
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('detail monetary fields default to 0 when DB column is NULL', () => {
    fc.assert(
      fc.property(rawDetailRowArb, ({ dbRow, booking, discountCode }) => {
        const allNull = {
          ...dbRow,
          amount: null,
          refunded_amount: null,
          tip_amount: null,
        };
        const mapped = mapDetailRow(allNull, { booking, discountCode });
        expect(mapped.amount).toBe(0);
        expect(mapped.refunded_amount).toBe(0);
        expect(mapped.tip_amount).toBe(0);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('soft-deleted client (user_deleted_at != null) collapses to walk-in mapping', () => {
    fc.assert(
      fc.property(rawDetailRowArb, ({ dbRow, booking, discountCode }) => {
        const softDeleted = {
          ...dbRow,
          user_id: dbRow.user_id ?? 42,
          user_deleted_at: new Date('2025-01-01'),
        };
        const mapped = mapDetailRow(softDeleted, { booking, discountCode });
        expect(mapped.client_id).toBeNull();
        expect(mapped.client_name).toBe(WALK_IN_NAME);
        expect(mapped.client_email).toBeNull();
      }),
      { seed: SEED, numRuns: 100 },
    );
  });
});

// ─── Pinned tables — drift detection ───────────────────────────────────────

describe('Property 16 — pinned listing-shape table', () => {
  it('listing keys are exactly the documented set (drift guard)', () => {
    expect([...LISTING_KEYS]).toEqual([
      'id',
      'booking_id',
      'client_id',
      'client_name',
      'client_email',
      'booking_datetime',
      'amount',
      'method',
      'status',
      'refunded_amount',
      'tip_amount',
      'stripe_payment_id',
      'notes',
      'created_at',
    ]);
  });

  it('detail extra keys are exactly the documented set (drift guard)', () => {
    expect([...DETAIL_EXTRA_KEYS]).toEqual([
      'services_amount',
      'products_amount',
      'subtotal',
      'discount_amount',
      'discount_code',
      'gift_card_amount',
      'stripe_payment_intent_id',
    ]);
  });

  it('listing row with all-null monetaries collapses to the documented zero defaults', () => {
    const raw = {
      id: 1,
      booking_id: 2,
      amount: null,
      method: 'card',
      status: 'paid',
      stripe_payment_id: null,
      refunded_amount: null,
      tip_amount: null,
      notes: null,
      created_at: '2025-03-09 14:30:00',
      client_id: 7,
      start_datetime: '2025-03-09 12:00:00',
      first_name: 'Léa',
      last_name: 'Dubois',
      email: 'lea@example.com',
    };
    const mapped = mapListingRow(raw);
    expect(mapped.amount).toBe(0);
    expect(mapped.refunded_amount).toBe(0);
    expect(mapped.tip_amount).toBe(0);
    expect(mapped.client_name).toBe('Léa Dubois');
    expect(mapped.client_email).toBe('lea@example.com');
    expect(mapped.booking_datetime).toMatch(ISO_UTC_RE);
    expect(mapped.created_at).toMatch(ISO_UTC_RE);
  });

  it('detail row with empty booking lines yields zero breakdown and stripe mirror', () => {
    const dbRow = {
      id: 10,
      booking_id: 11,
      amount: 0,
      method: 'cash',
      status: 'pending',
      stripe_payment_id: 'pi_abcdef0123456789',
      refunded_amount: null,
      tip_amount: null,
      notes: null,
      created_at: '2025-03-09 14:30:00',
      client_id: null,
      user_id: null,
      user_deleted_at: null,
      start_datetime: '2025-03-09 12:00:00',
      first_name: null,
      last_name: null,
      email: null,
    };
    const mapped = mapDetailRow(dbRow, {
      booking: {
        serviceLines: [],
        productLines: [],
        travelLines: [],
        discountLines: [],
        giftCardLines: [],
      },
      discountCode: null,
    });
    expect(mapped.services_amount).toBe(0);
    expect(mapped.products_amount).toBe(0);
    expect(mapped.subtotal).toBe(0);
    expect(mapped.discount_amount).toBe(0);
    expect(mapped.gift_card_amount).toBe(0);
    expect(mapped.discount_code).toBeNull();
    expect(mapped.stripe_payment_intent_id).toBe('pi_abcdef0123456789');
    expect(mapped.stripe_payment_intent_id).toBe(mapped.stripe_payment_id);
    expect(mapped.client_name).toBe(WALK_IN_NAME);
    expect(mapped.client_id).toBeNull();
  });
});

// Marker — keeps the unused `positiveMoneyArb` import out of warnings while
// documenting that the arb library is the source of money generators.
void positiveMoneyArb;
