import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, forbidden, notFound } from '@/lib/response';
import { validate, updateSalonStatusSchema } from '@/lib/validate';

// PATCH /api/admin/salons/[salonId]/status
export async function PATCH(request, { params }) {
  try {
    const session = await requireAuth();
    if (session.role !== 'admin') {
      return forbidden('Admin access required');
    }

    const { salonId } = await params;

    // Check if salon exists
    const salon = await getOne('SELECT id, is_active FROM salons WHERE id = ?', [salonId]);
    if (!salon) {
      return notFound('Salon not found');
    }

    const body = await request.json();
    const validation = validate(updateSalonStatusSchema, body);
    
    if (!validation.success) {
      return error({ code: "VALIDATION_ERROR", message: validation.errors }, 400);
    }

    const { isActive } = validation.data;
    const isActiveInt = isActive ? 1 : 0;

    // Update status
    await query(
      'UPDATE salons SET is_active = ? WHERE id = ?',
      [isActiveInt, salonId]
    );

    return success({
      message: `Salon ${isActive ? 'activated' : 'deactivated'} successfully`,
      salonId: Number(salonId),
      isActive
    });

  } catch (err) {
    if (err.message === 'Unauthorized') return error(err.message, 401);
    console.error('Update salon status error:', err);
    return error('Failed to update salon status', 500);
  }
}
