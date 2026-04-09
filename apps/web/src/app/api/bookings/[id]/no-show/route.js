import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';
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
  if (booking.owner_id === userId) return { access: true, booking };

  const staff = await getOne(
    'SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
    [booking.salon_id, userId]
  );
  if (staff) return { access: true, booking };

  return { access: false, booking: null };
}

// POST /api/bookings/[id]/no-show - Mark booking as no-show
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const { access, booking } = await checkBookingAccess(id, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to mark this booking as no-show');
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return error(`Cannot mark as no-show for booking with status: ${booking.status}`);
    }

    await query("UPDATE bookings SET status = 'no_show' WHERE id = ?", [id]);

    // Determine no_show_fee rules
    const cancelSettings = await getOne('SELECT * FROM salon_settings WHERE salon_id = ?', [booking.salon_id]);
    const cancellationFee = cancelSettings ? parseFloat(cancelSettings.no_show_fee || 0) : 0;

    // Apply penalty to payments
    const payment = await getOne('SELECT id, amount, status, notes FROM payments WHERE booking_id = ?', [id]);
    const feeReasonStr = 'No-Show Fee (Manually Applied by Salon)';
    let feeApplied = cancellationFee > 0 ? cancellationFee : null;

    if (payment) {
        if (payment.status === 'paid') {
           if (cancellationFee > 0) {
               const refundAmt = Math.max(0, parseFloat(payment.amount) - cancellationFee);
               await query(`UPDATE payments SET status = 'refunded', refunded_amount = ?, notes = CONCAT(COALESCE(notes, ''), ' | ${feeReasonStr}: $', ?) WHERE id = ?`, [refundAmt, cancellationFee, payment.id]);
           } else {
               await query(`UPDATE payments SET status = 'refunded', refunded_amount = amount WHERE id = ?`, [payment.id]);
           }
        } else {
           if (cancellationFee > 0) {
               await query(`UPDATE payments SET amount = ?, notes = CONCAT(COALESCE(notes, ''), ' | ${feeReasonStr}'), status = 'pending' WHERE id = ?`, [cancellationFee, payment.id]);
           } else {
               await query(`UPDATE payments SET status = 'refunded' WHERE id = ?`, [payment.id]);
           }
        }
    } else if (cancellationFee > 0) {
        await query(`INSERT INTO payments (booking_id, amount, method, status, notes) VALUES (?, ?, 'card', 'pending', ?)`, [id, cancellationFee, feeReasonStr]);
    }

    // Automatically Blacklist client for this salon
    await query(`
      UPDATE salon_clients 
      SET is_active = 0, 
          notes = CONCAT(COALESCE(notes, ''), '\\nManually Blacklisted due to No-Show.')
      WHERE client_id = ? AND salon_id = ?
    `, [booking.client_id, booking.salon_id]);

    // Notify Client
    const client = await getOne('SELECT id, email, first_name FROM users WHERE id = ?', [booking.client_id]);
    if (client) {
        const salon = await getOne('SELECT name FROM salons WHERE id = ?', [booking.salon_id]);
        const pad = (n) => String(n).padStart(2, "0");
        const d = new Date(String(booking.start_datetime).replace(" ", "T"));
        const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        
        let feeMessage = '';
        if (cancellationFee > 0) {
            feeMessage = `<br><p><em>Notice: As per our policy, a no-show fee of $${cancellationFee.toFixed(2)} has been applied to your account.</em></p>`;
        }

        await sendNotification({
            userId: client.id,
            email: client.email,
            type: 'email',
            title: 'Missed Appointment',
            message: `
              <p>Hi ${client.first_name || 'there'},</p>
              <p>We missed you at <strong>${salon?.name || 'the salon'}</strong> for your appointment on ${formattedDate}.</p>
              <p>Your booking has been manually marked as a No-Show by the salon staff.</p>
              ${feeMessage}
              <p>Please contact the salon if you believe this is an error or if you wish to appeal this status to un-restrict your booking permissions.</p>
            `,
            data: { bookingId: id, status: 'no_show', event: 'no_show_alert' }
        });
    }

    return success({
      id: booking.id,
      status: 'no_show',
      noShowFee: feeApplied,
      message: 'Booking marked as no-show by staff and client restricted.',
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('No-show booking error:', err);
    return error('Failed to mark as no-show', 500);
  }
}
