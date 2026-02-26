import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/admin/fees - Get all platform fees (admin only)
export async function GET(request) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, collected, disputed, waived
    const salonId = searchParams.get('salonId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT pf.*, s.name as salon_name, b.id as booking_id
      FROM platform_fees pf
      JOIN salons s ON s.id = pf.salon_id
      LEFT JOIN bookings b ON b.id = pf.booking_id
      WHERE 1=1
    `;
    const sqlParams = [];

    if (status) {
      sql += ' AND pf.status = ?';
      sqlParams.push(status);
    }

    if (salonId) {
      sql += ' AND pf.salon_id = ?';
      sqlParams.push(salonId);
    }

    // Get total
    const countSql = sql.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await query(countSql, sqlParams);

    // Get summary
    const [summary] = await query(
      `SELECT 
        SUM(CASE WHEN is_paid = 1 THEN amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN is_paid = 0 THEN amount ELSE 0 END) as total_pending
       FROM platform_fees`,
      []
    );

    sql += ' ORDER BY pf.id DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const fees = await query(sql, sqlParams);

    return success({
      fees: fees.map((f) => ({
        id: f.id,
        salonId: f.salon_id,
        salonName: f.salon_name,
        bookingId: f.booking_id,
        amount: parseFloat(f.amount),
        feeType: f.type, // DB uses 'type'
        status: f.is_paid ? 'collected' : 'pending', // DB uses 'is_paid'
        description: f.description || '', // might not exist
        createdAt: f.created_at || new Date().toISOString(), // fallback 
      })),
      summary: {
        totalCollected: parseFloat(summary.total_collected || 0),
        totalPending: parseFloat(summary.total_pending || 0),
        totalDisputed: 0, // Not supported in DB yet
        disputedCount: 0,
      },
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Admin get fees error:', err);
    return error('Failed to get fees', 500);
  }
}
