import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/response';

export async function GET(request) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized('Admin access required');
        }

        const logs = await query(`
            SELECT 
                al.id, 
                al.action, 
                al.entity_type, 
                al.entity_id, 
                al.old_data, 
                al.new_data, 
                al.ip_address, 
                al.created_at,
                u.email as user_email,
                u.first_name,
                u.last_name,
                u.role as user_role
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT 100
        `);

        return success(logs);
    } catch (err) {
        console.error('Audit Logs API Error:', err);
        return error({ message: 'Failed to fetch audit logs' }, 500);
    }
}
