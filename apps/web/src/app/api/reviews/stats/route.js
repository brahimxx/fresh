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

    if (!salonId) {
      return errorResponse('Salon ID is required', 400);
    }

    // Get overall stats
    const [stats] = await query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        SUM(CASE WHEN owner_reply IS NOT NULL THEN 1 ELSE 0 END) as replied_count,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as this_month
      FROM reviews
      WHERE salon_id = ? AND status = 'approved'`,
      [parseInt(salonId)]
    );

    // Get rating distribution
    const distribution = await query(
      `SELECT 
        rating,
        COUNT(*) as count
      FROM reviews
      WHERE salon_id = ? AND status = 'approved'
      GROUP BY rating
      ORDER BY rating DESC`,
      [parseInt(salonId)]
    );

    return successResponse({
      totalReviews: stats.total_reviews || 0,
      averageRating: stats.average_rating ? parseFloat(stats.average_rating.toFixed(1)) : 0,
      repliedCount: stats.replied_count || 0,
      responseRate: stats.total_reviews > 0 
        ? Math.round((stats.replied_count / stats.total_reviews) * 100) 
        : 0,
      thisMonth: stats.this_month || 0,
      distribution: distribution.reduce((acc, item) => {
        acc[item.rating] = item.count;
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    return errorResponse('Failed to fetch review stats', 500);
  }
}
