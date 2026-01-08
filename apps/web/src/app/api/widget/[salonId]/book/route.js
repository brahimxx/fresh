import { query, getOne, transaction } from '@/lib/db';
import { success, error, created, notFound } from '@/lib/response';
import { validate, widgetBookingSchema, formatValidationErrors } from '@/lib/validate';

// POST /api/widget/[salonId]/book - Create booking from widget (public)
export async function POST(request, { params }) {
  try {
    const { salonId } = await params;

    const salon = await getOne('SELECT id, name, is_marketplace_enabled FROM salons WHERE id = ?', [salonId]);
    if (!salon) {
      return notFound('Salon not found');
    }

    const widgetSettings = await getOne('SELECT * FROM widget_settings WHERE salon_id = ?', [salonId]);
    if (!widgetSettings || !widgetSettings.enabled) {
      return error('Booking widget is not available');
    }

    const body = await request.json();
    
    // Validate input using Zod schema
    const validation = validate(widgetBookingSchema, body);
    if (!validation.success) {
      return error(formatValidationErrors(validation.errors));
    }
    
    const { serviceId, staffId, startTime, firstName, lastName, email, phone, notes } = validation.data;

    // Additional widget-specific validation
    if (widgetSettings.require_email && !email) {
      return error('Email is required');
    }

    if (widgetSettings.require_phone && !phone) {
      return error('Phone is required');
    }

    // Verify service exists and belongs to salon
    const service = await getOne(
      'SELECT id, duration_minutes, price FROM services WHERE id = ? AND salon_id = ? AND is_active = 1', 
      [serviceId, salonId]
    );
    if (!service) {
      return error('Service not found or inactive');
    }

    // Verify staff can perform this service
    const staffCheck = await getOne(
      'SELECT id FROM service_staff WHERE service_id = ? AND staff_id = ?',
      [serviceId, staffId]
    );
    if (!staffCheck) {
      return error('Selected staff cannot perform this service');
    }

    // Calculate end time
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(startDateTime.getTime() + service.duration_minutes * 60000);
    const startDatetimeFormatted = startDateTime.toISOString().slice(0, 19).replace('T', ' ');
    const endDatetimeFormatted = endDateTime.toISOString().slice(0, 19).replace('T', ' ');

    // Check working hours before transaction
    const dayOfWeek = startDateTime.getDay();
    const timeStr = startDateTime.toTimeString().slice(0, 8);
    const endTimeStr = endDateTime.toTimeString().slice(0, 8);

    const workingHours = await getOne(
      'SELECT * FROM staff_working_hours WHERE staff_id = ? AND day_of_week = ? AND start_time <= ? AND end_time >= ?',
      [staffId, dayOfWeek, timeStr, endTimeStr]
    );

    if (!workingHours) {
      return error('Staff is not working at this time', 409);
    }

    const result = await transaction(async (conn) => {
      // Lock and check for conflicts (prevents race condition)
      const [conflicts] = await conn.execute(
        `SELECT id FROM bookings 
         WHERE staff_id = ? 
         AND status NOT IN ('cancelled', 'no_show')
         AND start_datetime < ? AND end_datetime > ?
         FOR UPDATE`,
        [staffId, endDatetimeFormatted, startDatetimeFormatted]
      );

      if (conflicts.length > 0) {
        throw new Error('CONFLICT: This time slot is no longer available');
      }

      // Check if user exists by email
      let [users] = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
      let clientId;
      let isNewUser = false;

      if (users.length > 0) {
        clientId = users[0].id;
      } else {
        // Create guest user
        isNewUser = true;
        const [userResult] = await conn.execute(
          `INSERT INTO users (email, first_name, last_name, phone, role, email_verified, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'client', 0, NOW(), NOW())`,
          [email, firstName, lastName, phone || null]
        );
        clientId = userResult.insertId;
      }

      // Create or update salon_clients relationship
      const [existing] = await conn.execute(
        'SELECT salon_id FROM salon_clients WHERE salon_id = ? AND client_id = ?',
        [salonId, clientId]
      );

      const isNewClient = existing.length === 0;
      
      if (isNewClient) {
        await conn.execute(
          'INSERT INTO salon_clients (salon_id, client_id, first_visit_date, last_visit_date, total_visits) VALUES (?, ?, NOW(), NOW(), 1)',
          [salonId, clientId]
        );
      } else {
        await conn.execute(
          'UPDATE salon_clients SET last_visit_date = NOW(), total_visits = total_visits + 1 WHERE salon_id = ? AND client_id = ?',
          [salonId, clientId]
        );
      }

      // Create booking
      const [bookingResult] = await conn.execute(
        `INSERT INTO bookings (
          salon_id, client_id, staff_id, start_datetime, end_datetime, 
          status, source, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', 'widget', ?, NOW())`,
        [salonId, clientId, staffId, startDatetimeFormatted, endDatetimeFormatted, notes || null]
      );

      const bookingId = bookingResult.insertId;

      // Add booking service
      await conn.execute(
        'INSERT INTO booking_services (booking_id, service_id, price, duration_minutes) VALUES (?, ?, ?, ?)',
        [bookingId, serviceId, service.price, service.duration_minutes]
      );

      // Create platform fee if new client from marketplace
      if (isNewClient && salon.is_marketplace_enabled) {
        await conn.execute(
          "INSERT INTO platform_fees (booking_id, salon_id, type, amount, is_paid) VALUES (?, ?, 'new_client', ?, 0)",
          [bookingId, salonId, parseFloat(service.price) * 0.2]
        );
      }

      // Create notification for salon owner
      await conn.execute(
        `INSERT INTO notifications (user_id, type, title, message, sent_at)
         SELECT s.owner_id, 'push', 'New Booking', ?, NOW()
         FROM salons s WHERE s.id = ?`,
        [`New booking from ${firstName} ${lastName} on ${startDateTime.toLocaleDateString()}`, salonId]
      );

      return {
        bookingId,
        clientId,
        isNewClient,
      };
    });

    return created({
      success: true,
      bookingId: result.bookingId,
      message: widgetSettings.success_message || 'Your booking has been confirmed!',
      booking: {
        id: result.bookingId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        salonName: salon.name,
        service: {
          id: service.id,
          price: service.price,
          duration: service.duration_minutes,
        },
      },
    });
  } catch (err) {
    if (err.message.startsWith('CONFLICT:')) {
      return error(err.message.replace('CONFLICT: ', ''), 409);
    }
    console.error('Widget booking error:', err);
    return error('Failed to create booking', 500);
  }
}
