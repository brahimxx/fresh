// Feature: hybrid-fulfillment-fixes
//
// Property 1 — Price Resolution Invariant.
//
// **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
//
// For any service S and fulfillment type F:
//   - If F = "mobile" and S.mobile_price_override ≠ NULL → resolved price = S.mobile_price_override
//   - If F = "virtual" and S.virtual_price_override ≠ NULL → resolved price = S.virtual_price_override
//   - Otherwise → resolved price = S.price
//
// The function under test is `resolveServicePrice` from `@/lib/pricing`.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { resolveServicePrice } from '@/lib/pricing';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const FULFILLMENT_TYPES = ['physical', 'mobile', 'virtual'];

/**
 * A nullable monetary value — either null/undefined or a positive decimal
 * string (matching how MySQL DECIMAL columns come through in JS).
 * We include both null and undefined to exercise the != null guard.
 */
const nullableOverrideArb = fc.oneof(
  { weight: 2, arbitrary: fc.constant(null) },
  { weight: 1, arbitrary: fc.constant(undefined) },
  {
    weight: 4,
    arbitrary: fc
      .integer({ min: 1, max: 1_000_000_00 })
      .map((cents) => (cents / 100).toFixed(2)),
  },
);

/**
 * A service object with a base price and optional overrides.
 * Prices are stored as strings (DECIMAL columns from MySQL) to match
 * real-world data shapes.
 */
const serviceArb = fc.record({
  price: fc
    .integer({ min: 1, max: 1_000_000_00 })
    .map((cents) => (cents / 100).toFixed(2)),
  mobile_price_override: nullableOverrideArb,
  virtual_price_override: nullableOverrideArb,
});

const fulfillmentTypeArb = fc.constantFrom(...FULFILLMENT_TYPES);

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

const NUM_RUNS = 100;

describe('Property 1 — Price Resolution Invariant', () => {
  it('mobile fulfillment with non-null override returns mobile_price_override', () => {
    fc.assert(
      fc.property(serviceArb, (service) => {
        // Only test when mobile_price_override is set (not null/undefined)
        fc.pre(service.mobile_price_override != null);

        const result = resolveServicePrice(service, 'mobile');
        return result === parseFloat(service.mobile_price_override);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('virtual fulfillment with non-null override returns virtual_price_override', () => {
    fc.assert(
      fc.property(serviceArb, (service) => {
        // Only test when virtual_price_override is set (not null/undefined)
        fc.pre(service.virtual_price_override != null);

        const result = resolveServicePrice(service, 'virtual');
        return result === parseFloat(service.virtual_price_override);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('mobile fulfillment with null override falls back to base price', () => {
    fc.assert(
      fc.property(serviceArb, (service) => {
        // Only test when mobile_price_override is null/undefined
        fc.pre(service.mobile_price_override == null);

        const result = resolveServicePrice(service, 'mobile');
        return result === parseFloat(service.price);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('virtual fulfillment with null override falls back to base price', () => {
    fc.assert(
      fc.property(serviceArb, (service) => {
        // Only test when virtual_price_override is null/undefined
        fc.pre(service.virtual_price_override == null);

        const result = resolveServicePrice(service, 'virtual');
        return result === parseFloat(service.price);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('for any service and fulfillment type, the full resolution invariant holds', () => {
    fc.assert(
      fc.property(serviceArb, fulfillmentTypeArb, (service, fulfillmentType) => {
        const result = resolveServicePrice(service, fulfillmentType);

        let expected;
        if (fulfillmentType === 'mobile' && service.mobile_price_override != null) {
          expected = parseFloat(service.mobile_price_override);
        } else if (fulfillmentType === 'virtual' && service.virtual_price_override != null) {
          expected = parseFloat(service.virtual_price_override);
        } else {
          expected = parseFloat(service.price);
        }

        return result === expected;
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('resolved price is always a finite positive number', () => {
    fc.assert(
      fc.property(serviceArb, fulfillmentTypeArb, (service, fulfillmentType) => {
        const result = resolveServicePrice(service, fulfillmentType);
        return Number.isFinite(result) && result > 0;
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
