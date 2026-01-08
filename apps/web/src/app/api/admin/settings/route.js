import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/admin/settings - Get platform settings
export async function GET(request) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const settings = await query('SELECT * FROM platform_settings');

    // Convert to key-value object
    const settingsObj = {};
    for (const setting of settings) {
      settingsObj[setting.key] = {
        value: setting.value,
        type: setting.type,
        description: setting.description,
      };
    }

    // Return with defaults if no settings exist
    return success({
      settings: {
        platformFeePercent: settingsObj.platform_fee_percent?.value || '2.5',
        minBookingAdvanceHours: settingsObj.min_booking_advance_hours?.value || '1',
        maxBookingAdvanceDays: settingsObj.max_booking_advance_days?.value || '90',
        defaultCurrency: settingsObj.default_currency?.value || 'EUR',
        maintenanceMode: settingsObj.maintenance_mode?.value || 'false',
        allowNewRegistrations: settingsObj.allow_new_registrations?.value || 'true',
        requireEmailVerification: settingsObj.require_email_verification?.value || 'true',
        defaultTimezone: settingsObj.default_timezone?.value || 'Europe/Paris',
        supportEmail: settingsObj.support_email?.value || '',
        termsUrl: settingsObj.terms_url?.value || '',
        privacyUrl: settingsObj.privacy_url?.value || '',
        ...settingsObj,
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get settings error:', err);
    return error('Failed to get settings', 500);
  }
}

// PUT /api/admin/settings - Update platform settings
export async function PUT(request) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      // Check if setting exists
      const existing = await getOne('SELECT id FROM platform_settings WHERE `key` = ?', [key]);

      if (existing) {
        await query('UPDATE platform_settings SET value = ?, updated_at = NOW() WHERE `key` = ?', [
          String(value),
          key,
        ]);
      } else {
        await query(
          'INSERT INTO platform_settings (`key`, value, type, created_at) VALUES (?, ?, ?, NOW())',
          [key, String(value), typeof value]
        );
      }
    }

    return success({ message: 'Settings updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update settings error:', err);
    return error('Failed to update settings', 500);
  }
}
