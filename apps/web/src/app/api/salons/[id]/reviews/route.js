import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';

// GET /api/salons/[id]/reviews - Get salon reviews (public)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const reviews = await query(
      `SELECT r.*, u.first_name, u.last_name
       FROM reviews r
       JOIN users u ON u.id = r.client_id
       WHERE r.salon_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [id, limit, offset]
    );

    // Get average rating and total count
    const [stats] = await query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE salon_id = ?',
      [id]
    );

    return success({
      reviews: reviews.map((r) => ({
        id: r.id,
        clientName: `${r.first_name} ${r.last_name.charAt(0)}.`,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
      })),
      stats: {
        avgRating: stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : null,
        totalReviews: stats.total,
      },
      pagination: {
        page,
        limit,
        total: stats.total,
        totalPages: Math.ceil(stats.total / limit),
      },
    });
  } catch (err) {
    console.error('Get reviews error:', err);
    return error('Failed to get reviews', 500);
  }
}

// POST /api/salons/[id]/reviews - Create a review
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const { rating, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return error('Rating must be between 1 and 5');
    }

    // Check if client has completed a booking at this salon
    const completedBooking = await getOne(
      "SELECT id FROM bookings WHERE salon_id = ? AND client_id = ? AND status = 'completed'",
      [id, session.userId]
    );

    if (!completedBooking) {
      return forbidden('You can only review salons where you have completed a booking');
    }

    // Check if already reviewed
    const existingReview = await getOne(
      'SELECT id FROM reviews WHERE salon_id = ? AND client_id = ?',
      [id, session.userId]
    );

    if (existingReview) {
      return error('You have already reviewed this salon', 409);
    }

    const result = await query(
      'INSERT INTO reviews (salon_id, client_id, rating, comment, created_at) VALUES (?, ?, ?, ?, NOW())',
      [id, session.userId, rating, comment || null]
    );

    return created({
      id: result.insertId,
      rating,
      comment,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create review error:', err);
    return error('Failed to create review', 500);
  }
}
