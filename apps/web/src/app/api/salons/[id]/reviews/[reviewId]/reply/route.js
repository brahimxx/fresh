import { query, getOne, execute } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, forbidden, notFound } from '@/lib/response';
import { validate, replyReviewSchema } from '@/lib/validate';
import { checkSalonAccess } from '@/lib/permissions-server';



// PATCH /api/salons/[id]/reviews/[reviewId]/reply
export async function PATCH(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: salonId, reviewId } = await params;

    const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to reply to reviews for this salon');
    }

    // Verify Review exists and belongs to this salon
    const review = await getOne('SELECT id FROM reviews WHERE id = ? AND salon_id = ?', [reviewId, salonId]);
    if (!review) {
      return notFound('Review not found');
    }

    const body = await request.json();
    const validation = validate(replyReviewSchema, body);
    
    if (!validation.success) {
      return error({ code: "VALIDATION_ERROR", message: validation.errors }, 400);
    }

    const { reply } = validation.data;

    await query(
      `UPDATE reviews SET owner_reply = ?, owner_reply_at = NOW() WHERE id = ?`,
      [reply, reviewId]
    );

    return success({
      message: 'Review reply posted successfully',
      reviewId: Number(reviewId),
      reply
    });

  } catch (err) {
    if (err.message === 'Unauthorized') return error(err.message, 401);
    console.error('Review reply error:', err);
    return error('Failed to post reply', 500);
  }
}
