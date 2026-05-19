import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/my/bookings - Get current user's bookings with filters
export async function GET(request) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // upcoming, past, all
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT b.*, s.name as salon_name, s.address as salon_address, s.city as salon_city,
        s.phone as salon_phone, s.email as salon_email, s.currency as salon_currency,
        (SELECT image_url FROM salon_photos WHERE salon_id = s.id AND is_cover = 1 LIMIT 1) as salon_image,
        GROUP_CONCAT(DISTINCT sv.name) as services,
        GROUP_CONCAT(DISTINCT CONCAT(sv.name, '|', COALESCE(bs.price, 0), '|', COALESCE(bs.duration_minutes, 0)) SEPARATOR ';;') as service_details,
        st.id as staff_id, u2.first_name as staff_first_name, u2.last_name as staff_last_name,
        SUM(bs.price) as total_price,
        MAX(bgc.amount_used) as gift_card_amount_used,
        MAX(gc.code) as gift_card_code
      FROM bookings b
      JOIN salons s ON s.id = b.salon_id
      LEFT JOIN booking_services bs ON bs.booking_id = b.id
      LEFT JOIN services sv ON sv.id = bs.service_id
      LEFT JOIN staff st ON st.id = b.staff_id
      LEFT JOIN users u2 ON u2.id = st.user_id
      LEFT JOIN booking_gift_cards bgc ON bgc.booking_id = b.id
      LEFT JOIN gift_cards gc ON gc.id = bgc.gift_card_id
      WHERE b.client_id = ? AND b.deleted_at IS NULL
    `;
    const sqlParams = [session.userId];

    // Apply filter
    if (filter === 'upcoming') {
      sql += " AND b.start_datetime > NOW() AND b.status IN ('pending', 'confirmed')";
    } else if (filter === 'past') {
      sql += " AND (b.start_datetime <= NOW() OR b.status IN ('completed', 'cancelled', 'no_show'))";
    }

    if (status) {
      sql += ' AND b.status = ?';
      sqlParams.push(status);
    }

    sql += ' GROUP BY b.id';

    // Get total count
    const fromIndex = sql.indexOf('FROM bookings b');
    const countSql = 'SELECT COUNT(DISTINCT b.id) as total ' + sql.substring(fromIndex).replace(' GROUP BY b.id', '');
    const countResult = await query(countSql, sqlParams);
    const total = countResult[0] ? countResult[0].total : 0;

    sql += ' ORDER BY b.start_datetime DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const bookings = await query(sql, sqlParams);

    return success({
      bookings: bookings.map((b) => {
        // Parse service details
        var serviceList = [];
        if (b.service_details) {
          serviceList = b.service_details.split(';;').map(function (s) {
            var parts = s.split('|');
            return { name: parts[0], price: parseFloat(parts[1]) || 0, duration: parseInt(parts[2]) || 0 };
          });
        }
        // Calculate duration in minutes
        var start = new Date(String(b.start_datetime).replace(' ', 'T'));
        var end = new Date(String(b.end_datetime).replace(' ', 'T'));
        var durationMinutes = Math.round((end - start) / (1000 * 60));

        return {
          id: b.id,
          salonId: b.salon_id,
          salonName: b.salon_name,
          salonAddress: b.salon_address,
          salonCity: b.salon_city,
          salonPhone: b.salon_phone,
          salonEmail: b.salon_email,
          salonImage: b.salon_image,
          salonCurrency: b.salon_currency,
          staffId: b.staff_id,
          staffName: b.staff_first_name ? `${b.staff_first_name} ${b.staff_last_name}` : null,
          services: b.services,
          serviceDetails: serviceList,
          startTime: String(b.start_datetime).replace(' ', 'T'),
          endTime: String(b.end_datetime).replace(' ', 'T'),
          duration: durationMinutes,
          totalPrice: b.total_price,
          status: b.status,
          notes: b.notes,
          fulfillmentType: b.fulfillment_type || 'physical',
          serviceLocationAddress: b.service_location_address || null,
          virtualMeetingLink: b.virtual_meeting_link || null,
          travelFeeAmount: b.travel_fee_amount ? parseFloat(b.travel_fee_amount) : 0,
          giftCardCode: b.gift_card_code || null,
          giftCardAmountUsed: b.gift_card_amount_used ? parseFloat(b.gift_card_amount_used) : 0,
          createdAt: b.created_at,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get my bookings error:', err);
    return error('Failed to get bookings', 500);
  }
}
