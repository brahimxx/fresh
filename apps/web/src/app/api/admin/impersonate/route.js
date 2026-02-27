import { getSession, createToken } from '@/lib/auth';
import { query, getOne } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/response';
import { cookies } from 'next/headers';

export async function POST(request) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized('Admin access required');
        }

        const body = await request.json();
        const { targetUserId } = body;

        if (!targetUserId) {
            return error({ message: 'Target User ID is required' }, 400);
        }

        // Verify target user exists and isn't another admin
        const targetUser = await getOne('SELECT id, role, email FROM users WHERE id = ?', [targetUserId]);
        if (!targetUser) {
            return error({ message: 'Target user not found' }, 404);
        }
        if (targetUser.role === 'admin') {
            return error({ message: 'Cannot impersonate another admin' }, 403);
        }

        // Check if the user is a manager (or staff) in the staff table
        const staffRec = await getOne(
            'SELECT id, role, salon_id FROM staff WHERE user_id = ? AND is_active = 1 LIMIT 1',
            [targetUserId]
        );

        // Log the action in audit_logs
        await query(`
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
            VALUES (?, ?, ?, ?, ?)
        `, [
            session.userId,
            'impersonate_start',
            'user',
            targetUserId,
            JSON.stringify({ targetEmail: targetUser.email, targetRole: targetUser.role })
        ]);

        // Generate impersonation token
        const impersonationPayload = {
            userId: targetUser.id,
            // If they are a manager in a salon, treat their session role as 'manager'
            role: (staffRec && staffRec.role === 'manager') ? 'manager' : targetUser.role,
            impersonatorAdminId: session.userId, // The critical flag for UI and security checks
            // Link directly to their specific staff_id rather than a generic user role
            ...(staffRec && { staffId: staffRec.id, salonId: staffRec.salon_id })
        };

        const token = await createToken(impersonationPayload);

        // Set the cookie
        const cookieStore = await cookies();
        cookieStore.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        return success({ message: `Now impersonating ${targetUser.email}` });
    } catch (err) {
        console.error('Impersonation Start Error:', err);
        return error({ message: 'Failed to impersonate user' }, 500);
    }
}
