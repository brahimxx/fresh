import { query, getOne } from '@/lib/db';
import { success, error, notFound } from '@/lib/response';

// GET /api/marketplace/salons/[id] - Get salon public profile
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    // Get salon details
    const salon = await getOne(
      `SELECT 
        s.id, s.name, s.description, s.logo_url, s.cover_image_url,
        s.address, s.city, s.state, s.postal_code, s.country,
        s.phone, s.email, s.website, s.price_level, s.category,
        s.timezone, s.currency,
        AVG(r.rating) as rating,
        COUNT(DISTINCT r.id) as review_count
       FROM salons s
       LEFT JOIN reviews r ON r.salon_id = s.id AND r.status = 'approved'
       WHERE s.id = ? AND s.status = 'active'
       GROUP BY s.id`,
      [id]
    );
    
    if (!salon) {
      return notFound('Salon not found');
    }
    
    // Get business hours
    const businessHours = await query(
      `SELECT day_of_week, open_time, close_time, is_closed
       FROM business_hours
       WHERE salon_id = ?
       ORDER BY day_of_week`,
      [id]
    );
    
    // Get amenities if available
    const amenities = await query(
      `SELECT name FROM salon_amenities WHERE salon_id = ?`,
      [id]
    );
    
    return success({
      ...salon,
      rating: salon.rating ? parseFloat(salon.rating) : null,
      review_count: parseInt(salon.review_count) || 0,
      business_hours: businessHours,
      amenities: amenities.map(a => a.name)
    });
    
  } catch (err) {
    console.error('Get salon profile error:', err);
    return error('Failed to load salon', 500);
  }
}
