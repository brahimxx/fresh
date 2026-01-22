import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// GET /api/users/[id] - Get user by ID
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Strict ID validation to prevent type confusion attacks
    const userId = Number(id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return error('Invalid user ID', 400);
    }

    // Users can only view their own profile unless admin
    if (session.userId !== userId && session.role !== 'admin') {
      return forbidden('You can only view your own profile');
    }

    const user = await getOne(
      'SELECT id, email, phone, first_name, last_name, role, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return notFound('User not found');
    }

    return success({
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get user error:', err);
    return error('Failed to get user', 500);
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Strict ID validation to prevent type confusion attacks
    const userId = Number(id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return error('Invalid user ID', 400);
    }

    // Users can only update their own profile unless admin
    if (session.userId !== userId && session.role !== 'admin') {
      return forbidden('You can only update your own profile');
    }

    const body = await request.json();
    const { phone, firstName, lastName } = body;

    await query(
      `UPDATE users SET phone = ?, first_name = ?, last_name = ?, updated_at = NOW() WHERE id = ?`,
      [phone || null, firstName, lastName, id]
    );

    const user = await getOne(
      'SELECT id, email, phone, first_name, last_name, role, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    return success({
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update user error:', err);
    return error('Failed to update user', 500);
  }
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Strict ID validation to prevent type confusion attacks
    const userId = Number(id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return error('Invalid user ID', 400);
    }

    // Only admins can delete users, or users can delete themselves
    if (session.userId !== userId && session.role !== 'admin') {
      return forbidden('Not authorized to delete this user');
    }

    await query('DELETE FROM users WHERE id = ?', [id]);

    return success({ message: 'User deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete user error:', err);
    return error('Failed to delete user', 500);
  }
}
