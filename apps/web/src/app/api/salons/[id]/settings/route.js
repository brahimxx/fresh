import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// Helper to check if user owns the salon
async function checkSalonOwnership(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  return salon && salon.owner_id === userId;
}

// GET /api/salons/[id]/settings - Get salon settings
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const isOwner = await checkSalonOwnership(id, session.userId, session.role);
    if (!isOwner) {
      return forbidden('Not authorized to view salon settings');
    }

    const settings = await getOne('SELECT * FROM salon_settings WHERE salon_id = ?', [id]);

    if (!settings) {
      return notFound('Salon settings not found');
    }

    return success({
      salonId: settings.salon_id,
      cancellationPolicyHours: settings.cancellation_policy_hours,
      noShowFee: settings.no_show_fee,
      depositRequired: settings.deposit_required,
      depositPercentage: settings.deposit_percentage,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get salon settings error:', err);
    return error('Failed to get salon settings', 500);
  }
}

// PUT /api/salons/[id]/settings - Update salon settings
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const isOwner = await checkSalonOwnership(id, session.userId, session.role);
    if (!isOwner) {
      return forbidden('Not authorized to update salon settings');
    }

    const body = await request.json();
    const { cancellationPolicyHours, noShowFee, depositRequired, depositPercentage } = body;

    await query(
      `INSERT INTO salon_settings (salon_id, cancellation_policy_hours, no_show_fee, deposit_required, deposit_percentage)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         cancellation_policy_hours = COALESCE(?, cancellation_policy_hours),
         no_show_fee = COALESCE(?, no_show_fee),
         deposit_required = COALESCE(?, deposit_required),
         deposit_percentage = COALESCE(?, deposit_percentage)`,
      [
        id,
        cancellationPolicyHours ?? 24,
        noShowFee ?? 0,
        depositRequired ?? false,
        depositPercentage ?? 0,
        cancellationPolicyHours,
        noShowFee,
        depositRequired,
        depositPercentage,
      ]
    );

    const settings = await getOne('SELECT * FROM salon_settings WHERE salon_id = ?', [id]);

    return success({
      salonId: settings.salon_id,
      cancellationPolicyHours: settings.cancellation_policy_hours,
      noShowFee: settings.no_show_fee,
      depositRequired: settings.deposit_required,
      depositPercentage: settings.deposit_percentage,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update salon settings error:', err);
    return error('Failed to update salon settings', 500);
  }
}
