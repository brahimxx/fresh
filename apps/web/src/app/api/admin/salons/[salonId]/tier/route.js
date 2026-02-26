import { success, error, unauthorized } from '@/lib/response';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(request, { params }) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized('Admin access required');
        }

        const { salonId } = await params;
        const body = await request.json().catch(() => ({}));
        const { planTier } = body;

        const validTiers = ['basic', 'pro', 'enterprise'];
        if (!validTiers.includes(planTier)) {
            return error({ message: 'Invalid plan tier. Must be basic, pro, or enterprise.' }, 400);
        }

        const result = await query(
            `UPDATE salons SET plan_tier = ? WHERE id = ?`,
            [planTier, salonId]
        );

        if (result.affectedRows === 0) {
            return error({ message: 'Salon not found' }, 404);
        }

        return success({
            message: `Successfully updated salon to ${planTier.toUpperCase()} tier`,
            planTier
        });
    } catch (err) {
        console.error('Admin Plan Tier API Error:', err);
        return error({ message: 'Failed to update salon tier' }, 500);
    }
}
