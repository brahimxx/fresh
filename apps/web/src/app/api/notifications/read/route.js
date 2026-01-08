import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/response';

// POST /api/notifications/read - Mark notifications as read
export async function POST(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { notificationIds } = body;

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      // Mark all as read
      await query(
        'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
        [session.userId]
      );
      return success({ message: 'All notifications marked as read' });
    }

    // Mark specific notifications as read
    await query(
      `UPDATE notifications SET is_read = 1 WHERE id IN (${notificationIds.map(() => '?').join(',')}) AND user_id = ?`,
      [...notificationIds, session.userId]
    );

    return success({
      message: `${notificationIds.length} notifications marked as read`,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Mark notifications read error:', err);
    return error('Failed to mark notifications as read', 500);
  }
}
