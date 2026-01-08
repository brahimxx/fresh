import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/salons/[id]/widget - Get widget settings
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const settings = await getOne('SELECT * FROM widget_settings WHERE salon_id = ?', [id]);

    if (!settings) {
      // Return default settings if none exist
      return success({
        salonId: id,
        enabled: true,
        primaryColor: '#000000',
        buttonText: 'Book Now',
        showServices: true,
        showStaff: true,
        showPrices: true,
        requirePhone: true,
        requireEmail: true,
        termsUrl: null,
        successMessage: 'Your booking has been confirmed!',
      });
    }

    return success({
      salonId: settings.salon_id,
      enabled: settings.enabled,
      primaryColor: settings.primary_color,
      buttonText: settings.button_text,
      showServices: settings.show_services,
      showStaff: settings.show_staff,
      showPrices: settings.show_prices,
      requirePhone: settings.require_phone,
      requireEmail: settings.require_email,
      termsUrl: settings.terms_url,
      successMessage: settings.success_message,
    });
  } catch (err) {
    console.error('Get widget settings error:', err);
    return error('Failed to get widget settings', 500);
  }
}

// PUT /api/salons/[id]/widget - Update widget settings
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [id]);
    if (!salon) {
      return error('Salon not found', 404);
    }

    if (session.role !== 'admin' && salon.owner_id !== session.userId) {
      return forbidden('Not authorized to update widget settings');
    }

    const body = await request.json();
    const {
      enabled,
      primaryColor,
      buttonText,
      showServices,
      showStaff,
      showPrices,
      requirePhone,
      requireEmail,
      termsUrl,
      successMessage,
    } = body;

    // Check if settings exist
    const existing = await getOne('SELECT id FROM widget_settings WHERE salon_id = ?', [id]);

    if (existing) {
      await query(
        `UPDATE widget_settings SET
          enabled = COALESCE(?, enabled),
          primary_color = COALESCE(?, primary_color),
          button_text = COALESCE(?, button_text),
          show_services = COALESCE(?, show_services),
          show_staff = COALESCE(?, show_staff),
          show_prices = COALESCE(?, show_prices),
          require_phone = COALESCE(?, require_phone),
          require_email = COALESCE(?, require_email),
          terms_url = COALESCE(?, terms_url),
          success_message = COALESCE(?, success_message)
         WHERE salon_id = ?`,
        [
          enabled,
          primaryColor,
          buttonText,
          showServices,
          showStaff,
          showPrices,
          requirePhone,
          requireEmail,
          termsUrl,
          successMessage,
          id,
        ]
      );
    } else {
      await query(
        `INSERT INTO widget_settings (
          salon_id, enabled, primary_color, button_text, show_services, show_staff,
          show_prices, require_phone, require_email, terms_url, success_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          enabled ?? true,
          primaryColor || '#000000',
          buttonText || 'Book Now',
          showServices ?? true,
          showStaff ?? true,
          showPrices ?? true,
          requirePhone ?? true,
          requireEmail ?? true,
          termsUrl || null,
          successMessage || 'Your booking has been confirmed!',
        ]
      );
    }

    return success({ message: 'Widget settings updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update widget settings error:', err);
    return error('Failed to update widget settings', 500);
  }
}
