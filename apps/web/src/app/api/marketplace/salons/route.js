import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { error } from '@/lib/response';

// GET /api/marketplace/salons
// Query params: q, city, location, categories, price_level, minRating, openNow, sort, limit, offset
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const q           = searchParams.get('q') || '';
    const city        = searchParams.get('city') || '';
    const location    = searchParams.get('location') || '';
    const categories  = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    const maxPrice    = parseInt(searchParams.get('price_level')) || 0;
    const minRating   = parseFloat(searchParams.get('minRating')) || 0;
    const openNow     = searchParams.get('openNow') === 'true';
    const sort        = searchParams.get('sort') || 'recommended';
    const limit       = Math.max(1, Math.min(100, parseInt(searchParams.get('limit')) || 20));
    const offset      = Math.max(0, parseInt(searchParams.get('offset')) || 0);
    
    // Bounds for map
    const minLat = parseFloat(searchParams.get('minLat'));
    const maxLat = parseFloat(searchParams.get('maxLat'));
    const minLng = parseFloat(searchParams.get('minLng'));
    const maxLng = parseFloat(searchParams.get('maxLng'));

    // ── Base query ──────────────────────────────────────────────────────────
    // Safety gates are hardcoded — cannot be bypassed via query params.
    // Services preview is inlined via GROUP_CONCAT to avoid N+1.
    let sql = `
      SELECT
        s.id, s.name, s.description, s.logo_url, s.cover_image_url,
        s.address, s.city, s.state, s.postal_code,
        s.phone, s.website, s.price_level, s.category,
        s.latitude, s.longitude,
        AVG(r.rating)        AS rating,
        COUNT(DISTINCT r.id) AS review_count,
        svc.services_preview
      FROM salons s
      LEFT JOIN reviews r ON r.salon_id = s.id AND r.status = 'approved'
      LEFT JOIN (
        SELECT salon_id,
          GROUP_CONCAT(name ORDER BY name SEPARATOR ', ') AS services_preview
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

    // ── Optional filters ────────────────────────────────────────────────────

    if (q) {
      sql += ` AND (s.name LIKE ? OR s.description LIKE ? OR EXISTS (
        SELECT 1 FROM services sv
        WHERE sv.salon_id = s.id AND sv.name LIKE ? AND sv.is_active = 1 AND sv.deleted_at IS NULL
      ))`;
      const term = '%' + q + '%';
      params.push(term, term, term);
    }

    if (city) {
      sql += ` AND s.city = ?`;
      params.push(city);
    }

    if (location && location !== 'Map area') {
      sql += ` AND (s.city LIKE ? OR s.state LIKE ? OR s.postal_code LIKE ?)`;
      const term = '%' + location + '%';
      params.push(term, term, term);
    }
    
    // Geographical bounds filter
    if (!isNaN(minLat) && !isNaN(maxLat) && !isNaN(minLng) && !isNaN(maxLng)) {
      sql += ` AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL 
               AND s.latitude >= ? AND s.latitude <= ? 
               AND s.longitude >= ? AND s.longitude <= ?`;
      params.push(minLat, maxLat, minLng, maxLng);
    }

    if (categories.length > 0) {
      sql += ` AND s.category IN (${categories.map(() => '?').join(',')})`;
      params.push(...categories);
    }

    if (maxPrice > 0) {
      sql += ` AND s.price_level <= ?`;
      params.push(maxPrice);
    }

    // openNow: filter salons open at the current server time
    if (openNow) {
      const now = new Date();
      // day_of_week: 0=Sunday … 6=Saturday (matches JS Date.getDay())
      const dayOfWeek  = now.getDay();
      const timeString = now.toTimeString().slice(0, 8); // 'HH:MM:SS'
      sql += ` AND EXISTS (
        SELECT 1 FROM business_hours bh
        WHERE bh.salon_id = s.id
          AND bh.day_of_week = ?
          AND bh.is_closed = 0
          AND bh.open_time  <= ?
          AND bh.close_time >  ?
      )`;
      params.push(dayOfWeek, timeString, timeString);
    }

    sql += ` GROUP BY s.id`;

    if (minRating > 0) {
      sql += ` HAVING AVG(r.rating) >= ?`;
      params.push(minRating);
    }

    // ── Sorting ─────────────────────────────────────────────────────────────
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
        // Weighted score: rating carries 70 %, review volume (capped at 100) carries 30 %
        sql += ` ORDER BY (COALESCE(AVG(r.rating), 0) * 0.7 + LEAST(COUNT(DISTINCT r.id), 100) * 0.3) DESC`;
    }

    // ── Pagination ───────────────────────────────────────────────────────────
    // Run count query first (same filters, no ORDER BY / LIMIT)
    const countSql    = `SELECT COUNT(*) AS total FROM (${sql}) AS _sub`;
    const countParams = [...params];

    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [countRows, salons] = await Promise.all([
      query(countSql, countParams),
      query(sql, params),
    ]);

    const total = parseInt(countRows[0]?.total) || 0;

    // ── Shape response ───────────────────────────────────────────────────────
    const results = salons.map(salon => ({
      id:               salon.id,
      name:             salon.name,
      description:      salon.description,
      logo_url:         salon.logo_url,
      cover_image_url:  salon.cover_image_url,
      address:          salon.address,
      city:             salon.city,
      state:            salon.state,
      postal_code:      salon.postal_code,
      phone:            salon.phone,
      website:          salon.website,
      price_level:      salon.price_level,
      category:         salon.category,
      latitude:         salon.latitude ? parseFloat(salon.latitude) : null,
      longitude:        salon.longitude ? parseFloat(salon.longitude) : null,
      rating:           salon.rating ? parseFloat(parseFloat(salon.rating).toFixed(1)) : null,
      review_count:     parseInt(salon.review_count) || 0,
      services_preview: salon.services_preview
        ? salon.services_preview.split(', ').slice(0, 5)
        : [],
    }));

    return NextResponse.json({
      success: true,
      data:    results,
      total,
      limit,
      offset,
      hasMore: offset + results.length < total,
    });

  } catch (err) {
    console.error('Marketplace salons error:', err);
    return error('Failed to load salons', 500);
  }
}
