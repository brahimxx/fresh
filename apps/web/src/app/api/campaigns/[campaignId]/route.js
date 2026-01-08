import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// Helper to check campaign access
async function checkCampaignAccess(campaignId, userId, role) {
  const campaign = await getOne(
    'SELECT c.*, s.owner_id FROM campaigns c JOIN salons s ON s.id = c.salon_id WHERE c.id = ?',
    [campaignId]
  );
  if (!campaign) return { access: false, campaign: null };
  if (role === 'admin') return { access: true, campaign };
  if (campaign.owner_id === userId) return { access: true, campaign };
  return { access: false, campaign: null };
}

// GET /api/campaigns/[campaignId] - Get campaign details
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { campaignId } = await params;

    const { access, campaign } = await checkCampaignAccess(campaignId, session.userId, session.role);
    if (!access || !campaign) {
      return notFound('Campaign not found');
    }

    return success({
      id: campaign.id,
      salonId: campaign.salon_id,
      name: campaign.name,
      type: campaign.type,
      subject: campaign.subject,
      content: campaign.content,
      targetAudience: campaign.target_audience,
      status: campaign.status,
      scheduledAt: campaign.scheduled_at,
      sentAt: campaign.sent_at,
      recipientCount: campaign.recipient_count,
      openCount: campaign.open_count,
      clickCount: campaign.click_count,
      createdAt: campaign.created_at,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get campaign error:', err);
    return error('Failed to get campaign', 500);
  }
}

// PUT /api/campaigns/[campaignId] - Update campaign
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { campaignId } = await params;

    const { access, campaign } = await checkCampaignAccess(campaignId, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to update this campaign');
    }

    if (campaign.status === 'completed') {
      return error('Cannot update a completed campaign');
    }

    const body = await request.json();
    const { name, subject, content, targetAudience, scheduledAt } = body;

    await query(
      `UPDATE campaigns SET
        name = COALESCE(?, name),
        subject = COALESCE(?, subject),
        content = COALESCE(?, content),
        target_audience = COALESCE(?, target_audience),
        scheduled_at = COALESCE(?, scheduled_at)
       WHERE id = ?`,
      [name, subject, content, targetAudience, scheduledAt, campaignId]
    );

    return success({ message: 'Campaign updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update campaign error:', err);
    return error('Failed to update campaign', 500);
  }
}

// DELETE /api/campaigns/[campaignId] - Delete campaign
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { campaignId } = await params;

    const { access, campaign } = await checkCampaignAccess(campaignId, session.userId, session.role);
    if (!access) {
      return forbidden('Not authorized to delete this campaign');
    }

    if (campaign.status === 'active') {
      return error('Cannot delete an active campaign');
    }

    await query('DELETE FROM campaigns WHERE id = ?', [campaignId]);

    return success({ message: 'Campaign deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete campaign error:', err);
    return error('Failed to delete campaign', 500);
  }
}
