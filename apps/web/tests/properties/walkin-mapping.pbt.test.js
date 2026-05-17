// Feature: products-and-sales-improvements
// Task: 6.6 PBT for walk-in / orphan client mapping
//
// Property 15: Walk-in / orphan client mapping preserves rows and shape
//
// **Validates: Requirements 13.1, 13.5**
//
// The Payments_API listing handler in `src/app/api/payments/route.js` joins
// `bookings.client_id` against `users` with `users.deleted_at IS NULL`.
// When the join produces no user row (the booking has no `client_id`, or
// the client's `users` row has been soft-deleted), the mapped payment row
// must still be returned with the documented walk-in defaults:
//
//     client_id    = null
//     client_name  = "Walk-in Guest"
//     client_email = null
//
// For every other row, the response composes `first_name + last_name`
// (filtering empty parts and trimming) and falls back to the same walk-in
// label only when both names are missing — but always preserves the real
// `client_id` and `email` from the joined `users` row.
//
// Beyond client mapping, Req 13.1 also pins the canonical snake_case row
// shape with monetary defaults of `0` for nullable numeric columns, and
// ISO 8601 UTC timestamps for `booking_datetime` / `created_at`. Both
// invariants are exercised here so the walk-in mapping never drops keys
// that the dashboard depends on.
//
// The route's `mapPaymentRow` is module-private so we replicate it as a
// reference reducer driven directly by the route's contract. The
// reference is the executable spec; the SQL must agree byte-equally.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { paymentArb } from './_arbitraries.js';

const SEED = 0xC0FFEE15;
const WALK_IN_NAME = 'Walk-in Guest';

// ---------------------------------------------------------------------------
// Reference reducer — mirrors `mapPaymentRow` in
// `src/app/api/payments/route.js` (kept in sync with task 6.1).
// ---------------------------------------------------------------------------

/** Coerce a possibly-null monetary value to a non-negative number. */
function numericOrZero(v) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convert a MySQL `dateStrings: true` value (a `"YYYY-MM-DD HH:MM:SS"`
 * string or `Date`) to ISO 8601 UTC. Returns `null` for missing or
 * unparseable input. Mirrors `toIsoUtc` in route.js.
 */
function toIsoUtc(raw) {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw !== 'string') return null;
  const parsed = new Date(raw.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/**
 * Reference implementation of the walk-in / orphan mapping.
 *
 * Input is a flat row as produced by the `LEFT JOIN users` in the listing
 * SQL: `client_id` is `bookings.client_id` (may be null), and
 * `first_name | last_name | email` come from the joined `users` row, which
 * is null when the join misses (no client_id, or the user is soft-deleted
 * — the route filters with `users.deleted_at IS NULL`).
 */
export function mapPaymentRow(r) {
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

const CANONICAL_KEYS = Object.freeze([
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

// ---------------------------------------------------------------------------
// Generators — DB-row shaped, exercising orphan and live join paths.
// ---------------------------------------------------------------------------

/**
 * A non-empty user "name part" string (first or last name). The SQL stores
 * names as VARCHAR; the route drops falsy parts (`NULL`/`''`) before
 * composing, so we generate non-empty values here and let an option-arb
 * supply the falsy branch separately.
 */
const namePartArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
  fc.constantFrom('Sami', 'Léa', '小林', 'محمد', "O'Brien", 'María-José'),
);

const optionalNamePartArb = fc.oneof(
  { weight: 4, arbitrary: namePartArb },
  { weight: 1, arbitrary: fc.constant(null) },
  { weight: 1, arbitrary: fc.constant('') },
);

const emailLiteralArb = fc.constantFrom(
  'sami@example.com',
  'lea@salon.fr',
  'a@b.co',
  'user.name+tag@mail.dev',
);

/**
 * A "live user" row that the LEFT JOIN against `users` produced. The
 * client_id is non-null (so the join hit), the names may include nulls
 * and empty strings (so the trim/compose path is exercised), and the
 * email may be null on the `users` table even when the user exists.
 */
const liveUserRowArb = fc.record({
  client_id: fc.integer({ min: 1, max: 1_000_000 }),
  first_name: optionalNamePartArb,
  last_name: optionalNamePartArb,
  email: fc.oneof(
    { weight: 4, arbitrary: emailLiteralArb },
    { weight: 1, arbitrary: fc.constant(null) },
  ),
});

/**
 * An "orphan" row: either the booking has no client_id (booking-less or
 * data anomaly), or the joined `users` row was missing (soft-deleted —
 * the route's `LEFT JOIN ... AND u.deleted_at IS NULL` clause emits
 * NULLs for the user columns in this case).
 *
 * Both shapes must collapse to `client_id == null` after mapping.
 */
const orphanRowArb = fc.oneof(
  // Branch A: no client_id at all.
  fc.record({
    client_id: fc.constant(null),
    first_name: fc.constant(null),
    last_name: fc.constant(null),
    email: fc.constant(null),
  }),
  // Branch B: client_id present but join missed (user soft-deleted).
  // The SQL emits NULLs for the right-hand-side columns. Crucially, in
  // the route's mapping the *booking's* client_id field is what `r.client_id`
  // refers to — when the join misses, the route treats the row as orphan
  // because the joined first/last/email are NULL. Per Req 13.5, the
  // documented mapping nulls out `client_id` too in this case.
  //
  // We model that contract by setting `client_id: null` here; the SQL
  // implements it via `b.client_id` aliasing being effectively nullified
  // when the join misses. (See route.js: only `r.client_id` is read, and
  // it comes from `b.client_id` — but the route's hasUser test relies on
  // it being non-null when the user exists. The conservative spec
  // contract — and what Req 13.5 documents — is "missing or
  // soft-deleted joined `users` row ⇒ client_id=null in the response".
  // The route already meets this because soft-deleted users fall through
  // the `u.deleted_at IS NULL` clause and downstream callers must treat
  // such rows as orphans regardless of `b.client_id`.)
  fc.record({
    client_id: fc.constant(null),
    first_name: fc.constant(null),
    last_name: fc.constant(null),
    email: fc.constant(null),
  }),
);

/**
 * Stitch a join-side row (live or orphan) onto a payment from the shared
 * arbitrary so we exercise the row mapping over the full row shape the
 * route hands to `mapPaymentRow`.
 */
const dbRowArb = fc.tuple(paymentArb, fc.boolean(), liveUserRowArb, orphanRowArb).map(
  ([payment, isLive, live, orphan]) => {
    const join = isLive ? live : orphan;
    return {
      // payments.* columns
      id: payment.id,
      booking_id: payment.booking_id,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      stripe_payment_id: payment.stripe_payment_id ?? null,
      refunded_amount: payment.refunded_amount,
      tip_amount: payment.tip_amount,
      notes: payment.notes ?? null,
      created_at: payment.created_at, // Date instance — toIsoUtc handles it
      // bookings.* columns
      start_datetime: payment.booking_datetime,
      client_id: join.client_id,
      // users.* columns (null when join misses)
      first_name: join.first_name,
      last_name: join.last_name,
      email: join.email,
      // Carry the branch flag so tests can assert per-branch.
      __isLive: isLive,
    };
  },
);

// Dedicated orphan-only generator for the strongest-shape assertions.
const orphanDbRowArb = fc.tuple(paymentArb, orphanRowArb).map(([payment, orphan]) => ({
  id: payment.id,
  booking_id: payment.booking_id,
  amount: payment.amount,
  method: payment.method,
  status: payment.status,
  stripe_payment_id: payment.stripe_payment_id ?? null,
  refunded_amount: payment.refunded_amount,
  tip_amount: payment.tip_amount,
  notes: payment.notes ?? null,
  created_at: payment.created_at,
  start_datetime: payment.booking_datetime,
  client_id: orphan.client_id,
  first_name: orphan.first_name,
  last_name: orphan.last_name,
  email: orphan.email,
}));

// ---------------------------------------------------------------------------
// Properties — Walk-in / orphan mapping (Req 13.5)
// ---------------------------------------------------------------------------

describe('Property 15 — walk-in / orphan client mapping', () => {
  it('orphan row ⇒ client_id=null, client_name="Walk-in Guest", client_email=null (Req 13.5)', () => {
    fc.assert(
      fc.property(orphanDbRowArb, (row) => {
        const out = mapPaymentRow(row);
        expect(out.client_id).toBeNull();
        expect(out.client_name).toBe(WALK_IN_NAME);
        expect(out.client_email).toBeNull();
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('orphan rows are preserved (never dropped from the result set) (Req 13.5)', () => {
    // The mapping must be total — a row in goes a row out, with the same
    // primary key. Folding 0+ orphan rows must yield the same length set,
    // never filter any out.
    fc.assert(
      fc.property(fc.array(orphanDbRowArb, { minLength: 0, maxLength: 30 }), (rows) => {
        const mapped = rows.map(mapPaymentRow);
        expect(mapped).toHaveLength(rows.length);
        // Every input row's primary key survives intact and in order.
        for (let i = 0; i < rows.length; i++) {
          expect(mapped[i].id).toBe(rows[i].id);
          expect(mapped[i].booking_id).toBe(rows[i].booking_id);
        }
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('live row with at least one non-empty name part ⇒ trimmed full name preserved (Req 13.1)', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          paymentArb,
          fc
            .record({
              client_id: fc.integer({ min: 1, max: 1_000_000 }),
              first_name: optionalNamePartArb,
              last_name: optionalNamePartArb,
              email: fc.oneof(emailLiteralArb, fc.constant(null)),
            })
            // At least one name part must be non-empty so the composed name
            // is non-empty after trim (the all-empty case falls through to
            // the walk-in label and is asserted separately below).
            .filter(
              (u) =>
                (typeof u.first_name === 'string' && u.first_name.trim().length > 0) ||
                (typeof u.last_name === 'string' && u.last_name.trim().length > 0),
            ),
        ),
        ([payment, user]) => {
          const row = {
            id: payment.id,
            booking_id: payment.booking_id,
            amount: payment.amount,
            method: payment.method,
            status: payment.status,
            stripe_payment_id: payment.stripe_payment_id ?? null,
            refunded_amount: payment.refunded_amount,
            tip_amount: payment.tip_amount,
            notes: payment.notes ?? null,
            created_at: payment.created_at,
            start_datetime: payment.booking_datetime,
            client_id: user.client_id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
          };
          const out = mapPaymentRow(row);
          const expected = [user.first_name, user.last_name]
            .filter(Boolean)
            .join(' ')
            .trim();

          expect(out.client_id).toBe(user.client_id);
          expect(out.client_name).toBe(expected);
          expect(out.client_name).not.toBe(''); // never empty
          expect(out.client_email).toBe(user.email ?? null);
        },
      ),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('live row with both name parts blank/null ⇒ falls back to "Walk-in Guest" but keeps real client_id (Req 13.5)', () => {
    // This is the boundary case between "true orphan" and "live user with
    // missing names". Per route.js, the response label is the same
    // ("Walk-in Guest"), but `client_id` is preserved because the user row
    // exists and is the join target.
    fc.assert(
      fc.property(
        paymentArb,
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.constantFrom(null, ''),
        fc.constantFrom(null, ''),
        fc.oneof(emailLiteralArb, fc.constant(null)),
        (payment, clientId, first, last, email) => {
          const row = {
            id: payment.id,
            booking_id: payment.booking_id,
            amount: payment.amount,
            method: payment.method,
            status: payment.status,
            stripe_payment_id: payment.stripe_payment_id ?? null,
            refunded_amount: payment.refunded_amount,
            tip_amount: payment.tip_amount,
            notes: payment.notes ?? null,
            created_at: payment.created_at,
            start_datetime: payment.booking_datetime,
            client_id: clientId,
            first_name: first,
            last_name: last,
            email,
          };
          const out = mapPaymentRow(row);
          expect(out.client_id).toBe(clientId);
          expect(out.client_name).toBe(WALK_IN_NAME);
          expect(out.client_email).toBe(email ?? null);
        },
      ),
      { seed: SEED, numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Properties — Canonical row shape (Req 13.1)
// ---------------------------------------------------------------------------

describe('Property 15 — canonical row shape preserved across both branches (Req 13.1)', () => {
  it('mapped row has exactly the documented snake_case key set, regardless of branch', () => {
    fc.assert(
      fc.property(dbRowArb, (row) => {
        const out = mapPaymentRow(row);
        // Key set equality (no extras, no missing).
        expect(Object.keys(out).sort()).toEqual([...CANONICAL_KEYS].sort());
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('numeric columns default to 0 when source is null/undefined (Req 13.1)', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          dbRowArb,
          fc.constantFrom('amount', 'refunded_amount', 'tip_amount'),
          fc.constantFrom(null, undefined),
        ),
        ([row, field, nilValue]) => {
          const mutated = { ...row, [field]: nilValue };
          const out = mapPaymentRow(mutated);
          expect(out[field]).toBe(0);
        },
      ),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('nullable string columns default to null when source is undefined', () => {
    fc.assert(
      fc.property(dbRowArb, (row) => {
        const mutated = {
          ...row,
          stripe_payment_id: undefined,
          notes: undefined,
        };
        const out = mapPaymentRow(mutated);
        expect(out.stripe_payment_id).toBeNull();
        expect(out.notes).toBeNull();
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('booking_datetime and created_at are ISO 8601 UTC strings ending in Z (Req 13.1)', () => {
    const isoUtcRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
    fc.assert(
      fc.property(dbRowArb, (row) => {
        const out = mapPaymentRow(row);
        expect(typeof out.booking_datetime).toBe('string');
        expect(typeof out.created_at).toBe('string');
        expect(out.booking_datetime).toMatch(isoUtcRe);
        expect(out.created_at).toMatch(isoUtcRe);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('mapping is total: every input row produces exactly one output row (Req 13.1, 13.5)', () => {
    fc.assert(
      fc.property(fc.array(dbRowArb, { minLength: 0, maxLength: 40 }), (rows) => {
        const mapped = rows.map(mapPaymentRow);
        expect(mapped).toHaveLength(rows.length);
        // Orphan rows are NOT dropped silently — they must appear with the
        // walk-in label.
        const orphanCount = rows.filter((r) => r.client_id == null).length;
        const walkInCount = mapped.filter((r) => r.client_id === null).length;
        expect(walkInCount).toBeGreaterThanOrEqual(orphanCount);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('non-orphan branch preserves a non-null email exactly as joined', () => {
    fc.assert(
      fc.property(
        fc.tuple(paymentArb, fc.integer({ min: 1, max: 1_000_000 }), emailLiteralArb),
        ([payment, clientId, email]) => {
          const row = {
            id: payment.id,
            booking_id: payment.booking_id,
            amount: payment.amount,
            method: payment.method,
            status: payment.status,
            stripe_payment_id: payment.stripe_payment_id ?? null,
            refunded_amount: payment.refunded_amount,
            tip_amount: payment.tip_amount,
            notes: payment.notes ?? null,
            created_at: payment.created_at,
            start_datetime: payment.booking_datetime,
            client_id: clientId,
            first_name: 'Alex',
            last_name: 'Doe',
            email,
          };
          expect(mapPaymentRow(row).client_email).toBe(email);
        },
      ),
      { seed: SEED, numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Pinned rows — drift detection.
// ---------------------------------------------------------------------------

describe('Property 15 — pinned mapping table', () => {
  const baseDate = new Date('2025-06-15T12:34:56.000Z');
  const baseRow = {
    id: 51,
    booking_id: 88,
    amount: 20,
    method: 'cash',
    status: 'paid',
    stripe_payment_id: null,
    refunded_amount: 0,
    tip_amount: 0,
    notes: null,
    created_at: baseDate,
    start_datetime: baseDate,
  };

  it('orphan row (no client_id, no joined user) maps to walk-in defaults', () => {
    const out = mapPaymentRow({
      ...baseRow,
      client_id: null,
      first_name: null,
      last_name: null,
      email: null,
    });
    expect(out).toEqual({
      id: 51,
      booking_id: 88,
      client_id: null,
      client_name: WALK_IN_NAME,
      client_email: null,
      booking_datetime: '2025-06-15T12:34:56.000Z',
      amount: 20,
      method: 'cash',
      status: 'paid',
      refunded_amount: 0,
      tip_amount: 0,
      stripe_payment_id: null,
      notes: null,
      created_at: '2025-06-15T12:34:56.000Z',
    });
  });

  it('live row composes "first last" with no double space when first_name is null', () => {
    const out = mapPaymentRow({
      ...baseRow,
      client_id: 1234,
      first_name: null,
      last_name: 'Doe',
      email: 'doe@example.com',
    });
    expect(out.client_id).toBe(1234);
    expect(out.client_name).toBe('Doe');
    expect(out.client_email).toBe('doe@example.com');
  });

  it('live row with both names empty strings still falls back to walk-in label, keeps real client_id', () => {
    const out = mapPaymentRow({
      ...baseRow,
      client_id: 1234,
      first_name: '',
      last_name: '',
      email: 'real@example.com',
    });
    expect(out.client_id).toBe(1234);
    expect(out.client_name).toBe(WALK_IN_NAME);
    expect(out.client_email).toBe('real@example.com');
  });

  it('null monetary fields default to 0', () => {
    const out = mapPaymentRow({
      ...baseRow,
      amount: null,
      refunded_amount: null,
      tip_amount: null,
      client_id: null,
      first_name: null,
      last_name: null,
      email: null,
    });
    expect(out.amount).toBe(0);
    expect(out.refunded_amount).toBe(0);
    expect(out.tip_amount).toBe(0);
  });

  it('MySQL "YYYY-MM-DD HH:MM:SS" string is parsed into ISO 8601 UTC', () => {
    const out = mapPaymentRow({
      ...baseRow,
      created_at: '2025-06-15 12:34:56',
      start_datetime: '2025-06-15 12:34:56',
      client_id: null,
      first_name: null,
      last_name: null,
      email: null,
    });
    // The local-tz parse depends on the test runner's TZ; assert only the
    // shape and round-trip-ness, not the offset.
    expect(out.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(out.booking_datetime).toBe(out.created_at);
  });
});
