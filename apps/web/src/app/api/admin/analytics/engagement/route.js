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

        // 1. Peak Booking Hours (last 30 days)
        const peakHoursSql = `
            SELECT 
                HOUR(start_datetime) as hour, 
                COUNT(*) as booking_count
            FROM bookings
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY HOUR(start_datetime)
            ORDER BY hour ASC
        `;
        const peakHoursData = await query(peakHoursSql);

        // 2. Popular Categories (last 30 days)
        const popularCategoriesSql = `
            SELECT 
                COALESCE(s.category, 'Other') as category, 
                COUNT(b.id) as booking_count
            FROM bookings b
            JOIN salons s ON b.salon_id = s.id
            WHERE b.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY COALESCE(s.category, 'Other')
            ORDER BY booking_count DESC
        `;
        const popularCategoriesData = await query(popularCategoriesSql);

        return success({
            peakHours: peakHoursData.map(d => ({
                hour: d.hour,
                count: d.booking_count
            })),
            categories: popularCategoriesData.map(d => ({
                name: d.category,
                count: d.booking_count
            })),
        });

    } catch (err) {
        console.error('Engagement Analytics API Error:', err);
        return error({ message: 'Failed to fetch engagement analytics' }, 500);
    }
}
