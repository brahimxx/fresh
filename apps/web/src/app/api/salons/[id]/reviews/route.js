import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';
import { validate, createReviewSchema } from '@/lib/validate';

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
    body.salonId = Number(id); // Inject salonId from URL path
    const validation = validate(createReviewSchema, body);

    if (!validation.success) {
      return error({ code: "VALIDATION_ERROR", message: validation.errors }, 400);
    }

    const { rating, comment, bookingId } = validation.data;

    // Check if client has completed a booking at this salon
    let completedBooking;
    
    if (bookingId) {
      completedBooking = await getOne(
        "SELECT id FROM bookings WHERE id = ? AND salon_id = ? AND client_id = ? AND status = 'completed'",
        [bookingId, id, session.userId]
      );
      if (!completedBooking) {
        return forbidden('The specified booking does not exist, is not completed, or belongs to another user.');
      }
    } else {
      completedBooking = await getOne(
        "SELECT id FROM bookings WHERE salon_id = ? AND client_id = ? AND status = 'completed' ORDER BY start_datetime DESC LIMIT 1",
        [id, session.userId]
      );
      if (!completedBooking) {
        return forbidden('You can only review salons where you have completed a booking.');
      }
    }

    const linkedBookingId = bookingId || completedBooking.id;

    // Check if already reviewed for this specific booking
    const existingReview = await getOne(
      'SELECT id FROM reviews WHERE salon_id = ? AND client_id = ? AND booking_id = ?',
      [id, session.userId, linkedBookingId]
    );

    if (existingReview) {
      return error('You have already reviewed this booking', 409);
    }

    const result = await query(
      'INSERT INTO reviews (salon_id, client_id, booking_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [id, session.userId, linkedBookingId, rating, comment || null]
    );

    return created({
      id: result.insertId,
      bookingId: linkedBookingId,
      rating,
      comment,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create review error:', err);
    return error('Failed to create review', 500);
  }
}
