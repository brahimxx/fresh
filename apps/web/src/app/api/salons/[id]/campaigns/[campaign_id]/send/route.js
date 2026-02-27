import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, forbidden, notFound } from '@/lib/response';
import { sendNotification } from '@/lib/notifications';

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  if (salon && salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// POST /api/salons/[id]/campaigns/[campaign_id]/send
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: salonId, campaign_id: campaignId } = await params;

    const hasAccess = await checkSalonAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to send campaigns');
    }

    // Load Campaign
    const campaign = await getOne(
      "SELECT * FROM campaigns WHERE id = ? AND salon_id = ?",
      [campaignId, salonId]
    );

    if (!campaign) {
      return notFound('Campaign not found');
    }

    if (campaign.status !== 'draft') {
      return error(`Cannot send a campaign in status: ${campaign.status}`, 400);
    }

    // Build the audience query
    let audienceQuery = `
      SELECT u.id as user_id, u.email, u.first_name, u.last_name 
      FROM salon_clients sc
      JOIN users u ON u.id = sc.client_id
      WHERE sc.salon_id = ? AND sc.is_active = 1 AND u.deleted_at IS NULL
    `;
    const queryParams = [salonId];

    if (campaign.target_audience === 'new') {
      audienceQuery += ' AND sc.total_visits = 1';
    } else if (campaign.target_audience === 'returning') {
      audienceQuery += ' AND sc.total_visits > 1';
    } else if (campaign.target_audience === 'inactive') {
      // Clients who haven't visited in 6 months
      audienceQuery += ' AND sc.last_visit_date < DATE_SUB(CURDATE(), INTERVAL 6 MONTH)';
    }

    const recipients = await query(audienceQuery, queryParams);

    if (recipients.length === 0) {
      return error('No recipients found matching the target audience criteria', 400);
    }

    // Set status to sending
    await query(
      "UPDATE campaigns SET status = 'sending', recipient_count = ? WHERE id = ?",
      [recipients.length, campaignId]
    );

    let sentCount = 0;

    // Dispatch emails (sequentially to simulate MVP blast without queue overhead)
    for (const recipient of recipients) {
      try {
        await sendNotification({
          userId: recipient.user_id,
          email: recipient.email,
          type: campaign.type, // 'email' by default
          title: campaign.subject || campaign.name,
          message: campaign.content,
          data: { campaignId: campaign.id }
        });
        sentCount++;
      } catch (err) {
        console.error(`Failed to send campaign ${campaignId} to user ${recipient.user_id}:`, err);
        // Continue loop to try the rest
      }
    }

    // Set status to completed
    await query(
      "UPDATE campaigns SET status = 'completed', sent_count = ?, completed_at = NOW() WHERE id = ?",
      [sentCount, campaignId]
    );

    return success({
      message: 'Campaign executed successfully',
      targetAudience: campaign.target_audience,
      recipientCount: recipients.length,
      sentCount: sentCount
    });

  } catch (err) {
    if (err.message === 'Unauthorized') return error(err.message, 401);
    console.error('Send Campaign Error:', err);
    return error('Failed to execute campaign', 500);
  }
}
