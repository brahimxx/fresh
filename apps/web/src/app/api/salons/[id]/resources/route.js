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

// GET /api/salons/[id]/resources - Get salon resources (rooms, equipment)
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to view resources');
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // room, chair, equipment
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let sql = 'SELECT * FROM resources WHERE salon_id = ?';
    const sqlParams = [id];

    if (type) {
      sql += ' AND type = ?';
      sqlParams.push(type);
    }

    if (!includeInactive) {
      sql += ' AND is_active = 1';
    }

    sql += ' ORDER BY name';

    const resources = await query(sql, sqlParams);

    return success({
      resources: resources.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        description: r.description,
        capacity: r.capacity,
        isActive: r.is_active,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get resources error:', err);
    return error('Failed to get resources', 500);
  }
}

// POST /api/salons/[id]/resources - Create resource
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to create resources');
    }

    const body = await request.json();
    const { name, type, description, capacity = 1, isActive = true } = body;

    if (!name || !type) {
      return error('Name and type are required');
    }

    if (!['room', 'chair', 'equipment'].includes(type)) {
      return error('Invalid resource type');
    }

    const result = await query(
      `INSERT INTO resources (salon_id, name, type, description, capacity, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id, name, type, description || null, capacity, isActive]
    );

    return created({
      id: result.insertId,
      name,
      type,
      description,
      capacity,
      isActive,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create resource error:', err);
    return error('Failed to create resource', 500);
  }
}
