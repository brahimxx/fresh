import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// POST /api/waitlist/[waitlistId]/notify - Notify client of available slot
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { waitlistId } = await params;

    const entry = await getOne(
      `SELECT w.*, s.owner_id, s.name as salon_name, u.email, u.first_name
       FROM waitlist w 
       JOIN salons s ON s.id = w.salon_id 
       JOIN users u ON u.id = w.client_id
       WHERE w.id = ?`,
      [waitlistId]
    );

    if (!entry) {
      return notFound('Waitlist entry not found');
    }

    if (session.role !== 'admin' && entry.owner_id !== session.userId) {
      return forbidden('Not authorized to notify this client');
    }

    if (entry.status !== 'pending') {
      return error('Can only notify pending waitlist entries');
    }

    const body = await request.json();
    const { message, availableSlot } = body;

    // Update waitlist entry status
    await query("UPDATE waitlist SET status = 'notified', notified_at = NOW() WHERE id = ?", [waitlistId]);

    // Create notification for the client
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data, created_at)
       VALUES (?, 'waitlist', 'Slot Available!', ?, ?, NOW())`,
      [
        entry.client_id,
        message || `Great news! A slot is now available at ${entry.salon_name}. Book now before it's taken!`,
        JSON.stringify({ waitlistId, availableSlot }),
      ]
    );

    // In a real implementation, you would also send an email/SMS here

    return success({
      message: 'Client notified successfully',
      clientEmail: entry.email,
      clientName: entry.first_name,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Notify waitlist error:', err);
    return error('Failed to notify client', 500);
  }
}
