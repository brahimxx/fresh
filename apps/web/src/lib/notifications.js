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
export async function sendNotification({ userId, email, type = 'email', title, message, data = {}, attachments = [] }) {
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
          attachments: attachments.length > 0 ? attachments : undefined,
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


/**
 * Phase 4: Contextual Notifications & Mobile SMS integrations
 * Dispatches the correct email layout (Dynamic Badging, Timzones, Virtual Links, Addresses)
 * based on the hybrid fulfillment selection of exactly how they booked.
 */
export async function sendContextualBookingConfirmation({ 
  userId, 
  userEmail, 
  userName, 
  salonName, 
  services, 
  startTime, 
  fulfillmentType, 
  serviceLocationAddress, 
  virtualMeetingLink, 
  clientTimezone 
}) {
  try {
    const tz = clientTimezone || 'UTC';
    
    // Resolve the formatted time natively considering the user's timezone if provided
    const options = { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short' 
    };
    if (clientTimezone) options.timeZone = clientTimezone;
    
    const formattedDate = new Date(startTime).toLocaleString('en-US', options);
    
    let subject = `Booking Confirmed with ${salonName}`;
    let typeSpecificContent = '';
    let attachments = [];
    
    // -------------------------------------------------------------
    // VIRTUAL TEMPLATE
    // -------------------------------------------------------------
    if (fulfillmentType === 'virtual') {
      subject = `💻 Virtual ${subject}`;
      const link = virtualMeetingLink || 'The provider will send you a meeting link shortly.';
      typeSpecificContent = `
        <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #6366f1;">Virtual Appointment</h3>
          <p>Your session will be hosted online. Please keep an eye on your timezone <b>(${tz})</b>.</p>
          <a href="${link}" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Join Meeting</a>
        </div>
      `;

      // .ics Attachment Logic
      const icsData = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Fresh//Booking System//EN",
        "BEGIN:VEVENT",
        "SUMMARY:" + "Virtual Service with " + salonName,
        "DTSTART:" + new Date(startTime).toISOString().replace(/[-:]/g, '').split('.')[0] + "Z", // Basic UTC format for ICS
        "LOCATION:" + link,
        "DESCRIPTION:" + "Virtual Service Session. Connect via link.",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n");
      
      attachments.push({
        filename: 'invite.ics',
        content: Buffer.from(icsData).toString('base64'),
        type: 'text/calendar'
      });
      
    } 
    // -------------------------------------------------------------
    // MOBILE TEMPLATE
    // -------------------------------------------------------------
    else if (fulfillmentType === 'mobile') {
      subject = `🚗 Mobile ${subject}`;
      typeSpecificContent = `
        <div style="background: #fff7ed; padding: 20px; border-radius: 8px; border: 1px solid #ffedd5; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #ea580c;">Mobile Service</h3>
          <p>We are coming to you! The provider is scheduled to arrive at:</p>
          <div style="background: white; padding: 12px; border-radius: 4px; font-weight: bold; color: #333;">
            📍 ${serviceLocationAddress || 'Address on file'}
          </div>
        </div>
      `;
      
      // Dispatch mock SMS simulating "Provider is on the way" logic at booking
      // In a real system, a delayed cron job would send this 1 hour before start
      sendNotification({
        userId,
        email: userEmail, // Using email field as identifier stub for SMS fallback visually
        type: 'sms',
        title: `Mobile Service Confirmed`,
        message: `[SMS] Confirming your mobile booking with ${salonName} at ${formattedDate}. We\'ll see you at ${serviceLocationAddress}.`
      });
    } 
    // -------------------------------------------------------------
    // PHYSICAL TEMPLATE (Standard)
    // -------------------------------------------------------------
    else {
      subject = `📍 ${subject}`;
      typeSpecificContent = `
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #dcfce7; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #16a34a;">Salon Appointment</h3>
          <p>We look forward to seeing you at our location.</p>
        </div>
      `;
    }

    // HTML Skeleton
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #111;">Hello ${userName},</h2>
        <p>Your booking with <b>${salonName}</b> has been successfully secured.</p>
        
        ${typeSpecificContent}
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 100px;">When:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Services:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <ul style="margin: 0; padding-left: 20px;">
                ${services.map(s => `<li>${s.name}</li>`).join('')}
              </ul>
            </td>
          </tr>
        </table>
        
        <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
          Powered by Fresh - The modern booking platform.
        </p>
      </div>
    `;

    return await sendNotification({
      userId,
      email: userEmail,
      type: 'email',
      title: subject,
      message: htmlBody,
      data: { fulfillmentType, startTime, salonName },
      attachments
    });

  } catch (error) {
    console.error('[Notifications] Contextual Welcome Error:', error);
  }
}
