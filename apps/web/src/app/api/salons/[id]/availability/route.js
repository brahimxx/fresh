import { query, getOne } from '@/lib/db';
import { success, error } from '@/lib/response';

// GET /api/salons/[id]/availability - Get staff availability (optimized - no N+1)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const date = searchParams.get('date'); // YYYY-MM-DD format
    const staffId = searchParams.get('staffId');
    const serviceIds = searchParams.get('serviceIds')?.split(',').map(Number).filter(Boolean);

    if (!date) {
      return error('Date is required');
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return error('Invalid date format. Use YYYY-MM-DD');
    }

    // Get services duration if provided
    let totalDuration = 30; // Default 30 min slot
    if (serviceIds && serviceIds.length > 0) {
      const services = await query(
        `SELECT duration_minutes FROM services WHERE id IN (${serviceIds.map(() => '?').join(',')}) AND salon_id = ?`,
        [...serviceIds, id]
      );
      if (services.length > 0) {
        totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
      }
    }

    // Get all active staff for the salon
    let staffQuery = `
      SELECT st.id, u.first_name, u.last_name
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
      `SELECT staff_id 
       FROM staff_time_off 
       WHERE staff_id IN (${staffIds.map(() => '?').join(',')})
       AND DATE(start_datetime) <= ? 
       AND DATE(end_datetime) >= ?`,
      [...staffIds, date, date]
    );
    
    // Create a set of staff IDs on time off
    const timeOffStaffIds = new Set(allTimeOff.map(t => t.staff_id));

    // BATCH QUERY 3: Get all bookings for all staff members at once
    const allBookings = await query(
      `SELECT staff_id, start_datetime, end_datetime 
       FROM bookings 
       WHERE staff_id IN (${staffIds.map(() => '?').join(',')})
       AND DATE(start_datetime) = ?
       AND status NOT IN ('cancelled', 'no_show')
       ORDER BY start_datetime`,
      [...staffIds, date]
    );
    
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
    const slotInterval = 15; // 15 minute intervals

    for (const staff of staffMembers) {
      const staffName = `${staff.first_name} ${staff.last_name}`;
      
      // Check working hours from map
      const workingHours = workingHoursMap.get(staff.id);
      if (!workingHours) {
        availability.push({ staffId: staff.id, staffName, slots: [] });
        continue;
      }

      // Check time off from set
      if (timeOffStaffIds.has(staff.id)) {
        availability.push({ staffId: staff.id, staffName, slots: [] });
        continue;
      }

      // Get bookings from map
      const bookings = bookingsMap.get(staff.id) || [];

      // Generate available slots
      const slots = [];
      const startTime = new Date(`${date}T${workingHours.start_time}`);
      const endTime = new Date(`${date}T${workingHours.end_time}`);

      let currentSlot = new Date(startTime);

      while (currentSlot.getTime() + totalDuration * 60000 <= endTime.getTime()) {
        const slotEnd = new Date(currentSlot.getTime() + totalDuration * 60000);

        // Check if this slot conflicts with any booking
        const isAvailable = !bookings.some((booking) => {
          const bookingStart = new Date(booking.start_datetime);
          const bookingEnd = new Date(booking.end_datetime);

          return (
            (currentSlot >= bookingStart && currentSlot < bookingEnd) ||
            (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
            (currentSlot <= bookingStart && slotEnd >= bookingEnd)
          );
        });

        if (isAvailable) {
          slots.push({
            startTime: currentSlot.toTimeString().slice(0, 5),
            endTime: slotEnd.toTimeString().slice(0, 5),
            datetime: currentSlot.toISOString(),
          });
        }

        currentSlot = new Date(currentSlot.getTime() + slotInterval * 60000);
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
