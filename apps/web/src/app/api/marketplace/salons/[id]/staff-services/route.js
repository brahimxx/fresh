import { query } from '@/lib/db';
import { success, error } from '@/lib/response';

// GET /api/marketplace/salons/[id]/staff-services - Get allowed staff per service mapping
export async function GET(request, { params }) {
    try {
        const { id } = await params;

        // Fetch mapping strictly for active services and active/visible staff belonging to the salon
        const mappings = await query(
            `SELECT ss.service_id, ss.staff_id
       FROM service_staff ss
       JOIN services s ON s.id = ss.service_id
       JOIN staff st ON st.id = ss.staff_id
       WHERE st.salon_id = ?
         AND s.is_active = 1
         AND st.is_active = 1
         AND st.is_visible = 1
         AND s.deleted_at IS NULL`,
            [id]
        );

        return success(mappings);

    } catch (err) {
        console.error('Get salon staff-services error:', err);
        return error('Failed to load staff-service mappings', 500);
    }
}
