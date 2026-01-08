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

// GET /api/salons/[id]/waitlist - Get waitlist entries
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to view waitlist');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, notified, booked, expired

    let sql = `
      SELECT w.*, u.first_name, u.last_name, u.email, u.phone, s.name as service_name
      FROM waitlist w
      JOIN users u ON u.id = w.client_id
      LEFT JOIN services s ON s.id = w.service_id
      WHERE w.salon_id = ?
    `;
    const sqlParams = [id];

    if (status) {
      sql += ' AND w.status = ?';
      sqlParams.push(status);
    }

    sql += ' ORDER BY w.created_at DESC';

    const entries = await query(sql, sqlParams);

    return success({
      waitlist: entries.map((w) => ({
        id: w.id,
        clientId: w.client_id,
        clientName: `${w.first_name} ${w.last_name}`,
        email: w.email,
        phone: w.phone,
        serviceId: w.service_id,
        serviceName: w.service_name,
        preferredDate: w.preferred_date,
        preferredTimeStart: w.preferred_time_start,
        preferredTimeEnd: w.preferred_time_end,
        status: w.status,
        notes: w.notes,
        createdAt: w.created_at,
        notifiedAt: w.notified_at,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get waitlist error:', err);
    return error('Failed to get waitlist', 500);
  }
}

// POST /api/salons/[id]/waitlist - Add to waitlist
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const { serviceId, preferredDate, preferredTimeStart, preferredTimeEnd, notes } = body;

    if (!serviceId || !preferredDate) {
      return error('Service and preferred date are required');
    }

    // Check if already on waitlist for this service/date
    const existing = await getOne(
      `SELECT id FROM waitlist 
       WHERE salon_id = ? AND client_id = ? AND service_id = ? AND preferred_date = ? AND status = 'pending'`,
      [id, session.userId, serviceId, preferredDate]
    );

    if (existing) {
      return error('You are already on the waitlist for this service and date');
    }

    const result = await query(
      `INSERT INTO waitlist (
        salon_id, client_id, service_id, preferred_date, preferred_time_start,
        preferred_time_end, notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [id, session.userId, serviceId, preferredDate, preferredTimeStart || null, preferredTimeEnd || null, notes || null]
    );

    return created({
      id: result.insertId,
      message: 'Added to waitlist successfully',
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Add to waitlist error:', err);
    return error('Failed to add to waitlist', 500);
  }
}
