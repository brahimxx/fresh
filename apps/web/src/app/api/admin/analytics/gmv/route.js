import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/response';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized('Admin access required');
        }

        // Daily GMV over the last 60 days
        const dailySql = `
            SELECT 
                DATE(p.created_at) as date,
                SUM(p.amount - COALESCE(p.refunded_amount, 0) - COALESCE(p.tip_amount, 0)) as daily_gmv
            FROM payments p
            WHERE p.status = 'paid'
              AND p.created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
            GROUP BY DATE(p.created_at)
            ORDER BY date ASC
        `;
        const dailyData = await query(dailySql);

        // This Month GMV
        const thisMonthSql = `
            SELECT SUM(p.amount - COALESCE(p.refunded_amount, 0) - COALESCE(p.tip_amount, 0)) as total
            FROM payments p
            WHERE p.status = 'paid'
              AND MONTH(p.created_at) = MONTH(CURRENT_DATE())
              AND YEAR(p.created_at) = YEAR(CURRENT_DATE())
        `;
        const thisMonthResult = await query(thisMonthSql);

        // Last Month GMV
        const lastMonthSql = `
            SELECT SUM(p.amount - COALESCE(p.refunded_amount, 0) - COALESCE(p.tip_amount, 0)) as total
            FROM payments p
            WHERE p.status = 'paid'
              AND MONTH(p.created_at) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)
              AND YEAR(p.created_at) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH)
        `;
        const lastMonthResult = await query(lastMonthSql);

        return success({
            daily: dailyData.map(d => ({
                date: d.date,
                gmv: parseFloat(d.daily_gmv || 0)
            })),
            thisMonth: parseFloat(thisMonthResult[0]?.total || 0),
            lastMonth: parseFloat(lastMonthResult[0]?.total || 0)
        });

    } catch (err) {
        console.error('GMV Analytics API Error:', err);
        return error({ message: 'Failed to fetch GMV analytics' }, 500);
    }
}
