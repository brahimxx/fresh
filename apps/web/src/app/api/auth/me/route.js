import { getOne } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { success, unauthorized } from '@/lib/response';

// GET /api/auth/me - Get current user
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorized();
    }

    const user = await getOne(
      'SELECT id, email, phone, first_name, last_name, role, country, created_at FROM users WHERE id = ?',
      [session.userId]
    );

    if (!user) {
      return unauthorized();
    }

    return success({
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      country: user.country,
      createdAt: user.created_at,
      impersonatorAdminId: session.impersonatorAdminId || null,
    });
  } catch (err) {
    console.error('Get current user error:', err);
    return unauthorized();
  }
}
