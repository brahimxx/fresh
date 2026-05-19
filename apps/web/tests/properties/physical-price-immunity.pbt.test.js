// Feature: hybrid-fulfillment-fixes
//
// Property 5 — Physical Mode Price Immunity.
//
// **Validates: Requirements 1.5**
//
// For any service S with any combination of override values:
//   - If fulfillmentType = "physical" → resolved price = S.price (always)
//   - Overrides are never applied to physical bookings regardless of their values.
//
// The function under test is `resolveServicePrice` from `@/lib/pricing`.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { resolveServicePrice } from '@/lib/pricing';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * A nullable monetary value — either null/undefined or a positive decimal
 * string (matching how MySQL DECIMAL columns come through in JS).
 * Includes both null and undefined to exercise the != null guard.
 * Also includes zero to verify zero overrides don't leak into physical mode.
 */
const nullableOverrideArb = fc.oneof(
  { weight: 1, arbitrary: fc.constant(null) },
  { weight: 1, arbitrary: fc.constant(undefined) },
  { weight: 1, arbitrary: fc.constant('0.00') },
  {
    weight: 4,
    arbitrary: fc
      .integer({ min: 1, max: 1_000_000_00 })
      .map((cents) => (cents / 100).toFixed(2)),
  },
);

/**
 * A service object with a base price and arbitrary overrides.
 * The overrides span the full range: null, undefined, zero, and positive
 * values — all of which must be ignored when fulfillmentType is "physical".
 */
const serviceArb = fc.record({
  price: fc
    .integer({ min: 1, max: 1_000_000_00 })
    .map((cents) => (cents / 100).toFixed(2)),
  mobile_price_override: nullableOverrideArb,
  virtual_price_override: nullableOverrideArb,
});

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

const NUM_RUNS = 100;

describe('Property 5 — Physical Mode Price Immunity', () => {
  it('physical mode always returns base price regardless of override values', () => {
    fc.assert(
      fc.property(serviceArb, (service) => {
        const result = resolveServicePrice(service, 'physical');
        return result === parseFloat(service.price);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('physical mode result is independent of mobile_price_override value', () => {
    fc.assert(
      fc.property(serviceArb, (service) => {
        // Regardless of what mobile_price_override is set to,
        // physical mode must return the base price
        const result = resolveServicePrice(service, 'physical');
        const expected = parseFloat(service.price);
        return result === expected;
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('physical mode result is independent of virtual_price_override value', () => {
    fc.assert(
      fc.property(serviceArb, (service) => {
        // Regardless of what virtual_price_override is set to,
        // physical mode must return the base price
        const result = resolveServicePrice(service, 'physical');
        const expected = parseFloat(service.price);
        return result === expected;
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('physical mode price equals base price even when both overrides are set to different values', () => {
    // Specifically generate services where both overrides are non-null
    // and different from the base price to ensure they are truly ignored
    const serviceWithBothOverridesArb = fc.record({
      price: fc
        .integer({ min: 1, max: 500_00 })
        .map((cents) => (cents / 100).toFixed(2)),
      mobile_price_override: fc
        .integer({ min: 500_01, max: 1_000_000_00 })
        .map((cents) => (cents / 100).toFixed(2)),
      virtual_price_override: fc
        .integer({ min: 500_01, max: 1_000_000_00 })
        .map((cents) => (cents / 100).toFixed(2)),
    });

    fc.assert(
      fc.property(serviceWithBothOverridesArb, (service) => {
        const result = resolveServicePrice(service, 'physical');
        const expected = parseFloat(service.price);
        // The result must equal the base price, not either override
        return (
          result === expected &&
          result !== parseFloat(service.mobile_price_override) &&
          result !== parseFloat(service.virtual_price_override)
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
