import { decodeId } from '@/lib/id';
import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// PUT /api/salons/[id]/marketplace/enable - Enable marketplace listing
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
  const id = decodeId(rawId);

    const salon = await getOne('SELECT owner_id, is_active FROM salons WHERE id = ?', [id]);
    if (!salon) {
      return error('Salon not found', 404);
    }

    if (session.role !== 'admin' && Number(salon.owner_id) !== Number(session.userId)) {
      return forbidden('Not authorized');
    }

    // Enable marketplace: make salon visible in search and enable online booking
    await query(
      `UPDATE salons SET is_marketplace_enabled = 1 WHERE id = ?`,
      [id]
    );

    const salonSettings = await getOne("SELECT salon_id FROM salon_settings WHERE salon_id = ?", [id]);
    if (salonSettings) {
      await query("UPDATE salon_settings SET online_booking_enabled = 1 WHERE salon_id = ?", [id]);
    } else {
      await query(
        `INSERT INTO salon_settings (salon_id, cancellation_policy_hours, no_show_fee, deposit_required, deposit_percentage, online_booking_enabled)
         VALUES (?, 24, 0.00, 0, 0, 1)`,
        [id]
      );
    }

    const widgetSettings = await getOne("SELECT salon_id FROM widget_settings WHERE salon_id = ?", [id]);
    if (widgetSettings) {
      await query("UPDATE widget_settings SET enabled = 1 WHERE salon_id = ?", [id]);
    } else {
      await query(
        `INSERT INTO widget_settings (
          salon_id, enabled, primary_color, button_text, show_services, show_staff,
          show_prices, require_phone, require_email, success_message
        ) VALUES (?, 1, '#000000', 'Book Now', 1, 1, 1, 1, 1, 'Your booking has been confirmed!')`,
        [id]
      );
    }

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
