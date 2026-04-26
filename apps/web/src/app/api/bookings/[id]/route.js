import { decodeId } from '@/lib/id';
import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';
import { sendNotification } from '@/lib/notifications';

// Helper to check booking access
async function checkBookingAccess(bookingId, userId, role) {
  const booking = await getOne(
    `SELECT b.*, s.owner_id
     FROM bookings b
     JOIN salons s ON s.id = b.salon_id
     WHERE b.id = ?`,
    [bookingId]
  );

  if (!booking) return { access: false, booking: null };

  if (role === 'admin') return { access: true, booking };
  if (booking.client_id === userId) return { access: true, booking };
  if (booking.owner_id === userId) return { access: true, booking };

  // Check if staff member
  const staff = await getOne(
    'SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
    [booking.salon_id, userId]
  );
  if (staff) return { access: true, booking };

  return { access: false, booking: null };
}

// GET /api/bookings/[id] - Get booking details
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
  const id = decodeId(rawId);

    const { access, booking } = await checkBookingAccess(id, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to view this booking');
    }

    // Get client info
    const client = await getOne(
      'SELECT id, first_name, last_name, email, phone FROM users WHERE id = ?',
      [booking.client_id]
    );

    // Get staff info
    let staff = null;
    if (booking.staff_id) {
      staff = await getOne(
        `SELECT st.id, st.role, u.first_name, u.last_name
         FROM staff st
         JOIN users u ON u.id = st.user_id
         WHERE st.id = ?`,
        [booking.staff_id]
      );
    }

    // Get salon info
    const salon = await getOne('SELECT id, name, address, city, phone FROM salons WHERE id = ?', [booking.salon_id]);

    // Get booking services
    const services = await query(
      `SELECT bs.*, sv.name as service_name, bs.staff_id
       FROM booking_services bs
       JOIN services sv ON sv.id = bs.service_id
       WHERE bs.booking_id = ?`,
      [id]
    );

    // Get payment info
    const payment = await getOne('SELECT * FROM payments WHERE booking_id = ?', [id]);

    return success({
      id: booking.id,
      salon: {
        id: salon.id,
        name: salon.name,
        address: salon.address,
        city: salon.city,
        phone: salon.phone,
      },
      client: {
        id: client.id,
        firstName: client.first_name,
        lastName: client.last_name,
        email: client.email,
        phone: client.phone,
      },
      staff: staff
        ? {
            id: staff.id,
            firstName: staff.first_name,
            lastName: staff.last_name,
            role: staff.role,
          }
        : null,
      startDatetime: String(booking.start_datetime).replace(' ', 'T'),
      endDatetime: String(booking.end_datetime).replace(' ', 'T'),
      status: booking.status,
      source: booking.source,
      createdAt: booking.created_at,
      services: services.map((s) => ({
        id: s.service_id,
        name: s.service_name,
        price: s.price,
        duration: s.duration_minutes,
        staffId: s.staff_id,
      })),
      payment: payment
        ? {
            id: payment.id,
            amount: payment.amount,
            method: payment.method,
            status: payment.status,
            createdAt: payment.created_at,
          }
        : null,
      // Fulfillment context
      fulfillmentType: booking.fulfillment_type || 'physical',
      serviceLocationAddress: booking.service_location_address || null,
      virtualMeetingLink: booking.virtual_meeting_link || null,
      travelFeeAmount: parseFloat(booking.travel_fee_amount || 0),
      clientTimezone: booking.client_timezone || null,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get booking error:', err);
    return error('Failed to get booking', 500);
  }
}

// PUT /api/bookings/[id] - Update booking status
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
  const id = decodeId(rawId);

    const { access, booking } = await checkBookingAccess(id, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to update this booking');
    }

    const body = await request.json();
    const { status, staffId, startDatetime, cancellationReason } = body;

    // Validate status transition
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled', 'no_show'],
      completed: [],
      cancelled: [],
      no_show: [],
    };

    if (status && !validTransitions[booking.status]?.includes(status)) {
      return error(`Cannot transition from ${booking.status} to ${status}`);
    }

    // Build update query
    const updates = [];
    const updateParams = [];

    // Cancellation variables
    let lateCancellation = false;
    let cancellationFee = 0;
    let cancelSettings = null;

    if (status) {
      updates.push('status = ?');
      updateParams.push(status);

      if (status === 'cancelled' || status === 'no_show') {
        if (status === 'cancelled') {
            updates.push('cancelled_at = NOW()');
            updates.push('cancelled_by = ?');
            updateParams.push(session.userId);

            if (cancellationReason) {
              updates.push('cancellation_reason = ?');
              updateParams.push(cancellationReason);
            }
        }

        // Check policy for penalties (late cancellation or no-show)
        cancelSettings = await getOne('SELECT * FROM salon_settings WHERE salon_id = ?', [booking.salon_id]);
        
        if (status === 'no_show') {
            // A no-show always applies the full no-show fee automatically
            lateCancellation = true; // Re-use the penalty flag
            cancellationFee = cancelSettings ? parseFloat(cancelSettings.no_show_fee || 0) : 0;
        } else if (cancelSettings && cancelSettings.cancellation_policy_hours > 0) {
          const bookingStart = new Date(booking.start_datetime);
          const now = new Date();
          const hoursUntilBooking = (bookingStart - now) / (1000 * 60 * 60);

          if (hoursUntilBooking > 0 && hoursUntilBooking < cancelSettings.cancellation_policy_hours) {
            lateCancellation = true;
            cancellationFee = parseFloat(cancelSettings.no_show_fee || 0); // Defaulting late cancellation to no_show_fee penalty
          }
        }
      }
    }

    if (staffId) {
      updates.push('staff_id = ?');
      updateParams.push(staffId);
    }

    if (startDatetime) {
      // Recalculate end datetime including buffer time
      const services = await query(
        `SELECT bs.duration_minutes, s.buffer_time_minutes 
         FROM booking_services bs
         JOIN services s ON s.id = bs.service_id
         WHERE bs.booking_id = ?`,
        [id]
      );
      const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
      const totalBuffer = services.reduce((sum, s) => sum + (s.buffer_time_minutes || 0), 0);
      const startDate = new Date(String(startDatetime).replace(' ', 'T'));
      const endDate = new Date(startDate.getTime() + (totalDuration + totalBuffer) * 60000);
      
      // Format as local time
      const pad = (n) => String(n).padStart(2, "0");
      const startDatetimeFormatted = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())} ${pad(startDate.getHours())}:${pad(startDate.getMinutes())}:${pad(startDate.getSeconds())}`;
      const endDatetimeFormatted = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())} ${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:${pad(endDate.getSeconds())}`;

      updates.push('start_datetime = ?', 'end_datetime = ?');
      updateParams.push(startDatetimeFormatted, endDatetimeFormatted);
    }

    if (updates.length === 0) {
      return error('No updates provided');
    }

    updateParams.push(id, booking.salon_id);
    await query(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ? AND salon_id = ?`, updateParams);

    // If cancelled or no-show, handle payment refunds and cancellation fees dynamically
    if (status === 'cancelled' || status === 'no_show') {
        const payment = await getOne('SELECT id, amount, status FROM payments WHERE booking_id = ?', [id]);
        const feeReasonStr = status === 'no_show' ? 'No-Show Fee' : 'Late Cancellation Fee';

        if (payment) {
            if (payment.status === 'paid') {
               if (lateCancellation && cancellationFee > 0) {
                   const refundAmt = Math.max(0, parseFloat(payment.amount) - cancellationFee);
                   await query(`UPDATE payments SET status = 'refunded', refunded_amount = ?, notes = CONCAT(COALESCE(notes, ''), ' | ${feeReasonStr} Applied: $', ?) WHERE id = ?`, [refundAmt, cancellationFee, payment.id]);
               } else {
                   await query(`UPDATE payments SET status = 'refunded', refunded_amount = amount WHERE id = ?`, [payment.id]);
               }
            } else {
               if (lateCancellation && cancellationFee > 0) {
                   // Modify standing pending invoice to only match the fee amount
                   await query(`UPDATE payments SET amount = ?, notes = CONCAT(COALESCE(notes, ''), ' | ${feeReasonStr}'), status = 'pending' WHERE id = ?`, [cancellationFee, payment.id]);
               } else {
                   await query(`UPDATE payments SET status = 'refunded' WHERE id = ?`, [payment.id]);
               }
            }
        } else if (lateCancellation && cancellationFee > 0) {
            // Issue an outstanding fee for late cancellation / no-show
            await query(`INSERT INTO payments (booking_id, amount, method, status, notes) VALUES (?, ?, 'card', 'pending', ?)`, [id, cancellationFee, feeReasonStr]);
        }

        if (status === 'no_show') {
            // Apply Blacklisting for No-Show scenarios
            await query(`
                UPDATE salon_clients 
                SET is_active = 0, 
                    notes = CONCAT(COALESCE(notes, ''), '\\nBlacklisted due to No-Show.') 
                WHERE client_id = ? AND salon_id = ?
            `, [booking.client_id, booking.salon_id]);
        }
    }

    const updatedBooking = await getOne('SELECT * FROM bookings WHERE id = ?', [id]);

    // Setup notification payload if client notification is needed
    const client = await getOne('SELECT id, email, first_name FROM users WHERE id = ?', [booking.client_id]);
    
    // Send Cancellation Notification if status changed to cancelled
    if (status === 'cancelled') {
        if (client) {
            const salon = await getOne('SELECT name FROM salons WHERE id = ?', [booking.salon_id]);
            const pad = (n) => String(n).padStart(2, "0");
            const d = new Date(String(booking.start_datetime).replace(" ", "T"));
            const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
            
            let feeMessage = '';
            if (lateCancellation && cancellationFee > 0 && cancelSettings) {
                feeMessage = `<br><p><em>Notice: Because this cancellation occurred within the ${cancelSettings.cancellation_policy_hours}-hour window of the appointment, a late cancellation fee of $${cancellationFee.toFixed(2)} has been applied to your account according to salon policy.</em></p>`;
            }

            sendNotification({
                userId: client.id,
                email: client.email,
                type: 'email',
                title: 'Booking Cancelled',
                message: `<p>Hi ${client.first_name || 'there'},</p><p>Your booking with <strong>${salon?.name || 'the salon'}</strong> for ${formattedDate} has been successfully cancelled.</p>${feeMessage}`,
                data: { bookingId: id, status: 'cancelled' }
            });
        }
    }
    // Send No-Show Notification if status changed to no-show
    else if (status === 'no_show') {
        if (client) {
            const salon = await getOne('SELECT name FROM salons WHERE id = ?', [booking.salon_id]);
            const pad = (n) => String(n).padStart(2, "0");
            const d = new Date(String(booking.start_datetime).replace(" ", "T"));
            const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
            
            let feeMessage = '';
            if (cancellationFee > 0) {
                feeMessage = `<br><p><em>Notice: As per our policy, a no-show fee of $${cancellationFee.toFixed(2)} has been applied to your account.</em></p>`;
            }

            sendNotification({
                userId: client.id,
                email: client.email,
                type: 'email',
                title: 'Missed Appointment',
                message: `
                  <p>Hi ${client.first_name || 'there'},</p>
                  <p>We missed you at <strong>${salon?.name || 'the salon'}</strong> for your appointment on ${formattedDate}.</p>
                  <p>If you need to reschedule, please refer to our online booking system or contact us directly.</p>
                  ${feeMessage}
                `,
                data: { bookingId: id, status: 'no_show', event: 'no_show_alert' }
            });
        }
    } 
    // Send Confirmation Notification if status changed from pending to confirmed
    else if (status === 'confirmed' && booking.status === 'pending') {
        const salon = await getOne('SELECT name FROM salons WHERE id = ?', [booking.salon_id]);
        const services = await query(
          `SELECT s.name, s.duration_minutes 
           FROM booking_services bs 
           JOIN services s ON s.id = bs.service_id 
           WHERE bs.booking_id = ?`,
          [id]
        );
        if (client) {
          const pad = (n) => String(n).padStart(2, "0");
          const d = new Date(String(booking.start_datetime).replace(" ", "T"));
          const startDatetimeFormatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
          const formattedServicesHTML = services.map(s => `<li>${s.name} (${s.duration_minutes}m)</li>`).join('');

          sendNotification({
            userId: client.id,
            email: client.email,
            type: 'email',
            title: 'Booking Confirmed',
            message: `
              <p>Hi ${client.first_name || 'there'},</p>
              <p>Your booking at <strong>${salon?.name || 'the salon'}</strong> has been confirmed by the staff!</p>
              <p><strong>When:</strong> ${startDatetimeFormatted}</p>
              <p><strong>Services:</strong></p>
              <ul>${formattedServicesHTML}</ul>
              <p>We look forward to seeing you!</p>
            `,
            data: { bookingId: id, status: 'confirmed' }
          });
        }
    }
    // Send Review Flow Notification if status changed directly to completed
    else if (status === 'completed' && booking.status !== 'completed') {
        const salon = await getOne('SELECT name FROM salons WHERE id = ?', [booking.salon_id]);
        if (client) {
          // Explicit hardcoded review url placeholder until actual domain is configured
          const reviewUrl = `http://localhost:3000/dashboard/client/bookings/${id}/review`;
          sendNotification({
            userId: client.id,
            email: client.email,
            type: 'email',
            title: 'Thank you for your visit!',
            message: `
              <p>Hi ${client.first_name || 'there'},</p>
              <p>Your visit to <strong>${salon?.name || 'the salon'}</strong> is now complete!</p>
              <p>We'd love to hear about your experience. Please take a moment to leave a review.</p>
              <p><a href="${reviewUrl}">Leave a Review</a></p>
              <p>We hope to see you again soon!</p>
            `,
            data: { bookingId: id, status: 'completed', event: 'review_prompt' }
          });
        }
    }

    return success({
      id: updatedBooking.id,
      staffId: updatedBooking.staff_id,
      startDatetime: updatedBooking.start_datetime,
      endDatetime: updatedBooking.end_datetime,
      status: updatedBooking.status,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update booking error:', err);
    return error('Failed to update booking', 500);
  }
}

// DELETE /api/bookings/[id] - Cancel booking
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
  const id = decodeId(rawId);

    const { access, booking } = await checkBookingAccess(id, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to cancel this booking');
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return error('Cannot cancel a booking that is already completed or cancelled');
    }

    // Check cancellation policy
    let lateCancellation = false;
    let cancellationFee = 0;
    const settings = await getOne('SELECT * FROM salon_settings WHERE salon_id = ?', [booking.salon_id]);
    if (settings && settings.cancellation_policy_hours > 0 && session.role === 'client') {
      const bookingStart = new Date(booking.start_datetime);
      const now = new Date();
      const hoursUntilBooking = (bookingStart - now) / (1000 * 60 * 60);

      // Apply late fee if cancelled less than X hours before, but not if the appointment already passed (usually would be no-show)
      if (hoursUntilBooking > 0 && hoursUntilBooking < settings.cancellation_policy_hours) {
        lateCancellation = true;
        cancellationFee = parseFloat(settings.no_show_fee || 0); // Re-use no-show fee amount as late cancellation penalty
      }
    }

    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason');

    const updates = ['status = ?', 'cancelled_at = NOW()', 'cancelled_by = ?'];
    const updateParams = ['cancelled', session.userId];
    if (reason) {
      updates.push('cancellation_reason = ?');
      updateParams.push(reason);
    }
    updateParams.push(id, booking.salon_id);

    await query(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ? AND salon_id = ?`, updateParams);

    // If cancelled, handle payment refunds and calculate any cancellation fees dynamically
    const payment = await getOne('SELECT id, amount, status FROM payments WHERE booking_id = ?', [id]);
    if (payment) {
        if (payment.status === 'paid') {
           if (lateCancellation && cancellationFee > 0) {
               const refundAmt = Math.max(0, parseFloat(payment.amount) - cancellationFee);
               await query(`UPDATE payments SET status = 'refunded', refunded_amount = ?, notes = CONCAT(COALESCE(notes, ''), ' | Late Cancellation Fee Applied: $', ?) WHERE id = ?`, [refundAmt, cancellationFee, payment.id]);
           } else {
               await query(`UPDATE payments SET status = 'refunded', refunded_amount = amount WHERE id = ?`, [payment.id]);
           }
        } else {
           if (lateCancellation && cancellationFee > 0) {
               // Modify standing pending invoice to only match the fee amount
               await query(`UPDATE payments SET amount = ?, notes = CONCAT(COALESCE(notes, ''), ' | Late Cancellation Fee'), status = 'pending' WHERE id = ?`, [cancellationFee, payment.id]);
           } else {
               await query(`UPDATE payments SET status = 'refunded' WHERE id = ?`, [payment.id]);
           }
        }
    } else if (lateCancellation && cancellationFee > 0) {
        // Issue an outstanding fee for late cancellation
        await query(`INSERT INTO payments (booking_id, amount, method, status, notes) VALUES (?, ?, 'card', 'pending', 'Late Cancellation Fee')`, [id, cancellationFee]);
    }

    // Send Cancellation Notification
    const client = await getOne('SELECT id, email, first_name FROM users WHERE id = ?', [booking.client_id]);
    if (client) {
        const salon = await getOne('SELECT name FROM salons WHERE id = ?', [booking.salon_id]);
        const pad = (n) => String(n).padStart(2, "0");
        const d = new Date(String(booking.start_datetime).replace(" ", "T"));
        const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        
        let feeMessage = '';
        if (lateCancellation && cancellationFee > 0) {
            feeMessage = `<br><p><em>Notice: Because this cancellation occurred within the ${settings.cancellation_policy_hours}-hour window of the appointment, a late cancellation fee of $${cancellationFee.toFixed(2)} has been applied to your account according to salon policy.</em></p>`;
        }

        sendNotification({
            userId: client.id,
            email: client.email,
            type: 'email',
            title: 'Booking Cancelled',
            message: `<p>Hi ${client.first_name || 'there'},</p><p>Your booking with <strong>${salon?.name || 'the salon'}</strong> for ${formattedDate} has been successfully cancelled.</p>${feeMessage}`,
            data: { bookingId: id, status: 'cancelled' }
        });
    }

    return success({ message: 'Booking cancelled successfully', lateCancellation, cancellationFee });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Cancel booking error:', err);
    return error('Failed to cancel booking', 500);
  }
}
