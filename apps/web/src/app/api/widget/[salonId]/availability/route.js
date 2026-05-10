import { decodeId } from '@/lib/id';
import { query, getOne } from '@/lib/db';
import { success, error, notFound } from '@/lib/response';
import { checkBidirectionalTravel, calculateTravelTimeMinutes, SETUP_BUFFER_MINUTES } from '@/lib/travel';
import { isValidCoordinatePair, haversineDistanceKm } from '@/lib/geo';

// GET /api/widget/[salonId]/availability - Get available slots for widget
export async function GET(request, { params }) {
  try {
    const { salonId: rawSalonId } = await params;
  const salonId = decodeId(rawSalonId);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const fulfillmentType = searchParams.get('fulfillmentType');
    const servicesParam = searchParams.get('services');
    const userLatRaw = searchParams.get('userLat');
    const userLngRaw = searchParams.get('userLng');
    const userLat = userLatRaw ? Number(userLatRaw) : null;
    const userLng = userLngRaw ? Number(userLngRaw) : null;
    const isMobile = fulfillmentType === 'mobile';
    const hasMobileCoords = isMobile && isValidCoordinatePair(userLat, userLng);

    if (!date || !servicesParam) {
      return error('Date and services are required');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return error('Invalid date format. Expected YYYY-MM-DD', 400);
    }

    const salon = await getOne('SELECT id, travel_buffer_time, latitude, longitude, travel_radius FROM salons WHERE id = ? AND is_active = 1', [salonId]);
    if (!salon) {
      return notFound('Salon not found');
    }

    // ── Travel Radius Check (Fail Fast) ────────────────────────────────────
    if (isMobile && hasMobileCoords && salon.travel_radius !== null && salon.latitude && salon.longitude) {
      const distance = haversineDistanceKm(Number(salon.latitude), Number(salon.longitude), userLat, userLng);
      if (distance > salon.travel_radius) {
        return success({
          slots: [],
          closed: true,
          message: `Sorry, this location is outside our service area (max ${salon.travel_radius}km).`,
        });
      }
    }

    // Check if the salon is closed on this specific date (one-off closure)
    const closure = await getOne(
      'SELECT reason FROM salon_closures WHERE salon_id = ? AND date = ?',
      [salonId, date]
    );
    if (closure) {
      return success({
        slots: [],
        closed: true,
        message: closure.reason ? `Closed: ${closure.reason}` : 'Salon is closed on this date',
      });
    }

    // Parse services parameter: "serviceId:staffId,serviceId:staffId"
    const serviceStaffPairs = servicesParam.split(',').map((pair) => {
      const [serviceIdRaw, staffIdRaw] = pair.split(':');
      const serviceId = Number(serviceIdRaw);
      const staffId = staffIdRaw === 'any' ? 'any' : Number(staffIdRaw);
      return { serviceId, staffId };
    });

    // Strict validation (prevents type confusion / malformed IDs)
    for (const { serviceId, staffId } of serviceStaffPairs) {
      if (!Number.isInteger(serviceId) || serviceId <= 0) {
        return error('Invalid services parameter (serviceId must be a positive integer)', 400);
      }
      if (staffId !== 'any' && (!Number.isInteger(staffId) || staffId <= 0)) {
        return error(`Staff not selected for service ${serviceId}`, 400);
      }
    }

    // Fetch service details for all services
    const servicesData = [];
    let totalDuration = 0;
    let totalBuffer = fulfillmentType === 'mobile' && salon.travel_buffer_time ? salon.travel_buffer_time : 0;
    
    for (const pair of serviceStaffPairs) {
      const service = await getOne(
        'SELECT id, duration_minutes, buffer_time_minutes, price FROM services WHERE id = ? AND salon_id = ?',
        [pair.serviceId, salonId]
      );
      if (!service) {
        return notFound(`Service ${pair.serviceId} not found`);
      }
      
      if (!pair.staffId) {
        return error(`Staff not selected for service ${pair.serviceId}`);
      }
      
      let capableStaffIds = [];
      if (pair.staffId === 'any') {
        // Build fulfillment capability filter
        let capabilityFilter = '';
        if (fulfillmentType === 'mobile') {
          capabilityFilter = 'AND st.can_mobile = 1';
        } else if (fulfillmentType === 'virtual') {
          capabilityFilter = 'AND st.can_virtual = 1';
        }

        const staffList = await query(
          `SELECT staff_id FROM service_staff ss
           JOIN staff st ON st.id = ss.staff_id
           WHERE ss.service_id = ? AND st.salon_id = ? AND st.is_active = 1 ${capabilityFilter}`,
          [pair.serviceId, salonId]
        );
        capableStaffIds = staffList.map(s => s.staff_id);
        if (capableStaffIds.length === 0) {
          return error(`No active staff can perform service ${pair.serviceId} for ${fulfillmentType || 'physical'} fulfillment`);
        }
      } else {
        capableStaffIds = [pair.staffId];
      }
      
      servicesData.push({
        ...service,
        staffId: pair.staffId,
        capableStaffIds
      });
      totalDuration += service.duration_minutes;
      totalBuffer += (service.buffer_time_minutes || 0);
    }

    // Get unique staff IDs (union of all capable staff for all services)
    const staffIds = [...new Set(servicesData.flatMap(s => s.capableStaffIds))];

    // Verify all exactly-specified staff are active and can perform their assigned services
    for (const serviceData of servicesData) {
      if (serviceData.staffId !== 'any') {
        const canPerform = await getOne(
          `SELECT 1 FROM service_staff ss
           JOIN staff st ON st.id = ss.staff_id
           WHERE ss.service_id = ? AND ss.staff_id = ? AND st.is_active = 1`,
          [serviceData.id, serviceData.staffId]
        );
        
        if (!canPerform) {
          return error(`Staff ${serviceData.staffId} cannot perform service ${serviceData.id}`);
        }
      }
    }

    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
    const slots = [];

    // ── Helpers ────────────────────────────────────────────────────────────
    const padLocal = (n) => String(n).padStart(2, '0');
    const fmtTime = (d) => `${padLocal(d.getHours())}:${padLocal(d.getMinutes())}:00`;
    const fmtLocal = (d) => `${d.getFullYear()}-${padLocal(d.getMonth() + 1)}-${padLocal(d.getDate())}T${padLocal(d.getHours())}:${padLocal(d.getMinutes())}:00`;

    // ── Batch fetch working hours for all involved staff ──────────────────
    const staffWorkingHoursData = await query(
      `SELECT staff_id, start_time, end_time
       FROM staff_working_hours
       WHERE staff_id IN (?) AND day_of_week = ?`,
      [staffIds.length > 0 ? staffIds : [0], dayOfWeek]
    );

    const businessHours = await getOne(
      'SELECT open_time as start_time, close_time as end_time FROM business_hours WHERE salon_id = ? AND day_of_week = ? AND is_closed = 0',
      [salonId, dayOfWeek]
    );

    // Build per-staff working hours and time-off maps
    const staffWorkingHoursMap = {};   // staffId → { startTime, endTime }
    const staffTimeOffsMap = {};       // staffId → [{ start_datetime, end_datetime }]

    for (const staffId of staffIds) {
      let workingHours = staffWorkingHoursData.find(row => row.staff_id === staffId);

      if (!workingHours && businessHours) {
        workingHours = {
          staff_id: staffId,
          start_time: businessHours.start_time,
          end_time: businessHours.end_time
        };
      }

      if (workingHours) {
        staffWorkingHoursMap[staffId] = {
          startTime: workingHours.start_time,
          endTime: workingHours.end_time
        };
      }
      // If a specific staff has no working hours, they'll fail individual checks below.
      // For "any" staff, we simply skip that candidate.

      const whStart = workingHours ? `${date} ${workingHours.start_time}` : `${date} 00:00:00`;
      const whEnd   = workingHours ? `${date} ${workingHours.end_time}`   : `${date} 23:59:59`;

      const timeOffs = await query(
        `SELECT start_datetime, end_datetime FROM staff_time_off
         WHERE staff_id = ? AND start_datetime < ? AND end_datetime > ?`,
        [staffId, whEnd, whStart]
      );
      staffTimeOffsMap[staffId] = timeOffs;
    }

    // ── Compute the scan window ───────────────────────────────────────────
    //
    // Instead of the intersection (overlapping) of all staff hours, we use
    // the UNION: earliest start of any staff → latest end of any staff.
    // This ensures we don't hide valid slots where an early-starting staff
    // handles the first service before a later-starting staff takes over.

    let earliestStart = '23:59:59';
    let latestEnd = '00:00:00';

    for (const staffId of staffIds) {
      const wh = staffWorkingHoursMap[staffId];
      if (!wh) continue;
      if (wh.startTime < earliestStart) earliestStart = wh.startTime;
      if (wh.endTime > latestEnd) latestEnd = wh.endTime;
    }

    if (earliestStart >= latestEnd) {
      return success({ slots: [], message: 'No overlapping availability for the selected staff' });
    }

    const scanStart = new Date(`${date}T${earliestStart}`);
    const scanEnd = new Date(`${date}T${latestEnd}`);

    if (isNaN(scanStart.getTime()) || isNaN(scanEnd.getTime())) {
      console.error('Invalid time format:', { earliestStart, latestEnd });
      return success({ slots: [] });
    }

    // ── Batch fetch existing sub-window bookings for all staff ─────────────
    // For mobile bookings we also need location data so we can compute travel time.
    const excludeBookingId = searchParams.get('excludeBookingId');

    let bookingsQuery = `SELECT COALESCE(bs.staff_id, b.staff_id) AS staff_id,
              bs.start_datetime, bs.end_datetime,
              b.fulfillment_type, b.service_lat, b.service_lng
       FROM bookings b
       JOIN booking_services bs ON bs.booking_id = b.id
       WHERE COALESCE(bs.staff_id, b.staff_id) IN (?)
       AND DATE(b.start_datetime) = ?
       AND b.status IN ('pending', 'confirmed')
       AND b.deleted_at IS NULL`;

    const bookingsParams = [staffIds, date];
    if (excludeBookingId) {
      bookingsQuery += ` AND b.id != ?`;
      bookingsParams.push(excludeBookingId);
    }
    
    bookingsQuery += ` ORDER BY bs.start_datetime ASC`;

    const allBookings = await query(bookingsQuery, bookingsParams);

    const staffBookings = {};
    for (const staffId of staffIds) {
      staffBookings[staffId] = allBookings.filter(b => b.staff_id === staffId);
    }

    // ── Fetch staff base locations (home_lat/home_lng) for travel fallback ─
    // Fetched unconditionally — needed to compute departure travel time from
    // existing mobile bookings even when the new booking isn't mobile.
    const staffBaseLocations = {};
    if (staffIds.length > 0) {
      const baseRows = await query(
        `SELECT id, home_lat, home_lng FROM staff WHERE id IN (?)`,
        [staffIds]
      );
      for (const row of baseRows) {
        staffBaseLocations[row.id] = {
          lat: row.home_lat !== null ? Number(row.home_lat) : null,
          lng: row.home_lng !== null ? Number(row.home_lng) : null,
        };
      }
    }

    // ── Precompute effective blocked windows for existing mobile bookings ──
    //
    // An existing mobile booking blocks time BEYOND its raw end_datetime because
    // the staff is physically traveling from the client location back to base.
    // We compute this from real GPS coordinates so it's accurate regardless of
    // whether salon.travel_buffer_time is configured.
    //
    // Strategy:
    //   effectiveEnd   = end   + travelTime(service_location → base)
    //   effectiveStart = start - travelTime(base → service_location)
    //
    // "base" = staff home, falling back to salon coordinates.
    // If neither is valid, we fall back to salon.travel_buffer_time, and if
    // that's also 0 the raw window is used (fail-open, no false blocks).
    const salonBaseLat = salon.latitude  ? Number(salon.latitude)  : null;
    const salonBaseLng = salon.longitude ? Number(salon.longitude) : null;

    for (const staffId of staffIds) {
      const base = staffBaseLocations[staffId] || {};
      const baseLat = isValidCoordinatePair(base.lat, base.lng) ? base.lat
        : isValidCoordinatePair(salonBaseLat, salonBaseLng) ? salonBaseLat : null;
      const baseLng = isValidCoordinatePair(base.lat, base.lng) ? base.lng
        : isValidCoordinatePair(salonBaseLat, salonBaseLng) ? salonBaseLng : null;

      for (const b of staffBookings[staffId] || []) {
        const bStart = new Date(String(b.start_datetime).replace(' ', 'T'));
        const bEnd   = new Date(String(b.end_datetime).replace(' ', 'T'));

        if (b.fulfillment_type !== 'mobile') {
          // Non-mobile: blocked window = raw window
          b._effectiveStart = bStart;
          b._effectiveEnd   = bEnd;
          continue;
        }

        const sLat = b.service_lat !== null ? Number(b.service_lat) : null;
        const sLng = b.service_lng !== null ? Number(b.service_lng) : null;

        let departureMins = 0;
        if (isValidCoordinatePair(sLat, sLng) && isValidCoordinatePair(baseLat, baseLng)) {
          departureMins = calculateTravelTimeMinutes(sLat, sLng, baseLat, baseLng);
        } else {
          departureMins = salon.travel_buffer_time || 0;
        }

        // Block both travel legs in the coarse filter:
        //   leg 1 — departure: mobile location → base       (departureMins)
        //   prep  — SETUP_BUFFER at base before departing   (SETUP_BUFFER_MINUTES)
        //   leg 2 — arrival estimate: base → next client    (departureMins, symmetric)
        // We don't know the next client's location here, so we use departureMins
        // as a conservative symmetric estimate. The fine check (checkBidirectionalTravel)
        // uses the actual coords for a precise re-validation.
        const totalBlockMins = departureMins + SETUP_BUFFER_MINUTES + departureMins;

        b._effectiveStart = new Date(bStart.getTime() - totalBlockMins * 60000);
        b._effectiveEnd   = new Date(bEnd.getTime()   + totalBlockMins * 60000);
      }
    }

    // ── Helper: check if a single staff member is free in a time window ───
    function isStaffAvailable(staffId, windowStart, windowEnd) {
      // 1. Working hours — staff must cover the entire service window
      const wh = staffWorkingHoursMap[staffId];
      if (!wh) return false;
      if (fmtTime(windowStart) < wh.startTime || fmtTime(windowEnd) > wh.endTime) {
        return false;
      }

      // 2. Booking conflicts — use precomputed effective windows that include
      //    travel time for existing mobile bookings (arrival + departure).
      const bookings = staffBookings[staffId] || [];
      const hasConflict = bookings.some((b) => {
        const blockedStart = b._effectiveStart;
        const blockedEnd   = b._effectiveEnd;
        return windowStart < blockedEnd && windowEnd > blockedStart;
      });
      if (hasConflict) return false;

      // 3. Time-off conflicts
      const timeOffs = staffTimeOffsMap[staffId] || [];
      const hasTimeOff = timeOffs.some((t) => {
        const tStart = new Date(String(t.start_datetime).replace(' ', 'T'));
        const tEnd = new Date(String(t.end_datetime).replace(' ', 'T'));
        return windowStart < tEnd && windowEnd > tStart;
      });
      if (hasTimeOff) return false;

      return true;
    }

    // ── Generate slots using sequential service scheduling ────────────────
    //
    // For each candidate start time, we build the sequential schedule:
    //   Service 1: slotStart → slotStart + duration1
    //   Service 2: end1 → end1 + duration2   (no buffer gap between services)
    //   ...last service includes buffer in its end time
    //
    // Each service's specific staff (or any capable staff) only needs to be
    // available during THEIR service window, not the entire booking span.

    const now = new Date();
    
    // ── Enforce Lead Times ──────────────────────────────────────────────────
    // Physical/Virtual: 30 mins notice. Mobile: 2 hours (120 mins) + travel_buffer_time notice.
    const leadTimeMinutes = isMobile 
      ? 120 + (salon.travel_buffer_time || 0) 
      : 30;
      
    const cutoffTime = new Date(now.getTime() + leadTimeMinutes * 60000);

    let currentSlot = new Date(scanStart);

    while (currentSlot.getTime() + (totalDuration + totalBuffer) * 60000 <= scanEnd.getTime()) {
      const slotStart = new Date(currentSlot);

      // Skip times that violate the minimum lead time
      if (slotStart <= cutoffTime) {
        currentSlot.setMinutes(currentSlot.getMinutes() + 15);
        continue;
      }

      // Build sequential schedule for this candidate slot
      let cursor = new Date(slotStart);
      let allServicesCanBeFulfilled = true;

      for (let i = 0; i < servicesData.length; i++) {
        const serviceData = servicesData[i];
        const duration = serviceData.duration_minutes;
        const buffer = serviceData.buffer_time_minutes || 0;
        const isLast = i === servicesData.length - 1;

        const svcStart = new Date(cursor);
        const svcEnd = new Date(cursor.getTime() + (duration + (isLast ? buffer : 0)) * 60000);

        // Check if at least one capable staff is available for THIS service's window
        let anyCapableStaffAvailable = false;

        for (const staffId of serviceData.capableStaffIds) {
          if (!isStaffAvailable(staffId, svcStart, svcEnd)) continue;

          // ── Mobile bidirectional travel feasibility check ───────────────
          // Only applied when we have the client's coordinates.
          if (hasMobileCoords) {
            const staffDayBookings = staffBookings[staffId] || [];

            // Nearest previous booking: the one that ends latest at or before svcStart.
            const prevBooking = staffDayBookings
              .filter(b => new Date(String(b.end_datetime).replace(' ', 'T')) <= svcStart)
              .sort((a, b) => new Date(String(b.end_datetime).replace(' ', 'T')) - new Date(String(a.end_datetime).replace(' ', 'T')))[0] || null;

            // Nearest next booking: the one that starts earliest at or after svcEnd.
            const nextBooking = staffDayBookings
              .filter(b => new Date(String(b.start_datetime).replace(' ', 'T')) >= svcEnd)
              .sort((a, b) => new Date(String(a.start_datetime).replace(' ', 'T')) - new Date(String(b.start_datetime).replace(' ', 'T')))[0] || null;

            // Location hierarchy: booking location → staff home → salon center
            const base = staffBaseLocations[staffId] || {};
            const baseLat = isValidCoordinatePair(base.lat, base.lng)
              ? base.lat
              : (salon.latitude ? Number(salon.latitude) : null);
            const baseLng = isValidCoordinatePair(base.lat, base.lng)
              ? base.lng
              : (salon.longitude ? Number(salon.longitude) : null);

            // ── Determine effective previous position ───────────────────────
            // If the previous booking was mobile the staff travels back to base
            // after it ends. _effectiveEnd already includes that return travel
            // time, so we treat the staff as starting from BASE at _effectiveEnd.
            // This means the arrival leg becomes: base → newClient (correct).
            // Without this, the check computes direct A→B travel and ignores
            // the mandatory return-to-base leg entirely.
            const prevIsMobile = prevBooking?.fulfillment_type === 'mobile';
            const prevEffectiveEndTime = prevBooking
              ? (prevIsMobile && prevBooking._effectiveEnd
                  ? prevBooking._effectiveEnd
                  : new Date(String(prevBooking.end_datetime).replace(' ', 'T')))
              : null;
            // When prev was mobile, origin = base (staff has returned there by _effectiveEnd).
            // When prev was non-mobile (physical/virtual), origin = null → resolves to base inside checkBidirectionalTravel.
            const prevOriginLat = prevIsMobile ? baseLat : null;
            const prevOriginLng = prevIsMobile ? baseLng : null;

            const { feasible } = checkBidirectionalTravel({
              prevLat: prevOriginLat,
              prevLng: prevOriginLng,
              prevEndTime: prevEffectiveEndTime,
              // New booking (client location)
              newLat: userLat,
              newLng: userLng,
              newStartTime: svcStart,
              newEndTime: svcEnd,
              // Departure: staff goes directly to next booking location
              nextLat: nextBooking?.fulfillment_type === 'mobile' ? Number(nextBooking.service_lat) : null,
              nextLng: nextBooking?.fulfillment_type === 'mobile' ? Number(nextBooking.service_lng) : null,
              nextStartTime: nextBooking ? new Date(String(nextBooking.start_datetime).replace(' ', 'T')) : null,
              baseLat,
              baseLng,
              salonBufferTime: salon.travel_buffer_time,
            });

            if (!feasible) continue;
          }
          // ── End bidirectional travel check ─────────────────────────────

          anyCapableStaffAvailable = true;
          break;
        }

        if (!anyCapableStaffAvailable) {
          allServicesCanBeFulfilled = false;
          break;
        }

        // Advance cursor by pure duration (no buffer gap between services)
        cursor = new Date(cursor.getTime() + duration * 60000);
      }

      if (allServicesCanBeFulfilled) {
        const slotEnd = new Date(slotStart.getTime() + totalDuration * 60000);
        slots.push({
          startTime: fmtLocal(slotStart),
          endTime: fmtLocal(slotEnd),
        });
      }

      currentSlot.setMinutes(currentSlot.getMinutes() + 15);
    }

    return success({
      date,
      services: servicesData.map(s => ({ serviceId: s.id, staffId: s.staffId })),
      totalDuration,
      slots: slots.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    });
  } catch (err) {
    console.error('Get widget availability error:', err);
    console.error('Error stack:', err.stack);
    return error(`Failed to get availability: ${err.message}`, 500);
  }
}
