import { decodeId } from '@/lib/id';
import { query, getOne } from '@/lib/db';
import { success, error } from '@/lib/response';
import { haversineDistanceKm, isValidCoordinatePair } from '@/lib/geo';
import { checkBidirectionalTravel, resolveOrigin } from '@/lib/travel';

// GET /api/salons/[id]/availability - Get staff availability (optimized - no N+1)
export async function GET(request, { params }) {
  try {
    const { id: rawId } = await params;
  const id = decodeId(rawId);
    const { searchParams } = new URL(request.url);

    const date = searchParams.get('date'); // YYYY-MM-DD format
    const staffId = searchParams.get('staffId');
    const serviceIds = searchParams.get('serviceIds')?.split(',').map(Number).filter(Boolean);
    const fulfillmentType = searchParams.get('fulfillmentType');
    const userLatParam = searchParams.get('userLat');
    const userLngParam = searchParams.get('userLng');

    // Validate fulfillmentType enum if provided
    const VALID_FULFILLMENT_TYPES = ['physical', 'mobile', 'virtual'];
    if (fulfillmentType && !VALID_FULFILLMENT_TYPES.includes(fulfillmentType)) {
      return error({
        code: 'INVALID_PARAM',
        message: 'fulfillmentType must be one of: physical, mobile, virtual',
      }, 400);
    }

    // Parse user coordinates as floats
    const userLat = userLatParam ? parseFloat(userLatParam) : null;
    const userLng = userLngParam ? parseFloat(userLngParam) : null;

    if (!date) {
      return error('Date is required');
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return error('Invalid date format. Use YYYY-MM-DD');
    }

    // Check if salon has a closure on this specific date
    const closure = await getOne(
      'SELECT reason FROM salon_closures WHERE salon_id = ? AND date = ?',
      [id, date]
    );
    if (closure) {
      return success({
        date,
        duration: 0,
        closed: true,
        message: closure.reason ? `Closed: ${closure.reason}` : 'Salon is closed on this date',
        availability: [],
      });
    }

    // Fetch salon travel_buffer_time for mobile fulfillment
    const salon = await getOne('SELECT travel_buffer_time, travel_radius, latitude, longitude FROM salons WHERE id = ?', [id]);

    // Travel radius fail-fast check for mobile fulfillment
    if (fulfillmentType === 'mobile' && userLat != null && userLng != null && isValidCoordinatePair(userLat, userLng)) {
      const salonLat = salon ? Number(salon.latitude) : null;
      const salonLng = salon ? Number(salon.longitude) : null;
      if (salon && salon.travel_radius != null && isValidCoordinatePair(salonLat, salonLng)) {
        const distance = haversineDistanceKm(salonLat, salonLng, userLat, userLng);
        if (distance > parseFloat(salon.travel_radius)) {
          return success({
            date,
            duration: 0,
            availability: [],
            message: "Location is outside the salon's service area",
          });
        }
      }
    }

    // Get services duration if provided
    let totalDuration = 30; // Default 30 min slot
    // Travel buffer is applied once regardless of service count
    const travelBuffer = (fulfillmentType === 'mobile' && salon && salon.travel_buffer_time) ? salon.travel_buffer_time : 0;
    // Service buffers accumulate per service
    let serviceBuffer = 0;
    if (serviceIds && serviceIds.length > 0) {
      const uniqueServiceIds = [...new Set(serviceIds)];
      const services = await query(
        `SELECT id, duration_minutes, buffer_time_minutes FROM services WHERE id IN (${uniqueServiceIds.map(() => '?').join(',')}) AND salon_id = ?`,
        [...uniqueServiceIds, id]
      );
      
      if (services.length > 0) {
        // Create a map for quick lookup
        const serviceMap = new Map(services.map(s => [s.id, s]));
        
        // Calculate total duration based on the requested serviceIds array (handles duplicates)
        totalDuration = 0;
        
        for (const sId of serviceIds) {
          const service = serviceMap.get(sId);
          if (service) {
            totalDuration += service.duration_minutes;
            serviceBuffer += (service.buffer_time_minutes || 0);
          }
        }
        
        // Fallback if no valid services found
        if (totalDuration === 0) totalDuration = 30;
      }
    }

    // Total buffer = travel buffer (once) + accumulated service buffers
    const totalBuffer = travelBuffer + serviceBuffer;

    // Get all active staff for the salon (include home coordinates for travel origin resolution)
    let staffQuery = `
      SELECT st.id, u.first_name, u.last_name, st.home_lat, st.home_lng
      FROM staff st
      JOIN users u ON u.id = st.user_id
      WHERE st.salon_id = ? AND st.is_active = 1
    `;
    const staffParams = [id];

    if (staffId) {
      staffQuery += ' AND st.id = ?';
      staffParams.push(staffId);
    }

    const staffMembers = await query(staffQuery, staffParams);

    if (staffMembers.length === 0) {
      return success({ date, duration: totalDuration, availability: [] });
    }

    // Get day of week from date
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const staffIds = staffMembers.map(s => s.id);

    // BATCH QUERY 1: Get all working hours for all staff members at once
    const allWorkingHours = await query(
      `SELECT staff_id, start_time, end_time 
       FROM staff_working_hours 
       WHERE staff_id IN (${staffIds.map(() => '?').join(',')}) AND day_of_week = ?`,
      [...staffIds, dayOfWeek]
    );
    
    // Create a map for quick lookup
    const workingHoursMap = new Map();
    for (const wh of allWorkingHours) {
      workingHoursMap.set(wh.staff_id, wh);
    }

    // BATCH QUERY 2: Get all time off for all staff members at once
    const allTimeOff = await query(
      `SELECT staff_id, start_datetime, end_datetime 
       FROM staff_time_off 
       WHERE staff_id IN (${staffIds.map(() => '?').join(',')})
       AND DATE(start_datetime) <= ? 
       AND DATE(end_datetime) >= ?`,
      [...staffIds, date, date]
    );
    
    // Group time off by staff_id
    const timeOffMap = new Map();
    for (const timeOff of allTimeOff) {
      if (!timeOffMap.has(timeOff.staff_id)) {
        timeOffMap.set(timeOff.staff_id, []);
      }
      timeOffMap.get(timeOff.staff_id).push(timeOff);
    }

    const excludeBookingId = searchParams.get('excludeBookingId');

    let allBookingsQuery = `SELECT b.staff_id, b.start_datetime, b.end_datetime, b.fulfillment_type, b.service_lat, b.service_lng 
       FROM bookings b
       WHERE b.staff_id IN (${staffIds.map(() => '?').join(',')})
       AND DATE(b.start_datetime) = ?
       AND b.status IN ('pending', 'confirmed')
       AND b.deleted_at IS NULL`;
       
    if (excludeBookingId) {
      allBookingsQuery += ` AND b.id != ?`;
    }
    
    allBookingsQuery += ` UNION 
       SELECT bs.staff_id, b.start_datetime, b.end_datetime, b.fulfillment_type, b.service_lat, b.service_lng 
       FROM bookings b
       JOIN booking_services bs ON bs.booking_id = b.id
       WHERE bs.staff_id IN (${staffIds.map(() => '?').join(',')})
       AND DATE(b.start_datetime) = ?
       AND b.status IN ('pending', 'confirmed')
       AND b.deleted_at IS NULL`;
       
    if (excludeBookingId) {
      allBookingsQuery += ` AND b.id != ?`;
    }

    const bookingsParams = [...staffIds, date];
    if (excludeBookingId) bookingsParams.push(excludeBookingId);
    bookingsParams.push(...staffIds, date);
    if (excludeBookingId) bookingsParams.push(excludeBookingId);

    // BATCH QUERY 3: Get all bookings for all staff members at once
    const allBookings = await query(allBookingsQuery, bookingsParams);
    
    // Group bookings by staff_id
    const bookingsMap = new Map();
    for (const booking of allBookings) {
      if (!bookingsMap.has(booking.staff_id)) {
        bookingsMap.set(booking.staff_id, []);
      }
      bookingsMap.get(booking.staff_id).push(booking);
    }

    // Now process each staff member using the pre-fetched data
    const availability = [];

    for (const staff of staffMembers) {
      const staffName = `${staff.first_name} ${staff.last_name}`;
      
      // Resolve travel origin for this staff member (staff home → salon → null)
      const travelOrigin = resolveOrigin(staff.home_lat, staff.home_lng, salon?.latitude, salon?.longitude);

      // 1. Get working hours
      const workingHours = workingHoursMap.get(staff.id);
      if (!workingHours) {
        availability.push({ staffId: staff.id, staffName, slots: [] });
        continue;
      }

      // 2. Remove: staff_time_off, existing bookings
      const blockedPeriods = [];
      
      const timeOffs = timeOffMap.get(staff.id) || [];
      for (const t of timeOffs) {
        blockedPeriods.push({
          start: new Date(String(t.start_datetime).replace(' ', 'T')),
          end: new Date(String(t.end_datetime).replace(' ', 'T'))
        });
      }

      const bookings = bookingsMap.get(staff.id) || [];
      for (const b of bookings) {
        blockedPeriods.push({
          start: new Date(String(b.start_datetime).replace(' ', 'T')),
          end: new Date(String(b.end_datetime).replace(' ', 'T'))
        });
      }

      // Sort bookings by start time for adjacent booking lookup (travel feasibility)
      const sortedBookings = [...bookings].sort((a, b) => 
        new Date(String(a.start_datetime).replace(' ', 'T')).getTime() - new Date(String(b.start_datetime).replace(' ', 'T')).getTime()
      );

      // Determine if we need to perform travel feasibility checks
      const doTravelCheck = fulfillmentType === 'mobile' && userLat != null && userLng != null && isValidCoordinatePair(userLat, userLng);

      // Resolve base coordinates for travel origin (staff home → salon fallback)
      const baseLat = travelOrigin ? travelOrigin.lat : null;
      const baseLng = travelOrigin ? travelOrigin.lng : null;

      // 3. Split into slots based on service duration
      // 4. Apply buffer time
      const slots = [];
      const startTime = new Date(`${date}T${workingHours.start_time}`);
      const endTime = new Date(`${date}T${workingHours.end_time}`);

      let currentSlot = new Date(startTime);
      const now = new Date();
      const stepMinutes = totalDuration + totalBuffer;

      // For mobile mode, compute half travel buffer to pad slot start/end when checking working hours
      const halfBuffer = (fulfillmentType === 'mobile' && travelBuffer > 0)
        ? Math.floor(travelBuffer / 2)
        : 0;

      while (currentSlot.getTime() + stepMinutes * 60000 <= endTime.getTime()) {
        const slotStart = new Date(currentSlot);
        const slotEnd = new Date(currentSlot.getTime() + totalDuration * 60000);
        const slotEndWithBuffer = new Date(currentSlot.getTime() + stepMinutes * 60000);

        // For mobile mode, check that the padded slot fits within working hours
        // Effective start = slotStart - halfBuffer, Effective end = slotEnd + halfBuffer
        if (halfBuffer > 0) {
          const effectiveStart = new Date(slotStart.getTime() - halfBuffer * 60000);
          const effectiveEnd = new Date(slotEnd.getTime() + halfBuffer * 60000);
          if (effectiveStart.getTime() < startTime.getTime() || effectiveEnd.getTime() > endTime.getTime()) {
            currentSlot = new Date(currentSlot.getTime() + 15 * 60000);
            continue;
          }
        }

        // Skip past times
        if (slotStart <= now) {
          currentSlot = new Date(currentSlot.getTime() + 15 * 60000);
          continue;
        }

        // Check if this slot + buffer conflicts with any blocked period
        // Standard overlap: existing.start < slot_end AND existing.end > slot_start
        const isAvailable = !blockedPeriods.some((blocked) =>
          blocked.start < slotEndWithBuffer && blocked.end > slotStart
        );

        if (isAvailable) {
          // Bidirectional travel feasibility check for mobile slots with coordinates
          if (doTravelCheck) {
            // Find adjacent bookings for this slot
            const slotStartMs = slotStart.getTime();
            const slotEndMs = slotEnd.getTime();

            // Previous booking: latest booking that ends before or at slot start
            let prevBooking = null;
            for (const b of sortedBookings) {
              const bEnd = new Date(String(b.end_datetime).replace(' ', 'T'));
              if (bEnd.getTime() <= slotStartMs) {
                prevBooking = b;
              } else {
                break;
              }
            }

            // Next booking: earliest booking that starts at or after slot end
            let nextBooking = null;
            for (const b of sortedBookings) {
              const bStart = new Date(String(b.start_datetime).replace(' ', 'T'));
              if (bStart.getTime() >= slotEndMs) {
                nextBooking = b;
                break;
              }
            }

            // Determine previous end time and origin
            let prevOriginLat, prevOriginLng, prevEndTime;
            if (prevBooking) {
              const prevIsMobile = prevBooking.fulfillment_type === 'mobile';
              prevEndTime = new Date(String(prevBooking.end_datetime).replace(' ', 'T'));
              // When prev was mobile, staff returns to base; use base as origin
              // When prev was non-mobile, origin = null → resolves to base inside checkBidirectionalTravel
              prevOriginLat = prevIsMobile ? baseLat : null;
              prevOriginLng = prevIsMobile ? baseLng : null;
            } else {
              // First booking of the day: use staff base location and shift start time
              prevOriginLat = baseLat;
              prevOriginLng = baseLng;
              prevEndTime = startTime; // shift start time
            }

            // Determine next booking location
            const nextIsMobile = nextBooking?.fulfillment_type === 'mobile';
            const nextLat = nextIsMobile ? Number(nextBooking.service_lat) : null;
            const nextLng = nextIsMobile ? Number(nextBooking.service_lng) : null;
            const nextStartTime = nextBooking ? new Date(String(nextBooking.start_datetime).replace(' ', 'T')) : null;

            const { feasible } = checkBidirectionalTravel({
              prevLat: prevOriginLat,
              prevLng: prevOriginLng,
              prevEndTime,
              newLat: userLat,
              newLng: userLng,
              newStartTime: slotStart,
              newEndTime: slotEnd,
              nextLat,
              nextLng,
              nextStartTime,
              baseLat,
              baseLng,
              salonBufferTime: salon?.travel_buffer_time,
            });

            if (!feasible) {
              currentSlot = new Date(currentSlot.getTime() + 15 * 60000);
              continue;
            }
          }

          const pad = (n) => String(n).padStart(2, '0');
          const formatLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
          
          slots.push({
            startTime: `${pad(slotStart.getHours())}:${pad(slotStart.getMinutes())}`,
            endTime: `${pad(slotEnd.getHours())}:${pad(slotEnd.getMinutes())}`,
            datetime: formatLocal(slotStart),
          });
        }

        currentSlot = new Date(currentSlot.getTime() + 15 * 60000);
      }

      availability.push({ staffId: staff.id, staffName, slots });
    }

    return success({
      date,
      duration: totalDuration,
      availability,
    });
  } catch (err) {
    console.error('Get availability error:', err);
    return error('Failed to get availability', 500);
  }
}
