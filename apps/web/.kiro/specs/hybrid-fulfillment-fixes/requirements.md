# Requirements Document

## Introduction

This specification addresses a comprehensive set of bug fixes and improvements to the hybrid fulfillment system in the Fresh SaaS platform. The hybrid fulfillment model allows salons to offer services via physical (in-salon), mobile (staff travels to client), and virtual (video call) modes. Several critical bugs prevent correct pricing, availability calculation, and data exposure, while improvements enhance the admin experience and data integrity.

## Glossary

- **Booking_Engine**: The `createSafeBooking()` function in `src/lib/booking.js` that atomically creates bookings with conflict detection, travel validation, and row locking.
- **Widget_Book_Route**: The `POST /api/widget/[salonId]/book` API endpoint that handles booking creation from the embeddable booking widget.
- **Dashboard_Availability_API**: The `GET /api/salons/[id]/availability` API endpoint used by the salon dashboard calendar to compute available time slots.
- **Widget_Availability_API**: The `GET /api/widget/[salonId]/availability` API endpoint used by the booking widget to compute available time slots for clients.
- **Staff_API**: The `GET /api/staff` API endpoint that returns staff member data for the dashboard.
- **Service_Form**: The `service-form.jsx` dialog component used by salon owners to create and edit services.
- **Widget_Service_Selection**: The `service-selection.jsx` component in the booking widget that displays available services and their prices.
- **Marketplace_Salon_Services**: The `salon-services.jsx` component on the public salon profile page that lists services.
- **Travel_Module**: The `src/lib/travel.js` module containing travel time estimation and bidirectional feasibility checks.
- **Geo_Module**: The `src/lib/geo.js` module containing Haversine distance calculation and travel fee computation.
- **Fulfillment_Type**: One of "physical", "mobile", or "virtual" — the mode in which a booking is delivered.
- **Price_Override**: A service-level column (`mobile_price_override` or `virtual_price_override`) that specifies an alternate price when the service is booked in a non-physical mode. NULL means use the base price.
- **Travel_Buffer**: The `salons.travel_buffer_time` value (in minutes) added to mobile bookings to account for travel and setup time.
- **Staff_Home_Coordinates**: The `staff.home_lat` and `staff.home_lng` columns representing a staff member's base location for travel calculations.
- **Salon_Coordinates**: The `salons.latitude` and `salons.longitude` columns representing the salon's physical location.

## Requirements

### Requirement 1: Apply Mobile/Virtual Price Overrides at Booking Time

**User Story:** As a salon owner, I want mobile and virtual price overrides to be applied when a client books a service in those modes, so that I can charge appropriately for the additional effort or reduced overhead.

#### Acceptance Criteria

1. WHEN a booking is created with Fulfillment_Type "mobile" and the service has a non-NULL `mobile_price_override`, THE Widget_Book_Route SHALL use the `mobile_price_override` value as the service price snapshot passed to the Booking_Engine.
2. WHEN a booking is created with Fulfillment_Type "virtual" and the service has a non-NULL `virtual_price_override`, THE Widget_Book_Route SHALL use the `virtual_price_override` value as the service price snapshot passed to the Booking_Engine.
3. WHEN a booking is created with Fulfillment_Type "mobile" and the service has a NULL `mobile_price_override`, THE Widget_Book_Route SHALL use the base `services.price` value.
4. WHEN a booking is created with Fulfillment_Type "virtual" and the service has a NULL `virtual_price_override`, THE Widget_Book_Route SHALL use the base `services.price` value.
5. WHEN a booking is created with Fulfillment_Type "physical", THE Widget_Book_Route SHALL use the base `services.price` value regardless of override columns.

### Requirement 2: Dashboard Availability API Mobile Awareness

**User Story:** As a salon owner using the dashboard calendar, I want the availability API to account for fulfillment type, travel buffers, and travel feasibility, so that I can see accurate slot availability when scheduling mobile appointments.

#### Acceptance Criteria

1. THE Dashboard_Availability_API SHALL accept an optional `fulfillmentType` query parameter with values "physical", "mobile", or "virtual".
2. WHEN `fulfillmentType` is "mobile", THE Dashboard_Availability_API SHALL pad each candidate slot with the salon's `travel_buffer_time` (half before, half after) when checking against staff working hours.
3. WHEN `fulfillmentType` is "mobile" and `userLat`/`userLng` query parameters are provided, THE Dashboard_Availability_API SHALL perform bidirectional travel feasibility checks against adjacent bookings using the Travel_Module.
4. WHEN `fulfillmentType` is "mobile" and the salon has a `travel_radius` configured, THE Dashboard_Availability_API SHALL reject requests where the client coordinates exceed the travel radius by returning an empty slot list with an explanatory message.
5. WHILE `fulfillmentType` is not provided or is "physical", THE Dashboard_Availability_API SHALL maintain its current behavior with no travel padding or feasibility checks.

### Requirement 3: Staff API Fulfillment Capabilities in Response

**User Story:** As a frontend developer consuming the Staff API, I want the GET response to include fulfillment capability flags, so that the dashboard can display and filter staff by their supported modes.

#### Acceptance Criteria

1. THE Staff_API GET response SHALL include `canPhysical`, `canMobile`, and `canVirtual` boolean fields for each staff member in the response mapping.
2. THE Staff_API GET response SHALL map `canPhysical` from the `staff.can_physical` database column.
3. THE Staff_API GET response SHALL map `canMobile` from the `staff.can_mobile` database column.
4. THE Staff_API GET response SHALL map `canVirtual` from the `staff.can_virtual` database column.

### Requirement 4: Widget Service Selection Displays Correct Price per Fulfillment Type

**User Story:** As a client using the booking widget, I want to see the correct price for the selected fulfillment type, so that I know what I will be charged before booking.

#### Acceptance Criteria

1. WHEN Fulfillment_Type is "mobile" and a service has a non-NULL `mobile_price_override`, THE Widget_Service_Selection SHALL display the `mobile_price_override` value as the service price.
2. WHEN Fulfillment_Type is "virtual" and a service has a non-NULL `virtual_price_override`, THE Widget_Service_Selection SHALL display the `virtual_price_override` value as the service price.
3. WHEN Fulfillment_Type is "physical" or the relevant override is NULL, THE Widget_Service_Selection SHALL display the base `services.price` value.
4. WHEN the user changes the Fulfillment_Type, THE Widget_Service_Selection SHALL update displayed prices to reflect the new mode within the same render cycle.

### Requirement 5: Travel Fee Calculated from Staff Home Coordinates

**User Story:** As a salon owner with mobile staff, I want travel fees to be calculated from the staff member's home coordinates rather than the salon address, so that fees accurately reflect the actual travel distance.

#### Acceptance Criteria

1. WHEN a mobile booking travel fee is calculated and the assigned staff member has valid Staff_Home_Coordinates, THE Geo_Module `calculateTravelFee` caller SHALL use Staff_Home_Coordinates as the origin point.
2. WHEN a mobile booking travel fee is calculated and the assigned staff member does not have valid Staff_Home_Coordinates, THE system SHALL fall back to Salon_Coordinates as the origin point.
3. WHEN neither Staff_Home_Coordinates nor Salon_Coordinates are valid, THE system SHALL return a travel fee of zero.

### Requirement 6: Price Override Fields in Service Form

**User Story:** As a salon owner, I want input fields for mobile and virtual price overrides in the service form, so that I can set mode-specific pricing when creating or editing services.

#### Acceptance Criteria

1. WHEN the salon supports mobile fulfillment (`is_mobile = true`) and the service has `can_mobile` checked, THE Service_Form SHALL display a "Mobile Price" input field.
2. WHEN the salon supports virtual fulfillment (`is_virtual = true`) and the service has `can_virtual` checked, THE Service_Form SHALL display a "Virtual Price" input field.
3. THE Service_Form SHALL submit `mobile_price_override` and `virtual_price_override` values to the service create/update API.
4. WHEN a price override field is left empty, THE Service_Form SHALL submit NULL for that override (indicating "use base price").
5. WHEN editing an existing service with price overrides set, THE Service_Form SHALL pre-populate the override fields with the current values.

### Requirement 7: Salon-Level Fulfillment Badges on Marketplace

**User Story:** As a client browsing the marketplace, I want to see badges indicating which fulfillment modes a salon supports, so that I can quickly identify salons that offer mobile or virtual services.

#### Acceptance Criteria

1. WHEN a salon has `is_mobile = true`, THE Marketplace_Salon_Services component SHALL display a "We come to you" badge or indicator on the salon profile.
2. WHEN a salon has `is_virtual = true`, THE Marketplace_Salon_Services component SHALL display a "Virtual consultations" badge or indicator on the salon profile.
3. WHILE a salon only supports physical fulfillment (`is_physical = true`, `is_mobile = false`, `is_virtual = false`), THE Marketplace_Salon_Services component SHALL NOT display any fulfillment badges.

### Requirement 8: Remove Legacy offering_type Column

**User Story:** As a platform maintainer, I want to remove the deprecated `offering_type` enum column from the services table, so that the codebase has a single source of truth for service fulfillment capabilities.

#### Acceptance Criteria

1. THE system SHALL provide a database migration that drops the `offering_type` column from the `services` table.
2. THE system SHALL provide a database migration that drops the `idx_services_offering` index before dropping the column.
3. THE Booking_Engine SHALL remove all fallback logic that reads `offering_type` when `can_physical`/`can_mobile`/`can_virtual` flags are NULL.
4. WHEN the migration is applied, THE system SHALL verify that all services have explicit `can_physical`, `can_mobile`, and `can_virtual` flag values (no NULLs remain).

### Requirement 9: Travel Buffer Accumulation Fix for Multi-Service Mobile Bookings

**User Story:** As a client booking multiple services in a single mobile appointment, I want the travel buffer to apply only once per booking rather than stacking per service, so that the total appointment duration is accurate.

#### Acceptance Criteria

1. WHEN a multi-service mobile booking is created, THE Widget_Availability_API SHALL apply the salon's `travel_buffer_time` exactly once to the total booking duration, not once per service.
2. WHEN a multi-service mobile booking is created, THE Widget_Availability_API SHALL still accumulate per-service `buffer_time_minutes` (prep/cleanup time) for each service individually.
3. THE Dashboard_Availability_API SHALL apply the same single-travel-buffer rule for mobile multi-service bookings.

### Requirement 10: First-Booking-of-Day Travel Origin

**User Story:** As a salon owner, I want the system to use the staff member's home coordinates as the travel origin for the first booking of the day, so that travel time estimates are accurate even when no prior booking exists.

#### Acceptance Criteria

1. WHEN calculating travel feasibility for the first mobile booking of a staff member's day and the staff has valid Staff_Home_Coordinates, THE Travel_Module SHALL use Staff_Home_Coordinates as the departure origin.
2. WHEN calculating travel feasibility for the first mobile booking of a staff member's day and the staff does not have valid Staff_Home_Coordinates, THE Travel_Module SHALL fall back to Salon_Coordinates as the departure origin.
3. WHEN no previous booking exists for the day, THE Widget_Availability_API SHALL treat the staff's base location (home or salon) as the origin for the arrival travel time calculation.

### Requirement 11: Virtual Meeting Link Validation

**User Story:** As a platform operator, I want to ensure that every virtual booking has a meeting link, so that clients always have a way to join their virtual appointment.

#### Acceptance Criteria

1. WHEN a booking is created with Fulfillment_Type "virtual" and neither the request payload nor the salon's default `virtual_meeting_link` provides a meeting link, THE Widget_Book_Route SHALL return a validation error with code "MEETING_LINK_REQUIRED".
2. WHEN a booking is created with Fulfillment_Type "virtual" and the salon has a default `virtual_meeting_link` configured, THE Widget_Book_Route SHALL use the salon's default link if no per-booking link is provided.
3. WHEN a booking is created with Fulfillment_Type "virtual" and a per-booking `virtualMeetingLink` is provided, THE Widget_Book_Route SHALL use the per-booking link.

### Requirement 12: Covered ZIP Codes Scalability Improvement

**User Story:** As a platform maintainer, I want covered ZIP codes stored in a normalized relational table rather than a comma-separated text field, so that lookups are efficient and the system scales to salons with many covered zones.

#### Acceptance Criteria

1. THE system SHALL provide a database migration that creates a `salon_covered_zip_codes` table with columns `id`, `salon_id` (FK to salons), `zip_code` (varchar, indexed), and `created_at`.
2. THE system SHALL provide a data migration that moves existing `salons.covered_zip_codes` comma-separated values into individual rows in the new table.
3. WHEN validating a mobile booking address against covered zones, THE Widget_Book_Route SHALL query the `salon_covered_zip_codes` table instead of parsing the comma-separated text field.
4. THE system SHALL provide a subsequent migration that drops the `salons.covered_zip_codes` column after the data migration is verified.
