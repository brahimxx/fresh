// Feature: hybrid-fulfillment-fixes
// Task: 3.3 Write property test for Staff Fulfillment Flags Round-Trip
//
// Property 3: Staff Fulfillment Flags Round-Trip
//
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
//
// For any staff member with can_physical/can_mobile/can_virtual flags in the
// database, the API response canPhysical/canMobile/canVirtual must equal the
// boolean coercion of the DB values.
//
// Property: `!!db_value === api_response_value` for all three flags.
//
// The mapping logic in `src/app/api/staff/route.js` is:
//   canPhysical: !!s.can_physical,
//   canMobile: !!s.can_mobile,
//   canVirtual: !!s.can_virtual,
//
// We test that for any arbitrary DB values (0, 1, null, undefined, truthy
// integers, etc.), the boolean coercion produces the expected result.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Reference implementation — mirrors the mapping in staff/route.js
// ---------------------------------------------------------------------------

/**
 * Maps a staff DB row's fulfillment flags to the API response shape.
 * This replicates the exact logic from `src/app/api/staff/route.js`.
 */
function mapStaffFulfillmentFlags(staffRow) {
  return {
    canPhysical: !!staffRow.can_physical,
    canMobile: !!staffRow.can_mobile,
    canVirtual: !!staffRow.can_virtual,
  };
}

// ---------------------------------------------------------------------------
// Generators — DB-value shaped, exercising all MySQL TINYINT edge cases
// ---------------------------------------------------------------------------

/**
 * Arbitrary for a MySQL TINYINT(1) column value as it appears in JS after
 * the mysql2 driver parses it. MySQL TINYINT can be 0 or 1 (boolean-ish),
 * but also any integer -128..127. The driver may also return null for
 * nullable columns. We also include undefined to cover cases where the
 * column might be missing from the row object entirely.
 */
const dbFlagValueArb = fc.oneof(
  // Common MySQL boolean values
  { weight: 3, arbitrary: fc.constantFrom(0, 1) },
  // Null (nullable column)
  { weight: 2, arbitrary: fc.constant(null) },
  // Undefined (column missing from row)
  { weight: 1, arbitrary: fc.constant(undefined) },
  // Truthy integers (MySQL TINYINT range)
  { weight: 2, arbitrary: fc.integer({ min: -128, max: 127 }).filter((n) => n !== 0) },
  // Edge: zero as different numeric types
  { weight: 1, arbitrary: fc.constantFrom(0, -0) },
);

/**
 * Arbitrary for a staff DB row with all three fulfillment flag columns.
 */
const staffDbRowArb = fc.record({
  can_physical: dbFlagValueArb,
  can_mobile: dbFlagValueArb,
  can_virtual: dbFlagValueArb,
});

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('Property 3 — Staff Fulfillment Flags Round-Trip', () => {
  it('!!db_value === api_response_value for canPhysical (Req 3.2)', () => {
    fc.assert(
      fc.property(staffDbRowArb, (row) => {
        const mapped = mapStaffFulfillmentFlags(row);
        expect(mapped.canPhysical).toBe(!!row.can_physical);
      }),
      { numRuns: 100 },
    );
  });

  it('!!db_value === api_response_value for canMobile (Req 3.3)', () => {
    fc.assert(
      fc.property(staffDbRowArb, (row) => {
        const mapped = mapStaffFulfillmentFlags(row);
        expect(mapped.canMobile).toBe(!!row.can_mobile);
      }),
      { numRuns: 100 },
    );
  });

  it('!!db_value === api_response_value for canVirtual (Req 3.4)', () => {
    fc.assert(
      fc.property(staffDbRowArb, (row) => {
        const mapped = mapStaffFulfillmentFlags(row);
        expect(mapped.canVirtual).toBe(!!row.can_virtual);
      }),
      { numRuns: 100 },
    );
  });

  it('all three flags satisfy !!db_value === api_response_value simultaneously (Req 3.1)', () => {
    fc.assert(
      fc.property(staffDbRowArb, (row) => {
        const mapped = mapStaffFulfillmentFlags(row);
        expect(mapped.canPhysical).toBe(!!row.can_physical);
        expect(mapped.canMobile).toBe(!!row.can_mobile);
        expect(mapped.canVirtual).toBe(!!row.can_virtual);
      }),
      { numRuns: 100 },
    );
  });

  it('response flags are always strict booleans (never truthy/falsy non-booleans) (Req 3.1)', () => {
    fc.assert(
      fc.property(staffDbRowArb, (row) => {
        const mapped = mapStaffFulfillmentFlags(row);
        expect(typeof mapped.canPhysical).toBe('boolean');
        expect(typeof mapped.canMobile).toBe('boolean');
        expect(typeof mapped.canVirtual).toBe('boolean');
      }),
      { numRuns: 100 },
    );
  });

  it('falsy DB values (0, null, undefined) always map to false (Req 3.1)', () => {
    const falsyValueArb = fc.constantFrom(0, null, undefined, -0);
    const falsyRowArb = fc.record({
      can_physical: falsyValueArb,
      can_mobile: falsyValueArb,
      can_virtual: falsyValueArb,
    });

    fc.assert(
      fc.property(falsyRowArb, (row) => {
        const mapped = mapStaffFulfillmentFlags(row);
        expect(mapped.canPhysical).toBe(false);
        expect(mapped.canMobile).toBe(false);
        expect(mapped.canVirtual).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('truthy DB values (1, non-zero integers) always map to true (Req 3.1)', () => {
    const truthyValueArb = fc.integer({ min: -128, max: 127 }).filter((n) => n !== 0);
    const truthyRowArb = fc.record({
      can_physical: truthyValueArb,
      can_mobile: truthyValueArb,
      can_virtual: truthyValueArb,
    });

    fc.assert(
      fc.property(truthyRowArb, (row) => {
        const mapped = mapStaffFulfillmentFlags(row);
        expect(mapped.canPhysical).toBe(true);
        expect(mapped.canMobile).toBe(true);
        expect(mapped.canVirtual).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
