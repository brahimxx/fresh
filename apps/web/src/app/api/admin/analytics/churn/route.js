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

        // Identify salons where the last booking or last client visit is older than 30 days
        const churnSql = `
            SELECT 
                s.id, 
                s.name as salon_name, 
                s.email as contact_email, 
                s.phone as contact_phone, 
                s.plan_tier,
                MAX(b.created_at) as last_booking_date,
                MAX(sc.last_visit_date) as last_client_visit
            FROM salons s
            LEFT JOIN bookings b ON s.id = b.salon_id
            LEFT JOIN salon_clients sc ON s.id = sc.salon_id AND sc.is_active = 1
            WHERE s.is_active = 1 AND s.deleted_at IS NULL
            GROUP BY s.id, s.name, s.email, s.phone, s.plan_tier
            HAVING (last_booking_date IS NULL OR last_booking_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY))
               AND (last_client_visit IS NULL OR last_client_visit < DATE_SUB(CURDATE(), INTERVAL 30 DAY))
            ORDER BY last_booking_date ASC
        `;

        const atRiskSalons = await query(churnSql);

        return success({
            atRiskSalons: atRiskSalons.map(s => ({
                id: s.id,
                salonName: s.salon_name,
                email: s.contact_email,
                phone: s.contact_phone,
                planTier: s.plan_tier || 'basic',
                lastBookingDate: s.last_booking_date,
                lastClientVisit: s.last_client_visit,
                // Calculate days since last activity for UI convenience
                daysInactive: Math.floor((new Date() - new Date(Math.max(
                    new Date(s.last_booking_date || 0).getTime(),
                    new Date(s.last_client_visit || 0).getTime()
                ))) / (1000 * 60 * 60 * 24))
            }))
        });

    } catch (err) {
        console.error('Churn Analytics API Error:', err);
        return error({ message: 'Failed to fetch churn analytics' }, 500);
    }
}
