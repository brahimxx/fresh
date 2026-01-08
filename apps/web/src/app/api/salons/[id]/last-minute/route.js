import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  if (salon && salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// GET /api/salons/[id]/last-minute - Get last minute slots/offers
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Get last minute slots (available soon with discounts)
    const slots = await query(
      `SELECT lms.*, s.name as service_name, st.id as staff_id, u.first_name, u.last_name
       FROM last_minute_slots lms
       JOIN services s ON s.id = lms.service_id
       JOIN staff st ON st.id = lms.staff_id
       JOIN users u ON u.id = st.user_id
       WHERE lms.salon_id = ? AND DATE(lms.start_time) = ? AND lms.is_booked = 0
       AND lms.start_time > NOW()
       ORDER BY lms.start_time`,
      [id, date]
    );

    return success({
      slots: slots.map((slot) => ({
        id: slot.id,
        serviceId: slot.service_id,
        serviceName: slot.service_name,
        staffId: slot.staff_id,
        staffName: `${slot.first_name} ${slot.last_name}`,
        startTime: slot.start_time,
        originalPrice: parseFloat(slot.original_price),
        discountedPrice: parseFloat(slot.discounted_price),
        discountPercent: slot.discount_percent,
      })),
    });
  } catch (err) {
    console.error('Get last minute slots error:', err);
    return error('Failed to get last minute slots', 500);
  }
}

// POST /api/salons/[id]/last-minute - Create last minute offer
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to create last minute offers');
    }

    const body = await request.json();
    const { serviceId, staffId, startTime, originalPrice, discountPercent } = body;

    if (!serviceId || !staffId || !startTime || !originalPrice || !discountPercent) {
      return error('All fields are required');
    }

    const discountedPrice = originalPrice * (1 - discountPercent / 100);

    const result = await query(
      `INSERT INTO last_minute_slots (
        salon_id, service_id, staff_id, start_time, original_price, 
        discounted_price, discount_percent, is_booked, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [id, serviceId, staffId, startTime, originalPrice, discountedPrice, discountPercent]
    );

    return created({
      id: result.insertId,
      discountedPrice,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create last minute slot error:', err);
    return error('Failed to create last minute offer', 500);
  }
}
