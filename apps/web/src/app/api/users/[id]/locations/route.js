import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';

// GET /api/users/[id]/locations - Get all salon locations owned by user
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Users can only view their own locations, admins can view any
    if (session.role !== 'admin' && session.userId !== parseInt(id)) {
      return forbidden('Not authorized to view these locations');
    }

    const salons = await query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM staff st WHERE st.salon_id = s.id AND st.is_active = 1) as staff_count,
        (SELECT COUNT(*) FROM bookings b WHERE b.salon_id = s.id AND DATE(b.start_datetime) = CURDATE()) as today_bookings
       FROM salons s
       WHERE s.owner_id = ?
       ORDER BY s.name`,
      [id]
    );

    return success({
      locations: salons.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        city: s.city,
        postalCode: s.postal_code,
        phone: s.phone,
        email: s.email,
        isActive: s.is_active,
        staffCount: s.staff_count,
        todayBookings: s.today_bookings,
        createdAt: s.created_at,
      })),
      totalLocations: salons.length,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get locations error:', err);
    return error('Failed to get locations', 500);
  }
}

// POST /api/users/[id]/locations - Create new location
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    if (session.role !== 'admin' && session.userId !== parseInt(id)) {
      return forbidden('Not authorized to create locations');
    }

    const body = await request.json();
    const { name, address, city, postalCode, country, phone, email, description, timezone } = body;

    if (!name || !address || !city) {
      return error('Name, address, and city are required');
    }

    const result = await query(
      `INSERT INTO salons (
        owner_id, name, address, city, postal_code, country, phone, email, 
        description, timezone, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [id, name, address, city, postalCode || null, country || null, phone || null, email || null, description || null, timezone || 'Europe/Paris']
    );

    // Create default salon settings
    await query(
      `INSERT INTO salon_settings (salon_id, currency, booking_interval_minutes, cancellation_hours)
       VALUES (?, 'EUR', 15, 24)`,
      [result.insertId]
    );

    return created({
      id: result.insertId,
      name,
      address,
      city,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create location error:', err);
    return error('Failed to create location', 500);
  }
}
