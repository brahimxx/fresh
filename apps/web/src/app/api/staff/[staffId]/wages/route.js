import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';
import { decodeId } from '@/lib/id';

// GET /api/staff/[staffId]/wages - Get staff member's wages history and active settings
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
      return forbidden('Not authorized to view this wage data');
    }

    // Get active wage settings (explicitly where effective_to is null)
    const activeSetting = await getOne(
      'SELECT * FROM staff_wages WHERE staff_id = ? AND effective_to IS NULL',
      [id]
    );

    // Get all wage history, ordering by ID DESC as secondary to guarantee most recently created
    const wagesHistory = await query(
      'SELECT * FROM staff_wages WHERE staff_id = ? ORDER BY effective_from DESC, id DESC',
      [id]
    );

    const settings = activeSetting || (wagesHistory.length > 0 ? wagesHistory[0] : null);

    return success({
      staffId: parseInt(id),
      staffName: `${staff.first_name} ${staff.last_name}`,
      settings: settings
        ? {
            id: settings.id,
            wageType: settings.wage_type,
            hourlyRate: parseFloat(settings.hourly_rate || 0),
            salaryAmount: parseFloat(settings.salary_amount || 0),
            salaryPeriod: settings.salary_period,
            overtimeThresholdHours: settings.overtime_threshold_hours ? parseFloat(settings.overtime_threshold_hours) : null,
            overtimeMultiplier: parseFloat(settings.overtime_multiplier || 1.5),
            notes: settings.notes,
            currency: settings.currency || 'USD',
          }
        : null,
      history: wagesHistory.map((w) => ({
        id: w.id,
        wageType: w.wage_type,
        hourlyRate: parseFloat(w.hourly_rate || 0),
        salaryAmount: parseFloat(w.salary_amount || 0),
        salaryPeriod: w.salary_period,
        overtimeThresholdHours: w.overtime_threshold_hours ? parseFloat(w.overtime_threshold_hours) : null,
        overtimeMultiplier: parseFloat(w.overtime_multiplier || 1.5),
        notes: w.notes,
        effectiveFrom: w.effective_from,
        effectiveTo: w.effective_to,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get staff wages error:', err);
    return error('Failed to get wages', 500);
  }
}

// POST /api/staff/[staffId]/wages - Update staff wage structure atomically within a transaction
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawId } = await params;
    const id = decodeId(rawId);

    // Get staff and verify access
    const staff = await getOne(
      `SELECT st.id, st.salon_id, st.user_id, s.owner_id, s.currency
       FROM staff st 
       JOIN salons s ON s.id = st.salon_id
       WHERE st.id = ?`,
      [id]
    );

    if (!staff) {
      return error('Staff not found', 404);
    }

    // Only owner or admin can edit wages
    if (session.role !== 'admin' && Number(staff.owner_id) !== Number(session.userId)) {
      return forbidden('Only the salon owner can modify wage configurations');
    }

    const body = await request.json();
    const { 
      wageType, 
      hourlyRate, 
      salaryAmount, 
      salaryPeriod = 'monthly',
      overtimeThresholdHours = 40.0,
      overtimeMultiplier = 1.5,
      notes = ''
    } = body;

    // Validate main inputs
    if (!['hourly', 'salary', 'commission_only'].includes(wageType)) {
      return error('Invalid wage type', 400);
    }

    const hr = parseFloat(hourlyRate || 0);
    const sa = parseFloat(salaryAmount || 0);

    if (isNaN(hr) || isNaN(sa) || hr < 0 || sa < 0) {
      return error('Rates and salary amounts must be valid non-negative numbers', 400);
    }

    // Process inside a transaction to ensure ledger integrity
    await transaction(async (conn) => {
      // 1. Close out the currently active wage record
      await conn.execute(
        `UPDATE staff_wages 
         SET effective_to = NOW() 
         WHERE staff_id = ? AND effective_to IS NULL`,
        [id]
      );

      // 2. Insert the new wage rate effective immediately
      await conn.execute(
        `INSERT INTO staff_wages 
         (staff_id, wage_type, hourly_rate, salary_amount, salary_period, overtime_threshold_hours, overtime_multiplier, currency, notes, effective_from)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id, wageType, hr, sa, salaryPeriod, overtimeThresholdHours, overtimeMultiplier, staff.currency || 'USD', notes]
      );
    });

    return success({ message: 'Wage structure updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update staff wages error:', err);
    return error('Failed to update wages', 500);
  }
}
