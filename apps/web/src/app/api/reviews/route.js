import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salon_id');
    const status = searchParams.get('status');
    const rating = searchParams.get('rating');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!salonId) {
      return errorResponse('Salon ID is required', 400);
    }

    // Build WHERE clause
    let whereConditions = ['r.salon_id = ?'];
    let queryParams = [parseInt(salonId)];

    if (status) {
      whereConditions.push('r.status = ?');
      queryParams.push(status);
    }

    if (rating) {
      whereConditions.push('r.rating = ?');
      queryParams.push(parseInt(rating));
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const [countResult] = await query(
      `SELECT COUNT(*) as total FROM reviews r WHERE ${whereClause}`,
      queryParams
    );

    // Get reviews
    const reviews = await query(
      `SELECT 
        r.*,
        u.first_name AS client_first_name,
        u.last_name AS client_last_name,
        u.email AS client_email,
        u.avatar_url AS client_avatar,
        s.first_name AS staff_first_name,
        s.last_name AS staff_last_name,
        srv.name AS service_name
      FROM reviews r
      LEFT JOIN users u ON r.client_id = u.id
      LEFT JOIN staff s ON r.staff_id = s.id
      LEFT JOIN services srv ON r.service_id = srv.id
      WHERE ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    return successResponse({
      reviews: reviews.map(review => ({
        id: review.id,
        salonId: review.salon_id,
        clientId: review.client_id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        status: review.status,
        moderationNote: review.moderation_note,
        moderatedBy: review.moderated_by,
        moderatedAt: review.moderated_at,
        bookingId: review.booking_id,
        ownerReply: review.owner_reply,
        ownerReplyAt: review.owner_reply_at,
        staffId: review.staff_id,
        serviceId: review.service_id,
        client: {
          firstName: review.client_first_name,
          lastName: review.client_last_name,
          email: review.client_email,
          avatar: review.client_avatar,
        },
        staff: review.staff_id ? {
          firstName: review.staff_first_name,
          lastName: review.staff_last_name,
        } : null,
        service: review.service_name,
      })),
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return errorResponse('Failed to fetch reviews', 500);
  }
}
