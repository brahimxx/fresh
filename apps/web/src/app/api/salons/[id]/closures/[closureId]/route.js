import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden, notFound } from '@/lib/response';

async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  if (!salon) return false;
  if (salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// DELETE /api/salons/[id]/closures/[closureId] - Remove a closure date
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { id, closureId } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) return forbidden('Not authorized');

    const closure = await getOne(
      'SELECT id FROM salon_closures WHERE id = ? AND salon_id = ?',
      [closureId, id]
    );
    if (!closure) return notFound('Closure not found');

    await query('DELETE FROM salon_closures WHERE id = ?', [closureId]);

    return success({ message: 'Closure removed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete closure error:', err);
    return error('Failed to delete closure', 500);
  }
}
