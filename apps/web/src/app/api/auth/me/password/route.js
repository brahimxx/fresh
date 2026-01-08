import { query, getOne } from '@/lib/db';
import { requireAuth, hashPassword, verifyPassword } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/response';

// PUT /api/auth/me/password - Change password
export async function PUT(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return error('Current password and new password are required');
    }

    if (newPassword.length < 8) {
      return error('New password must be at least 8 characters');
    }

    // Get user's current password hash
    const user = await getOne('SELECT password_hash FROM users WHERE id = ?', [session.userId]);

    if (!user) {
      return error('User not found', 404);
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      return error('Current password is incorrect', 401);
    }

    // Hash and update new password
    const newPasswordHash = await hashPassword(newPassword);

    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, session.userId]);

    return success({ message: 'Password changed successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Change password error:', err);
    return error('Failed to change password', 500);
  }
}
