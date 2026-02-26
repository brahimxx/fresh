import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/response';

export async function POST(request) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized('Admin access required');
        }

        const body = await request.json();
        const { title, message, type = 'push', isSystemBanner = false } = body;

        if (!title || !message) {
            return error({ message: 'Title and message are required' }, 400);
        }

        const bannerVal = isSystemBanner ? 1 : 0;

        // Fetch all target user IDs (owners and staff)
        const targetUsers = await query(`
            SELECT id FROM users 
            WHERE role IN ('owner', 'staff')
        `);

        if (targetUsers.length === 0) {
            return success({ message: 'No active target users found.' });
        }

        // Prepare bulk insert
        const values = targetUsers.map(user => [
            user.id,
            type,
            title,
            message,
            bannerVal
        ]);

        const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const flatValues = values.flat();

        await query(`
            INSERT INTO notifications (user_id, type, title, message, is_system_banner)
            VALUES ${placeholders}
        `, flatValues);

        return success({ message: `Broadcast sent to ${targetUsers.length} users.` });
    } catch (err) {
        console.error('Broadcast API Error:', err);
        return error({ message: 'Failed to send broadcast' }, 500);
    }
}
