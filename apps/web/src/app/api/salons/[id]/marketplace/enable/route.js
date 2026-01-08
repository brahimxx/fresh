import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// PUT /api/salons/[id]/marketplace/enable - Enable marketplace listing
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const salon = await getOne('SELECT owner_id, is_active FROM salons WHERE id = ?', [id]);
    if (!salon) {
      return error('Salon not found', 404);
    }

    if (session.role !== 'admin' && salon.owner_id !== session.userId) {
      return forbidden('Not authorized');
    }

    // Enable marketplace: make salon visible in search and enable online booking
    await query(
      `UPDATE salons SET marketplace_enabled = 1, updated_at = NOW() WHERE id = ?`,
      [id]
    );

    await query(
      `UPDATE salon_settings SET online_booking_enabled = 1 WHERE salon_id = ?`,
      [id]
    );

    return success({
      message: 'Salon is now visible on the marketplace',
      marketplaceEnabled: true,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Enable marketplace error:', err);
    return error('Failed to enable marketplace', 500);
  }
}
