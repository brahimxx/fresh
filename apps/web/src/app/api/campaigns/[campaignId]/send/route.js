import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// POST /api/campaigns/[campaignId]/send - Send campaign immediately
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { campaignId } = await params;

    const campaign = await getOne(
      'SELECT c.*, s.owner_id FROM campaigns c JOIN salons s ON s.id = c.salon_id WHERE c.id = ?',
      [campaignId]
    );

    if (!campaign) {
      return notFound('Campaign not found');
    }

    if (session.role !== 'admin' && campaign.owner_id !== session.userId) {
      return forbidden('Not authorized to send this campaign');
    }

    if (campaign.status === 'completed') {
      return error('Campaign has already been sent');
    }

    // Get target recipients based on audience
    let recipientQuery = 'SELECT DISTINCT u.id, u.email, u.phone FROM users u JOIN salon_clients sc ON sc.client_id = u.id WHERE sc.salon_id = ? AND sc.is_active = 1 AND u.deleted_at IS NULL';
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

    // Update campaign status
    await query(
      `UPDATE campaigns SET status = 'active', sent_at = NOW(), recipient_count = ? WHERE id = ?`,
      [recipients.length, campaignId]
    );

    // In a real implementation, you would queue the actual sending here
    // For now, we just simulate it by marking as completed
    await query(`UPDATE campaigns SET status = 'completed' WHERE id = ?`, [campaignId]);

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
