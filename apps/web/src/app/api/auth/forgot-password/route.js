import { getOne } from '@/lib/db';
import { success, error } from '@/lib/response';
import crypto from 'crypto';
import { query } from '@/lib/db';
import rateLimiter, { RateLimitPresets } from '@/lib/rate-limit';
import { sendNotification } from '@/lib/notifications';

// POST /api/auth/forgot-password - Request password reset
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = rateLimiter.check(
      `forgot-password:${ip}`,
      RateLimitPresets.PASSWORD_RESET.maxAttempts,
      RateLimitPresets.PASSWORD_RESET.windowMs
    );

    if (!rateLimit.success) {
      return error(
        `Too many password reset attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
        429
      );
    }

    if (!email) {
      return error({ code: 'MISSING_EMAIL', message: 'Email is required' });
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    await sendNotification({
      userId: user.id,
      email: user.email,
      type: 'email',
      title: 'Password Reset Request',
      message: `
        <p>Hi ${user.first_name || 'there'},</p>
        <p>You recently requested a password reset for your account. Click the link below to reset it:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <p>This link is valid for 1 hour.</p>
      `,
    });

    // Only log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Password reset URL:', resetUrl);
    }

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
