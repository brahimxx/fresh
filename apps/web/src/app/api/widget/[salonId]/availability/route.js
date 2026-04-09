import { query, getOne } from '@/lib/db';
import { success, error, notFound } from '@/lib/response';

// GET /api/widget/[salonId]/availability - Get available slots for widget
export async function GET(request, { params }) {
  try {
    const { salonId } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const servicesParam = searchParams.get('services');

    if (!date || !servicesParam) {
      return error('Date and services are required');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return error('Invalid date format. Expected YYYY-MM-DD', 400);
    }

    const salon = await getOne('SELECT id FROM salons WHERE id = ? AND is_active = 1', [salonId]);
    if (!salon) {
      return notFound('Salon not found');
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
    let totalBuffer = 0;
    
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
        const staffList = await query(
          `SELECT staff_id FROM service_staff ss
           JOIN staff st ON st.id = ss.staff_id
           WHERE ss.service_id = ? AND st.salon_id = ? AND st.is_active = 1`,
          [pair.serviceId, salonId]
        );
        capableStaffIds = staffList.map(s => s.staff_id);
        if (capableStaffIds.length === 0) {
          return error(`No active staff can perform service ${pair.serviceId}`);
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
    const allBookings = await query(
      `SELECT COALESCE(bs.staff_id, b.staff_id) AS staff_id, bs.start_datetime, bs.end_datetime
       FROM bookings b
       JOIN booking_services bs ON bs.booking_id = b.id
       WHERE COALESCE(bs.staff_id, b.staff_id) IN (?) 
       AND DATE(b.start_datetime) = ?
       AND b.status IN ('pending', 'confirmed')
       AND b.deleted_at IS NULL`,
      [staffIds, date]
    );

    const staffBookings = {};
    for (const staffId of staffIds) {
      staffBookings[staffId] = allBookings.filter(b => b.staff_id === staffId);
    }

    // ── Helper: check if a single staff member is free in a time window ───
    function isStaffAvailable(staffId, windowStart, windowEnd) {
      // 1. Working hours — staff must cover the entire service window
      const wh = staffWorkingHoursMap[staffId];
      if (!wh) return false;
      if (fmtTime(windowStart) < wh.startTime || fmtTime(windowEnd) > wh.endTime) {
        return false;
      }

      // 2. Booking conflicts
      const bookings = staffBookings[staffId] || [];
      const hasConflict = bookings.some((b) => {
        const bStart = new Date(String(b.start_datetime).replace(' ', 'T'));
        const bEnd = new Date(String(b.end_datetime).replace(' ', 'T'));
        return windowStart < bEnd && windowEnd > bStart;
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
    let currentSlot = new Date(scanStart);

    while (currentSlot.getTime() + (totalDuration + totalBuffer) * 60000 <= scanEnd.getTime()) {
      const slotStart = new Date(currentSlot);

      // Skip past times
      if (slotStart <= now) {
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
          if (isStaffAvailable(staffId, svcStart, svcEnd)) {
            anyCapableStaffAvailable = true;
            break;
          }
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
