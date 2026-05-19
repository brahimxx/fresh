# Design Document

## Overview

This design addresses 12 requirements for fixing and improving the hybrid fulfillment system. Changes span the booking API layer, availability engines, UI components, travel calculation utilities, and database schema. The approach prioritizes backward compatibility and regression safety by making incremental, testable changes.

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Fresh Platform                                 │
│                                                                       │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │ Booking      │    │ Availability     │    │ UI Components     │  │
│  │ Widget       │───▶│ Engine           │    │                   │  │
│  │ (Client)     │    │ (Widget + Dash)  │    │ • service-form    │  │
│  └──────┬───────┘    └────────┬─────────┘    │ • service-select  │  │
│         │                     │              │ • salon-services  │  │
│         ▼                     ▼              └───────────────────┘  │
│  ┌──────────────┐    ┌──────────────────┐                           │
│  │ Book Route   │    │ Travel Module    │                           │
│  │ (POST)       │───▶│ (travel.js)      │                           │
│  └──────┬───────┘    └────────┬─────────┘                           │
│         │                     │                                      │
│         ▼                     ▼                                      │
│  ┌──────────────┐    ┌──────────────────┐                           │
│  │ Booking      │    │ Geo Module       │                           │
│  │ Engine       │    │ (geo.js)         │                           │
│  │ (booking.js) │    └──────────────────┘                           │
│  └──────┬───────┘                                                    │
│         │                                                            │
│         ▼                                                            │
│  ┌──────────────────────────────────────┐                           │
│  │           MySQL Database              │                           │
│  │  services, staff, bookings, salons    │                           │
│  └──────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Change Impact Map

| Component | Requirements | Risk Level |
|-----------|-------------|------------|
| `src/app/api/widget/[salonId]/book/route.js` | R1, R5, R11 | High — booking money flow |
| `src/app/api/widget/[salonId]/availability/route.js` | R9 | Medium — slot calculation |
| `src/app/api/salons/[id]/availability/route.js` | R2, R9 | Medium — dashboard slots |
| `src/app/api/staff/route.js` | R3 | Low — read-only mapping |
| `src/components/booking-widget/service-selection.jsx` | R4 | Low — display only |
| `src/components/services/service-form.jsx` | R6 | Low — form fields |
| `src/components/marketplace/salon-services.jsx` | R7 | Low — display only |
| `src/lib/booking.js` | R8 | Medium — remove fallback |
| `src/lib/geo.js` | R5 | Medium — fee calculation |
| `src/lib/travel.js` | R10 | Low — origin resolution |
| Database migrations | R8, R12 | High — schema changes |

## Components and Interfaces

### Pricing Module (`src/lib/pricing.js` — new)

**Interface:**
```javascript
/**
 * Resolves the effective price for a service based on fulfillment type.
 * @param {Object} service - Service object with price, mobile_price_override, virtual_price_override
 * @param {string} fulfillmentType - One of "physical", "mobile", "virtual"
 * @returns {number} The resolved price as a float
 */
export function resolveServicePrice(service, fulfillmentType): number
```

**Consumers:** Widget Book Route, Widget Service Selection component

### Travel Module (`src/lib/travel.js` — modified)

**Interface:**
```javascript
/**
 * Resolves the travel origin coordinates for a staff member.
 * Priority: staff home → salon coordinates → null
 * @param {Object} staff - Staff object with home_lat, home_lng
 * @param {Object} salon - Salon object with latitude, longitude
 * @returns {{ lat: number, lng: number } | null}
 */
export function resolveOrigin(staff, salon): { lat: number, lng: number } | null

/**
 * Checks bidirectional travel feasibility between adjacent bookings.
 * @param {Object} params - Contains origin, destination, prevBooking, nextBooking, travelBuffer
 * @returns {{ feasible: boolean, reason?: string }}
 */
export function checkBidirectionalTravel(params): { feasible: boolean, reason?: string }
```

**Consumers:** Widget Availability API, Dashboard Availability API, Book Route

### Geo Module (`src/lib/geo.js` — modified)

**Interface:**
```javascript
/**
 * Calculates travel fee based on distance from origin to destination.
 * @param {number} originLat
 * @param {number} originLng
 * @param {number} destLat
 * @param {number} destLng
 * @param {Object} feeConfig - Salon fee configuration (base_fee, per_km_fee, free_km)
 * @returns {number} Fee amount in EUR
 */
export function calculateTravelFee(originLat, originLng, destLat, destLng, feeConfig): number

/**
 * Validates a coordinate pair.
 * @returns {boolean}
 */
export function isValidCoordinatePair(lat, lng): boolean
```

### Staff API (`src/app/api/staff/route.js` — modified)

**Response shape addition:**
```javascript
{
  // ...existing fields
  canPhysical: boolean,  // mapped from staff.can_physical
  canMobile: boolean,    // mapped from staff.can_mobile
  canVirtual: boolean    // mapped from staff.can_virtual
}
```

### Widget Book Route (`src/app/api/widget/[salonId]/book/route.js` — modified)

**New validation:** Virtual meeting link resolution with error code `MEETING_LINK_REQUIRED`.

**New behavior:** Price resolution via `resolveServicePrice()` and travel fee origin via `resolveOrigin()`.

### Dashboard Availability API (`src/app/api/salons/[id]/availability/route.js` — modified)

**New query parameters:**
- `fulfillmentType` (optional): "physical" | "mobile" | "virtual"
- `userLat` (optional): Client latitude for travel checks
- `userLng` (optional): Client longitude for travel checks

### UI Components

| Component | Change | Props/State |
|-----------|--------|-------------|
| `service-form.jsx` | Add override price inputs | Conditional on `can_mobile`/`can_virtual` + salon flags |
| `service-selection.jsx` | Use `resolveServicePrice` logic | Reads `fulfillmentType` from widget state |
| `salon-services.jsx` | Add fulfillment badges | Reads `salon.is_mobile`, `salon.is_virtual` |

## Data Models

### Services Table (modified)

```sql
-- Columns added by prior migration (already exist):
mobile_price_override DECIMAL(10,2) DEFAULT NULL,
virtual_price_override DECIMAL(10,2) DEFAULT NULL,
can_physical TINYINT(1) NOT NULL DEFAULT 1,
can_mobile TINYINT(1) NOT NULL DEFAULT 0,
can_virtual TINYINT(1) NOT NULL DEFAULT 0

-- Column to be dropped (R8):
offering_type ENUM('physical','mobile','virtual','hybrid') -- DEPRECATED
```

### Staff Table (existing columns exposed via API)

```sql
can_physical TINYINT(1) NOT NULL DEFAULT 1,
can_mobile TINYINT(1) NOT NULL DEFAULT 0,
can_virtual TINYINT(1) NOT NULL DEFAULT 0,
home_lat DECIMAL(10,7) DEFAULT NULL,
home_lng DECIMAL(10,7) DEFAULT NULL
```

### Salons Table (relevant columns)

```sql
travel_buffer_time INT DEFAULT 0,          -- minutes
travel_radius DECIMAL(5,2) DEFAULT NULL,   -- km
latitude DECIMAL(10,7) DEFAULT NULL,
longitude DECIMAL(10,7) DEFAULT NULL,
is_mobile TINYINT(1) NOT NULL DEFAULT 0,
is_virtual TINYINT(1) NOT NULL DEFAULT 0,
virtual_meeting_link VARCHAR(500) DEFAULT NULL,
covered_zip_codes TEXT DEFAULT NULL         -- TO BE DROPPED (R12)
```

### New Table: `salon_covered_zip_codes` (R12)

```sql
CREATE TABLE salon_covered_zip_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  zip_code VARCHAR(20) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_salon_zip (salon_id, zip_code),
  CONSTRAINT fk_scz_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);
```

### Bookings Table (relevant columns, no changes)

```sql
fulfillment_type ENUM('physical','mobile','virtual') NOT NULL DEFAULT 'physical',
service_price DECIMAL(10,2) NOT NULL,      -- snapshot at booking time
travel_fee DECIMAL(10,2) DEFAULT 0,
virtual_meeting_link VARCHAR(500) DEFAULT NULL
```

## Detailed Design

### 1. Price Override Resolution (R1, R4)

**New utility function:** `resolveServicePrice(service, fulfillmentType)`

```javascript
// src/lib/pricing.js (new file)
export function resolveServicePrice(service, fulfillmentType) {
  if (fulfillmentType === 'mobile' && service.mobile_price_override != null) {
    return parseFloat(service.mobile_price_override);
  }
  if (fulfillmentType === 'virtual' && service.virtual_price_override != null) {
    return parseFloat(service.virtual_price_override);
  }
  return parseFloat(service.price);
}
```

**Widget Book Route changes (`book/route.js`):**
- After fetching each service from DB, call `resolveServicePrice(service, fulfillmentType)` instead of using `service.price` directly.
- The service query already fetches `price` — extend it to also SELECT `mobile_price_override, virtual_price_override`.

**Widget Service Selection changes (`service-selection.jsx`):**
- The services API already returns `mobile_price_override` and `virtual_price_override` fields.
- In the price display section, compute displayed price using the same resolution logic client-side:
  ```javascript
  const displayPrice = fulfillmentType === 'mobile' && service.mobile_price_override != null
    ? service.mobile_price_override
    : fulfillmentType === 'virtual' && service.virtual_price_override != null
      ? service.virtual_price_override
      : service.price;
  ```

### 2. Dashboard Availability Mobile Awareness (R2)

**Changes to `src/app/api/salons/[id]/availability/route.js`:**

1. Parse new query params: `fulfillmentType`, `userLat`, `userLng`
2. When `fulfillmentType === 'mobile'`:
   - Fetch `salon.travel_buffer_time`, `salon.travel_radius`, `salon.latitude`, `salon.longitude`
   - Apply radius check (fail-fast if coordinates exceed radius)
   - Compute `halfBuffer = Math.floor(travel_buffer_time / 2)`
   - When checking slot against working hours, pad: `slotStart - halfBuffer` and `slotEnd + halfBuffer`
   - When `userLat`/`userLng` provided, perform `checkBidirectionalTravel()` against adjacent bookings
3. Import `checkBidirectionalTravel` from `@/lib/travel` and `haversineDistanceKm`, `isValidCoordinatePair` from `@/lib/geo`
4. Fetch staff `home_lat`/`home_lng` for travel origin resolution

### 3. Staff API Response Mapping (R3)

**Changes to `src/app/api/staff/route.js` GET handler:**

Add three fields to the response mapping object:
```javascript
canPhysical: !!s.can_physical,
canMobile: !!s.can_mobile,
canVirtual: !!s.can_virtual,
```

The SQL query already uses `SELECT s.*` which includes these columns.

### 4. Travel Fee Origin Correction (R5)

**Changes to `src/app/api/widget/[salonId]/book/route.js`:**

In the section where travel fee is calculated (inside `createSafeBooking`), the fee calculation must use staff home coordinates as origin:

1. After resolving the primary staff, fetch `staff.home_lat`, `staff.home_lng`
2. If valid, use as origin for `calculateTravelFee()`
3. If not valid, fall back to `salon.latitude`, `salon.longitude`

**Changes to `src/lib/booking.js` (inside createSafeBooking):**

The travel fee insertion logic already fetches staff base coordinates for feasibility. Extend it to also use those coordinates when computing the fee amount via `calculateTravelFee()`.

### 5. Service Form Price Override Fields (R6)

**Changes to `src/components/services/service-form.jsx`:**

1. Add `mobile_price_override` and `virtual_price_override` to the Zod schema (optional, nullable number fields)
2. Add conditional input fields that appear when:
   - `can_mobile` is checked AND salon supports mobile → show "Mobile Price (EUR)" input
   - `can_virtual` is checked AND salon supports virtual → show "Virtual Price (EUR)" input
3. On submit, include the override values in the payload (empty → null)
4. On edit, pre-populate from `serviceDetail.mobile_price_override` / `serviceDetail.virtual_price_override`

### 6. Marketplace Fulfillment Badges (R7)

**Changes to `src/components/marketplace/salon-services.jsx`:**

Add a badge section at the top of the services list (or in the salon header area) that shows:
- 🚗 "We come to you" badge when `salon.is_mobile` is truthy
- 💻 "Virtual consultations" badge when `salon.is_virtual` is truthy

### 7. Remove Legacy offering_type (R8)

**Step 1: Data verification migration**
```sql
-- Ensure no NULLs exist in the flag columns
UPDATE services SET can_physical = 1 WHERE can_physical IS NULL;
UPDATE services SET can_mobile = 0 WHERE can_mobile IS NULL;
UPDATE services SET can_virtual = 0 WHERE can_virtual IS NULL;
```

**Step 2: Code changes**
- In `src/lib/booking.js`, remove the `hasFlagValues` check and `offering_type` fallback in the fulfillment compatibility guard (Step 1.5).
- Remove `offering_type` from the SELECT query in that section.

**Step 3: Schema migration**
```sql
DROP INDEX idx_services_offering ON services;
ALTER TABLE services DROP COLUMN offering_type;
```

### 8. Travel Buffer Accumulation Fix (R9)

**Current bug in `widget/[salonId]/availability/route.js`:**
```javascript
let totalBuffer = fulfillmentType === 'mobile' && salon.travel_buffer_time ? salon.travel_buffer_time : 0;
// Then in the loop:
totalBuffer += (service.buffer_time_minutes || 0);  // ← stacks travel + service buffers
```

**Fix:** Separate travel buffer from service buffers:
```javascript
const travelBuffer = (fulfillmentType === 'mobile' && salon.travel_buffer_time) ? salon.travel_buffer_time : 0;
let serviceBuffer = 0;
// In loop:
serviceBuffer += (service.buffer_time_minutes || 0);
// Final:
const totalBuffer = travelBuffer + serviceBuffer;
```

This ensures `travel_buffer_time` is added once regardless of service count.

**Same fix in `src/app/api/salons/[id]/availability/route.js`** when mobile awareness is added.

### 9. First-Booking-of-Day Travel Origin (R10)

**Current behavior in `widget/[salonId]/availability/route.js`:**
When there's no previous booking (`prevBooking` is null), the bidirectional check skips the arrival direction entirely (treats as feasible).

**Fix:** When `prevBooking` is null and `fulfillmentType === 'mobile'`:
- Treat the staff's base location (home → salon fallback) as the "previous end" location
- Use the staff's shift start time as `prevEndTime`
- This enables the arrival feasibility check to verify the staff can reach the client from home/salon

This is already partially handled by `resolveOrigin()` in `travel.js` — the fix is to pass `baseLat`/`baseLng` and a synthetic `prevEndTime` (shift start) when no prior booking exists.

### 10. Virtual Meeting Link Validation (R11)

**Changes to `src/app/api/widget/[salonId]/book/route.js`:**

After resolving the meeting link:
```javascript
const resolvedMeetingLink = fulfillmentType === 'virtual'
  ? (virtualMeetingLink || salon.virtual_meeting_link || null)
  : null;

if (fulfillmentType === 'virtual' && !resolvedMeetingLink) {
  return error({
    code: 'MEETING_LINK_REQUIRED',
    message: 'A virtual meeting link is required. Please contact the salon to configure their virtual booking settings.',
  }, 400);
}
```

### 11. ZIP Codes Normalization (R12)

**Migration 1: Create table + migrate data**
```sql
CREATE TABLE IF NOT EXISTS salon_covered_zip_codes (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  salon_id bigint unsigned NOT NULL,
  zip_code varchar(20) NOT NULL,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_salon_zip (salon_id, zip_code),
  CONSTRAINT fk_scz_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- Migrate existing data (MySQL 8.0 recursive CTE approach)
INSERT INTO salon_covered_zip_codes (salon_id, zip_code)
SELECT s.id, TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(s.covered_zip_codes, ',', n.n), ',', -1))
FROM salons s
JOIN (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
      UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) n
ON n.n <= 1 + LENGTH(s.covered_zip_codes) - LENGTH(REPLACE(s.covered_zip_codes, ',', ''))
WHERE s.covered_zip_codes IS NOT NULL AND s.covered_zip_codes != '';
```

**Migration 2: Drop old column (after verification)**
```sql
ALTER TABLE salons DROP COLUMN covered_zip_codes;
```

**Code change in `book/route.js`:**
Replace the comma-split ZIP check with:
```javascript
const zipMatch = await getOne(
  'SELECT 1 FROM salon_covered_zip_codes WHERE salon_id = ? AND ? LIKE CONCAT("%", zip_code, "%") LIMIT 1',
  [salonId, serviceLocationAddress]
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Price Resolution Invariant

*For any* service S and fulfillment type F:
- If F = "mobile" and S.mobile_price_override ≠ NULL → resolved price = S.mobile_price_override
- If F = "virtual" and S.virtual_price_override ≠ NULL → resolved price = S.virtual_price_override
- Otherwise → resolved price = S.price

This is a pure function with no side effects — ideal for property-based testing with arbitrary service objects and fulfillment types.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: Travel Buffer Single Application

*For any* multi-service mobile booking with N services (N ≥ 1):
- Total travel buffer contribution = salon.travel_buffer_time (constant, independent of N)
- Total service buffer = Σ(service_i.buffer_time_minutes) for i = 1..N
- Total buffer = travel_buffer + service_buffer

Metamorphic property: adding a service increases total buffer by exactly that service's buffer_time_minutes, never by travel_buffer_time again.

**Validates: Requirements 9.1, 9.2**

### Property 3: Staff Fulfillment Flags Round-Trip

*For any* staff member with can_physical/can_mobile/can_virtual flags in the database:
- The API response canPhysical/canMobile/canVirtual must equal the boolean coercion of the DB values
- Property: `!!db_value === api_response_value` for all three flags

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 4: Travel Origin Priority

*For any* travel fee or feasibility calculation:
- If staff.home_lat and staff.home_lng are valid → origin = (home_lat, home_lng)
- Else if salon.latitude and salon.longitude are valid → origin = (salon.latitude, salon.longitude)
- Else → origin = null (fee = 0, feasibility = assumed feasible)

This priority chain is deterministic and testable as a property over arbitrary coordinate inputs.

**Validates: Requirements 5.1, 5.2, 5.3, 10.1, 10.2**

### Property 5: Physical Mode Price Immunity

*For any* service S with any combination of override values:
- If fulfillmentType = "physical" → resolved price = S.price (always)

Overrides are never applied to physical bookings regardless of their values.

**Validates: Requirements 1.5**

## Error Handling

### Booking Route Errors (R1, R5, R11)

| Condition | Error Code | HTTP Status | Message |
|-----------|-----------|-------------|---------|
| Virtual booking without meeting link | `MEETING_LINK_REQUIRED` | 400 | "A virtual meeting link is required..." |
| Service not found during price resolution | `SERVICE_NOT_FOUND` | 404 | "One or more selected services could not be found" |
| Invalid coordinates for travel fee | N/A (graceful) | — | Falls back to salon coords or zero fee |

### Availability API Errors (R2, R9)

| Condition | Error Code | HTTP Status | Message |
|-----------|-----------|-------------|---------|
| Client coordinates exceed travel radius | N/A | 200 | Returns empty slots with `message: "Location is outside the salon's service area"` |
| Invalid `fulfillmentType` param | `INVALID_PARAM` | 400 | "fulfillmentType must be one of: physical, mobile, virtual" |
| Missing `userLat`/`userLng` when needed | N/A (graceful) | — | Skips travel feasibility check, returns slots without travel validation |

### Data Migration Errors (R8, R12)

- If `offering_type` drop fails due to dependent views/triggers, the migration rolls back and logs the dependency.
- ZIP code migration uses `INSERT IGNORE` semantics to handle duplicate entries gracefully.
- The column drop migrations (R8, R12) are deployed separately to allow rollback if code still references old columns.

### General Error Strategy

- All API routes use the existing `error()` helper for consistent JSON error responses.
- Travel/geo calculations never throw — they return safe defaults (zero fee, assumed feasible) on invalid input.
- Price resolution never throws — returns base price if override parsing fails.

## Testing Strategy

### Property-Based Tests

Property-based testing is appropriate for this feature because the core logic involves pure functions (price resolution, buffer calculation, origin resolution) with clear input/output behavior and large input spaces.

**Library:** `fast-check` (already available in the project's test dependencies)

**Configuration:** Minimum 100 iterations per property test.

| Property | Test Target | Tag |
|----------|-------------|-----|
| Property 1 | `resolveServicePrice()` | Feature: hybrid-fulfillment-fixes, Property 1: Price Resolution Invariant |
| Property 2 | Buffer accumulation logic | Feature: hybrid-fulfillment-fixes, Property 2: Travel Buffer Single Application |
| Property 3 | Staff API response mapping | Feature: hybrid-fulfillment-fixes, Property 3: Staff Fulfillment Flags Round-Trip |
| Property 4 | `resolveOrigin()` | Feature: hybrid-fulfillment-fixes, Property 4: Travel Origin Priority |
| Property 5 | `resolveServicePrice()` (physical subset) | Feature: hybrid-fulfillment-fixes, Property 5: Physical Mode Price Immunity |

### Unit Tests

| Requirement | Test Focus |
|-------------|-----------|
| R4 | Widget service selection displays correct price per mode |
| R6 | Service form conditionally renders override fields, submits null for empty |
| R7 | Marketplace badges render based on salon flags |
| R11 | Virtual booking rejected without meeting link; salon default used as fallback |

### Integration Tests

| Requirement | Test Focus |
|-------------|-----------|
| R1 | Full booking flow with mobile/virtual overrides applied to price snapshot |
| R2 | Dashboard availability returns padded slots for mobile, empty for out-of-radius |
| R8 | Booking engine works correctly after offering_type removal |
| R9 | Multi-service mobile booking applies travel buffer once |
| R10 | First-booking-of-day uses staff home as origin |
| R12 | ZIP code lookup uses normalized table |

### Migration Execution Order

1. **R8 data fix** — Ensure all services have non-NULL flag values
2. **R12 table creation** — Create `salon_covered_zip_codes` and migrate data
3. **Code deployment** — All code changes (R1–R11, R12 query change)
4. **R8 schema drop** — Drop `offering_type` column (after code no longer references it)
5. **R12 column drop** — Drop `covered_zip_codes` column (after code uses new table)

Steps 4 and 5 are separate deployments to allow rollback if issues arise.
