import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/response';

// GET /api/my/reviews - Get the current client's reviews
export async function GET(request) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Count total
    const [countResult] = await query(
      `SELECT COUNT(*) as total
       FROM reviews r
       WHERE r.client_id = ? AND r.deleted_at IS NULL`,
      [session.userId]
    );
    const total = countResult.total;

    // Fetch reviews joined with salon info
    const reviews = await query(
      `SELECT r.id, r.salon_id, r.rating, r.comment, r.status,
              r.booking_id, r.owner_reply, r.owner_reply_at,
              r.created_at,
              s.name AS salon_name, s.city AS salon_city
       FROM reviews r
       JOIN salons s ON s.id = r.salon_id AND s.deleted_at IS NULL
       WHERE r.client_id = ? AND r.deleted_at IS NULL
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [session.userId, limit, offset]
    );

    return success({
      reviews: reviews.map((r) => ({
        id: r.id,
        salonId: r.salon_id,
        salonName: r.salon_name,
        salonCity: r.salon_city,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        bookingId: r.booking_id,
        ownerReply: r.owner_reply,
        ownerReplyAt: r.owner_reply_at,
        createdAt: r.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get my reviews error:', err);
    return error('Failed to get reviews', 500);
  }
}
