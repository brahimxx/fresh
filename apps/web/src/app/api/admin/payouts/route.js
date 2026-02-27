import { success, error, unauthorized } from '@/lib/response';
import { query, getOne } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

export async function GET(request) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized('Admin access required');
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 20;
        const page = parseInt(searchParams.get('page')) || 1;
        const offset = (page - 1) * limit;

        // Calculate payouts. We're looking for net balances of active bookings that haven't been factored into a payout yet.
        // For MVP payouts logic, we will aggregate total volume - total platform fees - total refunds.
        const sql = `
      SELECT 
        s.id as salon_id,
        s.name as salon_name,
        u.email as owner_email,
        -- Gross Volume: Sum of all completed/confirmed bookings where a payment is marked paid (excluding tip/refunds handled separately ideally, but using net amount)
        COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') AND p.status = 'paid' THEN (p.amount - COALESCE(p.refunded_amount, 0) - COALESCE(p.tip_amount, 0)) ELSE 0 END), 0) as gross_volume,
        -- Platform Fees: Sum of platform fees taken for these bookings
        COALESCE((SELECT SUM(pf.amount) FROM platform_fees pf WHERE pf.salon_id = s.id AND pf.is_paid = 1), 0) as total_platform_fees,
        -- Refunds: Sum of global refunds issued
        COALESCE((SELECT SUM(r.amount) FROM refunds r JOIN payments rp ON r.payment_id = rp.id JOIN bookings rb ON rp.booking_id = rb.id WHERE rb.salon_id = s.id), 0) as total_refunds,
        -- Payouts Already Sent
        COALESCE((SELECT SUM(py.amount) FROM payouts py WHERE py.salon_id = s.id AND py.status IN ('completed', 'processing')), 0) as already_paid_out
      FROM salons s
      LEFT JOIN users u ON s.owner_id = u.id
      LEFT JOIN bookings b ON s.id = b.salon_id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE s.deleted_at IS NULL
      GROUP BY s.id, s.name, u.email
      -- We only want to show salons that have a positive net balance owing
      HAVING (gross_volume - total_platform_fees - total_refunds - already_paid_out) > 0
      ORDER BY (gross_volume - total_platform_fees - total_refunds - already_paid_out) DESC
      LIMIT ? OFFSET ?
    `;

        const balances = await query(sql, [limit, offset]);

        // Count total for pagination (slightly complex due to having clause, using subquery)
        const [countResult] = await query(`
      SELECT COUNT(*) as total FROM (
        SELECT s.id,
          COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') AND p.status = 'paid' THEN (p.amount - COALESCE(p.refunded_amount, 0) - COALESCE(p.tip_amount, 0)) ELSE 0 END), 0) as gv,
          COALESCE((SELECT SUM(amount) FROM platform_fees WHERE salon_id = s.id AND is_paid = 1), 0) as pf,
          COALESCE((SELECT SUM(r.amount) FROM refunds r JOIN payments rp ON r.payment_id = rp.id JOIN bookings rb ON rp.booking_id = rb.id WHERE rb.salon_id = s.id), 0) as rf,
          COALESCE((SELECT SUM(amount) FROM payouts WHERE salon_id = s.id AND status IN ('completed', 'processing')), 0) as pa
        FROM salons s
        LEFT JOIN bookings b ON s.id = b.salon_id
        LEFT JOIN payments p ON b.id = p.booking_id
        WHERE s.deleted_at IS NULL
        GROUP BY s.id
        HAVING (gv - pf - rf - pa) > 0
      ) as sub
    `);

        // Calculate totals across ALL salons
        const [summaryResult] = await query(`
        SELECT 
          SUM(gv) as total_gross,
          SUM(pf) as total_fees,
          SUM(rf) as total_refunds,
          SUM(gv - pf - rf - pa) as total_pending_payouts
        FROM (
          SELECT s.id,
          COALESCE(SUM(CASE WHEN b.status IN ('completed', 'confirmed') AND p.status = 'paid' THEN (p.amount - COALESCE(p.refunded_amount, 0) - COALESCE(p.tip_amount, 0)) ELSE 0 END), 0) as gv,
          COALESCE((SELECT SUM(amount) FROM platform_fees WHERE salon_id = s.id AND is_paid = 1), 0) as pf,
          COALESCE((SELECT SUM(r.amount) FROM refunds r JOIN payments rp ON r.payment_id = rp.id JOIN bookings rb ON rp.booking_id = rb.id WHERE rb.salon_id = s.id), 0) as rf,
          COALESCE((SELECT SUM(amount) FROM payouts WHERE salon_id = s.id AND status IN ('completed', 'processing')), 0) as pa
        FROM salons s
        LEFT JOIN bookings b ON s.id = b.salon_id
        LEFT JOIN payments p ON b.id = p.booking_id
        WHERE s.deleted_at IS NULL
        GROUP BY s.id
        ) as sum_sub
    `);

        return success({
            balances: balances.map(b => ({
                salonId: b.salon_id,
                salonName: b.salon_name,
                ownerEmail: b.owner_email,
                grossVolume: parseFloat(b.gross_volume),
                platformFees: parseFloat(b.total_platform_fees),
                refunds: parseFloat(b.total_refunds),
                alreadyPaidOut: parseFloat(b.already_paid_out),
                netPayable: parseFloat((b.gross_volume - b.total_platform_fees - b.total_refunds - b.already_paid_out).toFixed(2))
            })),
            summary: {
                totalGross: parseFloat(summaryResult?.total_gross || 0),
                totalFees: parseFloat(summaryResult?.total_fees || 0),
                totalRefunds: parseFloat(summaryResult?.total_refunds || 0),
                totalPendingPayouts: Math.max(0, parseFloat(summaryResult?.total_pending_payouts || 0))
            },
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit),
            },
        });

    } catch (err) {
        console.error('Payouts API Error:', err);
        return error({ message: 'Failed to calculate payouts' }, 500);
    }
}

export async function POST(request) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized('Admin access required');
        }

        const { payouts } = await request.json();
        // Expects an array of objects: [{ salonId: 1, amount: 250.00, periodStart: '...', periodEnd: '...' }]

        if (!Array.isArray(payouts) || payouts.length === 0) {
            return error({ message: 'Invalid payload: expects an array of payouts' }, 400);
        }

        const results = [];
        const errors = [];

        for (const payout of payouts) {
            if (!payout.salonId || !payout.amount) {
                errors.push({ salonId: payout.salonId, error: 'Missing required fields' });
                continue;
            }

            try {
                // Fetch the salon's connected Stripe account ID
                const salon = await getOne('SELECT stripe_account_id FROM salons WHERE id = ?', [payout.salonId]);

                if (!salon || !salon.stripe_account_id) {
                    throw new Error('Salon does not have a connected Stripe account');
                }

                // Call Stripe Connect API to transfer funds
                const stripeTransfer = await stripe.transfers.create({
                    amount: Math.round(payout.amount * 100), // Stripe expects amounts in cents
                    currency: 'eur',
                    destination: salon.stripe_account_id,
                    metadata: {
                        salonId: payout.salonId.toString(),
                        periodStart: payout.periodStart,
                        periodEnd: payout.periodEnd
                    }
                });

                const stripeTransferId = stripeTransfer.id;

                const insertResult = await query(
                    `INSERT INTO payouts (salon_id, amount, status, stripe_transfer_id, period_start, period_end) 
           VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        payout.salonId,
                        payout.amount,
                        'completed',
                        stripeTransferId,
                        payout.periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
                        payout.periodEnd || new Date().toISOString().slice(0, 19).replace('T', ' ')
                    ]
                );

                // Record audit log
                await query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data) VALUES (?, ?, ?, ?, ?)`,
                    [
                        session.userId,
                        'execute_payout',
                        'payout',
                        insertResult.insertId,
                        JSON.stringify({ amount: payout.amount, salon_id: payout.salonId, transfer_id: stripeTransferId })
                    ]
                );

                results.push({
                    salonId: payout.salonId,
                    payoutId: insertResult.insertId,
                    amount: payout.amount,
                    transferId: stripeTransferId
                });
            } catch (err) {
                console.error(`Failed to process payout for salon ${payout.salonId}:`, err);
                errors.push({ salonId: payout.salonId, error: err.message });
            }
        }

        return success({
            message: `Processed ${results.length} payouts successfully.`,
            successful: results,
            failed: errors
        });

    } catch (err) {
        console.error('Payout Approval API Error:', err);
        return error({ message: 'Failed to approve payouts' }, 500);
    }
}

