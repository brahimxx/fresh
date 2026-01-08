import { query } from '@/lib/db';
import { success, error } from '@/lib/response';

// GET /api/marketplace/salons - Search and list salons
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const q = searchParams.get('q') || '';
    const location = searchParams.get('location') || '';
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    const price = searchParams.get('price')?.split(',').filter(Boolean) || [];
    const minRating = searchParams.get('minRating');
    const openNow = searchParams.get('openNow') === 'true';
    const sort = searchParams.get('sort') || 'recommended';
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = parseInt(searchParams.get('offset')) || 0;
    
    let sql = `
      SELECT 
        s.id, s.name, s.description, s.logo_url, s.cover_image_url,
        s.address, s.city, s.state, s.postal_code,
        s.phone, s.website, s.price_level, s.category,
        AVG(r.rating) as rating,
        COUNT(DISTINCT r.id) as review_count
      FROM salons s
      LEFT JOIN reviews r ON r.salon_id = s.id AND r.status = 'approved'
      WHERE s.status = 'active' AND s.is_marketplace_enabled = 1
    `;
    
    const params = [];
    
    // Search query
    if (q) {
      sql += ` AND (s.name LIKE ? OR s.description LIKE ? OR EXISTS (
        SELECT 1 FROM services sv WHERE sv.salon_id = s.id AND sv.name LIKE ?
      ))`;
      const searchTerm = '%' + q + '%';
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Location filter
    if (location) {
      sql += ` AND (s.city LIKE ? OR s.state LIKE ? OR s.postal_code LIKE ?)`;
      const locationTerm = '%' + location + '%';
      params.push(locationTerm, locationTerm, locationTerm);
    }
    
    // Category filter
    if (categories.length > 0) {
      sql += ` AND s.category IN (${categories.map(() => '?').join(',')})`;
      params.push(...categories);
    }
    
    // Price filter
    if (price.length > 0) {
      sql += ` AND s.price_level IN (${price.map(() => '?').join(',')})`;
      params.push(...price.map(p => parseInt(p)));
    }
    
    // Group by before having clause
    sql += ` GROUP BY s.id`;
    
    // Min rating filter (after group by)
    if (minRating) {
      sql += ` HAVING rating >= ?`;
      params.push(parseFloat(minRating));
    }
    
    // Sorting
    switch (sort) {
      case 'rating':
        sql += ` ORDER BY AVG(r.rating) DESC`;
        break;
      case 'reviews':
        sql += ` ORDER BY COUNT(DISTINCT r.id) DESC`;
        break;
      case 'price_low':
        sql += ` ORDER BY s.price_level ASC`;
        break;
      case 'price_high':
        sql += ` ORDER BY s.price_level DESC`;
        break;
      case 'name':
        sql += ` ORDER BY s.name ASC`;
        break;
      default:
        // Recommended: mix of rating and reviews
        sql += ` ORDER BY (COALESCE(AVG(r.rating), 0) * 0.7 + LEAST(COUNT(DISTINCT r.id), 100) * 0.3) DESC`;
    }
    
    sql += ` LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
    
    const salons = await query(sql, params);
    
    // Get service previews for each salon
    const salonsWithServices = await Promise.all(salons.map(async (salon) => {
      const services = await query(
        `SELECT name FROM services WHERE salon_id = ? AND is_active = 1 LIMIT 5`,
        [salon.id]
      );
      return {
        ...salon,
        rating: salon.rating ? parseFloat(salon.rating) : null,
        review_count: parseInt(salon.review_count) || 0,
        services_preview: services.map(s => s.name)
      };
    }));
    
    return success(salonsWithServices);
    
  } catch (err) {
    console.error('Marketplace salons error:', err);
    return error('Failed to load salons', 500);
  }
}
