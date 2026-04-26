# Hybrid Fulfillment Global Integration Plan

> **Goal:** Transform Mobile Operator and Virtual Services from onboarding-only flags into fully integrated, production-grade booking models — with zero regression to existing physical salon operations.

---

## Current State Audit

### What Already Exists ✅
| Layer | Status | Details |
|-------|--------|---------|
| **Database Schema** | ✅ Done | `salons.is_physical/is_mobile/is_virtual`, travel columns, `services.offering_type`, `bookings.fulfillment_type` + location/meeting fields |
| **Onboarding** | ✅ Done | Location type selection (physical/mobile/virtual) saved during salon creation |
| **General Settings** | ✅ Done | Form fields for `is_physical`, `is_mobile`, `is_virtual`, `travel_radius`, `travel_fee_*`, `covered_zip_codes`, `virtual_meeting_link` |
| **Widget Fulfillment Selection** | ✅ Done | [fulfillment-selection.jsx](file:///Users/bhmx/Documents/Fresh/apps/web/src/components/booking-widget/fulfillment-selection.jsx) — radio group with address input |
| **Widget Availability API** | ✅ Partial | Accepts `fulfillmentType` param, adds `travel_buffer_time` for mobile |
| **Widget Book API** | ✅ Partial | Accepts `fulfillmentType`, adds travel fee, passes to `createSafeBooking` |
| **`createSafeBooking()`** | ✅ Partial | Accepts `fulfillmentType`, `serviceLocationAddress`, `virtualMeetingLink`, `clientTimezone` — but doesn't enforce travel buffer in scheduling |
| **Notifications** | ✅ Done | `sendContextualBookingConfirmation()` — distinct templates for physical/mobile/virtual with `.ics` for virtual |
| **Marketplace Card** | ✅ Partial | Shows mobile badge on salon cards |

### What's Missing ❌
| Gap | Impact | Priority |
|-----|--------|----------|
| **Service-level fulfillment filtering** | Services with `offering_type='physical'` still show for mobile bookings | 🔴 Critical |
| **Staff mobile/virtual capability flags** | No way to mark which staff can do mobile/virtual | 🔴 Critical |
| **Travel buffer in `createSafeBooking()`** | Mobile bookings don't block travel time on the calendar | 🔴 Critical |
| **Travel fee in `calculateBookingTotal()`** | Travel fees not persisted as a line item — backend total ignores them | 🔴 Critical |
| **Dashboard Booking Form** | No fulfillment type selector, no address/meeting-link fields | 🟡 High |
| **Calendar visual indicators** | No fulfillment type badges on calendar events | 🟡 High |
| **Booking Detail drawer** | Doesn't show fulfillment type, address, or meeting link | 🟡 High |
| **Client profile "Last visited" label** | Doesn't adapt based on fulfillment type | 🟡 Medium |
| **Widget service filtering** | Services API doesn't filter by `offering_type` matching selected `fulfillmentType` | 🟡 High |
| **Per-km travel fee calculation** | `per_km` fee type exists in DB but no distance calculation logic | 🟠 Medium |
| **Address validation** | Plain text input, no geocoding/autocomplete for mobile bookings | 🟠 Medium |
| **Virtual meeting link generation** | Only supports a static salon-level link, no per-booking auto-generation | 🟠 Medium |
| **Marketplace filtering by fulfillment type** | SQL filter for `is_mobile` exists but no UI filter toggle | 🟡 Medium |
| **Reports/Analytics by fulfillment type** | No breakdown of revenue/bookings by physical/mobile/virtual | 🟠 Lower |

---

## Industry Gap Analysis

### Fresha
Fresha is a **physical-location-first** platform. It has no native mobile service features — no travel zones, no GPS-based distance calculations, no automated travel-time scheduling. Mobile providers use workarounds like manual "Service Charges" added at checkout. This confirms that our implementation will be a **competitive differentiator**, not a copy.

### MarketBox (the gold standard for mobile services)
Key features we should adopt:

| Feature | MarketBox Approach | Our Plan |
|---------|-------------------|----------|
| **Travel Zones** | Circular radius OR drawn polygon zones per staff | Phase 2: staff-level radius + covered ZIP codes (simpler, iteratable) |
| **Staff-based filtering** | Only show providers who cover the client's area | Phase 3: filter available staff by `can_travel` + radius |
| **Travel buffer** | Automatic buffer before/after mobile appointments | Phase 1: `travel_buffer_time` already in DB, enforce in booking engine |
| **Route-aware availability** | Existing bookings act as routing anchors | Phase 6 (future): calculate drive time between consecutive mobile bookings |
| **Virtual meeting integration** | Auto-links per booking via Zoom/Google Meet API | Phase 3: auto-generate unique meeting links (or static fallback) |
| **Provider autonomy** | Staff manage own zones/availability via mobile app | Not in scope (existing staff working hours covers this) |

### Edge Cases Identified

> [!IMPORTANT]
> **Edge cases from industry analysis that we must handle:**

1. **Travel time padding on calendar** — A 60-min mobile booking with 30-min `travel_buffer_time` must block 120 min total (30 travel + 60 service + 30 return) on the staff's calendar
2. **Service radius/ZIP boundaries** — Client address must be validated against the salon's `covered_zip_codes` or `travel_radius` before confirming
3. **Mixed fulfillment in multi-service bookings** — All services in a single booking must share the same `fulfillment_type` (can't mix physical + mobile in one booking)
4. **Per-km fee calculation** — Requires distance computation (Google Maps Distance Matrix API or Haversine formula)
5. **Virtual meeting link uniqueness** — Each virtual booking should get a unique link (or use salon's static link as fallback)
6. **Timezone display** — Virtual bookings across timezones need clear "your time" vs "salon time" display
7. **Mobile-only businesses** — If `is_physical=0 AND is_mobile=1`, the address section in salon profile should be optional

---

## User Review Required

> [!WARNING]
> **Key decisions needed before implementation:**

1. **Per-km fee calculation method:** Should we use Google Maps Distance Matrix API (accurate but costs ~$5/1000 requests) or Haversine straight-line distance (free but less accurate)? Recommendation: Haversine with a 1.3x multiplier for road correction.

2. **Virtual meeting links:** Should we auto-generate unique Google Meet/Zoom links per booking (requires API integration), or use the salon's static `virtual_meeting_link` for all bookings? Recommendation: Static link for now, with a note about future API integration.

3. **Travel buffer direction:** Should `travel_buffer_time` be applied as **before-only** (staff needs to travel TO client), **after-only** (staff needs to travel BACK), or **both** (round trip)? MarketBox uses both. Recommendation: Both (split evenly: half before, half after).

4. **Mixed fulfillment bookings:** Should we allow a single booking to contain services with different fulfillment types (e.g., one physical + one virtual)? Recommendation: No — enforce uniform fulfillment per booking for simplicity and avoid impossible scheduling.

---

## Phased Roadmap

### Phase 1: Schema & Data Layer (Zero UI changes)
*Safe foundation — no user-facing behavior changes*

---

#### [NEW] [20260422_hybrid_fulfillment_phase3.sql](file:///Users/bhmx/Documents/Fresh/apps/web/database/migrations/20260422_hybrid_fulfillment_phase3.sql)

New migration to add missing schema elements:

```sql
-- 1. Staff fulfillment capabilities
ALTER TABLE `staff`
  ADD COLUMN `can_physical` tinyint(1) NOT NULL DEFAULT 1,
  ADD COLUMN `can_mobile` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN `can_virtual` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN `travel_radius` int DEFAULT NULL COMMENT 'Staff-specific travel radius override (km)',
  ADD COLUMN `home_lat` decimal(10,7) DEFAULT NULL COMMENT 'Staff home/base lat for distance calc',
  ADD COLUMN `home_lng` decimal(10,7) DEFAULT NULL COMMENT 'Staff home/base lng for distance calc';

-- 2. Travel fees as a booking line item (for financial integrity)
CREATE TABLE `booking_travel_fees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `fee_type` enum('fixed','per_km','none') NOT NULL DEFAULT 'fixed',
  `distance_km` decimal(8,2) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_booking_travel_fee` (`booking_id`),
  CONSTRAINT `fk_btf_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Service-level mobile price override (variable pricing)
ALTER TABLE `services`
  ADD COLUMN `mobile_price_override` decimal(10,2) DEFAULT NULL COMMENT 'Optional different price when fulfilled as mobile',
  ADD COLUMN `virtual_price_override` decimal(10,2) DEFAULT NULL COMMENT 'Optional different price when fulfilled as virtual';

-- 4. Per-booking travel metadata
ALTER TABLE `bookings`
  ADD COLUMN `travel_fee_amount` decimal(10,2) DEFAULT '0.00' COMMENT 'Snapshot of travel fee charged',
  ADD COLUMN `travel_distance_km` decimal(8,2) DEFAULT NULL COMMENT 'Calculated distance for per_km fees';

-- 5. Index for fulfillment-type queries
ALTER TABLE `bookings` ADD INDEX `idx_bookings_fulfillment` (`fulfillment_type`);
ALTER TABLE `services` ADD INDEX `idx_services_offering` (`offering_type`);
```

> [!NOTE]
> This migration is backward-compatible. All new columns have defaults. Existing staff get `can_physical=1` by default, matching current behavior.

---

#### [MODIFY] [checkout.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/lib/checkout.js)

Update `calculateBookingTotal()` to include travel fees:

```diff
 // Services
 const [[servicesRow]] = await conn.query(...)
 // Products
 const [[productsRow]] = await conn.query(...)
+// Travel fees
+const [[travelRow]] = await conn.query(
+  "SELECT COALESCE(SUM(amount), 0) AS total FROM booking_travel_fees WHERE booking_id = ?",
+  [bookingId]
+);
 // Discounts
 const [[discountsRow]] = await conn.query(...)

 const servicesTotal = parseFloat(servicesRow.total);
 const productsTotal = parseFloat(productsRow.total);
+const travelTotal = parseFloat(travelRow.total);
 const discountsTotal = parseFloat(discountsRow.total);
 const giftCardsTotal = parseFloat(giftCardsRow.total);

 const finalTotal = Math.max(
   0,
-  servicesTotal + productsTotal - discountsTotal - giftCardsTotal
+  servicesTotal + productsTotal + travelTotal - discountsTotal - giftCardsTotal
 );
```

**Rationale:** Travel fees must be computed from the DB, never trusted from the frontend. The `booking_travel_fees` table is the single source of truth.

---

#### [MODIFY] [booking.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/lib/booking.js)

Three changes to `createSafeBooking()`:

**A. Travel buffer enforcement for mobile bookings:**
After computing `endDate`, if `fulfillmentType === 'mobile'`, fetch `travel_buffer_time` from salon and extend the blocked window:

```diff
+  // ── Step 1.1: Travel buffer for mobile bookings ────────────────────────
+  let travelBufferMinutes = 0;
+  if (fulfillmentType === 'mobile') {
+    const [[salonRow]] = await pool.execute(
+      'SELECT travel_buffer_time FROM salons WHERE id = ?', [salonId]
+    );
+    travelBufferMinutes = salonRow?.travel_buffer_time || 0;
+  }
```

Then adjust the working hours and conflict checks to include the travel buffer as padding before and after the service window.

**B. Insert travel fee line item:**
After the booking row insert, if `fulfillmentType === 'mobile'`:

```javascript
if (fulfillmentType === 'mobile') {
  const [[salon]] = await conn.execute(
    'SELECT travel_fee_type, travel_fee_amount FROM salons WHERE id = ?', [salonId]
  );
  if (salon && salon.travel_fee_type !== 'none') {
    const travelAmount = parseFloat(salon.travel_fee_amount || 0);
    await conn.execute(
      `INSERT INTO booking_travel_fees (booking_id, fee_type, amount)
       VALUES (?, ?, ?)`,
      [bookingId, salon.travel_fee_type, travelAmount]
    );
  }
}
```

**C. Mixed fulfillment guard:**
Validate that all services in the booking support the requested `fulfillmentType`:

```javascript
if (fulfillmentType !== 'physical') {
  const serviceIds = services.map(s => s.serviceId);
  const [offeringRows] = await pool.execute(
    `SELECT id, offering_type FROM services WHERE id IN (${serviceIds.map(() => '?').join(',')})`,
    serviceIds
  );
  for (const row of offeringRows) {
    const type = row.offering_type;
    if (type !== 'hybrid' && type !== fulfillmentType) {
      throw new BookingError(
        'SERVICE_FULFILLMENT_MISMATCH',
        `Service #${row.id} doesn't support ${fulfillmentType} fulfillment`,
        400
      );
    }
  }
}
```

---

### Phase 2: Staff & Service Configuration
*Dashboard UI for configuring which staff/services support mobile/virtual*

---

#### [MODIFY] [service-form.jsx](file:///Users/bhmx/Documents/Fresh/apps/web/src/components/services/service-form.jsx)

Add `offering_type` selector and optional mobile/virtual price overrides:

- New `<Select>` for offering type: Physical only / Mobile only / Virtual only / All types (hybrid)
- Conditional price override inputs when mobile or virtual is selected
- Add to Zod schema: `offering_type`, `mobile_price_override`, `virtual_price_override`

---

#### [MODIFY] Staff profile tabs — new "Fulfillment" section

In the staff profile page ([team/[staffId]/page.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/app/dashboard/salon/[salonId]/team/[staffId]/page.js)):

- Add toggles for `can_physical`, `can_mobile`, `can_virtual`
- Staff-specific `travel_radius` override
- Optional home base address (lat/lng) for distance calculations

---

#### [MODIFY] Services API routes

In [/api/salons/[id]/services/route.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/app/api/salons/[id]/services/route.js):
- Include `offering_type`, `mobile_price_override`, `virtual_price_override` in GET response
- Accept them in POST/PUT handlers

In [/api/services/[serviceId]/route.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/app/api/services/[serviceId]/route.js):
- Same — already partially done for `offering_type`

---

#### [MODIFY] Staff API routes

In [/api/salons/[id]/staff/route.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/app/api/salons/[id]/staff/) and [/api/staff/[staffId]/route.js]:
- Add `can_physical`, `can_mobile`, `can_virtual`, `travel_radius` fields to GET/PUT

---

### Phase 3: Booking Flow Integration
*The core booking experience changes*

---

#### [MODIFY] Widget Services API — fulfillment filtering

In [/api/widget/[salonId]/services/route.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/app/api/widget/[salonId]/services/route.js):

```diff
+  const fulfillmentType = searchParams.get('fulfillmentType') || 'physical';
+
   // Filter services by offering type
+  let offeringFilter = '';
+  if (fulfillmentType && fulfillmentType !== 'physical') {
+    offeringFilter = ` AND (s.offering_type = '${fulfillmentType}' OR s.offering_type = 'hybrid')`;
+  }
```

Also filter `availableStaff` per service to only include staff who `can_mobile=1` or `can_virtual=1` depending on selected fulfillment type.

---

#### [MODIFY] Widget Availability API — staff-fulfillment filtering

In [/api/widget/[salonId]/availability/route.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/app/api/widget/[salonId]/availability/route.js):

- When `fulfillmentType=mobile`, filter `capableStaffIds` to only staff with `can_mobile=1`
- When `fulfillmentType=virtual`, filter to `can_virtual=1`
- For mobile: add travel buffer to the total blocked time window

---

#### [MODIFY] Widget Book API — address validation + travel fee

In [/api/widget/[salonId]/book/route.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/app/api/widget/[salonId]/book/route.js):

- Validate `serviceLocationAddress` is not empty for mobile bookings
- Validate ZIP code is in `covered_zip_codes` (if set)
- Pass `fulfillmentType` through to `createSafeBooking()` (already done)
- Remove the frontend travel fee addition (line 150-152) — it's now handled in `createSafeBooking()` via `booking_travel_fees`

---

#### [MODIFY] Dashboard Booking Form

In [booking-form.jsx](file:///Users/bhmx/Documents/Fresh/apps/web/src/components/bookings/booking-form.jsx):

- Add a fulfillment type selector (radio group: Physical / Mobile / Virtual) — shown only if salon supports multiple types
- When "Mobile" is selected: show address input (with Google Places autocomplete)
- When "Virtual" is selected: show meeting link field (pre-filled from salon's default)
- Filter service list by `offering_type` matching selected fulfillment type
- Filter staff dropdown by `can_mobile`/`can_virtual` flags
- Pass `fulfillmentType`, `serviceLocationAddress`, `virtualMeetingLink` to the create booking API

---

#### [MODIFY] Dashboard Booking API

In [/api/bookings/route.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/app/api/bookings/route.js) POST handler:
- Accept `fulfillmentType`, `serviceLocationAddress`, `serviceLat`, `serviceLng`, `clientTimezone`, `virtualMeetingLink`
- Pass them through to `createSafeBooking()`

---

### Phase 4: Calendar & UI/UX Updates
*Visual indicators and contextual terminology*

---

#### [MODIFY] Calendar View

In [calendar-view.jsx](file:///Users/bhmx/Documents/Fresh/apps/web/src/components/calendar/calendar-view.jsx):

- Add fulfillment type badge/icon on calendar events:
  - 🏪 Physical (default, no badge needed)
  - 🚗 Mobile — orange badge + client address tooltip
  - 💻 Virtual — purple badge + meeting link tooltip
- For mobile bookings: render travel buffer blocks as hatched/dimmed blocks before/after the service event
- Add a calendar filter toggle: "Show: All / Physical / Mobile / Virtual"

---

#### [MODIFY] Calendar API

In [/api/salons/[id]/calendar/route.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/app/api/salons/[id]/calendar/route.js):

- Include `fulfillment_type`, `service_location_address`, `virtual_meeting_link` in the returned event objects

---

#### [MODIFY] Booking Detail Drawer

In [booking-detail.jsx](file:///Users/bhmx/Documents/Fresh/apps/web/src/components/bookings/booking-detail.jsx):

- Show fulfillment type badge
- For mobile: display client address with a "Get Directions" link (Google Maps deep link)
- For virtual: display the meeting link with a "Join Meeting" button
- For virtual: show client timezone

---

#### [MODIFY] Client Profile — "Last visited" label

In [clients/[clientId]/page.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/app/dashboard/salon/[salonId]/clients/[clientId]/page.js):

- Query the most recent booking's `fulfillment_type` for this client
- Change label dynamically:
  - Physical: "Last visited: Apr 15"
  - Mobile: "Last home visit: Apr 15"
  - Virtual: "Last virtual session: Apr 15"

---

#### [MODIFY] Booking Confirmation (Widget)

In [booking-confirmation.jsx](file:///Users/bhmx/Documents/Fresh/apps/web/src/components/booking-widget/booking-confirmation.jsx):

- Already partially done — enrich with travel fee display for mobile bookings
- Add the `.ics` invite download for virtual bookings (already in email, add to UI)

---

### Phase 5: Marketplace & Discovery
*Public-facing search and filtering*

---

#### [MODIFY] Marketplace Salons API

In [/api/marketplace/salons/route.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/app/api/marketplace/salons/route.js):

- Already has `is_mobile` filter SQL — add UI filter parameter: `?fulfillmentType=mobile`
- Return fulfillment capabilities in the response

---

#### [MODIFY] Marketplace Search Page

In the salons search page ([/salons/page.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/app/(marketplace)/salons/page.js)):

- Add filter chips: "At Salon" / "Mobile" / "Virtual"
- Filter API call with `fulfillmentType` param

---

#### [MODIFY] Salon Public Profile

In [/salon/[id]/page.js](file:///Users/bhmx/Documents/Fresh/apps/web/src/app/(marketplace)/salon/[id]/page.js):

- Show fulfillment badges (🏪 Physical / 🚗 Mobile / 💻 Virtual)
- For mobile-capable salons: show travel radius and fee info
- For virtual: show "Online appointments available" badge

---

### Phase 6: Analytics & Polish (Future)
*Post-launch improvements*

---

#### Reports by Fulfillment Type
- Add fulfillment type breakdown to revenue and bookings reports
- New chart: "Revenue by Fulfillment Type" (physical vs mobile vs virtual)

#### Per-km Distance Calculation
- Integrate Haversine formula for `per_km` travel fee calculation
- Use client's `service_lat`/`service_lng` + salon's `latitude`/`longitude`
- Future: Google Maps Distance Matrix API for road-distance accuracy

#### Route-Aware Availability (Advanced)
- For mobile staff with multiple bookings in a day, calculate drive time between consecutive bookings
- Block availability slots that would require impossible travel times

#### Auto-Generated Meeting Links
- Integrate Google Calendar API or Zoom API for per-booking unique meeting links
- Fallback to salon's static `virtual_meeting_link`

---

## Open Questions

> [!IMPORTANT]
> **These need your input before Phase 1 execution:**

1. **Travel buffer split:** Half before + half after the service, or the full buffer before only? (Recommendation: half/half)

2. **Per-km calculation:** Haversine formula (free, less accurate) or Google Maps Distance Matrix (paid, accurate)? This only affects the `per_km` fee type — `fixed` fees need no calculation.

3. **Virtual meeting links:** Use salon's static link for now, or integrate a meeting provider API immediately?

4. **Service price overrides:** Should mobile/virtual prices be stored as overrides on the `services` table (simpler) or in a separate `service_pricing` table (more flexible for future zone-based pricing)?

5. **Calendar travel buffer rendering:** Should travel buffers appear as separate "travel" events on the calendar, or as extended/hatched borders on the booking event itself?

---

## Verification Plan

### Automated Tests
After each phase, run these verification steps:

```bash
# Ensure the app builds without errors
npm run build

# Run the migration against the dev database
node run_migration.js database/migrations/20260422_hybrid_fulfillment_phase3.sql
```

### Per-Phase Browser Tests
| Phase | Test |
|-------|------|
| 1 | Create a mobile booking via widget → verify `booking_travel_fees` row created, `calculateBookingTotal` includes travel fee |
| 1 | Create a physical booking → verify zero regression, no travel fee |
| 2 | Update service `offering_type` to 'mobile' → verify it appears only in mobile bookings |
| 2 | Set staff `can_mobile=0` → verify they don't appear for mobile bookings |
| 3 | Book a mobile service via widget → staff filtered, address required, travel fee displayed |
| 3 | Book a virtual service → meeting link shown in confirmation |
| 3 | Try to book a physical-only service as mobile → verify error |
| 4 | Check calendar shows mobile/virtual badges on booked events |
| 4 | Check client profile shows correct "Last visited"/"Last home visit" label |
| 5 | Search marketplace with "Mobile" filter → only mobile-capable salons shown |

### Manual Verification
- Ask the user to walkthrough the full booking flow for each fulfillment type
- Verify email notifications contain correct templates
- Check responsive layout of new UI elements on mobile viewport
