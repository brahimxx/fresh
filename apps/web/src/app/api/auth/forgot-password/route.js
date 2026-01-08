import { getOne } from '@/lib/db';
import { success, error } from '@/lib/response';
import crypto from 'crypto';
import { query } from '@/lib/db';

// POST /api/auth/forgot-password - Request password reset
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return error('Email is required');
    }

    const user = await getOne('SELECT id, email, first_name FROM users WHERE email = ?', [email]);

    // Always return success to prevent email enumeration
    if (!user) {
      return success({ message: 'If an account exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await query(
      `UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?`,
      [resetTokenHash, expiresAt, user.id]
    );

    // In production, send email here
    // For now, we'll just return the token (remove in production!)
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

    // TODO: Send email with resetUrl
    console.log('Password reset URL:', resetUrl);

    return success({
      message: 'If an account exists, a reset link has been sent',
      // Remove this in production - only for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return error('Failed to process request', 500);
  }
}
