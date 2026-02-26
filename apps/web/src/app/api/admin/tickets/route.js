import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/response';

export async function GET(request) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized();
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'all';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        let sql = `
            SELECT t.*, u.email as user_email, u.first_name, u.last_name, u.role as user_role
            FROM support_tickets t
            JOIN users u ON t.user_id = u.id
        `;
        let countSql = `SELECT COUNT(*) as total FROM support_tickets t JOIN users u ON t.user_id = u.id`;
        let params = [];

        if (status !== 'all') {
            sql += ` WHERE t.status = ?`;
            countSql += ` WHERE t.status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY 
            CASE t.priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'normal' THEN 3 
                WHEN 'low' THEN 4 
            END,
            t.created_at DESC 
            LIMIT ? OFFSET ?
        `;
        params.push(limit, offset);

        const rows = await query(sql, params);
        const countRows = await query(countSql, status !== 'all' ? [status] : []);
        const total = countRows[0].total;

        return success({
            tickets: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        console.error('Fetch Admin Tickets Error:', err);
        return error({ message: 'Failed to fetch tickets' }, 500);
    }
}
