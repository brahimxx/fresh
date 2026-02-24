import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';

// GET /api/notifications - Get user notifications
export async function GET(request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [session.userId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY sent_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const notifications = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    const countParams = [session.userId];
    if (type) {
      countSql += ' AND type = ?';
      countParams.push(type);
    }
    const [{ total }] = await query(countSql, countParams);

    // Get unread count
    const [{ unread }] = await query(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [session.userId]
    );

    return success({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: !!n.is_read,
        sentAt: n.sent_at,
      })),
      unreadCount: unread,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get notifications error:', err);
    return error('Failed to get notifications', 500);
  }
}

// POST /api/notifications - Create a notification (system/admin use)
export async function POST(request) {
  try {
    const session = await requireAuth();

    // Only admins or system can create notifications
    if (session.role !== 'admin') {
      return forbidden('Not authorized to create notifications');
    }

    const body = await request.json();
    const { userId, type, title, message } = body;

    if (!userId || !type || !title || !message) {
      return error('User ID, type, title, and message are required');
    }

    if (!['email', 'sms', 'push'].includes(type)) {
      return error('Invalid notification type');
    }

    const result = await query(
      'INSERT INTO notifications (user_id, type, title, message, sent_at) VALUES (?, ?, ?, ?, NOW())',
      [userId, type, title, message]
    );

    return created({
      id: result.insertId,
      userId,
      type,
      title,
      message,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create notification error:', err);
    return error('Failed to create notification', 500);
  }
}

// DELETE /api/notifications - Delete notifications
export async function DELETE(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { notificationIds } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return error('Notification IDs are required');
    }

    // Only delete user's own notifications
    await query(
      `DELETE FROM notifications WHERE id IN (${notificationIds.map(() => '?').join(',')}) AND user_id = ?`,
      [...notificationIds, session.userId]
    );

    return success({ message: 'Notifications deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete notifications error:', err);
    return error('Failed to delete notifications', 500);
  }
}
