import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden, notFound } from '@/lib/response';

// PATCH /api/admin/reviews/[reviewId] - Moderate review
export async function PATCH(request, { params }) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const { reviewId } = await params;
    const body = await request.json();
    const { status, moderationNote } = body;

    if (!status || !['approved', 'flagged', 'removed'].includes(status)) {
      return error('Valid status is required');
    }

    await query(
      `UPDATE reviews SET 
        status = ?,
        moderation_note = ?,
        moderated_by = ?,
        moderated_at = NOW()
       WHERE id = ?`,
      [status, moderationNote || null, session.userId, reviewId]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data) VALUES (?, ?, ?, ?, ?)`,
      [
        session.userId,
        'moderate_review',
        'review',
        reviewId,
        JSON.stringify({ status, moderation_note: moderationNote || null })
      ]
    );

    return success({ message: 'Review moderated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Moderate review error:', err);
    return error('Failed to moderate review', 500);
  }
}

// DELETE /api/admin/reviews/[reviewId] - Delete review
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const { reviewId } = await params;

    await query('DELETE FROM reviews WHERE id = ?', [reviewId]);

    return success({ message: 'Review deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete review error:', err);
    return error('Failed to delete review', 500);
  }
}
