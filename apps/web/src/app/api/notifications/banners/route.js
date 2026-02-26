import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/response';

export async function GET(request) {
    try {
        const session = await requireAuth();

        const banners = await query(`
            SELECT id, title, message, type, sent_at
            FROM notifications
            WHERE user_id = ? AND is_system_banner = 1 AND is_read = 0
            ORDER BY sent_at DESC
        `, [session.userId]);

        return success(banners);
    } catch (err) {
        if (err.message === 'Unauthorized') return unauthorized();
        console.error('Banners API Error:', err);
        return error('Failed to fetch system banners', 500);
    }
}
