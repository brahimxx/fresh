import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/response';

export async function GET(request) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized();
        }

        // Find salons that are active but have ZERO services OR ZERO business hours defined
        // This is a classic "Partially Onboarded" definition
        const sql = `
            SELECT 
                s.id as salon_id, 
                s.name as salon_name, 
                s.created_at as salon_created_at,
                u.id as owner_id,
                u.first_name as owner_first_name,
                u.last_name as owner_last_name,
                u.email as owner_email,
                u.phone as owner_phone,
                (SELECT COUNT(*) FROM services sv WHERE sv.salon_id = s.id) as total_services,
                (SELECT COUNT(*) FROM business_hours bh WHERE bh.salon_id = s.id) as total_business_hours
            FROM salons s
            JOIN users u ON s.owner_id = u.id
            WHERE s.is_active = 1
            HAVING total_services = 0 OR total_business_hours = 0
            ORDER BY s.created_at DESC
        `;

        const rows = await query(sql);

        const formatted = rows.map(row => ({
            salonId: row.salon_id,
            salonName: row.salon_name,
            createdAt: row.salon_created_at,
            owner: {
                id: row.owner_id,
                name: `${row.owner_first_name} ${row.owner_last_name}`,
                email: row.owner_email,
                phone: row.owner_phone
            },
            status: {
                missingServices: row.total_services === 0,
                missingHours: row.total_business_hours === 0,
            }
        }));

        return success(formatted);
    } catch (err) {
        console.error('Fetch Onboarding Concierge Error:', err);
        return error({ message: 'Failed to fetch concierge data' }, 500);
    }
}
