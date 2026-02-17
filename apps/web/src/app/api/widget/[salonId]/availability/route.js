import { query, getOne } from '@/lib/db';
import { success, error, notFound } from '@/lib/response';

// Algeria timezone (UTC+1, no DST)
const TIMEZONE_OFFSET = 1 * 60; // minutes

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

    // Parse services parameter: "serviceId:staffId,serviceId:staffId"
    const serviceStaffPairs = servicesParam.split(',').map((pair) => {
      const [serviceIdRaw, staffIdRaw] = pair.split(':');
      const serviceId = Number(serviceIdRaw);
      const staffId = Number(staffIdRaw);
      return { serviceId, staffId };
    });

    // Strict validation (prevents type confusion / malformed IDs)
    for (const { serviceId, staffId } of serviceStaffPairs) {
      if (!Number.isInteger(serviceId) || serviceId <= 0) {
        return error('Invalid services parameter (serviceId must be a positive integer)', 400);
      }
      if (!Number.isInteger(staffId) || staffId <= 0) {
        return error(`Staff not selected for service ${serviceId}`, 400);
      }
    }

    // Fetch service details for all services
    const servicesData = [];
    let totalDuration = 0;
    
    for (const pair of serviceStaffPairs) {
      const service = await getOne(
        'SELECT id, duration_minutes, price FROM services WHERE id = ? AND salon_id = ?',
        [pair.serviceId, salonId]
      );
      if (!service) {
        return notFound(`Service ${pair.serviceId} not found`);
      }
      
      if (!pair.staffId) {
        return error(`Staff not selected for service ${pair.serviceId}`);
      }
      
      servicesData.push({
        ...service,
        staffId: pair.staffId
      });
      totalDuration += service.duration_minutes;
    }

    // Get unique staff IDs
    const staffIds = [...new Set(servicesData.map(s => s.staffId))];

    // Verify all staff are active and can perform their assigned services
    for (const serviceData of servicesData) {
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

    const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
    const slots = [];

    // Batch fetch working hours for all staff at once
    const staffWorkingHoursData = await query(
      `SELECT staff_id, start_time, end_time
       FROM staff_working_hours
       WHERE staff_id IN (?) AND day_of_week = ?`,
      [staffIds, dayOfWeek]
    );

    // Batch fetch business hours as fallback (in case no staff hours exist)
    const businessHours = await getOne(
      'SELECT open_time as start_time, close_time as end_time FROM business_hours WHERE salon_id = ? AND day_of_week = ? AND is_closed = 0',
      [salonId, dayOfWeek]
    );

    // Build working hours map for each staff
    const staffWorkingHours = [];

    for (const staffId of staffIds) {
      let workingHours = staffWorkingHoursData.find(row => row.staff_id === staffId);

      // Fallback to salon business hours
      if (!workingHours && businessHours) {
        workingHours = {
          staff_id: staffId,
          start_time: businessHours.start_time,
          end_time: businessHours.end_time
        };
      }

      if (!workingHours) {
        // If any staff doesn't work this day, no slots available
        return success({ slots: [], message: `Staff ${staffId} is not working on this day` });
      }

      // Check for time off with datetime granularity
      const startDateTime = new Date(`${date}T${workingHours.start_time}Z`);
      const endDateTime = new Date(`${date}T${workingHours.end_time}Z`);

      const timeOff = await getOne(
        `SELECT id FROM staff_time_off
         WHERE staff_id = ?
         AND start_datetime < ?
         AND end_datetime > ?`,
        [staffId, endDateTime.toISOString().slice(0, 19).replace('T', ' '), startDateTime.toISOString().slice(0, 19).replace('T', ' ')]
      );

      if (timeOff) {
        // Staff has time off during working hours
        return success({ slots: [], message: `Staff ${staffId} has time off on this day` });
      }

      staffWorkingHours.push({
        staffId,
        startTime: workingHours.start_time,
        endTime: workingHours.end_time
      });
    }

    // Find the overlapping working hours (latest start, earliest end)
    const startTimeStr = staffWorkingHours.reduce((latest, curr) => {
      return curr.startTime > latest ? curr.startTime : latest;
    }, staffWorkingHours[0].startTime);

    const endTimeStr = staffWorkingHours.reduce((earliest, curr) => {
      return curr.endTime < earliest ? curr.endTime : earliest;
    }, staffWorkingHours[0].endTime);

    // Create dates in UTC then adjust for Algeria timezone
    const startTime = new Date(`${date}T${startTimeStr}Z`);
    startTime.setMinutes(startTime.getMinutes() - TIMEZONE_OFFSET);
    
    const endTime = new Date(`${date}T${endTimeStr}Z`);
    endTime.setMinutes(endTime.getMinutes() - TIMEZONE_OFFSET);
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      console.error('Invalid time format:', { start_time: startTimeStr, end_time: endTimeStr });
      return success({ slots: [] });
    }

    // Get existing bookings for all staff on this date (batch query)
    const allBookings = await query(
      `SELECT bs.staff_id, b.start_datetime, b.end_datetime
       FROM bookings b
       JOIN booking_services bs ON bs.booking_id = b.id
       WHERE bs.staff_id IN (?) AND DATE(b.start_datetime) = ?
       AND b.status NOT IN ('cancelled', 'no_show')
       ORDER BY b.start_datetime`,
      [staffIds, date]
    );

    // Group bookings by staff
    const staffBookings = {};
    for (const staffId of staffIds) {
      staffBookings[staffId] = allBookings.filter(b => b.staff_id === staffId);
    }

    const now = new Date();
    let currentSlot = new Date(startTime);

    // Generate slots checking all staff availability
    while (currentSlot.getTime() + totalDuration * 60000 <= endTime.getTime()) {
      const slotStart = new Date(currentSlot);
      const slotEnd = new Date(currentSlot.getTime() + totalDuration * 60000);

      // Skip past times
      if (slotStart <= now) {
        currentSlot.setMinutes(currentSlot.getMinutes() + 15);
        continue;
      }

      // Check if ALL staff are available for this slot
      let allAvailable = true;
      
      for (const staffId of staffIds) {
        const bookings = staffBookings[staffId];
        const hasConflict = bookings.some((booking) => {
          const bookingStart = new Date(booking.start_datetime);
          const bookingEnd = new Date(booking.end_datetime);
          
          // Check overlap
          return slotStart < bookingEnd && slotEnd > bookingStart;
        });

        if (hasConflict) {
          allAvailable = false;
          break;
        }
      }

      if (allAvailable) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
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
