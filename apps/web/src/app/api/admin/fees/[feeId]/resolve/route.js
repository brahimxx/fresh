import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden, notFound } from '@/lib/response';

// PUT /api/admin/fees/[feeId]/resolve - Resolve a fee dispute
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') return forbidden('Admin access required');

    const { feeId } = await params;

    const fee = await getOne('SELECT * FROM platform_fees WHERE id = ?', [feeId]);
    if (!fee) return notFound('Fee not found');

    const body = await request.json();
    const { resolution, newStatus, adjustedAmount, notes } = body;

    if (!resolution || !newStatus) {
      return error('Resolution and new status are required');
    }

    if (!['collected', 'waived', 'adjusted'].includes(newStatus)) {
      return error('Invalid status');
    }

    const finalAmount = newStatus === 'waived' ? 0 : (adjustedAmount || fee.amount);

    await query(
      `UPDATE platform_fees SET 
        status = ?,
        amount = ?,
        resolution = ?,
        resolution_notes = ?,
        resolved_by = ?,
        resolved_at = NOW()
       WHERE id = ?`,
      [newStatus === 'adjusted' ? 'collected' : newStatus, finalAmount, resolution, notes || null, session.userId, feeId]
    );

    // Notify salon owner
    const salon = await getOne('SELECT owner_id, name FROM salons WHERE id = ?', [fee.salon_id]);
    if (salon) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, data, created_at)
         VALUES (?, 'fee_resolved', 'Fee Dispute Resolved', ?, ?, NOW())`,
        [
          salon.owner_id,
          `Your fee dispute for ${salon.name} has been ${newStatus}. ${notes || ''}`,
          JSON.stringify({ feeId, resolution, newStatus }),
        ]
      );
    }

    return success({
      message: 'Fee resolved successfully',
      feeId: parseInt(feeId),
      newStatus,
      finalAmount,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Resolve fee error:', err);
    return error('Failed to resolve fee', 500);
  }
}
