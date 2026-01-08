import { query, getOne } from '@/lib/db';
import { success, error, notFound } from '@/lib/response';

// GET /api/widget/[salonId] - Get public widget data for embedding
export async function GET(request, { params }) {
  try {
    const { salonId } = await params;

    // Get salon basic info
    const salon = await getOne(
      'SELECT id, name, address, city, phone, email, website, logo_url FROM salons WHERE id = ? AND is_active = 1',
      [salonId]
    );

    if (!salon) {
      return notFound('Salon not found');
    }

    // Get widget settings
    const widgetSettings = await getOne('SELECT * FROM widget_settings WHERE salon_id = ?', [salonId]);

    if (!widgetSettings || !widgetSettings.enabled) {
      return error('Booking widget is not available for this salon');
    }

    // Get service categories with services
    const categories = await query(
      'SELECT * FROM service_categories WHERE salon_id = ? ORDER BY display_order, name',
      [salonId]
    );

    const services = await query(
      `SELECT s.*, sc.name as category_name 
       FROM services s 
       LEFT JOIN service_categories sc ON sc.id = s.category_id
       WHERE s.salon_id = ? AND s.is_active = 1
       ORDER BY s.name`,
      [salonId]
    );

    // Get staff if enabled
    let staff = [];
    if (widgetSettings.show_staff) {
      staff = await query(
        `SELECT s.id, u.first_name, u.last_name, s.avatar_url
         FROM staff s
         JOIN users u ON u.id = s.user_id
         WHERE s.salon_id = ? AND s.is_active = 1
         ORDER BY u.first_name`,
        [salonId]
      );
    }

    return success({
      salon: {
        id: salon.id,
        name: salon.name,
        address: salon.address,
        city: salon.city,
        phone: salon.phone,
        email: salon.email,
        website: salon.website,
        logo: salon.logo_url,
      },
      settings: {
        primaryColor: widgetSettings.primary_color,
        buttonText: widgetSettings.button_text,
        showServices: widgetSettings.show_services,
        showStaff: widgetSettings.show_staff,
        showPrices: widgetSettings.show_prices,
        requirePhone: widgetSettings.require_phone,
        requireEmail: widgetSettings.require_email,
        termsUrl: widgetSettings.terms_url,
        successMessage: widgetSettings.success_message,
      },
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
      })),
      services: widgetSettings.show_services
        ? services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            categoryId: s.category_id,
            categoryName: s.category_name,
            duration: s.duration_minutes,
            price: widgetSettings.show_prices ? parseFloat(s.price) : null,
          }))
        : [],
      staff: staff.map((s) => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        avatar: s.avatar_url,
      })),
    });
  } catch (err) {
    console.error('Get widget data error:', err);
    return error('Failed to get widget data', 500);
  }
}
