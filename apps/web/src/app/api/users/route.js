import { query } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/users - List all users (admin only)
export async function GET(request) {
  try {
    await requireRole(['admin']);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role');
    const offset = (page - 1) * limit;

    let sql = 'SELECT id, email, phone, first_name, last_name, role, created_at FROM users';
    const params = [];

    if (role) {
      sql += ' WHERE role = ?';
      params.push(role);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const users = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM users';
    const countParams = [];
    if (role) {
      countSql += ' WHERE role = ?';
      countParams.push(role);
    }
    const [{ total }] = await query(countSql, countParams);

    return success({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at,
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
    if (err.message === 'Forbidden') return forbidden();
    console.error('List users error:', err);
    return error('Failed to list users', 500);
  }
}
