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
      
      servicesData.push({
        ...service,
        staffId: pair.staffId
      });
      totalDuration += service.duration_minutes;
      totalBuffer += (service.buffer_time_minutes || 0);
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

    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
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
    const staffTimeOffs = {};

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
      const startDateTimeStr = `${date} ${workingHours.start_time}`;
      const endDateTimeStr = `${date} ${workingHours.end_time}`;

      const timeOffs = await query(
        `SELECT start_datetime, end_datetime FROM staff_time_off
         WHERE staff_id = ?
         AND start_datetime < ?
         AND end_datetime > ?`,
        [staffId, endDateTimeStr, startDateTimeStr]
      );

      staffTimeOffs[staffId] = timeOffs;

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

    // Create dates in local time
    const startTime = new Date(`${date}T${startTimeStr}`);
    const endTime = new Date(`${date}T${endTimeStr}`);
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      console.error('Invalid time format:', { start_time: startTimeStr, end_time: endTimeStr });
      return success({ slots: [] });
    }

    // Get existing bookings for all staff on this date (batch query)
    const allBookings = await query(
      `SELECT b.staff_id, b.start_datetime, b.end_datetime
       FROM bookings b
       WHERE b.staff_id IN (?) AND DATE(b.start_datetime) = ?
       AND b.status IN ('pending', 'confirmed')
       AND b.deleted_at IS NULL
       
       UNION
       
       SELECT bs.staff_id, b.start_datetime, b.end_datetime
       FROM bookings b
       JOIN booking_services bs ON bs.booking_id = b.id
       WHERE bs.staff_id IN (?) AND DATE(b.start_datetime) = ?
       AND b.status IN ('pending', 'confirmed')
       AND b.deleted_at IS NULL`,
      [staffIds, date, staffIds, date]
    );

    // Group bookings by staff
    const staffBookings = {};
    for (const staffId of staffIds) {
      staffBookings[staffId] = allBookings.filter(b => b.staff_id === staffId);
    }

    const now = new Date();
    let currentSlot = new Date(startTime);

    // Generate slots checking all staff availability
    while (currentSlot.getTime() + (totalDuration + totalBuffer) * 60000 <= endTime.getTime()) {
      const slotStart = new Date(currentSlot);
      const slotEnd = new Date(currentSlot.getTime() + totalDuration * 60000);
      const slotEndWithBuffer = new Date(currentSlot.getTime() + (totalDuration + totalBuffer) * 60000);

      // Skip past times
      if (slotStart <= now) {
        currentSlot.setMinutes(currentSlot.getMinutes() + (totalDuration + totalBuffer));
        continue;
      }

      // Check if ALL staff are available for this slot
      let allAvailable = true;
      
      for (const staffId of staffIds) {
        const bookings = staffBookings[staffId];
        const timeOffs = staffTimeOffs[staffId] || [];
        
        const hasBookingConflict = bookings.some((booking) => {
          const bookingStart = new Date(String(booking.start_datetime).replace(' ', 'T'));
          const bookingEnd = new Date(String(booking.end_datetime).replace(' ', 'T'));
          
          // Check overlap with buffer
          return slotStart < bookingEnd && slotEndWithBuffer > bookingStart;
        });

        const hasTimeOffConflict = timeOffs.some((timeOff) => {
          const timeOffStart = new Date(String(timeOff.start_datetime).replace(' ', 'T'));
          const timeOffEnd = new Date(String(timeOff.end_datetime).replace(' ', 'T'));
          
          // Check overlap with buffer
          return slotStart < timeOffEnd && slotEndWithBuffer > timeOffStart;
        });

        if (hasBookingConflict || hasTimeOffConflict) {
          allAvailable = false;
          break;
        }
      }

      if (allAvailable) {
        const pad = (n) => String(n).padStart(2, '0');
        const formatLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
        
        slots.push({
          startTime: formatLocal(slotStart),
          endTime: formatLocal(slotEnd),
        });
      }

      currentSlot.setMinutes(currentSlot.getMinutes() + (totalDuration + totalBuffer));
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
