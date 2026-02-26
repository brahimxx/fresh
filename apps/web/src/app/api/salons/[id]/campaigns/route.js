import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';
import { validate, createCampaignSchema } from '@/lib/validate';

// Helper to check salon access and fetch plan tier
async function checkSalonAccess(salonId, userId, role) {
  const salon = await getOne('SELECT owner_id, plan_tier FROM salons WHERE id = ?', [salonId]);
  if (!salon) return { hasAccess: false };

  if (role === 'admin') return { hasAccess: true, tier: salon.plan_tier };

  if (salon.owner_id === userId) return { hasAccess: true, tier: salon.plan_tier };

  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [salonId, userId]
  );
  return { hasAccess: !!staff, tier: salon.plan_tier };
}

// GET /api/salons/[id]/campaigns - Get marketing campaigns
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const access = await checkSalonAccess(id, session.userId, session.role);
    if (!access.hasAccess) {
      return forbidden('Not authorized to view campaigns');
    }
    if (access.tier === 'basic') {
      return forbidden('Marketing campaigns require a Pro or Enterprise subscription tier');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // draft, scheduled, active, completed

    let sql = 'SELECT * FROM campaigns WHERE salon_id = ?';
    const sqlParams = [id];

    if (status) {
      sql += ' AND status = ?';
      sqlParams.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const campaigns = await query(sql, sqlParams);

    return success({
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type, // email, sms, push
        subject: c.subject,
        content: c.content,
        targetAudience: c.target_audience, // all, new, returning, inactive
        status: c.status,
        scheduledAt: c.scheduled_at,
        sentAt: c.sent_at,
        recipientCount: c.recipient_count,
        openCount: c.open_count,
        clickCount: c.click_count,
        createdAt: c.created_at,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get campaigns error:', err);
    return error('Failed to get campaigns', 500);
  }
}

// POST /api/salons/[id]/campaigns - Create campaign
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: salonId } = await params;

    const access = await checkSalonAccess(salonId, session.userId, session.role);
    if (!access.hasAccess) {
      return forbidden('Not authorized to create campaigns');
    }
    if (access.tier === 'basic') {
      return forbidden('Marketing campaigns require a Pro or Enterprise subscription tier');
    }

    const body = await request.json();
    const validation = validate(createCampaignSchema, body);

    if (!validation.success) {
      return error({ code: "VALIDATION_ERROR", message: validation.errors }, 400);
    }

    const { name, type, subject, content, targetAudience } = validation.data;

    const result = await query(
      `INSERT INTO campaigns 
         (salon_id, name, type, subject, content, target_audience, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', NOW())`,
      [salonId, name, type, subject || null, content, targetAudience]
    );

    return created({
      id: result.insertId,
      salonId: Number(salonId),
      name,
      type,
      subject,
      targetAudience,
      status: 'draft'
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create campaign error:', err);
    return error('Failed to create campaign', 500);
  }
}
