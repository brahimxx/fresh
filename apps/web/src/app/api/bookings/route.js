import { query, getOne, transaction } from '@/lib/db';
import { getSession, requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';
import { validate, createBookingSchema, formatValidationErrors } from '@/lib/validate';

// GET /api/bookings - Get bookings (filtered by user role)
export async function GET(request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const salonId = searchParams.get('salonId');
    const staffId = searchParams.get('staffId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT b.*,
             u.first_name as client_first_name, u.last_name as client_last_name, u.email as client_email, u.phone as client_phone,
             s.name as salon_name,
             su.first_name as staff_first_name, su.last_name as staff_last_name
      FROM bookings b
      JOIN users u ON u.id = b.client_id
      JOIN salons s ON s.id = b.salon_id
      LEFT JOIN staff st ON st.id = b.staff_id
      LEFT JOIN users su ON su.id = st.user_id
      WHERE 1=1
    `;
    const params = [];

    // Role-based filtering
    if (session.role === 'client') {
      sql += ' AND b.client_id = ?';
      params.push(session.userId);
    } else if (session.role === 'owner') {
      sql += ' AND s.owner_id = ?';
      params.push(session.userId);
    } else if (session.role === 'staff') {
      // Staff can see bookings assigned to them
      sql += ' AND st.user_id = ?';
      params.push(session.userId);
    }

    if (salonId) {
      sql += ' AND b.salon_id = ?';
      params.push(salonId);
    }

    if (staffId) {
      sql += ' AND b.staff_id = ?';
      params.push(staffId);
    }

    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }

    if (startDate) {
      sql += ' AND b.start_datetime >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND b.end_datetime <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY b.start_datetime DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const bookings = await query(sql, params);

    // Get booking services for each booking
    const bookingIds = bookings.map((b) => b.id);
    let bookingServices = [];
    if (bookingIds.length > 0) {
      bookingServices = await query(
        `SELECT bs.*, sv.name as service_name
         FROM booking_services bs
         JOIN services sv ON sv.id = bs.service_id
         WHERE bs.booking_id IN (${bookingIds.map(() => '?').join(',')})`,
        bookingIds
      );
    }

    const result = bookings.map((b) => ({
      id: b.id,
      salonId: b.salon_id,
      salonName: b.salon_name,
      client: {
        id: b.client_id,
        firstName: b.client_first_name,
        lastName: b.client_last_name,
        email: b.client_email,
        phone: b.client_phone,
      },
      staff: b.staff_id
        ? {
            id: b.staff_id,
            firstName: b.staff_first_name,
            lastName: b.staff_last_name,
          }
        : null,
      startDatetime: b.start_datetime,
      endDatetime: b.end_datetime,
      status: b.status,
      source: b.source,
      createdAt: b.created_at,
      services: bookingServices
        .filter((bs) => bs.booking_id === b.id)
        .map((bs) => ({
          id: bs.service_id,
          name: bs.service_name,
          price: bs.price,
          duration: bs.duration_minutes,
        })),
    }));

    return success({ bookings: result });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get bookings error:', err);
    return error('Failed to get bookings', 500);
  }
}

// POST /api/bookings - Create a new booking
export async function POST(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    
    // Validate input
    const validation = validate(createBookingSchema, body);
    if (!validation.success) {
      return error(formatValidationErrors(validation.errors));
    }
    
    const { salonId, staffId, serviceIds, startDatetime, notes, source } = validation.data;

    // Get services to calculate total duration and price
    if (serviceIds.length === 0) {
      return error('At least one service is required');
    }
    
    const services = await query(
      `SELECT id, name, duration_minutes, price FROM services WHERE id IN (${serviceIds.map(() => '?').join(',')}) AND salon_id = ? AND is_active = 1`,
      [...serviceIds, salonId]
    );

    if (services.length !== serviceIds.length) {
      return error('One or more services not found or inactive');
    }

    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalPrice = services.reduce((sum, s) => sum + parseFloat(s.price), 0);

    // Calculate end datetime
    const startDate = new Date(startDatetime);
    const endDate = new Date(startDate.getTime() + totalDuration * 60000);
    const endDatetime = endDate.toISOString().slice(0, 19).replace('T', ' ');
    const startDatetimeFormatted = startDate.toISOString().slice(0, 19).replace('T', ' ');

    // Check staff working hours (outside transaction for faster fail)
    const dayOfWeek = startDate.getDay();
    const timeStr = startDate.toTimeString().slice(0, 8);
    const endTimeStr = endDate.toTimeString().slice(0, 8);

    const workingHours = await getOne(
      'SELECT * FROM staff_working_hours WHERE staff_id = ? AND day_of_week = ? AND start_time <= ? AND end_time >= ?',
      [staffId, dayOfWeek, timeStr, endTimeStr]
    );

    if (!workingHours) {
      return error('Staff is not working at this time', 409);
    }

    // Check for time off (outside transaction for faster fail)
    const timeOff = await getOne(
      'SELECT id FROM staff_time_off WHERE staff_id = ? AND start_datetime <= ? AND end_datetime >= ?',
      [staffId, startDatetimeFormatted, startDatetimeFormatted]
    );

    if (timeOff) {
      return error('Staff is on time off', 409);
    }

    // Create booking in transaction with row locking to prevent race conditions
    const result = await transaction(async (conn) => {
      // Lock existing bookings for this staff to prevent double-booking (SELECT FOR UPDATE)
      const [conflicts] = await conn.execute(
        `SELECT id FROM bookings 
         WHERE staff_id = ? 
         AND status NOT IN ('cancelled', 'no_show')
         AND start_datetime < ? AND end_datetime > ?
         FOR UPDATE`,
        [staffId, endDatetime, startDatetimeFormatted]
      );

      if (conflicts.length > 0) {
        throw new Error('CONFLICT: Staff is not available at this time');
      }

      // Insert the booking
      const [bookingResult] = await conn.execute(
        `INSERT INTO bookings (salon_id, client_id, staff_id, start_datetime, end_datetime, status, source, notes, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, NOW())`,
        [salonId, session.userId, staffId, startDatetimeFormatted, endDatetime, source, notes || null]
      );

      const bookingId = bookingResult.insertId;

      // Add booking services (batch insert for performance)
      const serviceValues = services.map(s => [bookingId, s.id, s.price, s.duration_minutes]);
      for (const values of serviceValues) {
        await conn.execute(
          'INSERT INTO booking_services (booking_id, service_id, price, duration_minutes) VALUES (?, ?, ?, ?)',
          values
        );
      }

      // Update or create salon_clients record
      const [existingClient] = await conn.execute(
        'SELECT salon_id FROM salon_clients WHERE salon_id = ? AND client_id = ?',
        [salonId, session.userId]
      );

      const isNewClient = existingClient.length === 0;
      
      if (isNewClient) {
        await conn.execute(
          'INSERT INTO salon_clients (salon_id, client_id, first_visit_date, last_visit_date, total_visits) VALUES (?, ?, NOW(), NOW(), 1)',
          [salonId, session.userId]
        );

        // If marketplace booking and new client, create platform fee
        if (source === 'marketplace') {
          await conn.execute(
            "INSERT INTO platform_fees (booking_id, salon_id, type, amount, is_paid) VALUES (?, ?, 'new_client', ?, 0)",
            [bookingId, salonId, totalPrice * 0.2]
          );
        }
      } else {
        await conn.execute(
          'UPDATE salon_clients SET last_visit_date = NOW(), total_visits = total_visits + 1 WHERE salon_id = ? AND client_id = ?',
          [salonId, session.userId]
        );
      }

      return { bookingId, isNewClient };
    });

    return created({
      id: result.bookingId,
      salonId,
      staffId,
      startDatetime: startDatetimeFormatted,
      endDatetime,
      status: 'pending',
      source,
      totalDuration,
      totalPrice,
      isNewClient: result.isNewClient,
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        duration: s.duration_minutes,
        price: s.price,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    if (err.message.startsWith('CONFLICT:')) {
      return error(err.message.replace('CONFLICT: ', ''), 409);
    }
    console.error('Create booking error:', err);
    return error('Failed to create booking', 500);
  }
}
