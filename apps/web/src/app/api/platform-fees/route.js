import { query, getOne } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/platform-fees - Get platform fees (admin or salon owner)
export async function GET(request) {
  try {
    const session = await requireRole(['admin', 'owner']);
    const { searchParams } = new URL(request.url);

    const salonId = searchParams.get('salonId');
    const isPaid = searchParams.get('isPaid');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT pf.*, s.name as salon_name, b.start_datetime
      FROM platform_fees pf
      JOIN salons s ON s.id = pf.salon_id
      JOIN bookings b ON b.id = pf.booking_id
      WHERE 1=1
    `;
    const params = [];

    if (session.role === 'owner') {
      sql += ' AND s.owner_id = ?';
      params.push(session.userId);
    }

    if (salonId) {
      sql += ' AND pf.salon_id = ?';
      params.push(salonId);
    }

    if (isPaid !== null && isPaid !== undefined) {
      sql += ' AND pf.is_paid = ?';
      params.push(isPaid === 'true' ? 1 : 0);
    }

    if (type) {
      sql += ' AND pf.type = ?';
      params.push(type);
    }

    sql += ' ORDER BY b.start_datetime DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const fees = await query(sql, params);

    // Get summary
    let summarySql = `
      SELECT 
        COUNT(*) as total_count,
        SUM(amount) as total_amount,
        SUM(CASE WHEN is_paid = 0 THEN amount ELSE 0 END) as unpaid_amount
      FROM platform_fees pf
      JOIN salons s ON s.id = pf.salon_id
      WHERE 1=1
    `;
    const summaryParams = [];

    if (session.role === 'owner') {
      summarySql += ' AND s.owner_id = ?';
      summaryParams.push(session.userId);
    }

    if (salonId) {
      summarySql += ' AND pf.salon_id = ?';
      summaryParams.push(salonId);
    }

    const [summary] = await query(summarySql, summaryParams);

    return success({
      fees: fees.map((f) => ({
        id: f.id,
        bookingId: f.booking_id,
        salonId: f.salon_id,
        salonName: f.salon_name,
        bookingDatetime: f.start_datetime,
        type: f.type,
        amount: f.amount,
        isPaid: f.is_paid,
      })),
      summary: {
        totalCount: summary.total_count,
        totalAmount: summary.total_amount || 0,
        unpaidAmount: summary.unpaid_amount || 0,
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    if (err.message === 'Forbidden') return forbidden();
    console.error('Get platform fees error:', err);
    return error('Failed to get platform fees', 500);
  }
}

// PUT /api/platform-fees - Mark fees as paid (admin only)
export async function PUT(request) {
  try {
    await requireRole(['admin']);

    const body = await request.json();
    const { feeIds } = body;

    if (!feeIds || !Array.isArray(feeIds) || feeIds.length === 0) {
      return error('Fee IDs are required');
    }

    await query(
      `UPDATE platform_fees SET is_paid = 1 WHERE id IN (${feeIds.map(() => '?').join(',')})`,
      feeIds
    );

    return success({ message: `${feeIds.length} fees marked as paid` });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    if (err.message === 'Forbidden') return forbidden();
    console.error('Update platform fees error:', err);
    return error('Failed to update platform fees', 500);
  }
}
