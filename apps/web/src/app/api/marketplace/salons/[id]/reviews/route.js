import { query } from '@/lib/db';
import { success, error } from '@/lib/response';

// GET /api/marketplace/salons/[id]/reviews - Get salon's public reviews
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const sort = searchParams.get('sort') || 'recent';
    
    let orderBy = 'r.created_at DESC';
    if (sort === 'highest') {
      orderBy = 'r.rating DESC, r.created_at DESC';
    } else if (sort === 'lowest') {
      orderBy = 'r.rating ASC, r.created_at DESC';
    }
    
    const reviews = await query(
      `SELECT 
        r.id, r.rating, r.comment, r.created_at,
        u.first_name as client_name,
        s.name as service_name,
        st.id as staff_id,
        CONCAT(su.first_name, ' ', su.last_name) as staff_name
       FROM reviews r
       LEFT JOIN users u ON u.id = r.client_id
       LEFT JOIN services s ON s.id = r.service_id
       LEFT JOIN staff st ON st.id = r.staff_id
       LEFT JOIN users su ON su.id = st.user_id
       WHERE r.salon_id = ? AND r.status = 'approved'
       ORDER BY ${orderBy}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      [id]
    );
    
    // Get rating distribution
    const distribution = await query(
      `SELECT rating, COUNT(*) as count
       FROM reviews
       WHERE salon_id = ? AND status = 'approved'
       GROUP BY rating
       ORDER BY rating DESC`,
      [id]
    );
    
    return success({
      reviews: reviews,
      distribution: distribution
    });
    
  } catch (err) {
    console.error('Get salon reviews error:', err);
    return error('Failed to load reviews', 500);
  }
}
