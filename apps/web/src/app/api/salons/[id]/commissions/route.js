import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  if (salon && salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// GET /api/salons/[id]/commissions - Get commission settings and data
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to view commissions');
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const staffId = searchParams.get('staffId');

    // Get commission settings for all staff
    const staffSettings = await query(
      `SELECT sc.*, st.id as staff_id, u.first_name, u.last_name
       FROM staff_commissions sc
       JOIN staff st ON st.id = sc.staff_id
       JOIN users u ON u.id = st.user_id
       WHERE st.salon_id = ? AND st.is_active = 1`,
      [id]
    );

    // Build commission data query
    let dataQuery = `
      SELECT 
        st.id as staff_id,
        u.first_name,
        u.last_name,
        COUNT(DISTINCT b.id) as total_bookings,
        COALESCE(SUM(p.amount), 0) as total_revenue,
        COALESCE(SUM(bs.price), 0) as services_revenue
      FROM staff st
      JOIN users u ON u.id = st.user_id
      LEFT JOIN bookings b ON b.staff_id = st.id AND b.status = 'completed'
      LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'paid'
      LEFT JOIN booking_services bs ON bs.booking_id = b.id
      WHERE st.salon_id = ? AND st.is_active = 1
    `;
    const dataParams = [id];

    if (startDate && endDate) {
      dataQuery += ' AND DATE(b.start_datetime) BETWEEN ? AND ?';
      dataParams.push(startDate, endDate);
    }

    if (staffId) {
      dataQuery += ' AND st.id = ?';
      dataParams.push(staffId);
    }

    dataQuery += ' GROUP BY st.id, u.first_name, u.last_name';

    const commissionData = await query(dataQuery, dataParams);

    // Calculate commissions
    const staffWithCommissions = commissionData.map((staff) => {
      const settings = staffSettings.find((s) => s.staff_id === staff.staff_id);
      const commissionType = settings?.commission_type || 'percentage';
      const commissionValue = settings?.commission_value || 0;

      let commissionAmount = 0;
      if (commissionType === 'percentage') {
        commissionAmount = parseFloat(staff.services_revenue) * (commissionValue / 100);
      } else {
        commissionAmount = parseFloat(staff.total_bookings) * commissionValue;
      }

      return {
        staffId: staff.staff_id,
        staffName: `${staff.first_name} ${staff.last_name}`,
        totalBookings: parseInt(staff.total_bookings),
        totalRevenue: parseFloat(staff.total_revenue),
        servicesRevenue: parseFloat(staff.services_revenue),
        commissionType,
        commissionValue,
        commissionAmount,
      };
    });

    return success({
      settings: staffSettings.map((s) => ({
        staffId: s.staff_id,
        staffName: `${s.first_name} ${s.last_name}`,
        commissionType: s.commission_type,
        commissionValue: parseFloat(s.commission_value),
      })),
      data: staffWithCommissions,
      totals: {
        totalRevenue: staffWithCommissions.reduce((sum, s) => sum + s.totalRevenue, 0),
        totalCommissions: staffWithCommissions.reduce((sum, s) => sum + s.commissionAmount, 0),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get commissions error:', err);
    return error('Failed to get commissions', 500);
  }
}

// POST /api/salons/[id]/commissions - Set commission settings for staff
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to set commissions');
    }

    const body = await request.json();
    const { staffId, commissionType = 'percentage', commissionValue } = body;

    if (!staffId || commissionValue === undefined) {
      return error('Staff ID and commission value are required');
    }

    if (!['percentage', 'fixed'].includes(commissionType)) {
      return error('Invalid commission type');
    }

    // Verify staff belongs to this salon
    const staff = await getOne('SELECT id FROM staff WHERE id = ? AND salon_id = ?', [staffId, id]);
    if (!staff) {
      return error('Staff not found in this salon', 404);
    }

    // Check if settings exist
    const existing = await getOne('SELECT id FROM staff_commissions WHERE staff_id = ?', [staffId]);

    if (existing) {
      await query(
        'UPDATE staff_commissions SET commission_type = ?, commission_value = ? WHERE staff_id = ?',
        [commissionType, commissionValue, staffId]
      );
    } else {
      await query(
        'INSERT INTO staff_commissions (staff_id, commission_type, commission_value, created_at) VALUES (?, ?, ?, NOW())',
        [staffId, commissionType, commissionValue]
      );
    }

    return success({
      message: 'Commission settings updated successfully',
      staffId,
      commissionType,
      commissionValue,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Set commission error:', err);
    return error('Failed to set commission', 500);
  }
}
