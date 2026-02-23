import { Resend } from 'resend';
import { query } from '@/lib/db';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MOCK_NOTIFICATIONS = !RESEND_API_KEY;

// Initialize Resend if key is available
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Sends a notification and logs it to the database.
 * NEVER throws an error, ensuring it doesn't break root operations like booking creation.
 * 
 * @param {Object} params
 * @param {number} params.userId - ID of the user to notify
 * @param {string} params.email - Recipient email address
 * @param {string} params.type - Notification type ('email', 'sms', 'push')
 * @param {string} params.title - Email Subject / Notification Title
 * @param {string} params.message - The text/html body of the notification
 * @param {Object} [params.data] - Additional JSON data to store
 */
export async function sendNotification({ userId, email, type = 'email', title, message, data = {} }) {
  try {
    if (!userId) {
      console.warn('[Notifications] Attempted to send notification without userId, skipping.');
      return false;
    }

    // Insert record into DB FIRST (as pending/unread)
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, data) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, type, title, MOCK_NOTIFICATIONS ? 'MOCK: ' + message : message, JSON.stringify(data)]
    );
    const notificationId = result.insertId;

    let success = false;
    let sentAt = null;

    let resendError = null;

    if (MOCK_NOTIFICATIONS) {
      // Mock mode
      console.log('----------------------------------------------------');
      console.log(`[MOCK NOTIFICATION] To: ${email} (User ${userId})`);
      console.log(`[TITLE]: ${title}`);
      console.log(`[MESSAGE]:\n${message}`);
      console.log('----------------------------------------------------');
      success = true;
      sentAt = new Date();
    } else {
      // Real send via Resend
      if (type === 'email') {
        if (!email) throw new Error('No email address provided for email notification');

        // Fresh Platform Default From Email
        const FROM_EMAIL = process.env.FROM_EMAIL || 'Fresh <notifications@fresh.app>';
        
        const { data: resendData, error } = await resend.emails.send({
          from: FROM_EMAIL,
          to: [email],
          subject: title,
          html: message,
        });

        if (error) {
          console.error('[Notifications] Resend API Error:', error);
          resendError = error;
        } else {
          success = true;
          sentAt = new Date();
        }
      } else {
        console.warn(`[Notifications] Type '${type}' NOT IMPLEMENTED yet for real delivery.`);
        success = true;
        sentAt = new Date();
      }
    }

    // If sent successfully, update DB with sent_at
    if (success && sentAt) {
      await query(
        'UPDATE notifications SET sent_at = ? WHERE id = ?',
        [sentAt, notificationId]
      );
    }

    return { success, error: resendError };

  } catch (error) {
    // Top-level catch to guarantee no crashes bubble up to caller
    console.error('[Notifications] Fatal error sending notification:', error);
    return { success: false, error: error.message };
  }
}
