import { query, getOne } from '@/lib/db';
import { error, notFound } from '@/lib/response';
import { NextResponse } from 'next/server';

// GET /api/marketplace/salons/[id] - Get salon public profile
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Single query: salon + inlined business hours (eliminates one round trip)
    const salon = await getOne(
      `SELECT 
        s.id, s.name, s.description, s.logo_url, s.cover_image_url,
        s.address, s.city, s.state, s.postal_code, s.country,
        s.phone, s.email, s.website, s.price_level, s.category,
        s.timezone, s.currency,
        AVG(r.rating) as rating,
        COUNT(DISTINCT r.id) as review_count,
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
         AND s.status = 'active'
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

    const payload = {
      success: true,
      data: {
        ...salon,
        rating: salon.rating ? parseFloat(salon.rating) : null,
        review_count: parseInt(salon.review_count) || 0,
        business_hours: typeof salon.business_hours_json === 'string'
          ? JSON.parse(salon.business_hours_json).sort((a, b) => a.day_of_week - b.day_of_week)
          : (salon.business_hours_json || []).sort((a, b) => a.day_of_week - b.day_of_week),
        business_hours_json: undefined, // strip raw field
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
