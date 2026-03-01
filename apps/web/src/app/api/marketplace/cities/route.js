import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { error } from '@/lib/response';

// GET /api/marketplace/cities?q=paris
// Returns distinct cities (and states) matching the query, from active salons only.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, data: [] });
    }

    const term = '%' + q + '%';

    const rows = await query(
      `SELECT DISTINCT city, state, COUNT(*) AS salon_count
       FROM salons
       WHERE is_active = 1
         AND deleted_at IS NULL
         AND status = 'active'
         AND is_marketplace_enabled = 1
         AND (city LIKE ? OR state LIKE ? OR postal_code LIKE ?)
       GROUP BY city, state
       ORDER BY salon_count DESC
       LIMIT 6`,
      [term, term, term]
    );

    const data = rows.map(r => ({
      city: r.city,
      state: r.state,
      label: [r.city, r.state].filter(Boolean).join(', '),
      salon_count: parseInt(r.salon_count) || 0,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Cities autocomplete error:', err);
    return error('Failed to load cities', 500);
  }
}
