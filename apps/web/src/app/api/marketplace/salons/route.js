import { query } from '@/lib/db';
import { success, error } from '@/lib/response';

// GET /api/marketplace/salons - Search and list salons
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q') || '';
    const city = searchParams.get('city') || '';          // exact city match
    const location = searchParams.get('location') || '';  // fuzzy city/state/postal
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    const maxPrice = parseInt(searchParams.get('price_level')) || 0;  // price_level <= ?
    const price = searchParams.get('price')?.split(',').filter(Boolean) || [];  // legacy multi-select
    const minRating = searchParams.get('minRating');
    const openNow = searchParams.get('openNow') === 'true';
    const sort = searchParams.get('sort') || 'recommended';
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit')) || 20));
    const offset = Math.max(0, parseInt(searchParams.get('offset')) || 0);

    let sql = `
      SELECT 
        s.id, s.name, s.description, s.logo_url, s.cover_image_url,
        s.address, s.city, s.state, s.postal_code,
        s.phone, s.website, s.price_level, s.category,
        AVG(r.rating) as rating,
        COUNT(DISTINCT r.id) as review_count,
        svc.services_preview
      FROM salons s
      LEFT JOIN reviews r ON r.salon_id = s.id AND r.status = 'approved'
      LEFT JOIN (
        SELECT salon_id,
          GROUP_CONCAT(name ORDER BY name SEPARATOR ', ') as services_preview
        FROM services
        WHERE is_active = 1 AND deleted_at IS NULL
        GROUP BY salon_id
      ) svc ON svc.salon_id = s.id
      WHERE s.status = 'active'
        AND s.is_active = 1
        AND s.deleted_at IS NULL
        AND s.is_marketplace_enabled = 1
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

    // City exact match (Step 2 primary filter)
    if (city) {
      sql += ` AND s.city = ?`;
      params.push(city);
    }

    // Location fuzzy search (city/state/postal — broader fallback)
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

    // Price level filter: price_level <= ? (up to max budget)
    if (maxPrice > 0) {
      sql += ` AND s.price_level <= ?`;
      params.push(maxPrice);
    } else if (price.length > 0) {
      // Legacy multi-select fallback if price_level param not used
      const priceLevels = price.map(p => parseInt(p)).filter(p => !isNaN(p));
      if (priceLevels.length > 0) {
        sql += ` AND s.price_level IN (${priceLevels.map(() => '?').join(',')})`;
        params.push(...priceLevels);
      }
    }

    // Group by before having clause
    sql += ` GROUP BY s.id`;

    // Min rating filter (after group by - use AVG() in HAVING)
    if (minRating) {
      sql += ` HAVING AVG(r.rating) >= ?`;
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

    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const salons = await query(sql, params);

    // Service previews are now inlined via GROUP_CONCAT — no N+1 queries
    const results = salons.map(salon => ({
      ...salon,
      rating: salon.rating ? parseFloat(salon.rating) : null,
      review_count: parseInt(salon.review_count) || 0,
      services_preview: salon.services_preview
        ? salon.services_preview.split(', ').slice(0, 5)
        : []
    }));

    return success(results);

  } catch (err) {
    console.error('Marketplace salons error:', err);
    return error('Failed to load salons', 500);
  }
}
