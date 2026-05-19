// Feature: hybrid-fulfillment-fixes
//
// Property 2 — Travel Buffer Single Application.
//
// **Validates: Requirements 9.1, 9.2**
//
// For any multi-service mobile booking with N services (N ≥ 1):
//   - Total travel buffer contribution = salon.travel_buffer_time (constant, independent of N)
//   - Total service buffer = Σ(service_i.buffer_time_minutes) for i = 1..N
//   - Total buffer = travel_buffer + service_buffer
//
// Metamorphic property: adding a service increases total buffer by exactly
// that service's buffer_time_minutes, never by travel_buffer_time again.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// System Under Test
// ---------------------------------------------------------------------------
// We replicate the buffer calculation logic from
// `src/app/api/widget/[salonId]/availability/route.js` as a pure function
// to test the property without needing database access.

/**
 * Computes the total buffer for a booking given fulfillment type, salon
 * config, and a list of services.
 *
 * This mirrors the fixed logic in the widget availability route:
 *   const travelBuffer = (fulfillmentType === 'mobile' && salon.travel_buffer_time)
 *     ? salon.travel_buffer_time : 0;
 *   let serviceBuffer = 0;
 *   for (const service of services) {
 *     serviceBuffer += (service.buffer_time_minutes || 0);
 *   }
 *   const totalBuffer = travelBuffer + serviceBuffer;
 */
function computeTotalBuffer(fulfillmentType, salon, services) {
  const travelBuffer =
    fulfillmentType === 'mobile' && salon.travel_buffer_time
      ? salon.travel_buffer_time
      : 0;
  let serviceBuffer = 0;
  for (const service of services) {
    serviceBuffer += service.buffer_time_minutes || 0;
  }
  return travelBuffer + serviceBuffer;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const FULFILLMENT_TYPES = ['physical', 'mobile', 'virtual'];

/** Salon with a travel_buffer_time (0–120 minutes). */
const salonArb = fc.record({
  travel_buffer_time: fc.integer({ min: 0, max: 120 }),
});

/** A service with a buffer_time_minutes (0–60 minutes). */
const serviceArb = fc.record({
  buffer_time_minutes: fc.integer({ min: 0, max: 60 }),
});

/** A non-empty list of services (1–10 services per booking). */
const servicesArb = fc.array(serviceArb, { minLength: 1, maxLength: 10 });

const fulfillmentTypeArb = fc.constantFrom(...FULFILLMENT_TYPES);

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

const NUM_RUNS = 100;

describe('Property 2 — Travel Buffer Single Application', () => {
  it('travel buffer is applied exactly once for mobile bookings regardless of service count', () => {
    fc.assert(
      fc.property(salonArb, servicesArb, (salon, services) => {
        const totalBuffer = computeTotalBuffer('mobile', salon, services);

        const expectedTravelBuffer = salon.travel_buffer_time || 0;
        const expectedServiceBuffer = services.reduce(
          (sum, s) => sum + (s.buffer_time_minutes || 0),
          0,
        );

        return totalBuffer === expectedTravelBuffer + expectedServiceBuffer;
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('metamorphic: adding a service increases total buffer by exactly that service buffer_time_minutes', () => {
    fc.assert(
      fc.property(salonArb, servicesArb, serviceArb, (salon, services, newService) => {
        const bufferBefore = computeTotalBuffer('mobile', salon, services);
        const bufferAfter = computeTotalBuffer('mobile', salon, [...services, newService]);

        const increase = bufferAfter - bufferBefore;
        const expectedIncrease = newService.buffer_time_minutes || 0;

        // The increase should be exactly the new service's buffer, never
        // including travel_buffer_time again.
        return increase === expectedIncrease;
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('travel buffer is zero for non-mobile fulfillment types', () => {
    fc.assert(
      fc.property(
        salonArb,
        servicesArb,
        fc.constantFrom('physical', 'virtual'),
        (salon, services, fulfillmentType) => {
          const totalBuffer = computeTotalBuffer(fulfillmentType, salon, services);

          // For non-mobile, total buffer should equal only the sum of service buffers
          const expectedServiceBuffer = services.reduce(
            (sum, s) => sum + (s.buffer_time_minutes || 0),
            0,
          );

          return totalBuffer === expectedServiceBuffer;
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('total buffer is independent of service count for the travel component', () => {
    fc.assert(
      fc.property(salonArb, servicesArb, (salon, services) => {
        // Compute buffer with all services having zero buffer_time_minutes
        const zeroBufferServices = services.map(() => ({ buffer_time_minutes: 0 }));
        const bufferWithZeroServices = computeTotalBuffer('mobile', salon, zeroBufferServices);

        // The travel component should be the same regardless of how many
        // services there are (it's always salon.travel_buffer_time once)
        const expectedTravelOnly = salon.travel_buffer_time || 0;

        return bufferWithZeroServices === expectedTravelOnly;
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('total buffer equals travel_buffer + sum of service buffers for any fulfillment type', () => {
    fc.assert(
      fc.property(salonArb, servicesArb, fulfillmentTypeArb, (salon, services, fulfillmentType) => {
        const totalBuffer = computeTotalBuffer(fulfillmentType, salon, services);

        const expectedTravelBuffer =
          fulfillmentType === 'mobile' && salon.travel_buffer_time
            ? salon.travel_buffer_time
            : 0;
        const expectedServiceBuffer = services.reduce(
          (sum, s) => sum + (s.buffer_time_minutes || 0),
          0,
        );

        return totalBuffer === expectedTravelBuffer + expectedServiceBuffer;
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
