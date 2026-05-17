// Feature: products-and-sales-improvements
//
// Smoke test for `tests/properties/_arbitraries.js`. Validates that every
// generator produces well-formed values within the documented bounds, and
// that a deterministic `seed` reproduces identical output. Real PBT files
// (Properties 1–18) consume these generators directly.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import {
  arbitraries,
  brandArb,
  categorySetArb,
  customPermissionsArb,
  dateRangeArb,
  paymentArb,
  productArb,
  refundTripleArb,
  salonArb,
  staffRecordArb,
  stockMovementTripleArb,
  userArb,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PERMISSION_KEYS,
  STAFF_ROLES,
  STOCK_MODES,
  CURRENCY_CODES,
} from './_arbitraries.js';

const SEED = 0xC0FFEE;

describe('shared arbitraries — well-formedness', () => {
  it('salonArb produces a salon with id, name, currency, owner_id', () => {
    fc.assert(
      fc.property(salonArb, (salon) => {
        expect(Number.isInteger(salon.id)).toBe(true);
        expect(salon.id).toBeGreaterThan(0);
        expect(typeof salon.name).toBe('string');
        expect(salon.name.length).toBeGreaterThan(0);
        expect(CURRENCY_CODES).toContain(salon.currency);
        expect(Number.isInteger(salon.owner_id)).toBe(true);
      }),
      { seed: SEED, numRuns: 50 },
    );
  });

  it('userArb produces a user with id, name, email, is_admin', () => {
    fc.assert(
      fc.property(userArb, (user) => {
        expect(Number.isInteger(user.id)).toBe(true);
        expect(typeof user.name).toBe('string');
        expect(user.email).toMatch(/@/);
        expect(typeof user.is_admin).toBe('boolean');
      }),
      { seed: SEED, numRuns: 50 },
    );
  });

  it('staffRecordArb produces records with valid role enum and permission shape', () => {
    fc.assert(
      fc.property(staffRecordArb, (s) => {
        expect(STAFF_ROLES).toContain(s.role);
        expect(typeof s.is_active).toBe('boolean');
        expect(s.deleted_at === null || s.deleted_at instanceof Date).toBe(true);
        expect(s.permissions === null || typeof s.permissions === 'object').toBe(true);
        if (s.permissions !== null) {
          for (const k of Object.keys(s.permissions)) {
            expect(PERMISSION_KEYS).toContain(k);
            expect(typeof s.permissions[k]).toBe('boolean');
          }
        }
      }),
      { seed: SEED, numRuns: 50 },
    );
  });

  it('customPermissionsArb yields null or an object keyed by known permission keys', () => {
    fc.assert(
      fc.property(customPermissionsArb, (perms) => {
        if (perms === null) return;
        expect(typeof perms).toBe('object');
        for (const k of Object.keys(perms)) {
          expect(PERMISSION_KEYS).toContain(k);
          expect(typeof perms[k]).toBe('boolean');
        }
      }),
      { seed: SEED, numRuns: 50 },
    );
  });

  it('productArb honours brand bounds and produces non-negative quantities', () => {
    fc.assert(
      fc.property(productArb, (p) => {
        expect(p.salon_id).toBeGreaterThan(0);
        expect(p.brand === null || typeof p.brand === 'string').toBe(true);
        if (typeof p.brand === 'string' && p.brand.length > 0) {
          // Generator may emit values up to the schema limit (120) before
          // the API trims; we only check that nothing wildly exceeds it.
          expect(p.brand.length).toBeLessThanOrEqual(120);
        }
        expect(p.price).toBeGreaterThan(0);
        expect(p.cost_price).toBeGreaterThanOrEqual(0);
        expect(p.stock_quantity).toBeGreaterThanOrEqual(0);
        expect(p.low_stock_threshold).toBeGreaterThanOrEqual(0);
        expect([0, 1]).toContain(p.is_active);
        expect(p.image_url === null || typeof p.image_url === 'string').toBe(true);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('brandArb yields the documented edge cases on a fixed seed', () => {
    const samples = fc.sample(brandArb, { numRuns: 200, seed: SEED });
    // At least one null, one empty, and one non-ASCII / surrogate-pair value
    // should appear in 200 samples — the literal pool guarantees this.
    expect(samples.some((b) => b === null)).toBe(true);
    expect(samples.some((b) => b === '')).toBe(true);
    expect(
      samples.some(
        (b) =>
          typeof b === 'string' &&
          b.length > 0 &&
          // Any code point above U+007F qualifies (surrogates included)
          [...b].some((ch) => ch.codePointAt(0) > 0x7f),
      ),
    ).toBe(true);
  });

  it('paymentArb keeps refunded_amount ≤ amount and uses canonical enums', () => {
    fc.assert(
      fc.property(paymentArb, (pay) => {
        expect(PAYMENT_STATUSES).toContain(pay.status);
        expect(PAYMENT_METHODS).toContain(pay.method);
        expect(pay.amount).toBeGreaterThan(0);
        expect(pay.refunded_amount).toBeGreaterThanOrEqual(0);
        expect(pay.refunded_amount).toBeLessThanOrEqual(pay.amount);
        expect(pay.tip_amount).toBeGreaterThanOrEqual(0);
        expect(pay.created_at instanceof Date).toBe(true);
        expect(pay.booking_datetime instanceof Date).toBe(true);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('refundTripleArb yields previousRefunded ≤ amount (over-refund still reachable)', () => {
    fc.assert(
      fc.property(refundTripleArb, (t) => {
        expect(t.amount).toBeGreaterThan(0);
        expect(t.previousRefunded).toBeGreaterThanOrEqual(0);
        expect(t.previousRefunded).toBeLessThanOrEqual(t.amount);
        expect(t.refundAmount).toBeGreaterThan(0);
      }),
      { seed: SEED, numRuns: 100 },
    );
    // Verify the over-refund branch is reachable.
    const samples = fc.sample(refundTripleArb, { numRuns: 200, seed: SEED });
    expect(
      samples.some((t) => t.refundAmount > t.amount - t.previousRefunded),
    ).toBe(true);
  });

  it('stockMovementTripleArb yields a valid (currentQty, mode, quantity) triple', () => {
    fc.assert(
      fc.property(stockMovementTripleArb, (t) => {
        expect(t.currentQty).toBeGreaterThanOrEqual(0);
        expect(STOCK_MODES).toContain(t.mode);
        expect(t.quantity).toBeGreaterThanOrEqual(0);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('categorySetArb returns categories sorted by display_order then name', () => {
    fc.assert(
      fc.property(categorySetArb, (cats) => {
        for (let i = 1; i < cats.length; i++) {
          const prev = cats[i - 1];
          const cur = cats[i];
          if (prev.display_order !== cur.display_order) {
            expect(prev.display_order).toBeLessThanOrEqual(cur.display_order);
          } else {
            expect(prev.name.localeCompare(cur.name)).toBeLessThanOrEqual(0);
          }
          expect(prev.name.length).toBeGreaterThan(0);
          expect(prev.name.length).toBeLessThanOrEqual(100);
        }
      }),
      { seed: SEED, numRuns: 50 },
    );
  });

  it('dateRangeArb yields inclusive ranges ≤ 366 days, including DST/year edges', () => {
    fc.assert(
      fc.property(dateRangeArb, ({ start_date, end_date }) => {
        expect(start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(start_date <= end_date).toBe(true);
        const days =
          (Date.parse(`${end_date}T00:00:00Z`) -
            Date.parse(`${start_date}T00:00:00Z`)) /
          86_400_000;
        expect(days).toBeGreaterThanOrEqual(0);
        expect(days).toBeLessThanOrEqual(366);
      }),
      { seed: SEED, numRuns: 100 },
    );
    // DST/year edges are reachable.
    const samples = fc.sample(dateRangeArb, { numRuns: 200, seed: SEED });
    const flat = samples.flatMap((r) => [r.start_date, r.end_date]);
    expect(flat.some((d) => d === '2024-03-10' || d === '2024-11-03' || d === '2024-12-31')).toBe(
      true,
    );
  });
});

describe('shared arbitraries — determinism', () => {
  it('the same seed produces identical samples across runs', () => {
    const a = fc.sample(productArb, { numRuns: 10, seed: 42 });
    const b = fc.sample(productArb, { numRuns: 10, seed: 42 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different seeds produce different samples (with overwhelming probability)', () => {
    const a = fc.sample(productArb, { numRuns: 10, seed: 1 });
    const b = fc.sample(productArb, { numRuns: 10, seed: 2 });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});

describe('shared arbitraries — bundled export', () => {
  it('arbitraries object exposes every named generator', () => {
    const names = [
      'brand',
      'money',
      'positiveMoney',
      'salon',
      'user',
      'customPermissions',
      'staffRecord',
      'categorySet',
      'product',
      'payment',
      'refundTriple',
      'stockMovementTriple',
      'dateRange',
    ];
    for (const n of names) {
      expect(arbitraries[n]).toBeDefined();
      // fast-check v3 arbitraries expose .generate() — a soft duck-type check
      expect(typeof arbitraries[n].generate).toBe('function');
    }
  });
});
