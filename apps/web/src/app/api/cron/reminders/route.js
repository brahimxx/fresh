import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';

// GET /api/cron/reminders
// Can be called by Vercel Cron or any other external scheduler every hour/day.
export async function GET(request) {
  try {
    // 1. Optional auth verification if required by your hosting environment
    // For Vercel Cron, you would verify a CRON_SECRET header.
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. We want to find bookings that are happening in exactly 24 hours (or between 23-24 hrs)
    // AND haven't had a reminder sent yet.
    // We check this by seeing if a 'reminder' notification already exists for this booking ID.

    // A time window for finding bookings starting in the next 24 to 25 hours.
    // (This helps ensure if cron runs hourly, it catches the upcoming ones cleanly)
    const sql = `
      SELECT b.id as booking_id, b.start_datetime, b.client_id, u.email, u.first_name, s.name as salon_name
      FROM bookings b
      JOIN users u ON u.id = b.client_id
      JOIN salons s ON s.id = b.salon_id
      WHERE b.status = 'confirmed'
      AND b.start_datetime > NOW() + INTERVAL 23 HOUR
      AND b.start_datetime <= NOW() + INTERVAL 25 HOUR
      AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.user_id = b.client_id 
        AND n.title LIKE 'Reminder%' 
        AND JSON_EXTRACT(n.data, '$.bookingId') = b.id
      )
    `;

    const upcomingBookings = await query(sql);
    let sentCount = 0;

    // 3. Loop and send
    for (const booking of upcomingBookings) {
      const startTime = new Date(booking.start_datetime).toLocaleString();
      
      const success = await sendNotification({
        userId: booking.client_id,
        email: booking.email,
        type: 'email',
        title: `Reminder: Upcoming Appointment at ${booking.salon_name}`,
        message: `
          <p>Hi ${booking.first_name || 'there'},</p>
          <p>This is a friendly reminder that you have an appointment at <strong>${booking.salon_name}</strong>.</p>
          <p><strong>When:</strong> ${startTime}</p>
          <p>We look forward to seeing you!</p>
        `,
        data: { bookingId: booking.booking_id, type: 'reminder' }
      });

      if (success) sentCount++;
    }

    return NextResponse.json({ 
      success: true, 
      processed: sentCount,
      message: `Sent ${sentCount} reminders.` 
    });

  } catch (error) {
    console.error('[CRON Reminders Error]', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}
