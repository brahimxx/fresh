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

// POST /api/clients - Create a walk-in client
export async function POST(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { salonId, firstName, lastName, email, phone } = body;

    if (!salonId || !firstName || !lastName) {
      return error('Salon ID, first name, and last name are required');
    }

    const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to create clients for this salon');
    }

    // Check if user exists by email
    let userId;
    if (email) {
      const existingUser = await getOne('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser) {
        userId = existingUser.id;
      }
    }

    // Create new user if not exists
    if (!userId) {
      const result = await query(
        `INSERT INTO users (email, phone, first_name, last_name, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'client', NOW(), NOW())`,
        [email || null, phone || null, firstName, lastName]
      );
      userId = result.insertId;
    }

    // Add to salon_clients
    const existingClient = await getOne(
      'SELECT * FROM salon_clients WHERE salon_id = ? AND client_id = ?',
      [salonId, userId]
    );

    if (!existingClient) {
      await query(
        'INSERT INTO salon_clients (salon_id, client_id, first_visit_date, last_visit_date, total_visits) VALUES (?, ?, NOW(), NOW(), 0)',
        [salonId, userId]
      );
    }

    return created({
      id: userId,
      firstName,
      lastName,
      email,
      phone,
      salonId,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create client error:', err);
    return error('Failed to create client', 500);
  }
}

// GET /api/clients - List clients (for specific salon)
export async function GET(request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const salonId = searchParams.get('salon_id') || searchParams.get('salonId');
    
    if (!salonId) {
      return error('Salon ID is required');
    }

    const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to view clients');
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT sc.*, u.first_name, u.last_name, u.email, u.phone
      FROM salon_clients sc
      JOIN users u ON u.id = sc.client_id
      WHERE sc.salon_id = ?
    `;
    const params = [salonId];

    if (search) {
      sql += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY sc.last_visit_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const clients = await query(sql, params);

    const [{ total }] = await query(
      'SELECT COUNT(*) as total FROM salon_clients WHERE salon_id = ?',
      [salonId]
    );

    return success({
      clients: clients.map((c) => ({
        id: c.client_id,
        firstName: c.first_name,
        lastName: c.last_name,
        email: c.email,
        phone: c.phone,
        firstVisitDate: c.first_visit_date,
        lastVisitDate: c.last_visit_date,
        totalVisits: c.total_visits,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('List clients error:', err);
    return error('Failed to list clients', 500);
  }
}
