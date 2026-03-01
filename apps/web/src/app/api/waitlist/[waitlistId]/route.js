import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// PUT /api/waitlist/[waitlistId] - Update waitlist entry
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { waitlistId } = await params;

    const entry = await getOne(
      'SELECT w.*, s.owner_id FROM waitlist w JOIN salons s ON s.id = w.salon_id WHERE w.id = ?',
      [waitlistId]
    );

    if (!entry) {
      return notFound('Waitlist entry not found');
    }

    // Check authorization (salon owner or the client)
    if (session.role !== 'admin' && entry.owner_id !== session.userId && entry.client_id !== session.userId) {
      return forbidden('Not authorized to update this entry');
    }

    const body = await request.json();
    const { status, preferredDate, preferredTimeStart, preferredTimeEnd, notes } = body;

    const updates = [];
    const values = [];

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
      if (status === 'notified') {
        updates.push('notified_at = NOW()');
      }
    }
    if (preferredDate !== undefined) {
      updates.push('preferred_date = ?');
      values.push(preferredDate);
    }
    if (preferredTimeStart !== undefined) {
      updates.push('preferred_time_start = ?');
      values.push(preferredTimeStart);
    }
    if (preferredTimeEnd !== undefined) {
      updates.push('preferred_time_end = ?');
      values.push(preferredTimeEnd);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      return error('No updates provided');
    }

    values.push(waitlistId);
    await query(`UPDATE waitlist SET ${updates.join(', ')} WHERE id = ?`, values);

    return success({ message: 'Waitlist entry updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update waitlist error:', err);
    return error('Failed to update waitlist entry', 500);
  }
}

// DELETE /api/waitlist/[waitlistId] - Remove from waitlist
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { waitlistId } = await params;

    const entry = await getOne(
      'SELECT w.*, s.owner_id FROM waitlist w JOIN salons s ON s.id = w.salon_id WHERE w.id = ?',
      [waitlistId]
    );

    if (!entry) {
      return notFound('Waitlist entry not found');
    }

    if (session.role !== 'admin' && entry.owner_id !== session.userId && entry.client_id !== session.userId) {
      return forbidden('Not authorized to delete this entry');
    }

    await query("UPDATE waitlist SET status = 'cancelled' WHERE id = ?", [waitlistId]);

    return success({ message: 'Removed from waitlist successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete waitlist error:', err);
    return error('Failed to remove from waitlist', 500);
  }
}
