import { query, getOne } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { successResponse, errorResponse } from '@/lib/response';
import { formatCurrency } from '@/lib/format';

/**
 * GET /api/cron/no-shows
 * 
 * Flow summary:
 * Trigger: Time Elapsed
 * Next Typical Step: Blacklisting/Penalty
 * 
 * Automatically marks 'confirmed' bookings as 'no-show' if they are 
 * past a certain elapsed time (e.g., 24 hours after their end_datetime) 
 * but were never checked out or completed. Applies penalty / blacklisting logic.
 */
export async function GET(request) {
  try {
    // Vercel Cron or webhook auth (placeholder logic)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return errorResponse('Unauthorized', 401);
    }

    // Find confirmed bookings whose end_datetime was more than 24 hours ago
    const expiredBookings = await query(`
      SELECT b.id, b.salon_id, b.client_id, b.start_datetime 
      FROM bookings b
      WHERE b.status = 'confirmed' 
      AND b.end_datetime < DATE_SUB(NOW(), INTERVAL 24 HOUR)
      AND b.deleted_at IS NULL
    `, []);

    if (!expiredBookings.length) {
      return successResponse({ message: 'No elapsed bookings to process.' });
    }

    const processed = [];

    for (const booking of expiredBookings) {
      const { id, salon_id, client_id, start_datetime } = booking;
      
      // Update status to no_show
      await query(`UPDATE bookings SET status = 'no_show' WHERE id = ?`, [id]);

      // Determine no_show_fee rules
      const cancelSettings = await getOne('SELECT * FROM salon_settings WHERE salon_id = ?', [salon_id]);
      const cancellationFee = cancelSettings ? parseFloat(cancelSettings.no_show_fee || 0) : 0;
      
      // Apply penalty to payments
      const payment = await getOne('SELECT id, amount, status FROM payments WHERE booking_id = ?', [id]);
      const feeReasonStr = 'No-Show Fee (Auto-Applied)';

      if (payment) {
          if (payment.status === 'paid') {
             if (cancellationFee > 0) {
                 const refundAmt = Math.max(0, parseFloat(payment.amount) - cancellationFee);
                 await query(`UPDATE payments SET status = 'refunded', refunded_amount = ?, notes = CONCAT(COALESCE(notes, ''), ' | ${feeReasonStr} Applied: $', ?) WHERE id = ?`, [refundAmt, cancellationFee, payment.id]);
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
            notes = CONCAT(COALESCE(notes, ''), '\nAuto-Blacklisted due to Time Elapsed No-Show.') 
        WHERE client_id = ? AND salon_id = ?
      `, [client_id, salon_id]);

      // Notify Client
      const client = await getOne('SELECT id, email, first_name FROM users WHERE id = ?', [client_id]);
      if (client) {
          const salon = await getOne('SELECT name, currency FROM salons WHERE id = ?', [salon_id]);
          const pad = (n) => String(n).padStart(2, "0");
          const d = new Date(String(start_datetime).replace(" ", "T"));
          const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
          
          let feeMessage = '';
          if (cancellationFee > 0) {
              feeMessage = `<br><p><em>Notice: As per our policy, a no-show fee of ${formatCurrency(cancellationFee, salon?.currency)} has been applied to your account.</em></p>`;
          }

          await sendNotification({
              userId: client.id,
              email: client.email,
              type: 'email',
              title: 'Missed Appointment',
              message: `
                <p>Hi ${client.first_name || 'there'},</p>
                <p>We missed you at <strong>${salon?.name || 'the salon'}</strong> for your appointment on ${formattedDate}.</p>
                <p>Since the time has elapsed without a check-in, your booking has been marked as a No-Show.</p>
                ${feeMessage}
                <p>Please contact the salon if you believe this is an error.</p>
              `,
              data: { bookingId: id, status: 'no_show', event: 'no_show_alert' }
          });
      }

      processed.push(id);
    }

    return successResponse({
      message: 'Time-Elapsed No-Show processing complete.',
      processedIds: processed
    });

  } catch (error) {
    console.error('Error processing elapsed no-shows:', error);
    return errorResponse('Failed to run elapsed no-shows cron', 500);
  }
}