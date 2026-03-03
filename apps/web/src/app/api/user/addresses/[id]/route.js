import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/response';

// DELETE /api/user/addresses/[id]
// Soft delete an address
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const addressId = parseInt(id);

    if (!addressId) {
      return error('Invalid address ID', 400);
    }

    // Soft delete (only if it belongs to the user and isn't already deleted)
    const result = await query(
      `UPDATE user_addresses 
       SET deleted_at = NOW() 
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [addressId, session.userId]
    );

    if (result.affectedRows === 0) {
      return error('Address not found or unauthorized', 404);
    }

    return success({ success: true, message: 'Address removed successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Failed to delete address:', err);
    return error('Failed to delete address', 500);
  }
}
