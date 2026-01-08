import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// PUT /api/salons/[id]/marketplace/disable - Disable marketplace listing
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [id]);
    if (!salon) {
      return error('Salon not found', 404);
    }

    if (session.role !== 'admin' && salon.owner_id !== session.userId) {
      return forbidden('Not authorized');
    }

    // Disable marketplace: hide salon from search and disable online booking
    await query(
      `UPDATE salons SET marketplace_enabled = 0, updated_at = NOW() WHERE id = ?`,
      [id]
    );

    await query(
      `UPDATE salon_settings SET online_booking_enabled = 0 WHERE salon_id = ?`,
      [id]
    );

    return success({
      message: 'Salon removed from marketplace',
      marketplaceEnabled: false,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Disable marketplace error:', err);
    return error('Failed to disable marketplace', 500);
  }
}
