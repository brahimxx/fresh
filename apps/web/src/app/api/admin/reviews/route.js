import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/admin/reviews - Get all reviews (admin moderation)
export async function GET(request) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, flagged, removed
    const minRating = searchParams.get('minRating');
    const maxRating = searchParams.get('maxRating');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT r.*, 
        s.name as salon_name,
        u.first_name, u.last_name, u.email as client_email
      FROM reviews r
      JOIN salons s ON s.id = r.salon_id
      JOIN users u ON u.id = r.client_id
      WHERE 1=1
    `;
    const sqlParams = [];

    if (status) {
      sql += ' AND r.status = ?';
      sqlParams.push(status);
    }

    if (minRating) {
      sql += ' AND r.rating >= ?';
      sqlParams.push(parseInt(minRating));
    }

    if (maxRating) {
      sql += ' AND r.rating <= ?';
      sqlParams.push(parseInt(maxRating));
    }

    // Get total
    const countSql = sql.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await query(countSql, sqlParams);

    sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const reviews = await query(sql, sqlParams);

    return success({
      reviews: reviews.map((r) => ({
        id: r.id,
        salonId: r.salon_id,
        salonName: r.salon_name,
        clientId: r.client_id,
        clientName: r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : 'Unknown Client',
        clientEmail: r.client_email || null,
        rating: r.rating,
        comment: r.comment,
        status: r.status || 'approved',
        createdAt: r.created_at,
      })),
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Admin get reviews error:', err);
    return error('Failed to get reviews', 500);
  }
}
