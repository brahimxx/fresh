import { query, getOne } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { success, error } from '@/lib/response';

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return error('Verification token is required', 400);
    }

    const payload = await verifyToken(token);
    
    if (!payload || payload.type !== 'email_verification' || !payload.userId) {
      return error('Invalid or expired verification token. Please request a new one.', 401);
    }

    const user = await getOne('SELECT id, email_verified, email FROM users WHERE id = ?', [payload.userId]);

    if (!user) {
      return error('User no longer exists', 404);
    }

    if (user.email_verified) {
      return success({ message: 'Email is already verified', email: user.email });
    }

    await query('UPDATE users SET email_verified = 1, updated_at = NOW() WHERE id = ?', [payload.userId]);

    return success({ message: 'Email verified successfully', email: user.email });
  } catch (err) {
    console.error('Verify email error:', err);
    return error('An error occurred verifying your email', 500);
  }
}
