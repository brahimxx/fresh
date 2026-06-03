import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';
import { sendEmail } from '@/lib/email';

// POST /api/campaigns/[campaignId]/send - Send campaign immediately
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { campaignId } = await params;

    const campaignList = await query(
      'SELECT c.*, s.owner_id, s.name as salon_name FROM campaigns c JOIN salons s ON s.id = c.salon_id WHERE c.id = ?',
      [campaignId]
    );
    const campaign = campaignList[0];

    if (!campaign) {
      return notFound('Campaign not found');
    }

    if (session.role !== 'admin' && Number(campaign.owner_id) !== Number(session.userId)) {
      return forbidden('Not authorized to send this campaign');
    }

    if (campaign.status === 'completed') {
      return error('Campaign has already been sent');
    }

    // Get target recipients based on audience
    let recipientQuery = 'SELECT DISTINCT u.id, u.email, u.phone, u.first_name, u.last_name FROM users u JOIN salon_clients sc ON sc.client_id = u.id WHERE sc.salon_id = ? AND sc.is_active = 1 AND u.deleted_at IS NULL';
    const recipientParams = [campaign.salon_id];

    switch (campaign.target_audience) {
      case 'new':
        recipientQuery += ' AND sc.total_visits <= 1';
        break;
      case 'returning':
        recipientQuery += ' AND sc.total_visits > 1';
        break;
      case 'inactive':
        recipientQuery += ' AND (sc.last_visit_date IS NULL OR sc.last_visit_date < DATE_SUB(NOW(), INTERVAL 3 MONTH))';
        break;
    }

    const recipients = await query(recipientQuery, recipientParams);

    // Actual email dispatch logic via Resend
    if (campaign.type === 'email' && recipients.length > 0) {
      const emailPromises = recipients
        .filter(r => r.email)
        .map(recipient => {
          let htmlContent = campaign.content || '';
          
          // Replace dynamic placeholders
          htmlContent = htmlContent.replace(/{{first_name}}/g, recipient.first_name || 'Client');
          htmlContent = htmlContent.replace(/{{salon_name}}/g, campaign.salon_name || 'Our Salon');
          
          return sendEmail({
            to: recipient.email,
            subject: campaign.subject || campaign.name,
            html: htmlContent,
          });
        });
        
      await Promise.allSettled(emailPromises);
    }

    // Update campaign status and simulate completion
    await query(
      `UPDATE campaigns SET status = 'completed', completed_at = NOW(), recipient_count = ? WHERE id = ?`,
      [recipients.length, campaignId]
    );

    return success({
      message: 'Campaign sent successfully',
      recipientCount: recipients.length,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Send campaign error:', err);
    return error('Failed to send campaign', 500);
  }
}
