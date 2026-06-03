import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';
import { decodeId } from '@/lib/id';

// GET /api/staff/[id]/commissions - Get staff member's commission history, assigned services, active products, and overrides
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawId } = await params;
    const id = decodeId(rawId);

    // Get staff and verify access
    const staff = await getOne(
      `SELECT st.*, s.owner_id, u.first_name, u.last_name
       FROM staff st 
       JOIN salons s ON s.id = st.salon_id
       JOIN users u ON u.id = st.user_id
       WHERE st.id = ?`,
      [id]
    );

    if (!staff) {
      return error('Staff not found', 404);
    }

    // Staff can see their own, owners/managers can see their salon's staff
    if (session.role !== 'admin' && Number(staff.owner_id) !== Number(session.userId) && Number(staff.user_id) !== Number(session.userId)) {
      return forbidden('Not authorized to view this commission data');
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'month'; // day, week, month

    // Get active commission settings (explicitly where effective_to is null)
    const activeSetting = await getOne(
      'SELECT * FROM staff_commissions WHERE staff_id = ? AND effective_to IS NULL',
      [id]
    );

    // Get all commission history, ordering by ID DESC as secondary to guarantee most recently created
    const staffCommissions = await query(
      'SELECT * FROM staff_commissions WHERE staff_id = ? ORDER BY effective_from DESC, id DESC',
      [id]
    );
    const settings = activeSetting || (staffCommissions.length > 0 ? staffCommissions[0] : null);

    // Get overrides for the active commission structure
    let overrides = [];
    if (settings) {
      overrides = await query(
        'SELECT item_type, item_id, commission_rate FROM staff_item_commissions WHERE staff_commission_id = ?',
        [settings.id]
      );
    }

    // Fetch assigned services
    const assignedServices = await query(
      `SELECT s.id, s.name, s.price, sc.name as category_name
       FROM services s
       JOIN service_staff ss ON ss.service_id = s.id
       LEFT JOIN service_categories sc ON s.category_id = sc.id
       WHERE ss.staff_id = ? AND s.deleted_at IS NULL
       ORDER BY sc.name, s.name`,
      [id]
    );

    // Fetch salon products
    const salonProducts = await query(
      `SELECT p.id, p.name, p.price, pc.name as category_name
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       WHERE p.salon_id = ? AND p.is_active = 1 AND p.deleted_at IS NULL
       ORDER BY pc.name, p.name`,
      [staff.salon_id]
    );

    // Map overrides into services and products list for UI
    const servicesWithCommissions = assignedServices.map((s) => {
      const override = overrides.find(o => o.item_type === 'service' && Number(o.item_id) === Number(s.id));
      return {
        id: s.id,
        name: s.name,
        price: parseFloat(s.price),
        categoryName: s.category_name || 'Uncategorized',
        overrideRate: override ? parseFloat(override.commission_rate) : null,
        isOverridden: !!override
      };
    });

    const productsWithCommissions = salonProducts.map((p) => {
      const override = overrides.find(o => o.item_type === 'product' && Number(o.item_id) === Number(p.id));
      return {
        id: p.id,
        name: p.name,
        price: parseFloat(p.price),
        categoryName: p.category_name || 'Uncategorized',
        overrideRate: override ? parseFloat(override.commission_rate) : null,
        isOverridden: !!override
      };
    });

    // Build grouping for historical reporting
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    // 1. Fetch completed booking services with historical rates
    let servicesSql = `
      SELECT 
        DATE_FORMAT(b.start_datetime, ?) as period,
        b.id as booking_id,
        bs.service_id,
        bs.price as service_price,
        sc.commission_type,
        sc.service_commission as default_rate,
        sic.commission_rate as override_rate
      FROM bookings b
      JOIN booking_services bs ON bs.booking_id = b.id
      LEFT JOIN staff_commissions sc ON sc.staff_id = b.staff_id 
        AND b.start_datetime >= sc.effective_from 
        AND (sc.effective_to IS NULL OR b.start_datetime < sc.effective_to)
      LEFT JOIN staff_item_commissions sic ON sic.staff_commission_id = sc.id 
        AND sic.item_type = 'service' AND sic.item_id = bs.service_id
      WHERE b.staff_id = ? AND b.status = 'completed'
    `;
    const servicesParams = [dateFormat, id];
    if (startDate && endDate) {
      servicesSql += ' AND DATE(b.start_datetime) BETWEEN ? AND ?';
      servicesParams.push(startDate, endDate);
    }
    const serviceItems = await query(servicesSql, servicesParams);

    // 2. Fetch completed booking products with historical rates
    let productsSql = `
      SELECT 
        DATE_FORMAT(b.start_datetime, ?) as period,
        b.id as booking_id,
        bp.product_id,
        bp.total_price as product_total,
        sc.product_commission as default_rate,
        sic.commission_rate as override_rate
      FROM bookings b
      JOIN booking_products bp ON bp.booking_id = b.id
      LEFT JOIN staff_commissions sc ON sc.staff_id = b.staff_id 
        AND b.start_datetime >= sc.effective_from 
        AND (sc.effective_to IS NULL OR b.start_datetime < sc.effective_to)
      LEFT JOIN staff_item_commissions sic ON sic.staff_commission_id = sc.id 
        AND sic.item_type = 'product' AND sic.item_id = bp.product_id
      WHERE b.staff_id = ? AND b.status = 'completed'
    `;
    const productsParams = [dateFormat, id];
    if (startDate && endDate) {
      productsSql += ' AND DATE(b.start_datetime) BETWEEN ? AND ?';
      productsParams.push(startDate, endDate);
    }
    const productItems = await query(productsSql, productsParams);

    // 3. Fetch tips with historical rates
    let tipsSql = `
      SELECT 
        DATE_FORMAT(b.start_datetime, ?) as period,
        b.id as booking_id,
        pay.tip_amount,
        sc.tip_commission as tip_rate
      FROM bookings b
      JOIN payments pay ON pay.booking_id = b.id AND pay.status = 'paid'
      LEFT JOIN staff_commissions sc ON sc.staff_id = b.staff_id 
        AND b.start_datetime >= sc.effective_from 
        AND (sc.effective_to IS NULL OR b.start_datetime < sc.effective_to)
      WHERE b.staff_id = ? AND b.status = 'completed'
    `;
    const tipsParams = [dateFormat, id];
    if (startDate && endDate) {
      tipsSql += ' AND DATE(b.start_datetime) BETWEEN ? AND ?';
      tipsParams.push(startDate, endDate);
    }
    const tipItems = await query(tipsSql, tipsParams);

    // 4. Fetch unique completed bookings count
    let bookingsSql = `
      SELECT 
        DATE_FORMAT(b.start_datetime, ?) as period,
        b.id as booking_id
      FROM bookings b
      WHERE b.staff_id = ? AND b.status = 'completed'
    `;
    const bookingsParams = [dateFormat, id];
    if (startDate && endDate) {
      bookingsSql += ' AND DATE(b.start_datetime) BETWEEN ? AND ?';
      bookingsParams.push(startDate, endDate);
    }
    const bookingItems = await query(bookingsSql, bookingsParams);

    // Aggregate periods
    const periodsMap = {};
    function getPeriodEntry(periodName) {
      if (!periodsMap[periodName]) {
        periodsMap[periodName] = {
          period: periodName,
          bookings: 0,
          bookingIds: new Set(),
          revenue: 0,
          servicesRevenue: 0,
          productsRevenue: 0,
          tipsRevenue: 0,
          commission: 0,
          servicesCommission: 0,
          productsCommission: 0,
          tipsCommission: 0,
        };
      }
      return periodsMap[periodName];
    }

    bookingItems.forEach((b) => {
      const entry = getPeriodEntry(b.period);
      entry.bookingIds.add(b.booking_id);
      entry.bookings = entry.bookingIds.size;
    });

    serviceItems.forEach((item) => {
      const entry = getPeriodEntry(item.period);
      const price = parseFloat(item.service_price || 0);
      entry.servicesRevenue += price;
      entry.revenue += price;

      const commType = item.commission_type || 'percentage';
      const rate = item.override_rate !== null ? parseFloat(item.override_rate) : parseFloat(item.default_rate || 0);

      let comm = 0;
      if (commType === 'percentage') {
        comm = price * (rate / 100);
      } else {
        comm = rate; // flat commission per service
      }
      entry.servicesCommission += comm;
      entry.commission += comm;
    });

    productItems.forEach((item) => {
      const entry = getPeriodEntry(item.period);
      const total = parseFloat(item.product_total || 0);
      entry.productsRevenue += total;
      entry.revenue += total;

      const rate = item.override_rate !== null ? parseFloat(item.override_rate) : parseFloat(item.default_rate || 0);
      const comm = total * (rate / 100); // product commission is always a percentage
      entry.productsCommission += comm;
      entry.commission += comm;
    });

    tipItems.forEach((item) => {
      const entry = getPeriodEntry(item.period);
      const tip = parseFloat(item.tip_amount || 0);
      entry.tipsRevenue += tip;

      const rate = parseFloat(item.tip_rate || 100);
      const comm = tip * (rate / 100);
      entry.tipsCommission += comm;
      entry.commission += comm;
    });

    const periods = Object.values(periodsMap)
      .map((entry) => {
        delete entry.bookingIds;
        return entry;
      })
      .sort((a, b) => b.period.localeCompare(a.period));

    return success({
      staffId: parseInt(id),
      staffName: `${staff.first_name} ${staff.last_name}`,
      settings: settings
        ? {
            id: settings.id,
            type: settings.commission_type,
            serviceCommission: parseFloat(settings.service_commission),
            productCommission: parseFloat(settings.product_commission),
            tipCommission: parseFloat(settings.tip_commission),
          }
        : null,
      services: servicesWithCommissions,
      products: productsWithCommissions,
      overrides: overrides.map(o => ({
        itemType: o.item_type,
        itemId: o.item_id,
        commissionRate: parseFloat(o.commission_rate)
      })),
      commissions: staffCommissions.map((c) => ({
        id: c.id,
        commissionType: c.commission_type,
        serviceCommission: parseFloat(c.service_commission),
        productCommission: parseFloat(c.product_commission),
        tipCommission: parseFloat(c.tip_commission),
        effectiveFrom: c.effective_from,
        effectiveTo: c.effective_to,
      })),
      periods,
      totals: {
        totalBookings: periods.reduce((sum, p) => sum + p.bookings, 0),
        totalRevenue: periods.reduce((sum, p) => sum + p.revenue, 0),
        totalCommission: periods.reduce((sum, p) => sum + p.commission, 0),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get staff commissions error:', err);
    return error('Failed to get commissions', 500);
  }
}

// POST /api/staff/[id]/commissions - Update staff commission structure + item-level overrides atomically
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawId } = await params;
    const id = decodeId(rawId);

    // Get staff and verify access
    const staff = await getOne(
      `SELECT st.id, st.salon_id, st.user_id, s.owner_id
       FROM staff st 
       JOIN salons s ON s.id = st.salon_id
       WHERE st.id = ?`,
      [id]
    );

    if (!staff) {
      return error('Staff not found', 404);
    }

    // Only owner or admin can edit commissions
    if (session.role !== 'admin' && Number(staff.owner_id) !== Number(session.userId)) {
      return forbidden('Only the salon owner can modify commission structures');
    }

    const body = await request.json();
    const { 
      serviceCommission, 
      productCommission, 
      tipCommission, 
      commissionType = 'percentage',
      overrides = [] // Array of { itemType: 'service'|'product', itemId: number, commissionRate: number }
    } = body;

    // Validate main inputs
    const sc = parseFloat(serviceCommission || 0);
    const pc = parseFloat(productCommission || 0);
    const tc = parseFloat(tipCommission || 0);

    if (isNaN(sc) || isNaN(pc) || isNaN(tc)) {
      return error('Commissions must be valid numbers', 400);
    }

    if (sc < 0 || pc < 0 || tc < 0 || sc > 100 || pc > 100 || tc > 100) {
      return error('Commissions must be between 0 and 100', 400);
    }

    // Validate overrides
    if (!Array.isArray(overrides)) {
      return error('Overrides must be an array', 400);
    }

    for (const ov of overrides) {
      if (!['service', 'product'].includes(ov.itemType)) {
        return error('Override itemType must be "service" or "product"', 400);
      }
      const rate = parseFloat(ov.commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return error('Override rates must be numbers between 0 and 100', 400);
      }
    }

    // Process inside a transaction to ensure ledger integrity
    await transaction(async (conn) => {
      // 1. Close out the currently active commission rate
      await conn.execute(
        `UPDATE staff_commissions 
         SET effective_to = NOW() 
         WHERE staff_id = ? AND effective_to IS NULL`,
        [id]
      );

      // 2. Insert the new commission rate effective immediately
      const [insertRes] = await conn.execute(
        `INSERT INTO staff_commissions 
         (staff_id, commission_type, service_commission, product_commission, tip_commission, effective_from)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [id, commissionType, sc, pc, tc]
      );

      const newCommissionId = insertRes.insertId;

      // 3. Insert overrides
      if (overrides.length > 0) {
        const values = overrides.map(ov => [
          newCommissionId,
          ov.itemType,
          ov.itemId,
          parseFloat(ov.commissionRate)
        ]);

        await conn.query(
          `INSERT INTO staff_item_commissions 
           (staff_commission_id, item_type, item_id, commission_rate)
           VALUES ?`,
          [values]
        );
      }
    });

    return success({ message: 'Commission structure and overrides updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update staff commissions error:', err);
    return error('Failed to update commissions', 500);
  }
}
