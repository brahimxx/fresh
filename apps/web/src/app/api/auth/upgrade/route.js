import { getOne, run } from '@/lib/db';
import { getSession, createToken } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';
import { cookies } from 'next/headers';

export async function POST(request) {
    try {
        const session = await getSession();

        if (!session) {
            return unauthorized('You must be logged in to upgrade your account.');
        }

        // Only allow upgrading from 'client' to 'owner'
        if (session.role !== 'client') {
            return forbidden('Your account is already a professional account or cannot be upgraded.');
        }

        // Update user role in database
        await run(
            'UPDATE users SET role = "owner" WHERE id = ?',
            [session.userId]
        );

        // Fetch updated user info
        const user = await getOne(
            'SELECT id, email, first_name, last_name, role FROM users WHERE id = ?',
            [session.userId]
        );

        // Create a new token with the updated role
        const newToken = await createToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Update cookie with new token
        const cookieStore = await cookies();
        cookieStore.set('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return success({
            message: 'Account upgraded successfully!',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
            },
            token: newToken
        });
    } catch (err) {
        console.error('Upgrade error:', err);
        return error('An unexpected error occurred during account upgrade.', 500);
    }
}
