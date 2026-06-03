import { decodeId } from '@/lib/id';
import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';
import { checkSalonAccess } from '@/lib/permissions-server';

// GET /api/salons/[id]/commissions - Get commission settings and data
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const id = decodeId(rawId);

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to view commissions');
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const filterStaffId = searchParams.get('staffId');

    // 1. Get current commission settings for all salon staff (latest active structure where effective_to is null)
    const staffSettings = await query(
      `SELECT sc.*, st.id as staff_id, u.first_name, u.last_name
       FROM staff_commissions sc
       JOIN staff st ON st.id = sc.staff_id
       JOIN users u ON u.id = st.user_id
       WHERE st.salon_id = ? AND st.is_active = 1 AND sc.effective_to IS NULL`,
      [id]
    );

    // 2. Fetch completed booking services for all salon staff with their historically active rates
    let servicesSql = `
      SELECT 
        b.staff_id,
        bs.price as service_price,
        sc.commission_type,
        sc.service_commission as default_rate,
        sic.commission_rate as override_rate
      FROM bookings b
      JOIN booking_services bs ON bs.booking_id = b.id
      JOIN staff st ON st.id = b.staff_id
      LEFT JOIN staff_commissions sc ON sc.staff_id = b.staff_id 
        AND b.start_datetime >= sc.effective_from 
        AND (sc.effective_to IS NULL OR b.start_datetime < sc.effective_to)
      LEFT JOIN staff_item_commissions sic ON sic.staff_commission_id = sc.id 
        AND sic.item_type = 'service' AND sic.item_id = bs.service_id
      WHERE st.salon_id = ? AND b.status = 'completed'
    `;
    const servicesParams = [id];
    if (startDate && endDate) {
      servicesSql += ' AND DATE(b.start_datetime) BETWEEN ? AND ?';
      servicesParams.push(startDate, endDate);
    }
    if (filterStaffId) {
      servicesSql += ' AND b.staff_id = ?';
      servicesParams.push(filterStaffId);
    }
    const serviceItems = await query(servicesSql, servicesParams);

    // 3. Fetch completed booking products with historical rates
    let productsSql = `
      SELECT 
        b.staff_id,
        bp.total_price as product_total,
        sc.product_commission as default_rate,
        sic.commission_rate as override_rate
      FROM bookings b
      JOIN booking_products bp ON bp.booking_id = b.id
      JOIN staff st ON st.id = b.staff_id
      LEFT JOIN staff_commissions sc ON sc.staff_id = b.staff_id 
        AND b.start_datetime >= sc.effective_from 
        AND (sc.effective_to IS NULL OR b.start_datetime < sc.effective_to)
      LEFT JOIN staff_item_commissions sic ON sic.staff_commission_id = sc.id 
        AND sic.item_type = 'product' AND sic.item_id = bp.product_id
      WHERE st.salon_id = ? AND b.status = 'completed'
    `;
    const productsParams = [id];
    if (startDate && endDate) {
      productsSql += ' AND DATE(b.start_datetime) BETWEEN ? AND ?';
      productsParams.push(startDate, endDate);
    }
    if (filterStaffId) {
      productsSql += ' AND b.staff_id = ?';
      productsParams.push(filterStaffId);
    }
    const productItems = await query(productsSql, productsParams);

    // 4. Fetch tips with historical rates
    let tipsSql = `
      SELECT 
        b.staff_id,
        pay.tip_amount,
        sc.tip_commission as tip_rate
      FROM bookings b
      JOIN payments pay ON pay.booking_id = b.id AND pay.status = 'paid'
      JOIN staff st ON st.id = b.staff_id
      LEFT JOIN staff_commissions sc ON sc.staff_id = b.staff_id 
        AND b.start_datetime >= sc.effective_from 
        AND (sc.effective_to IS NULL OR b.start_datetime < sc.effective_to)
      WHERE st.salon_id = ? AND b.status = 'completed'
    `;
    const tipsParams = [id];
    if (startDate && endDate) {
      tipsSql += ' AND DATE(b.start_datetime) BETWEEN ? AND ?';
      tipsParams.push(startDate, endDate);
    }
    if (filterStaffId) {
      tipsSql += ' AND b.staff_id = ?';
      tipsParams.push(filterStaffId);
    }
    const tipItems = await query(tipsSql, tipsParams);

    // 5. Fetch booking counts per staff
    let bookingsSql = `
      SELECT 
        b.staff_id,
        COUNT(DISTINCT b.id) as total_bookings
      FROM bookings b
      JOIN staff st ON st.id = b.staff_id
      WHERE st.salon_id = ? AND b.status = 'completed'
    `;
    const bookingsParams = [id];
    if (startDate && endDate) {
      bookingsSql += ' AND DATE(b.start_datetime) BETWEEN ? AND ?';
      bookingsParams.push(startDate, endDate);
    }
    if (filterStaffId) {
      bookingsSql += ' AND b.staff_id = ?';
      bookingsParams.push(filterStaffId);
    }
    bookingsSql += ' GROUP BY b.staff_id';
    const bookingCounts = await query(bookingsSql, bookingsParams);

    // Get all active staff in salon
    let staffQuery = `
      SELECT st.id as staff_id, u.first_name, u.last_name
      FROM staff st
      JOIN users u ON u.id = st.user_id
      WHERE st.salon_id = ? AND st.is_active = 1
    `;
    const staffParams = [id];
    if (filterStaffId) {
      staffQuery += ' AND st.id = ?';
      staffParams.push(filterStaffId);
    }
    const salonStaff = await query(staffQuery, staffParams);

    // Build aggregate report
    const staffWithCommissions = salonStaff.map((st) => {
      const staffId = st.staff_id;
      const settings = staffSettings.find((s) => Number(s.staff_id) === Number(staffId));
      
      const bkCount = bookingCounts.find(b => Number(b.staff_id) === Number(staffId));
      const totalBookings = bkCount ? parseInt(bkCount.total_bookings) : 0;

      // Filter items for this staff member
      const myServices = serviceItems.filter(item => Number(item.staff_id) === Number(staffId));
      const myProducts = productItems.filter(item => Number(item.staff_id) === Number(staffId));
      const myTips = tipItems.filter(item => Number(item.staff_id) === Number(staffId));

      let servicesRevenue = 0;
      let servicesCommission = 0;

      myServices.forEach((item) => {
        const price = parseFloat(item.service_price || 0);
        servicesRevenue += price;

        const commType = item.commission_type || 'percentage';
        const rate = item.override_rate !== null ? parseFloat(item.override_rate) : parseFloat(item.default_rate || 0);

        if (commType === 'percentage') {
          servicesCommission += price * (rate / 100);
        } else {
          servicesCommission += rate; // Flat commission per service
        }
      });

      let productsRevenue = 0;
      let productsCommission = 0;

      myProducts.forEach((item) => {
        const total = parseFloat(item.product_total || 0);
        productsRevenue += total;

        const rate = item.override_rate !== null ? parseFloat(item.override_rate) : parseFloat(item.default_rate || 0);
        productsCommission += total * (rate / 100);
      });

      let tipsRevenue = 0;
      let tipsCommission = 0;

      myTips.forEach((item) => {
        const tip = parseFloat(item.tip_amount || 0);
        tipsRevenue += tip;

        const rate = parseFloat(item.tip_rate || 100);
        tipsCommission += tip * (rate / 100);
      });

      const totalRevenue = servicesRevenue + productsRevenue;
      const commissionAmount = servicesCommission + productsCommission + tipsCommission;

      return {
        staffId,
        staffName: `${st.first_name} ${st.last_name}`,
        totalBookings,
        totalRevenue,
        servicesRevenue,
        commissionType: settings?.commission_type || 'percentage',
        commissionValue: parseFloat(settings?.service_commission || 0),
        commissionAmount,
      };
    });

    return success({
      settings: staffSettings.map((s) => ({
        staffId: s.staff_id,
        staffName: `${s.first_name} ${s.last_name}`,
        commissionType: s.commission_type,
        commissionValue: parseFloat(s.service_commission || 0),
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
    const { id: rawId } = await params;
    const id = decodeId(rawId);

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
    const existing = await getOne('SELECT id FROM staff_commissions WHERE staff_id = ? AND effective_to IS NULL', [staffId]);

    const val = parseFloat(commissionValue);

    if (existing) {
      await query(
        'UPDATE staff_commissions SET commission_type = ?, service_commission = ? WHERE id = ?',
        [commissionType, val, existing.id]
      );
    } else {
      await query(
        'INSERT INTO staff_commissions (staff_id, commission_type, service_commission, effective_from) VALUES (?, ?, ?, NOW())',
        [staffId, commissionType, val]
      );
    }

    return success({
      message: 'Commission settings updated successfully',
      staffId,
      commissionType,
      commissionValue: val,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Set commission error:', err);
    return error('Failed to set commission', 500);
  }
}
