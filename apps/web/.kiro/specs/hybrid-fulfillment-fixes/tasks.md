# Implementation Plan: Hybrid Fulfillment Fixes

## Overview

This implementation plan addresses 12 requirements for fixing and improving the hybrid fulfillment system. Changes span the booking API layer, availability engines, UI components, travel calculation utilities, and database schema. Tasks are ordered to build foundational utilities first, then wire them into API routes and UI components, with migrations handled last to allow safe rollback.

## Tasks

- [x] 1. Create Price Resolution Utility
  - [x] 1.1 Create `src/lib/pricing.js` with `resolveServicePrice(service, fulfillmentType)` function
    - Implement the price resolution logic: mobile override → virtual override → base price
    - Export as named function for use in API routes and tests
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Write property test for Price Resolution Invariant
    - **Property 1: Price Resolution Invariant**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
    - Use fast-check to generate arbitrary service objects and fulfillment types
    - Verify override selection logic across all combinations

  - [x] 1.3 Write property test for Physical Mode Price Immunity
    - **Property 5: Physical Mode Price Immunity**
    - **Validates: Requirements 1.5**
    - Verify that physical mode always returns base price regardless of override values

- [x] 2. Update Widget Book Route for Price Overrides
  - [x] 2.1 Update service query in `src/app/api/widget/[salonId]/book/route.js` to SELECT `mobile_price_override, virtual_price_override`
    - Extend the existing service fetch query to include override columns
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Use `resolveServicePrice()` in Widget Book Route instead of `service.price` when building `serviceDetails`
    - Import from `@/lib/pricing`
    - Replace direct `service.price` usage with resolved price
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Staff API Fulfillment Flags
  - [x] 3.1 Add `canPhysical`, `canMobile`, `canVirtual` to the GET response mapping in `src/app/api/staff/route.js`
    - Map from `staff.can_physical`, `staff.can_mobile`, `staff.can_virtual` using boolean coercion
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Add `canPhysical`, `canMobile`, `canVirtual` to the POST (created) response mapping in `src/app/api/staff/route.js`
    - Ensure newly created staff also returns fulfillment flags
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.3 Write property test for Staff Fulfillment Flags Round-Trip
    - **Property 3: Staff Fulfillment Flags Round-Trip**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
    - Verify `!!db_value === api_response_value` for all three flags

- [x] 4. Widget Service Selection Price Display
  - [x] 4.1 Update price display in `src/components/booking-widget/service-selection.jsx` to use fulfillment-aware price resolution
    - Compute displayed price using mobile/virtual override logic client-side
    - Update on fulfillment type change within same render cycle
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 4.2 Ensure the widget services API (`/api/widget/[salonId]/services`) returns `mobile_price_override` and `virtual_price_override` fields
    - Verify or update the SELECT query to include override columns
    - _Requirements: 4.1, 4.2_

- [x] 5. Travel Fee Origin Correction
  - [x] 5.1 Update travel fee calculation in `src/lib/booking.js` (createSafeBooking) to use staff home coordinates as primary origin
    - Fetch `staff.home_lat`, `staff.home_lng` for the assigned staff
    - Use as origin for `calculateTravelFee()` if valid
    - Fall back to salon coordinates if staff home is invalid
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.2 Update `src/lib/geo.js` `calculateTravelFee` callers to accept and prefer staff coordinates over salon coordinates
    - Ensure all callers pass staff home as primary origin
    - _Requirements: 5.1, 5.2_

  - [x] 5.3 Write property test for Travel Origin Priority
    - **Property 4: Travel Origin Priority**
    - **Validates: Requirements 5.1, 5.2, 5.3, 10.1, 10.2**
    - Verify priority chain: staff home → salon → null over arbitrary coordinate inputs

- [x] 6. Checkpoint - Core utilities and API fixes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Service Form Price Override Fields
  - [x] 7.1 Add `mobile_price_override` and `virtual_price_override` to the Zod schema in `src/components/services/service-form.jsx`
    - Define as optional, nullable number fields
    - _Requirements: 6.3, 6.4_

  - [x] 7.2 Add conditional "Mobile Price" input field that appears when `can_mobile` is checked and salon supports mobile
    - Show only when both conditions are met
    - _Requirements: 6.1_

  - [x] 7.3 Add conditional "Virtual Price" input field that appears when `can_virtual` is checked and salon supports virtual
    - Show only when both conditions are met
    - _Requirements: 6.2_

  - [x] 7.4 Include override values in form submission payload (empty → null)
    - Transform empty string to null before submission
    - _Requirements: 6.3, 6.4_

  - [x] 7.5 Pre-populate override fields when editing an existing service
    - Read from `serviceDetail.mobile_price_override` / `serviceDetail.virtual_price_override`
    - _Requirements: 6.5_

  - [x] 7.6 Update the service create/update API to accept and persist `mobile_price_override` and `virtual_price_override`
    - Add columns to INSERT/UPDATE queries
    - _Requirements: 6.3_

- [x] 8. Marketplace Fulfillment Badges
  - [x] 8.1 Add "We come to you" badge to `src/components/marketplace/salon-services.jsx` when `salon.is_mobile` is truthy
    - Display badge/indicator in salon header or services list area
    - _Requirements: 7.1, 7.3_

  - [x] 8.2 Add "Virtual consultations" badge to `src/components/marketplace/salon-services.jsx` when `salon.is_virtual` is truthy
    - Display badge/indicator in salon header or services list area
    - _Requirements: 7.2, 7.3_

- [x] 9. Travel Buffer Accumulation Fix
  - [x] 9.1 Fix `src/app/api/widget/[salonId]/availability/route.js` to separate travel buffer from per-service buffers
    - Travel buffer applied once regardless of service count
    - Service buffers still accumulate per service
    - _Requirements: 9.1, 9.2_

  - [x] 9.2 Write property test for Travel Buffer Single Application
    - **Property 2: Travel Buffer Single Application**
    - **Validates: Requirements 9.1, 9.2**
    - Metamorphic property: adding a service increases total buffer by exactly that service's buffer_time_minutes

  - [x] 9.3 Apply same single-travel-buffer fix to `src/app/api/salons/[id]/availability/route.js`
    - Ensure dashboard availability uses same logic
    - _Requirements: 9.3_

- [x] 10. Dashboard Availability Mobile Awareness
  - [x] 10.1 Add `fulfillmentType`, `userLat`, `userLng` query parameter parsing to `src/app/api/salons/[id]/availability/route.js`
    - Validate fulfillmentType enum, parse coordinates as floats
    - _Requirements: 2.1, 2.5_

  - [x] 10.2 Add travel radius fail-fast check when `fulfillmentType=mobile` and coordinates are provided
    - Return empty slots with explanatory message if coordinates exceed radius
    - _Requirements: 2.4_

  - [x] 10.3 Add travel buffer padding (half before, half after) to slot working-hours validation for mobile mode
    - Compute `halfBuffer = Math.floor(travel_buffer_time / 2)`
    - Pad slot start and end when checking against working hours
    - _Requirements: 2.2_

  - [x] 10.4 Import travel and geo modules; add bidirectional travel feasibility check for mobile slots with coordinates
    - Use `checkBidirectionalTravel()` against adjacent bookings
    - _Requirements: 2.3_

  - [x] 10.5 Fetch staff `home_lat`/`home_lng` for travel origin resolution in dashboard availability
    - Use `resolveOrigin()` from travel module
    - _Requirements: 2.3, 5.1_

- [x] 11. First-Booking-of-Day Travel Origin
  - [x] 11.1 Update `src/app/api/widget/[salonId]/availability/route.js` to pass staff base location and shift start as synthetic "previous end" when no prior booking exists
    - Use resolveOrigin() for staff base location
    - Use shift start time as prevEndTime
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 11.2 Update `src/app/api/salons/[id]/availability/route.js` with same first-booking-of-day logic
    - Apply same synthetic previous end approach
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 12. Virtual Meeting Link Validation
  - [x] 12.1 Add validation check in `src/app/api/widget/[salonId]/book/route.js` that rejects virtual bookings without a resolved meeting link
    - Resolve link from: request payload → salon default → null
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 12.2 Return error code `MEETING_LINK_REQUIRED` with HTTP 400 and descriptive message
    - Message: "A virtual meeting link is required. Please contact the salon to configure their virtual booking settings."
    - _Requirements: 11.1_

- [x] 13. Checkpoint - All feature code complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Remove Legacy offering_type
  - [x] 14.1 Create data-fix migration to set all NULL `can_physical`/`can_mobile`/`can_virtual` to explicit defaults
    - Ensure no NULLs remain before column drop
    - _Requirements: 8.4_

  - [x] 14.2 Remove `offering_type` fallback logic from `src/lib/booking.js` fulfillment compatibility guard
    - Remove the `hasFlagValues` check and offering_type fallback
    - _Requirements: 8.3_

  - [x] 14.3 Remove `offering_type` from the SELECT query in `src/lib/booking.js`
    - Clean up query to no longer reference deprecated column
    - _Requirements: 8.3_

  - [x] 14.4 Create schema migration to drop `idx_services_offering` index and `offering_type` column
    - Drop index first, then column
    - _Requirements: 8.1, 8.2_

- [x] 15. Covered ZIP Codes Normalization
  - [x] 15.1 Create migration to add `salon_covered_zip_codes` table
    - Columns: id (PK), salon_id (FK), zip_code (indexed), created_at
    - Add composite index on (salon_id, zip_code)
    - _Requirements: 12.1_

  - [x] 15.2 Create data migration to split existing `salons.covered_zip_codes` into individual rows
    - Use MySQL string splitting to migrate comma-separated values
    - Handle NULL and empty string cases gracefully
    - _Requirements: 12.2_

  - [x] 15.3 Update `src/app/api/widget/[salonId]/book/route.js` ZIP validation to query the new table
    - Replace comma-split logic with SQL query against `salon_covered_zip_codes`
    - _Requirements: 12.3_

  - [x] 15.4 Create follow-up migration to drop `salons.covered_zip_codes` column
    - To be run after verification that new table is working correctly
    - _Requirements: 12.4_

- [x] 16. Final checkpoint - All migrations and tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Migration tasks (14, 15) are placed last to allow safe rollback — code changes deploy before schema drops
- The `offering_type` drop (14.4) and `covered_zip_codes` drop (15.4) should be separate deployments from the code changes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1", "3.2", "8.1", "8.2"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1", "3.3", "4.2", "7.1"] },
    { "id": 2, "tasks": ["2.2", "4.1", "5.1", "5.2", "7.2", "7.3", "9.1"] },
    { "id": 3, "tasks": ["5.3", "7.4", "7.5", "7.6", "9.2", "9.3"] },
    { "id": 4, "tasks": ["10.1", "10.2", "11.1", "12.1", "12.2", "14.1", "15.1"] },
    { "id": 5, "tasks": ["10.3", "10.4", "10.5", "11.2", "14.2", "14.3", "15.2"] },
    { "id": 6, "tasks": ["14.4", "15.3"] },
    { "id": 7, "tasks": ["15.4"] }
  ]
}
```
