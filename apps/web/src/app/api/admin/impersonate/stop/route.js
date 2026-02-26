import { getSession, createToken } from '@/lib/auth';
import { query, getOne } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/response';
import { cookies } from 'next/headers';

export async function POST(request) {
    try {
        const session = await getSession(request);

        // We only allow this action if the session explicitly has the impersonatorAdminId flag
        if (!session || !session.impersonatorAdminId) {
            return unauthorized('No active impersonation session found');
        }

        const adminId = session.impersonatorAdminId;
        const targetUserId = session.userId;

        // Verify the original admin still exists
        const adminUser = await getOne('SELECT id, role, email FROM users WHERE id = ?', [adminId]);
        if (!adminUser || adminUser.role !== 'admin') {
            return error({ message: 'Admin account verification failed' }, 403);
        }

        // Log the stop action in audit_logs
        await query(`
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data)
            VALUES (?, ?, ?, ?, ?)
        `, [
            adminId,
            'impersonate_stop',
            'user',
            targetUserId,
            JSON.stringify({ stoppedImpersonating: targetUserId })
        ]);

        // Regenerate the original admin token
        const originalPayload = {
            userId: adminUser.id,
            role: adminUser.role,
        };

        const token = await createToken(originalPayload);

        // Reset the cookie back to the admin token
        const cookieStore = await cookies();
        cookieStore.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        return success({ message: 'Successfully reverted to admin session' });
    } catch (err) {
        console.error('Impersonation Stop Error:', err);
        return error({ message: 'Failed to stop impersonation' }, 500);
    }
}
