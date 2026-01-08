import { query } from '@/lib/db';
import { success, error } from '@/lib/response';

// GET /api/marketplace/salons/[id]/staff - Get salon's public staff profiles
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    const staff = await query(
      `SELECT 
        s.id, s.title, s.bio, s.avatar_url,
        u.first_name, u.last_name,
        AVG(r.rating) as rating,
        COUNT(DISTINCT r.id) as review_count
       FROM staff s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN reviews r ON r.staff_id = s.id AND r.status = 'approved'
       WHERE s.salon_id = ? AND s.is_active = 1 AND s.is_visible = 1
       GROUP BY s.id, s.title, s.bio, s.avatar_url, u.first_name, u.last_name
       ORDER BY u.first_name`,
      [id]
    );
    
    return success(staff.map(s => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      title: s.title,
      bio: s.bio,
      avatar_url: s.avatar_url,
      rating: s.rating ? parseFloat(s.rating) : null,
      review_count: parseInt(s.review_count) || 0
    })));
    
  } catch (err) {
    console.error('Get salon staff error:', err);
    return error('Failed to load staff', 500);
  }
}
