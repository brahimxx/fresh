import { decodeId } from '@/lib/id';
import { query, getOne } from '@/lib/db';
import { error, notFound } from '@/lib/response';
import { NextResponse } from 'next/server';

// GET /api/marketplace/salons/[id] - Get salon public profile
export async function GET(request, { params }) {
  try {
    const { id: rawId } = await params;
  const id = decodeId(rawId);

    // Single query: salon + inlined business hours (eliminates one round trip)
    const salon = await getOne(
      `SELECT 
        s.id, s.name, s.description, s.logo_url, s.cover_image_url,
        s.address, s.city, s.state, s.postal_code, s.country,
        s.phone, s.email, s.website, s.price_level,
        s.timezone, s.currency,
        AVG(r.rating) as rating,
        COUNT(DISTINCT r.id) as review_count,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'category_name', sc.category_name,
              'is_primary', sc.is_primary
            )
          )
          FROM salon_categories sc
          WHERE sc.salon_id = s.id
        ) as categories_json,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'day_of_week', bh.day_of_week,
              'open_time', bh.open_time,
              'close_time', bh.close_time,
              'is_closed', bh.is_closed
            )
          )
          FROM business_hours bh
          WHERE bh.salon_id = s.id
        ) as business_hours_json
       FROM salons s
       LEFT JOIN reviews r ON r.salon_id = s.id AND r.status = 'approved'
       WHERE s.id = ? 
         AND s.is_active = 1
         AND s.deleted_at IS NULL
         AND s.is_marketplace_enabled = 1
       GROUP BY s.id`,
      [id]
    );

    if (!salon) {
      return notFound('Salon not found');
    }

    // salon_amenities table doesn't exist in schema — return empty array
    const amenities = [];

    const gallery = await query(
      `SELECT id, image_url, is_cover
       FROM salon_photos
       WHERE salon_id = ?
       ORDER BY is_cover DESC, id ASC`,
      [id]
    );

    // Check if salon has a special closure today
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
    const todayClosure = await getOne(
      'SELECT reason FROM salon_closures WHERE salon_id = ? AND date = ?',
      [id, todayStr]
    );

    // Find similar salons (same primary category and city)
    const categories = typeof salon.categories_json === 'string'
          ? JSON.parse(salon.categories_json || '[]')
          : (salon.categories_json || []);
    
    const primaryCategory = categories.find(c => c.is_primary)?.category_name || categories[0]?.category_name;
    
    let similar_salons = [];
    if (primaryCategory && salon.city) {
      similar_salons = await query(
        `SELECT s.id, s.name, s.cover_image_url, s.city, s.address, s.currency,
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(DISTINCT r.id) as review_count
         FROM salons s
         JOIN salon_categories sc ON sc.salon_id = s.id
         LEFT JOIN reviews r ON r.salon_id = s.id AND r.status = 'approved'
         WHERE s.is_active = 1
           AND s.is_marketplace_enabled = 1
           AND s.deleted_at IS NULL
           AND s.id != ?
           AND s.city = ?
           AND sc.category_name = ?
         GROUP BY s.id
         ORDER BY avg_rating DESC, review_count DESC
         LIMIT 4`,
        [id, salon.city, primaryCategory]
      );
    }

    const payload = {
      success: true,
      data: {
        ...salon,
        rating: salon.rating ? parseFloat(salon.rating) : null,
        review_count: parseInt(salon.review_count) || 0,
        categories: categories,
        categories_json: undefined,
        similar_salons: similar_salons.map(s => ({
          ...s,
          avg_rating: parseFloat(s.avg_rating).toFixed(1),
          review_count: parseInt(s.review_count) || 0
        })),
        business_hours: typeof salon.business_hours_json === 'string'
          ? JSON.parse(salon.business_hours_json).sort((a, b) => a.day_of_week - b.day_of_week)
          : (salon.business_hours_json || []).sort((a, b) => a.day_of_week - b.day_of_week),
        business_hours_json: undefined, // strip raw field
        is_closed_today: !!todayClosure,
        closure_reason: todayClosure?.reason || null,
        amenities: amenities.map(a => a.name),
        gallery: gallery.map((g, index) => ({
          image_url: g.image_url,
          display_order: index,
          is_cover: g.is_cover === 1
        }))
      }
    };

    // Allow browsers and CDN edges to cache public salon data for 60s
    const response = NextResponse.json(payload);
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return response;

  } catch (err) {
    console.error('Get salon profile error:', err);
    return error('Failed to load salon', 500);
  }
}
