#!/bin/bash
# ============================================================================
# HYBRID FULFILLMENT MANUAL TEST SCRIPT
# ============================================================================
#
# Prerequisites:
#   1. App running at http://localhost:3000
#   2. MySQL running with the 'fresh' database
#   3. A valid JWT token (get one by logging in via browser and copying the cookie)
#
# Usage:
#   1. Set the variables below
#   2. Run: bash tests/manual/hybrid-fulfillment-test.sh
#   3. Or run individual sections by copying curl commands
#
# ============================================================================

# ── CONFIGURATION ───────────────────────────────────────────────────────────
BASE_URL="http://localhost:3000"

# Generated via: node tests/manual/setup-test-env.mjs
TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjE3OSwiZW1haWwiOiJvd25lckBmcmVzaC5jb20iLCJyb2xlIjoib3duZXIiLCJpYXQiOjE3NzkyNjgwOTEsImV4cCI6MTc3OTg3Mjg5MX0.pVjXk__2h9_DMieFvX5FzfQKe8sbcvlRmVcnlQmiA3E"

# Salon: Luxe Hair Studio (DB ID: 163)
SALON_ID_ENCODED="w2G"

# Service 35: Full Color — base=150, mobile_price_override=200, can_mobile=1
# Service 36: Balayage — base=250, mobile_price_override=300, can_mobile=1
MOBILE_SERVICE_ID="36"

# Service 32: Women's Haircut — base=75, virtual_price_override=50, can_virtual=1
VIRTUAL_SERVICE_ID="32"

# Staff 9: brahimz — can_mobile=1, home=(36.6929659, 3.0727577) — for mobile tests
MOBILE_STAFF_ID="9"

# Staff 82: aaaa — can_mobile=1, can_virtual=1 — for virtual tests
VIRTUAL_STAFF_ID="82"

# A date in the future (YYYY-MM-DD format)
TEST_DATE="2026-05-23"

# Client coordinates (inside the salon's service area — ~3km from salon)
CLIENT_LAT="36.7538"   # Algiers center
CLIENT_LNG="3.0588"

# Client coordinates (OUTSIDE the salon's service area — far away, >10km radius)
FAR_LAT="48.8566"      # Paris (thousands of km away)
FAR_LNG="2.3522"

# A valid address inside covered ZIP codes (16000 is configured)
VALID_ADDRESS="123 Rue Didouche Mourad, 16000 Algiers"

# An address outside covered ZIP codes (75001 is NOT configured)
INVALID_ZIP_ADDRESS="123 Main Street, 75001 Paris"

# ── HELPER ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

test_header() {
  echo ""
  echo -e "${YELLOW}▶ TEST: $1${NC}"
}

# ============================================================================
# HIGH PRIORITY: Money Flow & Booking Correctness
# ============================================================================

section "HIGH PRIORITY: Price Overrides"

test_header "1. Book a MOBILE service — verify mobile_price_override is used"
echo "Service 36 (Balayage): base=250, mobile_price_override=300"
echo "Expected: The booking price should be 300 (override), NOT 250 (base)"
echo ""
curl -s -X POST "${BASE_URL}/api/widget/${SALON_ID_ENCODED}/book" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"services\": [{\"serviceId\": ${MOBILE_SERVICE_ID}, \"staffId\": ${MOBILE_STAFF_ID}}],
    \"startTime\": \"${TEST_DATE} 10:00:00\",
    \"fulfillmentType\": \"mobile\",
    \"serviceLocationAddress\": \"${VALID_ADDRESS}\",
    \"serviceLat\": ${CLIENT_LAT},
    \"serviceLng\": ${CLIENT_LNG},
    \"paymentMethod\": \"cash\"
  }" | python3 -m json.tool
echo ""
echo -e "${GREEN}✓ Check: response.booking.services[0].price should be 300 (mobile_price_override)${NC}"
echo -e "${GREEN}  Also verify in DB: SELECT bs.price FROM booking_services bs ORDER BY bs.id DESC LIMIT 1;${NC}"

test_header "2. Book a VIRTUAL service — verify virtual_price_override is used"
echo "Service 32 (Women's Haircut): base=75, virtual_price_override=50"
echo "Expected: The booking price should be 50 (override), NOT 75 (base)"
echo ""
curl -s -X POST "${BASE_URL}/api/widget/${SALON_ID_ENCODED}/book" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"services\": [{\"serviceId\": ${VIRTUAL_SERVICE_ID}, \"staffId\": ${VIRTUAL_STAFF_ID}}],
    \"startTime\": \"${TEST_DATE} 14:00:00\",
    \"fulfillmentType\": \"virtual\",
    \"virtualMeetingLink\": \"https://meet.google.com/test-link\",
    \"paymentMethod\": \"cash\"
  }" | python3 -m json.tool
echo ""
echo -e "${GREEN}✓ Check: response.booking.services[0].price should be 50 (virtual_price_override)${NC}"

# ────────────────────────────────────────────────────────────────────────────

section "HIGH PRIORITY: Travel Fee Origin"

test_header "3. Book mobile appointment — verify travel fee uses staff home coordinates"
echo "Staff 9 home: (36.6929659, 3.0727577), Salon: (36.7286519, 3.0838818)"
echo "Client: (${CLIENT_LAT}, ${CLIENT_LNG})"
echo "NOTE: Travel fee is calculated from SALON coords (for client-facing consistency)."
echo "      Staff home coords are used for FEASIBILITY checks only."
echo ""
curl -s -X POST "${BASE_URL}/api/widget/${SALON_ID_ENCODED}/book" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"services\": [{\"serviceId\": ${MOBILE_SERVICE_ID}, \"staffId\": ${MOBILE_STAFF_ID}}],
    \"startTime\": \"${TEST_DATE} 11:00:00\",
    \"fulfillmentType\": \"mobile\",
    \"serviceLocationAddress\": \"${VALID_ADDRESS}\",
    \"serviceLat\": ${CLIENT_LAT},
    \"serviceLng\": ${CLIENT_LNG},
    \"paymentMethod\": \"cash\"
  }" | python3 -m json.tool
echo ""
echo -e "${GREEN}✓ Check: response.booking.travel_fee_amount should be > 0 if salon has travel_fee_type set${NC}"
echo -e "${GREEN}  DB verify: SELECT travel_fee_amount, travel_distance_km FROM bookings ORDER BY id DESC LIMIT 1;${NC}"

# ────────────────────────────────────────────────────────────────────────────

section "HIGH PRIORITY: Travel Buffer (Multi-Service)"

test_header "4. Book 3+ mobile services — verify travel buffer applied ONCE"
echo "Salon travel_buffer_time = 15 min"
echo "Service 36 (Balayage) booked 3 times"
echo "Expected: Total buffer = 15 (travel, once) + sum(service buffers)"
echo "NOT: 15×3 + sum(service buffers)"
echo ""
echo "Check availability to see slot spacing:"
curl -s "${BASE_URL}/api/widget/${SALON_ID_ENCODED}/availability?date=${TEST_DATE}&services=${MOBILE_SERVICE_ID}:${MOBILE_STAFF_ID},${MOBILE_SERVICE_ID}:${MOBILE_STAFF_ID},${MOBILE_SERVICE_ID}:${MOBILE_STAFF_ID}&fulfillmentType=mobile&userLat=${CLIENT_LAT}&userLng=${CLIENT_LNG}" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool
echo ""
echo -e "${GREEN}✓ Check: totalDuration in response = 3× service duration (no travel buffer in duration)${NC}"
echo -e "${GREEN}  The travel buffer affects slot SPACING, not the reported totalDuration${NC}"
echo -e "${GREEN}  Verify slots are spaced correctly (not over-padded by 3×15=45 min)${NC}"

# ────────────────────────────────────────────────────────────────────────────

section "HIGH PRIORITY: Virtual Meeting Link Validation"

test_header "5. Book virtual WITHOUT meeting link (salon has no default) — should FAIL"
echo "Expected: Error with code MEETING_LINK_REQUIRED"
echo "Salon virtual_meeting_link is already NULL — good for this test."
echo ""
curl -s -X POST "${BASE_URL}/api/widget/${SALON_ID_ENCODED}/book" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"services\": [{\"serviceId\": ${VIRTUAL_SERVICE_ID}, \"staffId\": ${VIRTUAL_STAFF_ID}}],
    \"startTime\": \"${TEST_DATE} 15:00:00\",
    \"fulfillmentType\": \"virtual\",
    \"paymentMethod\": \"cash\"
  }" | python3 -m json.tool
echo ""
echo -e "${GREEN}✓ Check: Should return HTTP 400 with code 'MEETING_LINK_REQUIRED'${NC}"

test_header "5b. Book virtual WITH salon default meeting link — should SUCCEED"
echo "Setting salon default first..."
echo "  Run: UPDATE salons SET virtual_meeting_link = 'https://meet.google.com/salon-default' WHERE id = 163;"
echo ""
curl -s -X POST "${BASE_URL}/api/widget/${SALON_ID_ENCODED}/book" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"services\": [{\"serviceId\": ${VIRTUAL_SERVICE_ID}, \"staffId\": ${VIRTUAL_STAFF_ID}}],
    \"startTime\": \"${TEST_DATE} 16:00:00\",
    \"fulfillmentType\": \"virtual\",
    \"paymentMethod\": \"cash\"
  }" | python3 -m json.tool
echo ""
echo -e "${GREEN}✓ Check: Should succeed; booking.virtual_meeting_link in DB = salon default${NC}"

# ────────────────────────────────────────────────────────────────────────────

section "HIGH PRIORITY: ZIP Code Validation"

test_header "6. Book mobile with address OUTSIDE covered ZIP codes — should FAIL"
echo "Expected: Error with code OUTSIDE_SERVICE_AREA"
echo "Salon has ZIP codes: 16000, 16001, 16002"
echo "Address '75001 Paris' does NOT match any covered ZIP"
echo ""
curl -s -X POST "${BASE_URL}/api/widget/${SALON_ID_ENCODED}/book" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"services\": [{\"serviceId\": ${MOBILE_SERVICE_ID}, \"staffId\": ${MOBILE_STAFF_ID}}],
    \"startTime\": \"${TEST_DATE} 12:00:00\",
    \"fulfillmentType\": \"mobile\",
    \"serviceLocationAddress\": \"${INVALID_ZIP_ADDRESS}\",
    \"serviceLat\": ${FAR_LAT},
    \"serviceLng\": ${FAR_LNG},
    \"paymentMethod\": \"cash\"
  }" | python3 -m json.tool
echo ""
echo -e "${GREEN}✓ Check: Should return error OUTSIDE_SERVICE_AREA or OUTSIDE_SERVICE_RADIUS${NC}"
echo -e "${GREEN}  (May hit radius check first since Paris is >10km from Algiers)${NC}"

test_header "6b. Book mobile with address INSIDE covered ZIP codes — should SUCCEED"
echo "Address '16000 Algiers' matches covered ZIP 16000"
echo ""
curl -s -X POST "${BASE_URL}/api/widget/${SALON_ID_ENCODED}/book" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{
    \"services\": [{\"serviceId\": ${MOBILE_SERVICE_ID}, \"staffId\": ${MOBILE_STAFF_ID}}],
    \"startTime\": \"${TEST_DATE} 13:00:00\",
    \"fulfillmentType\": \"mobile\",
    \"serviceLocationAddress\": \"${VALID_ADDRESS}\",
    \"serviceLat\": ${CLIENT_LAT},
    \"serviceLng\": ${CLIENT_LNG},
    \"paymentMethod\": \"cash\"
  }" | python3 -m json.tool
echo ""
echo -e "${GREEN}✓ Check: Should succeed (booking created)${NC}"

# ============================================================================
# MEDIUM PRIORITY: Availability & Dashboard
# ============================================================================

section "MEDIUM PRIORITY: Dashboard Availability Mobile Mode"

test_header "7. Dashboard availability with fulfillmentType=mobile + coordinates"
echo "Expected: Slots filtered by travel feasibility and radius"
echo ""
curl -s "${BASE_URL}/api/salons/${SALON_ID_ENCODED}/availability?date=${TEST_DATE}&fulfillmentType=mobile&userLat=${CLIENT_LAT}&userLng=${CLIENT_LNG}" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool
echo ""
echo -e "${GREEN}✓ Check: Slots should be filtered by travel feasibility${NC}"
echo -e "${GREEN}  Compare with physical mode (no travel filtering):${NC}"
echo ""
curl -s "${BASE_URL}/api/salons/${SALON_ID_ENCODED}/availability?date=${TEST_DATE}" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool

# ────────────────────────────────────────────────────────────────────────────

test_header "8. Out-of-radius check — coordinates far outside travel_radius"
echo "Expected: Empty slots with 'outside service area' message"
echo ""
curl -s "${BASE_URL}/api/salons/${SALON_ID_ENCODED}/availability?date=${TEST_DATE}&fulfillmentType=mobile&userLat=${FAR_LAT}&userLng=${FAR_LNG}" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool
echo ""
echo -e "${GREEN}✓ Check: availability should be empty with message about service area${NC}"

# ────────────────────────────────────────────────────────────────────────────

test_header "9. First-booking-of-day — availability on a day with NO existing bookings"
echo "Expected: System validates staff can reach client from home/salon by first slot time"
echo "Staff 9 home: (36.6929659, 3.0727577) — ~3km from client"
echo "At 30km/h with 1.4x road factor, travel ~4 min + 15 min buffer = ~19 min"
echo "So first slot should be at least 19 min after shift start"
echo ""
curl -s "${BASE_URL}/api/widget/${SALON_ID_ENCODED}/availability?date=${TEST_DATE}&services=${MOBILE_SERVICE_ID}:${MOBILE_STAFF_ID}&fulfillmentType=mobile&userLat=${CLIENT_LAT}&userLng=${CLIENT_LNG}" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool
echo ""
echo -e "${GREEN}✓ Check: First available slot should account for travel from staff home/salon${NC}"
echo -e "${GREEN}  If staff home is far from client, early morning slots should be excluded${NC}"

# ============================================================================
# LOWER PRIORITY: UI & Display
# ============================================================================

section "LOWER PRIORITY: Staff API Flags"

test_header "10. Staff API — verify canPhysical, canMobile, canVirtual in response"
echo ""
curl -s "${BASE_URL}/api/staff?salon_id=${SALON_ID_ENCODED}" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool
echo ""
echo -e "${GREEN}✓ Check: Each staff member should have canPhysical, canMobile, canVirtual boolean fields${NC}"
echo -e "${GREEN}  Verify they match the DB values:${NC}"
echo -e "${GREEN}  SELECT id, can_physical, can_mobile, can_virtual FROM staff WHERE salon_id = <id>;${NC}"

# ────────────────────────────────────────────────────────────────────────────

section "LOWER PRIORITY: Widget Price Display"

test_header "11. Widget services API — verify price overrides are returned"
echo ""
echo "Physical mode (base prices):"
curl -s "${BASE_URL}/api/widget/${SALON_ID_ENCODED}/services" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool
echo ""
echo "Mobile mode (should show mobile_price_override where set):"
curl -s "${BASE_URL}/api/widget/${SALON_ID_ENCODED}/services?fulfillmentType=mobile" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool
echo ""
echo -e "${GREEN}✓ Check: Services with mobile_price_override should have that field populated${NC}"
echo -e "${GREEN}  The widget UI uses this to display the correct price per mode${NC}"

# ────────────────────────────────────────────────────────────────────────────

section "LOWER PRIORITY: Service Form & Marketplace (UI — Manual Browser Testing)"

echo ""
echo -e "${YELLOW}These tests require browser interaction:${NC}"
echo ""
echo "12. SERVICE FORM TEST:"
echo "    a. Go to Dashboard > Services > Edit a service"
echo "    b. Check 'Mobile' fulfillment checkbox"
echo "    c. Verify 'Mobile Price' field appears"
echo "    d. Set a value (e.g., 5000), save"
echo "    e. Reopen the service — verify the mobile price is pre-populated"
echo ""
echo "13. WIDGET PRICE DISPLAY TEST:"
echo "    a. Open the booking widget for your salon"
echo "    b. Select a service that has mobile_price_override set"
echo "    c. Switch between Physical / Mobile / Virtual modes"
echo "    d. Verify prices update instantly to reflect overrides"
echo ""
echo "14. MARKETPLACE BADGES TEST:"
echo "    a. Visit a salon profile page that has is_mobile=true"
echo "    b. Verify 'We come to you' badge (blue, with car icon) is shown"
echo "    c. Visit a salon with is_virtual=true"
echo "    d. Verify 'Virtual consultations' badge (purple, with monitor icon) is shown"
echo "    e. Visit a physical-only salon — no badges should appear"

# ============================================================================
# DATABASE VERIFICATION QUERIES
# ============================================================================

section "DATABASE VERIFICATION QUERIES"

echo ""
echo "Run these queries to verify the implementation state:"
echo ""
echo -e "${YELLOW}1. Verify offering_type column is dropped:${NC}"
echo "   DESCRIBE services;"
echo "   -- Should NOT have 'offering_type' column"
echo ""
echo -e "${YELLOW}2. Verify all services have explicit flags (no NULLs):${NC}"
echo "   SELECT COUNT(*) FROM services WHERE can_physical IS NULL OR can_mobile IS NULL OR can_virtual IS NULL;"
echo "   -- Should return 0"
echo ""
echo -e "${YELLOW}3. Verify salon_covered_zip_codes table exists and has data:${NC}"
echo "   SELECT COUNT(*) FROM salon_covered_zip_codes;"
echo "   DESCRIBE salon_covered_zip_codes;"
echo ""
echo -e "${YELLOW}4. Verify covered_zip_codes column is dropped from salons:${NC}"
echo "   DESCRIBE salons;"
echo "   -- Should NOT have 'covered_zip_codes' column"
echo ""
echo -e "${YELLOW}5. Check a service with price overrides:${NC}"
echo "   SELECT id, name, price, mobile_price_override, virtual_price_override, can_physical, can_mobile, can_virtual"
echo "   FROM services WHERE mobile_price_override IS NOT NULL LIMIT 5;"
echo ""
echo -e "${YELLOW}6. Check staff fulfillment flags:${NC}"
echo "   SELECT s.id, u.first_name, s.can_physical, s.can_mobile, s.can_virtual, s.home_lat, s.home_lng"
echo "   FROM staff s JOIN users u ON u.id = s.user_id LIMIT 10;"
echo ""
echo -e "${YELLOW}7. Verify a mobile booking stored the override price:${NC}"
echo "   SELECT b.id, b.fulfillment_type, bs.price as booked_price, sv.price as base_price, sv.mobile_price_override"
echo "   FROM bookings b"
echo "   JOIN booking_services bs ON bs.booking_id = b.id"
echo "   JOIN services sv ON sv.id = bs.service_id"
echo "   WHERE b.fulfillment_type = 'mobile'"
echo "   ORDER BY b.id DESC LIMIT 5;"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  TEST SCRIPT COMPLETE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
