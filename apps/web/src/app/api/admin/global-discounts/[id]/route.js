import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/response';

export async function PATCH(request, { params }) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized('Admin access required');
        }

        const { id } = await params;
        const body = await request.json();
        const { isActive } = body;

        if (typeof isActive === 'undefined') {
            return error({ message: 'isActive flag is required' }, 400);
        }

        await query(`
            UPDATE global_discounts 
            SET is_active = ? 
            WHERE id = ?
        `, [isActive ? 1 : 0, id]);

        return success({ message: `Discount status updated` });
    } catch (err) {
        console.error('Global Discounts PATCH Error:', err);
        return error({ message: 'Failed to update global discount' }, 500);
    }
}
