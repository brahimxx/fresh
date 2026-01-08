import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden, notFound } from '@/lib/response';

// GET /api/admin/users/[userId] - Get user details
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const { userId } = await params;

    const user = await getOne(
      `SELECT id, email, first_name, last_name, phone, role, email_verified, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) return notFound('User not found');

    // Get user's salons if owner
    const salons = await query('SELECT id, name, city FROM salons WHERE owner_id = ?', [userId]);

    // Get booking count
    const [bookingCount] = await query('SELECT COUNT(*) as total FROM bookings WHERE client_id = ?', [userId]);

    return success({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      salons,
      bookingsCount: bookingCount.total,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Admin get user error:', err);
    return error('Failed to get user', 500);
  }
}

// PUT /api/admin/users/[userId] - Update user (admin)
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const { userId } = await params;
    const body = await request.json();
    const { role, emailVerified, isActive } = body;

    await query(
      `UPDATE users SET 
        role = COALESCE(?, role),
        email_verified = COALESCE(?, email_verified)
       WHERE id = ?`,
      [role, emailVerified, userId]
    );

    return success({ message: 'User updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Admin update user error:', err);
    return error('Failed to update user', 500);
  }
}

// DELETE /api/admin/users/[userId] - Delete user
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const { userId } = await params;

    if (parseInt(userId) === session.userId) {
      return error('Cannot delete yourself');
    }

    await query('DELETE FROM users WHERE id = ?', [userId]);

    return success({ message: 'User deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Admin delete user error:', err);
    return error('Failed to delete user', 500);
  }
}
