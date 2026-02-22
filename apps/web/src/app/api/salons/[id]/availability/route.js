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
    let totalBuffer = 0;
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
        totalBuffer = 0;
        
        for (const sId of serviceIds) {
          const service = serviceMap.get(sId);
          if (service) {
            totalDuration += service.duration_minutes;
            totalBuffer += (service.buffer_time_minutes || 0);
          }
        }
        
        // Fallback if no valid services found
        if (totalDuration === 0) totalDuration = 30;
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

    // BATCH QUERY 3: Get all bookings for all staff members at once
    const allBookings = await query(
      `SELECT b.staff_id, b.start_datetime, b.end_datetime 
       FROM bookings b
       WHERE b.staff_id IN (${staffIds.map(() => '?').join(',')})
       AND DATE(b.start_datetime) = ?
       AND b.status IN ('pending', 'confirmed')
       AND b.deleted_at IS NULL
       
       UNION
       
       SELECT bs.staff_id, b.start_datetime, b.end_datetime 
       FROM bookings b
       JOIN booking_services bs ON bs.booking_id = b.id
       WHERE bs.staff_id IN (${staffIds.map(() => '?').join(',')})
       AND DATE(b.start_datetime) = ?
       AND b.status IN ('pending', 'confirmed')
       AND b.deleted_at IS NULL`,
      [...staffIds, date, ...staffIds, date]
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

    for (const staff of staffMembers) {
      const staffName = `${staff.first_name} ${staff.last_name}`;
      
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

      // 3. Split into slots based on service duration
      // 4. Apply buffer time
      const slots = [];
      const startTime = new Date(`${date}T${workingHours.start_time}`);
      const endTime = new Date(`${date}T${workingHours.end_time}`);

      let currentSlot = new Date(startTime);
      const now = new Date();
      const stepMinutes = totalDuration + totalBuffer;

      while (currentSlot.getTime() + stepMinutes * 60000 <= endTime.getTime()) {
        const slotStart = new Date(currentSlot);
        const slotEnd = new Date(currentSlot.getTime() + totalDuration * 60000);
        const slotEndWithBuffer = new Date(currentSlot.getTime() + stepMinutes * 60000);

        // Skip past times
        if (slotStart <= now) {
          currentSlot = new Date(currentSlot.getTime() + stepMinutes * 60000);
          continue;
        }

        // Check if this slot + buffer conflicts with any blocked period
        // Standard overlap: existing.start < slot_end AND existing.end > slot_start
        const isAvailable = !blockedPeriods.some((blocked) =>
          blocked.start < slotEndWithBuffer && blocked.end > slotStart
        );

        if (isAvailable) {
          const pad = (n) => String(n).padStart(2, '0');
          const formatLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
          
          slots.push({
            startTime: `${pad(slotStart.getHours())}:${pad(slotStart.getMinutes())}`,
            endTime: `${pad(slotEnd.getHours())}:${pad(slotEnd.getMinutes())}`,
            datetime: formatLocal(slotStart),
          });
        }

        currentSlot = new Date(currentSlot.getTime() + stepMinutes * 60000);
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
