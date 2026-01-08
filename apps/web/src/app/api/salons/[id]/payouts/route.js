import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// GET /api/salons/[id]/payouts - Get salon payouts
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Verify ownership
    const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [id]);
    if (!salon) {
      return error('Salon not found', 404);
    }

    if (session.role !== 'admin' && salon.owner_id !== session.userId) {
      return forbidden('Not authorized to view payouts');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, processing, completed, failed
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM payouts WHERE salon_id = ?';
    const sqlParams = [id];

    if (status) {
      sql += ' AND status = ?';
      sqlParams.push(status);
    }

    if (startDate) {
      sql += ' AND DATE(created_at) >= ?';
      sqlParams.push(startDate);
    }

    if (endDate) {
      sql += ' AND DATE(created_at) <= ?';
      sqlParams.push(endDate);
    }

    // Get total count
    const [countResult] = await query(sql.replace('SELECT *', 'SELECT COUNT(*) as total'), sqlParams);
    const total = countResult.total;

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    sqlParams.push(limit, offset);

    const payouts = await query(sql, sqlParams);

    // Get summary stats
    const [summary] = await query(
      `SELECT 
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
       FROM payouts WHERE salon_id = ?`,
      [id]
    );

    return success({
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: parseFloat(p.amount),
        currency: p.currency || 'EUR',
        status: p.status,
        method: p.method,
        reference: p.reference,
        periodStart: p.period_start,
        periodEnd: p.period_end,
        createdAt: p.created_at,
        paidAt: p.paid_at,
      })),
      summary: {
        totalPaid: parseFloat(summary.total_paid || 0),
        pendingAmount: parseFloat(summary.pending_amount || 0),
        completedCount: parseInt(summary.completed_count || 0),
        pendingCount: parseInt(summary.pending_count || 0),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get payouts error:', err);
    return error('Failed to get payouts', 500);
  }
}
