import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// Helper to check admin access
function requireAdmin(session) {
  if (session.role !== 'admin') {
    throw new Error('Admin access required');
  }
}

// GET /api/admin/users - Get all users (admin only)
export async function GET(request) {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let sql = 'SELECT id, email, first_name, last_name, phone, role, email_verified, created_at FROM users WHERE 1=1';
    const sqlParams = [];

    if (role) {
      sql += ' AND role = ?';
      sqlParams.push(role);
    }

    if (search) {
      sql += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const searchTerm = `%${search}%`;
      sqlParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total
    const [countResult] = await query(sql.replace('SELECT id, email, first_name, last_name, phone, role, email_verified, created_at', 'SELECT COUNT(*) as total'), sqlParams);

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const users = await query(sql, sqlParams);

    return success({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        phone: u.phone,
        role: u.role,
        emailVerified: u.email_verified,
        createdAt: u.created_at,
      })),
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    if (err.message === 'Admin access required') return forbidden(err.message);
    console.error('Admin get users error:', err);
    return error('Failed to get users', 500);
  }
}
