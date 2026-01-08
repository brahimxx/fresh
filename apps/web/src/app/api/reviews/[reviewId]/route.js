import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// GET /api/reviews/[reviewId] - Get review details
export async function GET(request, { params }) {
  try {
    const { reviewId } = await params;

    const review = await getOne(
      `SELECT r.*, u.first_name, u.last_name, s.name as salon_name
       FROM reviews r
       JOIN users u ON u.id = r.client_id
       JOIN salons s ON s.id = r.salon_id
       WHERE r.id = ?`,
      [reviewId]
    );

    if (!review) {
      return notFound('Review not found');
    }

    return success({
      id: review.id,
      salonId: review.salon_id,
      salonName: review.salon_name,
      clientName: `${review.first_name} ${review.last_name.charAt(0)}.`,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
    });
  } catch (err) {
    console.error('Get review error:', err);
    return error('Failed to get review', 500);
  }
}

// PUT /api/reviews/[reviewId] - Update review (client only)
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { reviewId } = await params;

    const review = await getOne('SELECT * FROM reviews WHERE id = ?', [reviewId]);

    if (!review) {
      return notFound('Review not found');
    }

    if (review.client_id !== session.userId && session.role !== 'admin') {
      return forbidden('You can only update your own reviews');
    }

    const body = await request.json();
    const { rating, comment } = body;

    if (rating && (rating < 1 || rating > 5)) {
      return error('Rating must be between 1 and 5');
    }

    await query(
      'UPDATE reviews SET rating = COALESCE(?, rating), comment = COALESCE(?, comment) WHERE id = ?',
      [rating, comment, reviewId]
    );

    const updatedReview = await getOne('SELECT * FROM reviews WHERE id = ?', [reviewId]);

    return success({
      id: updatedReview.id,
      rating: updatedReview.rating,
      comment: updatedReview.comment,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update review error:', err);
    return error('Failed to update review', 500);
  }
}

// DELETE /api/reviews/[reviewId] - Delete review
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { reviewId } = await params;

    const review = await getOne(
      `SELECT r.*, s.owner_id
       FROM reviews r
       JOIN salons s ON s.id = r.salon_id
       WHERE r.id = ?`,
      [reviewId]
    );

    if (!review) {
      return notFound('Review not found');
    }

    // Allow client, salon owner, or admin to delete
    if (
      review.client_id !== session.userId &&
      review.owner_id !== session.userId &&
      session.role !== 'admin'
    ) {
      return forbidden('Not authorized to delete this review');
    }

    await query('DELETE FROM reviews WHERE id = ?', [reviewId]);

    return success({ message: 'Review deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete review error:', err);
    return error('Failed to delete review', 500);
  }
}
