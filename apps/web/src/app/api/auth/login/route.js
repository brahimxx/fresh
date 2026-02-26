import { getOne } from '@/lib/db';
import { verifyPassword, createToken } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/response';
import { cookies } from 'next/headers';
import rateLimiter, { RateLimitPresets } from '@/lib/rate-limit';

// POST /api/auth/login - Login user
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const rateLimit = rateLimiter.check(
      `login:${email?.toLowerCase() || 'unknown'}`,
      RateLimitPresets.AUTH.maxAttempts,
      RateLimitPresets.AUTH.windowMs
    );

    if (!rateLimit.success) {
      return error(
        `Too many login attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
        429
      );
    }

    // Validation
    if (!email || !password) {
      return error({ code: 'MISSING_FIELDS', message: 'Email and password are required' }, 400);
    }

    // Find user
    const user = await getOne(
      'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return unauthorized('No account found with this email address. Please create an account or check your email.');
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return unauthorized('Incorrect password. Please try again or use "Forgot password".');
    }

    // Create token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return success({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    return error('An unexpected error occurred during login. Please try again.', 500);
  }
}
