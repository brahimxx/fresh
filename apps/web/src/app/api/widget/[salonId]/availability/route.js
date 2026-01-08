import { query, getOne } from '@/lib/db';
import { success, error, notFound } from '@/lib/response';

// GET /api/widget/[salonId]/availability - Get available slots for widget
export async function GET(request, { params }) {
  try {
    const { salonId } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const serviceId = searchParams.get('serviceId');
    const staffId = searchParams.get('staffId');

    if (!date || !serviceId) {
      return error('Date and service ID are required');
    }

    const salon = await getOne('SELECT id FROM salons WHERE id = ? AND is_active = 1', [salonId]);
    if (!salon) {
      return notFound('Salon not found');
    }

    const service = await getOne('SELECT duration_minutes, price FROM services WHERE id = ? AND salon_id = ?', [
      serviceId,
      salonId,
    ]);
    if (!service) {
      return notFound('Service not found');
    }

    // Get staff who can perform this service
    let staffQuery = `
      SELECT st.id, u.first_name, u.last_name
      FROM staff st
      JOIN users u ON u.id = st.user_id
      JOIN service_staff ss ON ss.staff_id = st.id
      WHERE ss.service_id = ? AND st.is_active = 1
    `;
    const staffParams = [serviceId];

    if (staffId) {
      staffQuery += ' AND st.id = ?';
      staffParams.push(staffId);
    }

    const availableStaff = await query(staffQuery, staffParams);

    if (availableStaff.length === 0) {
      return success({ slots: [] });
    }

    const dayOfWeek = new Date(date).getDay();
    const slots = [];

    for (const staffMember of availableStaff) {
      // Get working hours for this staff on this day
      const workingHours = await getOne(
        'SELECT start_time, end_time FROM staff_working_hours WHERE staff_id = ? AND day_of_week = ?',
        [staffMember.id, dayOfWeek]
      );

      if (!workingHours) continue;

      // Check for time off
      const timeOff = await getOne(
        'SELECT id FROM staff_time_off WHERE staff_id = ? AND ? BETWEEN start_date AND end_date',
        [staffMember.id, date]
      );

      if (timeOff) continue;

      // Get existing bookings for this staff on this date
      const bookings = await query(
        `SELECT start_datetime, end_datetime FROM bookings 
         WHERE staff_id = ? AND DATE(start_datetime) = ? 
         AND status NOT IN ('cancelled', 'no_show')
         ORDER BY start_datetime`,
        [staffMember.id, date]
      );

      // Generate available slots
      const start = new Date(`${date}T${workingHours.start_time}`);
      const end = new Date(`${date}T${workingHours.end_time}`);
      const duration = service.duration_minutes;
      const now = new Date();

      while (start.getTime() + duration * 60000 <= end.getTime()) {
        const slotEnd = new Date(start.getTime() + duration * 60000);

        // Skip past times
        if (start <= now) {
          start.setMinutes(start.getMinutes() + 15);
          continue;
        }

        // Check if slot conflicts with any booking
        const hasConflict = bookings.some((booking) => {
          const bookingStart = new Date(booking.start_datetime);
          const bookingEnd = new Date(booking.end_datetime);
          return start < bookingEnd && slotEnd > bookingStart;
        });

        if (!hasConflict) {
          slots.push({
            staffId: staffMember.id,
            staffName: `${staffMember.first_name} ${staffMember.last_name}`,
            startTime: start.toISOString(),
            endTime: slotEnd.toISOString(),
          });
        }

        start.setMinutes(start.getMinutes() + 15);
      }
    }

    return success({
      date,
      serviceId,
      duration: service.duration_minutes,
      slots: slots.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    });
  } catch (err) {
    console.error('Get widget availability error:', err);
    return error('Failed to get availability', 500);
  }
}
