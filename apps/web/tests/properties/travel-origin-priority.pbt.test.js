// Feature: hybrid-fulfillment-fixes
//
// Property 4 — Travel Origin Priority.
//
// **Validates: Requirements 5.1, 5.2, 5.3, 10.1, 10.2**
//
// For any travel fee or feasibility calculation:
//   - If staff.home_lat and staff.home_lng are valid → origin = (home_lat, home_lng)
//   - Else if salon.latitude and salon.longitude are valid → origin = (salon.latitude, salon.longitude)
//   - Else → origin = null (fee = 0, feasibility = assumed feasible)
//
// This priority chain is deterministic and testable as a property over
// arbitrary coordinate inputs.
//
// The function under test is `resolveOrigin` from `@/lib/travel`.
// In the travel fee context, callers pass staff home as the primary pair
// and salon coordinates as the fallback pair.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { resolveOrigin } from '@/lib/travel';
import { isValidCoordinatePair } from '@/lib/geo';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * A valid latitude: finite number in [-90, 90].
 */
const validLatArb = fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true });

/**
 * A valid longitude: finite number in [-180, 180].
 */
const validLngArb = fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true });

/**
 * An invalid coordinate value — one where Number(value) is NOT finite.
 *
 * Important: Number(null) = 0 and Number("") = 0, which are finite,
 * so those are NOT invalid for isValidCoordinatePair. We only use values
 * that produce NaN or ±Infinity after Number() conversion.
 */
const invalidCoordArb = fc.oneof(
  fc.constant(undefined),       // Number(undefined) = NaN
  fc.constant(NaN),             // Number(NaN) = NaN
  fc.constant(Infinity),        // Number(Infinity) = Infinity
  fc.constant(-Infinity),       // Number(-Infinity) = -Infinity
  fc.constant('abc'),           // Number('abc') = NaN
  fc.constant('not-a-number'),  // Number('not-a-number') = NaN
);

/**
 * A valid coordinate pair — both values produce finite numbers via Number().
 */
const validCoordPairArb = fc.record({
  lat: validLatArb,
  lng: validLngArb,
}).map(({ lat, lng }) => ({ lat, lng, valid: true }));

/**
 * An invalid coordinate pair — at least one coordinate produces a non-finite
 * Number() conversion. We ensure at least one coord is truly invalid.
 */
const invalidCoordPairArb = fc.oneof(
  // Both invalid
  fc.record({ lat: invalidCoordArb, lng: invalidCoordArb })
    .map(({ lat, lng }) => ({ lat, lng, valid: false })),
  // Only lat invalid (lng is valid finite number)
  fc.record({ lat: invalidCoordArb, lng: validLngArb })
    .map(({ lat, lng }) => ({ lat, lng, valid: false })),
  // Only lng invalid (lat is valid finite number)
  fc.record({ lat: validLatArb, lng: invalidCoordArb })
    .map(({ lat, lng }) => ({ lat, lng, valid: false })),
);

/**
 * Any coordinate pair — valid or invalid.
 */
const anyCoordPairArb = fc.oneof(
  { weight: 3, arbitrary: validCoordPairArb },
  { weight: 2, arbitrary: invalidCoordPairArb },
);

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

const NUM_RUNS = 100;

describe('Property 4 — Travel Origin Priority', () => {
  it('when staff home coordinates are valid, origin equals staff home regardless of salon coordinates', () => {
    fc.assert(
      fc.property(validCoordPairArb, anyCoordPairArb, (staffHome, salon) => {
        // Staff home is valid — should always be chosen
        const result = resolveOrigin(staffHome.lat, staffHome.lng, salon.lat, salon.lng);

        expect(result).not.toBeNull();
        expect(result.lat).toBe(Number(staffHome.lat));
        expect(result.lng).toBe(Number(staffHome.lng));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('when staff home is invalid and salon coordinates are valid, origin equals salon coordinates', () => {
    fc.assert(
      fc.property(invalidCoordPairArb, validCoordPairArb, (staffHome, salon) => {
        // Staff home is invalid, salon is valid — salon should be chosen
        const result = resolveOrigin(staffHome.lat, staffHome.lng, salon.lat, salon.lng);

        expect(result).not.toBeNull();
        expect(result.lat).toBe(Number(salon.lat));
        expect(result.lng).toBe(Number(salon.lng));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('when both staff home and salon coordinates are invalid, origin is null', () => {
    fc.assert(
      fc.property(invalidCoordPairArb, invalidCoordPairArb, (staffHome, salon) => {
        // Both invalid — should return null
        const result = resolveOrigin(staffHome.lat, staffHome.lng, salon.lat, salon.lng);

        expect(result).toBeNull();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('the full priority chain is deterministic over arbitrary inputs', () => {
    fc.assert(
      fc.property(anyCoordPairArb, anyCoordPairArb, (staffHome, salon) => {
        const result = resolveOrigin(staffHome.lat, staffHome.lng, salon.lat, salon.lng);

        const staffHomeValid = isValidCoordinatePair(Number(staffHome.lat), Number(staffHome.lng));
        const salonValid = isValidCoordinatePair(Number(salon.lat), Number(salon.lng));

        if (staffHomeValid) {
          // Priority 1: staff home
          expect(result).not.toBeNull();
          expect(result.lat).toBe(Number(staffHome.lat));
          expect(result.lng).toBe(Number(staffHome.lng));
        } else if (salonValid) {
          // Priority 2: salon
          expect(result).not.toBeNull();
          expect(result.lat).toBe(Number(salon.lat));
          expect(result.lng).toBe(Number(salon.lng));
        } else {
          // Priority 3: null
          expect(result).toBeNull();
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('result is always either a valid {lat, lng} object or null — never partial', () => {
    fc.assert(
      fc.property(anyCoordPairArb, anyCoordPairArb, (staffHome, salon) => {
        const result = resolveOrigin(staffHome.lat, staffHome.lng, salon.lat, salon.lng);

        if (result !== null) {
          // Must have both lat and lng as finite numbers
          expect(typeof result.lat).toBe('number');
          expect(typeof result.lng).toBe('number');
          expect(Number.isFinite(result.lat)).toBe(true);
          expect(Number.isFinite(result.lng)).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
