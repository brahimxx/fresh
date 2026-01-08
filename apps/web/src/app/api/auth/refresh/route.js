import { getOne } from '@/lib/db';
import { verifyToken, createToken } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/response';
import { cookies } from 'next/headers';

// POST /api/auth/refresh - Refresh access token
export async function POST(request) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      // Try to get from cookie
      const cookieStore = await cookies();
      const tokenFromCookie = cookieStore.get('refreshToken')?.value;
      if (!tokenFromCookie) {
        return unauthorized('Refresh token is required');
      }
    }

    const tokenToVerify = refreshToken || (await cookies()).get('refreshToken')?.value;
    const payload = await verifyToken(tokenToVerify);

    if (!payload) {
      return unauthorized('Invalid or expired refresh token');
    }

    // Get fresh user data
    const user = await getOne(
      'SELECT id, email, role FROM users WHERE id = ?',
      [payload.userId]
    );

    if (!user) {
      return unauthorized('User not found');
    }

    // Create new tokens
    const newAccessToken = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = await createToken({
      userId: user.id,
      type: 'refresh',
    });

    // Set cookies
    const cookieStore = await cookies();
    cookieStore.set('token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    cookieStore.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return success({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    return error('Failed to refresh token', 500);
  }
}
