import { query } from '@/lib/db';
import { success, error } from '@/lib/response';

// POST /api/webhooks/sms - Handle SMS delivery status webhooks (e.g., Twilio)
export async function POST(request) {
  try {
    const body = await request.formData ? await request.formData() : await request.json();
    
    // Twilio sends form data, other providers might send JSON
    let messageStatus, messageSid;
    
    if (body instanceof FormData) {
      messageStatus = body.get('MessageStatus');
      messageSid = body.get('MessageSid');
    } else {
      messageStatus = body.status || body.MessageStatus;
      messageSid = body.sid || body.MessageSid;
    }

    console.log(`SMS Status Update: ${messageSid} -> ${messageStatus}`);

    // Update notification status if tracking SMS delivery
    // This assumes you store the SMS provider's message ID
    if (messageSid && messageStatus) {
      // Could track delivery status in a separate table
      // await query(
      //   'UPDATE sms_logs SET status = ?, updated_at = NOW() WHERE provider_message_id = ?',
      //   [messageStatus, messageSid]
      // );
    }

    // Map common SMS statuses
    const statusMapping = {
      queued: 'pending',
      sending: 'pending',
      sent: 'sent',
      delivered: 'delivered',
      undelivered: 'failed',
      failed: 'failed',
    };

    const normalizedStatus = statusMapping[messageStatus?.toLowerCase()] || messageStatus;

    return success({
      received: true,
      messageSid,
      status: normalizedStatus,
    });
  } catch (err) {
    console.error('SMS webhook error:', err);
    return error('Webhook handling failed', 500);
  }
}
