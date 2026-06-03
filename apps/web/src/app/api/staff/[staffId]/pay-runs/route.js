import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';
import { decodeId } from '@/lib/id';

// GET /api/staff/[staffId]/pay-runs - Get staff member's pay runs
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawId } = await params;
    const id = decodeId(rawId);

    // Get staff and verify access
    const staff = await getOne(
      `SELECT st.*, s.owner_id
       FROM staff st 
       JOIN salons s ON s.id = st.salon_id
       WHERE st.id = ?`,
      [id]
    );

    if (!staff) {
      return error('Staff not found', 404);
    }

    // Staff can see their own, owners/managers can see their salon's staff
    if (session.role !== 'admin' && Number(staff.owner_id) !== Number(session.userId) && Number(staff.user_id) !== Number(session.userId)) {
      return forbidden('Not authorized to view pay runs');
    }

    const payRuns = await query(
      `SELECT * FROM staff_pay_runs WHERE staff_id = ? ORDER BY period_end DESC`,
      [id]
    );

    return success(payRuns.map(pr => ({
      id: pr.id,
      salonId: pr.salon_id,
      staffId: pr.staff_id,
      periodStart: pr.period_start,
      periodEnd: pr.period_end,
      status: pr.status,
      totalRevenue: parseFloat(pr.total_revenue),
      totalServicesCommission: parseFloat(pr.total_services_commission),
      totalProductsCommission: parseFloat(pr.total_products_commission),
      totalTipsCommission: parseFloat(pr.total_tips_commission),
      totalWages: parseFloat(pr.total_wages),
      totalPayout: parseFloat(pr.total_payout),
      createdAt: pr.created_at
    })));
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get pay runs error:', err);
    return error('Failed to get pay runs', 500);
  }
}

// POST /api/staff/[staffId]/pay-runs - Generate a new pay run
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawId } = await params;
    const id = decodeId(rawId);

    // Get staff and verify access
    const staff = await getOne(
      `SELECT st.id, st.salon_id, st.user_id, st.commission_profile_id, s.owner_id
       FROM staff st 
       JOIN salons s ON s.id = st.salon_id
       WHERE st.id = ?`,
      [id]
    );

    if (!staff) {
      return error('Staff not found', 404);
    }

    // Fetch salon settings for discount policy
    const salonSettings = await getOne(
      `SELECT deduct_discounts_before_commission FROM salon_settings WHERE salon_id = ?`,
      [staff.salon_id]
    );
    const deductDiscounts = salonSettings?.deduct_discounts_before_commission === 1;

    // Only owner or admin can generate pay runs
    if (session.role !== 'admin' && Number(staff.owner_id) !== Number(session.userId)) {
      return forbidden('Only the salon owner can generate pay runs');
    }

    const body = await request.json();
    const { periodStart, periodEnd } = body;

    if (!periodStart || !periodEnd) {
      return error('periodStart and periodEnd are required', 400);
    }

    // 1. Prevent overlapping pay run periods for this staff member
    const overlapping = await getOne(
      `SELECT id, period_start, period_end 
       FROM staff_pay_runs 
       WHERE staff_id = ? 
         AND period_start <= ? 
         AND period_end >= ? 
       LIMIT 1`,
      [id, periodEnd, periodStart]
    );

    if (overlapping) {
      // Format dates nicely for the error message
      const fmtStart = new Date(overlapping.period_start).toLocaleDateString();
      const fmtEnd = new Date(overlapping.period_end).toLocaleDateString();
      return error(`This period overlaps with an existing pay run (${fmtStart} to ${fmtEnd}).`, 400);
    }

    let totalRevenue = 0;
    let servicesCommission = 0;
    let productsCommission = 0;
    let tipsCommission = 0;
    let totalWages = 0;

    // Fetch Profile Tiers if applicable
    let tiers = [];
    if (staff.commission_profile_id) {
      tiers = await query(
        `SELECT threshold_amount, commission_rate 
         FROM commission_tiers 
         WHERE profile_id = ? 
         ORDER BY threshold_amount ASC`, 
        [staff.commission_profile_id]
      );
    }

    // 2. Fetch completed booking services with historically active commission rates
    const serviceItems = await query(`
      SELECT 
        b.id as booking_id,
        bs.service_id,
        bs.price as service_price,
        s.cost_price as service_cost,
        sc.commission_type,
        sc.service_commission as default_rate,
        sic.commission_rate as override_rate,
        (SELECT SUM(amount_saved) FROM booking_discounts WHERE booking_id = b.id) as booking_discount_total,
        (SELECT SUM(price) FROM booking_services WHERE booking_id = b.id) + 
        IFNULL((SELECT SUM(total_price) FROM booking_products WHERE booking_id = b.id), 0) as booking_gross_total
      FROM bookings b
      JOIN booking_services bs ON bs.booking_id = b.id
      JOIN services s ON s.id = bs.service_id
      LEFT JOIN staff_commissions sc ON sc.staff_id = b.staff_id 
        AND b.start_datetime >= sc.effective_from 
        AND (sc.effective_to IS NULL OR b.start_datetime < sc.effective_to)
      LEFT JOIN staff_item_commissions sic ON sic.staff_commission_id = sc.id 
        AND sic.item_type = 'service' AND sic.item_id = bs.service_id
      WHERE b.staff_id = ? AND b.status = 'completed'
      AND DATE(b.start_datetime) BETWEEN ? AND ?
    `, [id, periodStart, periodEnd]);

    let netServiceRevenue = 0;

    serviceItems.forEach((item) => {
      const price = parseFloat(item.service_price || 0);
      const cost = parseFloat(item.service_cost || 0);
      const discountTotal = parseFloat(item.booking_discount_total || 0);
      const grossTotal = parseFloat(item.booking_gross_total || 1); // prevent division by zero
      
      let apportionedDiscount = 0;
      if (deductDiscounts && discountTotal > 0) {
        // Apportion discount based on price ratio
        apportionedDiscount = discountTotal * (price / grossTotal);
      }

      totalRevenue += price;

      const commType = item.commission_type || 'percentage';
      const rate = item.override_rate !== null ? parseFloat(item.override_rate) : parseFloat(item.default_rate || 0);
      
      // Net is Price - COGS - Apportioned Discount
      const net = Math.max(0, price - cost - apportionedDiscount); 

      // If they have an explicit override, or no profile, do standard math
      // Otherwise, we pool the net revenue for the tiered math
      if (item.override_rate !== null || tiers.length === 0) {
        if (commType === 'percentage') {
          servicesCommission += net * (rate / 100);
        } else {
          servicesCommission += rate;
        }
      } else {
        netServiceRevenue += net;
      }
    });

    // Calculate tiered commission
    if (tiers.length > 0 && netServiceRevenue > 0) {
      let remainingRevenue = netServiceRevenue;
      let tieredCommission = 0;

      for (let i = tiers.length - 1; i >= 0; i--) {
        const threshold = parseFloat(tiers[i].threshold_amount);
        const rate = parseFloat(tiers[i].commission_rate) / 100;
        
        if (remainingRevenue > threshold) {
          const revenueInTier = remainingRevenue - threshold;
          tieredCommission += revenueInTier * rate;
          remainingRevenue = threshold;
        }
      }
      servicesCommission += tieredCommission;
    }

    // 3. Fetch completed booking products with historical rates
    const productItems = await query(`
      SELECT 
        b.id as booking_id,
        bp.product_id,
        bp.total_price as product_total,
        bp.quantity,
        p.cost_price as product_cost,
        sc.product_commission as default_rate,
        sic.commission_rate as override_rate,
        (SELECT SUM(amount_saved) FROM booking_discounts WHERE booking_id = b.id) as booking_discount_total,
        (SELECT SUM(price) FROM booking_services WHERE booking_id = b.id) + 
        IFNULL((SELECT SUM(total_price) FROM booking_products WHERE booking_id = b.id), 0) as booking_gross_total
      FROM bookings b
      JOIN booking_products bp ON bp.booking_id = b.id
      JOIN products p ON p.id = bp.product_id
      LEFT JOIN staff_commissions sc ON sc.staff_id = b.staff_id 
        AND b.start_datetime >= sc.effective_from 
        AND (sc.effective_to IS NULL OR b.start_datetime < sc.effective_to)
      LEFT JOIN staff_item_commissions sic ON sic.staff_commission_id = sc.id 
        AND sic.item_type = 'product' AND sic.item_id = bp.product_id
      WHERE b.staff_id = ? AND b.status = 'completed'
      AND DATE(b.start_datetime) BETWEEN ? AND ?
    `, [id, periodStart, periodEnd]);

    productItems.forEach((item) => {
      const total = parseFloat(item.product_total || 0);
      const qty = parseInt(item.quantity || 1, 10);
      const cost = parseFloat(item.product_cost || 0) * qty;
      const discountTotal = parseFloat(item.booking_discount_total || 0);
      const grossTotal = parseFloat(item.booking_gross_total || 1); // prevent division by zero
      
      let apportionedDiscount = 0;
      if (deductDiscounts && discountTotal > 0) {
        apportionedDiscount = discountTotal * (total / grossTotal);
      }

      totalRevenue += total;

      const rate = item.override_rate !== null ? parseFloat(item.override_rate) : parseFloat(item.default_rate || 0);
      const net = Math.max(0, total - cost - apportionedDiscount);
      productsCommission += net * (rate / 100);
    });

    // 4. Fetch tips with historical rates
    const tipItems = await query(`
      SELECT 
        b.id as booking_id,
        pay.tip_amount,
        sc.tip_commission as tip_rate
      FROM bookings b
      JOIN payments pay ON pay.booking_id = b.id AND pay.status = 'paid'
      LEFT JOIN staff_commissions sc ON sc.staff_id = b.staff_id 
        AND b.start_datetime >= sc.effective_from 
        AND (sc.effective_to IS NULL OR b.start_datetime < sc.effective_to)
      WHERE b.staff_id = ? AND b.status = 'completed'
      AND DATE(b.start_datetime) BETWEEN ? AND ?
    `, [id, periodStart, periodEnd]);

    tipItems.forEach((item) => {
      const tip = parseFloat(item.tip_amount || 0);
      const rate = parseFloat(item.tip_rate || 100);
      tipsCommission += tip * (rate / 100);
    });

    // 5. Fetch approved timesheets and calculate base wages
    const timesheets = await query(`
      SELECT 
        ts.id as timesheet_id,
        ts.total_hours,
        sw.wage_type,
        sw.hourly_rate,
        sw.overtime_threshold_hours,
        sw.overtime_multiplier
      FROM staff_timesheets ts
      LEFT JOIN staff_wages sw ON sw.staff_id = ts.staff_id 
        AND ts.clock_in >= sw.effective_from 
        AND (sw.effective_to IS NULL OR ts.clock_in < sw.effective_to)
      WHERE ts.staff_id = ? AND ts.status = 'approved' AND ts.deleted_at IS NULL
      AND DATE(ts.clock_in) BETWEEN ? AND ?
    `, [id, periodStart, periodEnd]);

    let totalHourlyHours = 0;
    let baseHourlyRate = 0;
    let ovThreshold = null;
    let ovMultiplier = 1.5;

    timesheets.forEach((ts) => {
      if (ts.wage_type === 'hourly') {
        const hours = parseFloat(ts.total_hours || 0);
        totalHourlyHours += hours;
        baseHourlyRate = parseFloat(ts.hourly_rate || 0);
        if (ts.overtime_threshold_hours !== null) ovThreshold = parseFloat(ts.overtime_threshold_hours);
        if (ts.overtime_multiplier !== null) ovMultiplier = parseFloat(ts.overtime_multiplier);
      }
    });

    if (ovThreshold !== null && totalHourlyHours > ovThreshold) {
       const regularHours = ovThreshold;
       const ovHours = totalHourlyHours - ovThreshold;
       totalWages += (regularHours * baseHourlyRate) + (ovHours * baseHourlyRate * ovMultiplier);
    } else {
       totalWages += (totalHourlyHours * baseHourlyRate);
    }

    // 6. Fetch pending adjustments (clawbacks/bonuses)
    const pendingAdjustments = await query(
      `SELECT id, amount 
       FROM staff_pay_run_adjustments 
       WHERE staff_id = ? AND status = 'pending'`,
      [id]
    );

    let totalAdjustments = 0;
    pendingAdjustments.forEach(adj => {
      totalAdjustments += parseFloat(adj.amount || 0);
    });

    // Determine final payout
    // For simplicity, total payout = commissions + wages + adjustments
    const totalPayout = Math.max(0, servicesCommission + productsCommission + tipsCommission + totalWages + totalAdjustments);

    let insertedId = null;

    // Run insert in a transaction to lock the pay run items
    await transaction(async (conn) => {
      const [insertRes] = await conn.execute(
        `INSERT INTO staff_pay_runs 
         (salon_id, staff_id, period_start, period_end, status, total_revenue, total_services_commission, total_products_commission, total_tips_commission, total_wages, total_payout, created_by, created_at)
         VALUES (?, ?, ?, ?, 'generated', ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [staff.salon_id, id, periodStart, periodEnd, totalRevenue, servicesCommission, productsCommission, tipsCommission, totalWages, totalPayout, session.userId]
      );
      
      insertedId = insertRes.insertId;

      // Mark adjustments as applied
      if (pendingAdjustments.length > 0) {
        const adjIds = pendingAdjustments.map(a => a.id);
        await conn.query(
          `UPDATE staff_pay_run_adjustments 
           SET status = 'applied', applied_pay_run_id = ? 
           WHERE id IN (?)`,
          [insertedId, adjIds]
        );
      }

      // Ideally we would also insert staff_pay_run_items here to track exactly which bookings and timesheets were in this run,
      // but for this phase the aggregation is enough to establish the ledger lock.
    });

    return success({ 
      message: 'Pay run generated successfully',
      payRunId: insertedId,
      totalPayout 
    });

  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Generate pay run error:', err);
    return error('Failed to generate pay run', 500);
  }
}
