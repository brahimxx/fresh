import { success, error, unauthorized } from '@/lib/response';
import pool, { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

export async function POST(request, { params }) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized('Admin access required');
        }

        const { id: bookingId } = await params;
        const { amount, reason } = await request.json().catch(() => ({}));

        // Find the payment associated with this booking
        const [payment] = await query(
            `SELECT * FROM payments WHERE booking_id = ?`,
            [bookingId]
        );

        if (!payment) {
            return error({ message: 'No payment found for this booking' }, 404);
        }

        if (payment.status === 'refunded') {
            return error({ message: 'Payment is already fully refunded' }, 400);
        }

        const maxRefundable = parseFloat(payment.amount) - parseFloat(payment.refunded_amount || 0);
        const refundAmount = amount ? parseFloat(amount) : maxRefundable;

        if (refundAmount <= 0 || refundAmount > maxRefundable) {
            return error({ message: `Invalid refund amount. Maximum refundable is ${maxRefundable}` }, 400);
        }

        if (!payment.stripe_payment_id) {
            return error({ message: 'No Stripe Payment ID found for this booking' }, 400);
        }

        // Live Stripe refund
        const stripeRefund = await stripe.refunds.create({
            payment_intent: payment.stripe_payment_id,
            amount: Math.round(refundAmount * 100)
        });

        const stripeRefundId = stripeRefund.id;

        // Calculate new status
        const newRefundedTotal = parseFloat(payment.refunded_amount || 0) + refundAmount;
        const newStatus = newRefundedTotal >= parseFloat(payment.amount) ? 'refunded' : 'paid';

        // Use a dedicated connection for proper transactional isolation
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // 1. Insert refund record
            const [refundInsertResult] = await conn.query(
                `INSERT INTO refunds (payment_id, amount, reason, stripe_refund_id, status, processed_by) 
         VALUES (?, ?, ?, ?, ?, ?)`,
                [payment.id, refundAmount, reason || 'Admin override refund', stripeRefundId, 'completed', session.userId]
            );

            // Audit
            await conn.query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data) VALUES (?, ?, ?, ?, ?)`,
                [
                    session.userId,
                    'execute_refund',
                    'refund',
                    refundInsertResult.insertId,
                    JSON.stringify({ amount: refundAmount, payment_id: payment.id, booking_id: bookingId, refund_id: stripeRefundId })
                ]
            );

            // 2. Update payment record
            await conn.query(
                `UPDATE payments SET refunded_amount = ?, status = ? WHERE id = ?`,
                [newRefundedTotal, newStatus, payment.id]
            );

            // 3. Handle Platform Fees — mark as unpaid so they don't factor into payouts
            if (newStatus === 'refunded') {
                await conn.query(
                    `UPDATE platform_fees SET is_paid = 0 WHERE booking_id = ?`,
                    [bookingId]
                );
            }

            // 4. Update booking status to cancelled if fully refunded
            if (newStatus === 'refunded') {
                await conn.query(
                    `UPDATE bookings SET status = 'cancelled', cancellation_reason = ? WHERE id = ? AND status != 'cancelled'`,
                    [`Admin globally refunded. Reason: ${reason || 'Unknown'}`, bookingId]
                );
            }

            await conn.commit();

            return success({
                message: `Successfully refunded ${refundAmount}`,
                refundId: stripeRefundId,
                newStatus
            });

        } catch (txError) {
            await conn.rollback();
            throw txError;
        } finally {
            conn.release();
        }

    } catch (err) {
        console.error('Admin Refund API Error:', err);
        return error({ message: 'Failed to process global refund' }, 500);
    }
}
