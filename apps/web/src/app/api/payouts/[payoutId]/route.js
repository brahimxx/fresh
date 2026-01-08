import { getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden, notFound } from '@/lib/response';

// GET /api/payouts/[payoutId] - Get payout details
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { payoutId } = await params;

    const payout = await getOne(
      `SELECT p.*, s.owner_id, s.name as salon_name
       FROM payouts p
       JOIN salons s ON s.id = p.salon_id
       WHERE p.id = ?`,
      [payoutId]
    );

    if (!payout) {
      return notFound('Payout not found');
    }

    if (session.role !== 'admin' && payout.owner_id !== session.userId) {
      return forbidden('Not authorized to view this payout');
    }

    return success({
      id: payout.id,
      salonId: payout.salon_id,
      salonName: payout.salon_name,
      amount: parseFloat(payout.amount),
      currency: payout.currency || 'EUR',
      status: payout.status,
      method: payout.method,
      reference: payout.reference,
      bankAccount: payout.bank_account_last4 ? `****${payout.bank_account_last4}` : null,
      periodStart: payout.period_start,
      periodEnd: payout.period_end,
      bookingsCount: payout.bookings_count,
      grossAmount: parseFloat(payout.gross_amount || payout.amount),
      feesDeducted: parseFloat(payout.fees_deducted || 0),
      netAmount: parseFloat(payout.amount),
      createdAt: payout.created_at,
      paidAt: payout.paid_at,
      failureReason: payout.failure_reason,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get payout error:', err);
    return error('Failed to get payout', 500);
  }
}
