import { query, getOne } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { success, error } from '@/lib/response';
import crypto from 'crypto';

// POST /api/auth/reset-password - Reset password with token
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return error('Token and new password are required');
    }

    if (newPassword.length < 8) {
      return error('Password must be at least 8 characters');
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await getOne(
      `SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()`,
      [tokenHash]
    );

    if (!user) {
      return error('Invalid or expired reset token', 400);
    }

    // Hash new password and update
    const passwordHash = await hashPassword(newPassword);

    await query(
      `UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?`,
      [passwordHash, user.id]
    );

    return success({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    return error('Failed to reset password', 500);
  }
}
