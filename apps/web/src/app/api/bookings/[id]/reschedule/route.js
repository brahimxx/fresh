import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// PUT /api/bookings/[id]/reschedule - Reschedule/edit a booking
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const booking = await getOne(
      'SELECT b.*, s.owner_id FROM bookings b JOIN salons s ON s.id = b.salon_id WHERE b.id = ?',
      [id]
    );

    if (!booking) {
      return error('Booking not found', 404);
    }

    // Check authorization (client, salon owner, or staff)
    const isClient = booking.client_id === session.userId;
    const isOwner = booking.owner_id === session.userId;
    const isAdmin = session.role === 'admin';

    let isStaff = false;
    if (!isClient && !isOwner && !isAdmin) {
      const staff = await getOne(
        'SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
        [booking.salon_id, session.userId]
      );
      isStaff = !!staff;
    }

    if (!isClient && !isOwner && !isAdmin && !isStaff) {
      return forbidden('Not authorized to reschedule this booking');
    }

    // Check if booking can be rescheduled
    if (['completed', 'cancelled', 'no_show'].includes(booking.status)) {
      return error(`Cannot reschedule a ${booking.status} booking`);
    }

    const body = await request.json();
    const { newStartTime, newStaffId, serviceIds, staffAssignments, notes } = body;

    if (!newStartTime) {
      return error('New start time is required');
    }

    const newStart = new Date(String(newStartTime).replace(' ', 'T'));
    const now = new Date();

    if (newStart <= now) {
      return error('New time must be in the future');
    }

    // Validate newStaffId if provided (and not ANYONE_VIRTUAL)
    if (newStaffId && newStaffId !== 'ANYONE_VIRTUAL') {
      const validStaff = await getOne(
        'SELECT id FROM staff WHERE id = ? AND salon_id = ? AND is_active = 1',
        [newStaffId, booking.salon_id]
      );
      if (!validStaff) {
        return error('The selected staff member does not exist or does not belong to this salon', 400);
      }
    }

    // Determine if this is a full service edit or time-only shift
    const isServiceEdit = Array.isArray(serviceIds) && serviceIds.length > 0;

    // Prepare formatters
    const pad = (n) => String(n).padStart(2, "0");
    const formatLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    // Execute atomic reschedule
    const result = await transaction(async (connection) => {
      // Lock the booking row
      const [lockedBookings] = await connection.query(
        'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
        [id]
      );

      if (!lockedBookings.length) {
        throw new Error('Booking not found during transaction');
      }

      const lockedBooking = lockedBookings[0];

      if (['completed', 'cancelled', 'no_show'].includes(lockedBooking.status)) {
        throw new Error(`Cannot reschedule a ${lockedBooking.status} booking`);
      }

      let shiftedServices;
      let globalStaffId;

      if (isServiceEdit) {
        // ══════════════════════════════════════════════════════════════════
        // MODE A: Full service/staff edit — rebuild booking_services
        // ══════════════════════════════════════════════════════════════════

        // Validate serviceIds are integers
        const parsedServiceIds = serviceIds.map(Number);
        if (parsedServiceIds.some(isNaN)) {
          throw new Error('Invalid service IDs');
        }

        // Fetch service metadata (duration, buffer, price)
        const [dbServices] = await connection.query(
          `SELECT id, name, duration_minutes, buffer_time_minutes, price
           FROM services
           WHERE id IN (${parsedServiceIds.map(() => '?').join(',')})
             AND salon_id = ? AND is_active = 1 AND deleted_at IS NULL`,
          [...parsedServiceIds, lockedBooking.salon_id]
        );

        if (dbServices.length !== new Set(parsedServiceIds).size) {
          throw new Error('One or more services not found or inactive');
        }

        // Resolve staff ID — per-service from staffAssignments, then newStaffId, then original
        const hasPerServiceStaff = staffAssignments && typeof staffAssignments === 'object';

        // Build sequential schedule from newStart
        let cursor = new Date(newStart);
        shiftedServices = [];

        for (const sid of parsedServiceIds) {
          const svc = dbServices.find(s => s.id === sid);
          const duration = svc.duration_minutes || 30;
          const buffer = svc.buffer_time_minutes || 0;
          const svcEnd = new Date(cursor.getTime() + (duration + buffer) * 60000);

          // Determine staff for this service
          let svcStaffId = hasPerServiceStaff
            ? (staffAssignments[String(sid)] || newStaffId || lockedBooking.staff_id)
            : (newStaffId || lockedBooking.staff_id);

          // Resolve ANYONE_VIRTUAL per-service
          if (svcStaffId === 'ANYONE_VIRTUAL') {
            const [qualifiedForSvc] = await connection.query(
              `SELECT ss.staff_id FROM service_staff ss
               JOIN staff st ON st.id = ss.staff_id AND st.is_active = 1
               WHERE ss.service_id = ? AND st.salon_id = ?`,
              [sid, lockedBooking.salon_id]
            );
            if (qualifiedForSvc.length === 0) {
              throw new Error(`No staff available for service: ${svc.name}`);
            }
            svcStaffId = qualifiedForSvc[0].staff_id;
          }

          // Validate this staff can perform this service
          const [canPerform] = await connection.query(
            `SELECT 1 FROM service_staff WHERE staff_id = ? AND service_id = ?`,
            [svcStaffId, sid]
          );
          if (canPerform.length === 0) {
            throw new Error(`Staff member cannot perform service: ${svc.name}`);
          }

          shiftedServices.push({
            serviceId: svc.id,
            staffId: svcStaffId,
            price: svc.price,
            durationMinutes: duration,
            start: new Date(cursor),
            end: svcEnd,
          });

          cursor = svcEnd;
        }

        // The parent booking's staff_id = first service's staff
        globalStaffId = shiftedServices[0].staffId;

        // Delete old booking_services within the lock
        await connection.query('DELETE FROM booking_services WHERE booking_id = ?', [id]);

      } else {
        // ══════════════════════════════════════════════════════════════════
        // MODE B: Time-only shift — preserve existing service assignments
        // ══════════════════════════════════════════════════════════════════

        const oldStart = new Date(lockedBooking.start_datetime);
        const diffMs = newStart.getTime() - oldStart.getTime();

        // Lock and load existing booking_services
        const [servicesRows] = await connection.query(
          `SELECT id, service_id, staff_id, start_datetime, end_datetime, price, duration_minutes
           FROM booking_services WHERE booking_id = ? FOR UPDATE`,
          [id]
        );

        if (servicesRows.length === 0) {
          throw new Error('Booking has no nested services');
        }

        globalStaffId = newStaffId || lockedBooking.staff_id;

        shiftedServices = servicesRows.map(s => ({
          id: s.id,               // existing row ID for UPDATE
          serviceId: s.service_id,
          staffId: newStaffId || s.staff_id || lockedBooking.staff_id,
          price: s.price,
          durationMinutes: s.duration_minutes,
          start: new Date(new Date(s.start_datetime).getTime() + diffMs),
          end: new Date(new Date(s.end_datetime).getTime() + diffMs),
        }));
      }

      // ════════════════════════════════════════════════════════════════════
      // COMMON: Validate all shifted/rebuilt service windows
      // ════════════════════════════════════════════════════════════════════

      const minStart = new Date(Math.min(...shiftedServices.map(s => s.start.getTime())));
      const maxEnd = new Date(Math.max(...shiftedServices.map(s => s.end.getTime())));

      // Group by staff for validation
      const staffWindows = new Map();
      for (const s of shiftedServices) {
        if (!staffWindows.has(s.staffId)) staffWindows.set(s.staffId, []);
        staffWindows.get(s.staffId).push(s);
      }

      const dayOfWeek = newStart.getDay();

      for (const [staffId, windows] of staffWindows) {
        const [staffHours] = await connection.query(
          `SELECT start_time, end_time FROM staff_working_hours WHERE staff_id = ? AND day_of_week = ?`,
          [staffId, dayOfWeek]
        );

        let validHours = staffHours;
        if (staffHours.length === 0) {
          const [bhRows] = await connection.query(
            `SELECT open_time as start_time, close_time as end_time FROM business_hours WHERE salon_id = ? AND day_of_week = ? AND is_closed = 0`,
            [lockedBooking.salon_id, dayOfWeek]
          );
          validHours = bhRows;
        }

        for (const win of windows) {
          const winStartFmt = formatLocal(win.start);
          const winEndFmt = formatLocal(win.end);

          // Time off check
          const [timeOffs] = await connection.query(
            `SELECT id FROM staff_time_off WHERE staff_id = ? AND start_datetime < ? AND end_datetime > ? FOR UPDATE`,
            [staffId, winEndFmt, winStartFmt]
          );
          if (timeOffs.length > 0) throw new Error('A staff member has time off during this slot');

          // Working hours check
          const timeString = `${pad(win.start.getHours())}:${pad(win.start.getMinutes())}:00`;
          const endTimeString = `${pad(win.end.getHours())}:${pad(win.end.getMinutes())}:00`;

          let isWorking = false;
          if (validHours.length > 0) {
            isWorking = timeString >= validHours[0].start_time && endTimeString <= validHours[0].end_time;
          }
          if (!isWorking) throw new Error('A staff member is not working during this time slot');

          // Conflict check
          const [conflicts] = await connection.query(
            `SELECT b.id FROM bookings b
             JOIN booking_services bs ON bs.booking_id = b.id
             WHERE b.id != ?
             AND b.status IN ('pending', 'confirmed') AND b.deleted_at IS NULL
             AND bs.start_datetime < ? AND bs.end_datetime > ?
             AND COALESCE(bs.staff_id, b.staff_id) = ? FOR UPDATE`,
            [id, winEndFmt, winStartFmt, staffId]
          );
          if (conflicts.length > 0) throw new Error('The selected time slot is not available');
        }
      }

      // ════════════════════════════════════════════════════════════════════
      // COMMON: Write the changes
      // ════════════════════════════════════════════════════════════════════

      const startDatetimeFormatted = formatLocal(minStart);
      const endDatetimeFormatted = formatLocal(maxEnd);

      // Update the parent bookings row
      await connection.query(
        `UPDATE bookings SET
          start_datetime = ?,
          end_datetime = ?,
          staff_id = ?,
          notes = COALESCE(?, notes),
          status = 'pending'
         WHERE id = ?`,
        [startDatetimeFormatted, endDatetimeFormatted, globalStaffId, notes || null, id]
      );

      if (isServiceEdit) {
        // Insert new booking_services rows
        for (const svc of shiftedServices) {
          await connection.query(
            `INSERT INTO booking_services (booking_id, service_id, staff_id, price, duration_minutes, start_datetime, end_datetime)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, svc.serviceId, svc.staffId, svc.price, svc.durationMinutes, formatLocal(svc.start), formatLocal(svc.end)]
          );
        }
      } else {
        // Update existing booking_services rows in place
        for (const svc of shiftedServices) {
          await connection.query(
            `UPDATE booking_services SET
              start_datetime = ?,
              end_datetime = ?,
              staff_id = ?
             WHERE id = ?`,
            [formatLocal(svc.start), formatLocal(svc.end), svc.staffId, svc.id]
          );
        }
      }

      // Notification
      const notifyUserId = isClient ? booking.owner_id : booking.client_id;
      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES (?, 'push', 'Booking Rescheduled', ?, ?)`,
        [
          notifyUserId,
          `Booking has been rescheduled to ${newStart.toLocaleString()}`,
          JSON.stringify({ bookingId: id }),
        ]
      );

      return {
        startDatetimeFormatted,
        endDatetimeFormatted,
        staffId: globalStaffId,
      };
    });

    return success({
      message: 'Booking rescheduled successfully',
      booking: {
        id: parseInt(id),
        startTime: result.startDatetimeFormatted,
        endTime: result.endDatetimeFormatted,
        staffId: result.staffId,
        status: 'pending',
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();

    // Handle expected transaction errors cleanly
    const expectedErrors = [
      'The selected time slot is not available',
      'A staff member has time off during this slot',
      'A staff member is not working during this time slot',
      'Booking has no nested services',
      'Booking not found during transaction',
      'One or more services not found or inactive',
      'Staff member cannot perform all selected services',
      'No staff member available for all selected services',
      'Invalid service IDs',
    ];
    if (
      expectedErrors.includes(err.message) ||
      err.message.startsWith('Cannot reschedule')
    ) {
      return error(err.message, 400);
    }

    console.error('Reschedule booking error:', err);
    return error('Failed to reschedule booking', 500);
  }
}
