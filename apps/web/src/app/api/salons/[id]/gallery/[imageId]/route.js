import { decodeId } from '@/lib/id';
import { getOne, query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden, notFound, serverError } from '@/lib/response';
import { hasMinRole } from '@/lib/permissions';
import rateLimiter, { RateLimitPresets } from '@/lib/rate-limit';

// Helper to check if user has gallery management access
async function checkGalleryAccess(salonId, userId, role) {
  if (role === 'admin') return true;

  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ? AND deleted_at IS NULL', [salonId]);
  if (!salon) return false;
  if (salon.owner_id === userId) return true;

  const staffRow = await getOne(
    'SELECT role FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
    [salonId, userId]
  );
  if (staffRow && hasMinRole(staffRow.role, 'manager')) return true;

  return false;
}

// DELETE /api/salons/[id]/gallery/[imageId] — Delete a gallery image
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId, imageId: rawImageId } = await params;
    const salonId = decodeId(rawId);
    const imageId = decodeId(rawImageId);

    // Rate limit (20 requests per minute)
    const rateLimitKey = `gallery_delete:${session.userId}`;
    const rateCheck = rateLimiter.check(rateLimitKey, RateLimitPresets.API.maxAttempts, RateLimitPresets.API.windowMs);
    if (!rateCheck.success) {
      return error('Too many requests. Please try again later.', 429);
    }

    const hasAccess = await checkGalleryAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to delete gallery images');
    }

    // Verify the image belongs to this salon before deleting
    const image = await getOne(
      'SELECT id FROM salon_gallery WHERE id = ? AND salon_id = ?',
      [imageId, salonId]
    );

    if (!image) {
      return notFound('Gallery image not found');
    }

    // Hard DELETE — salon_gallery has no deleted_at column (as specified)
    await query('DELETE FROM salon_gallery WHERE id = ? AND salon_id = ?', [imageId, salonId]);

    return success({ message: 'Gallery image deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete gallery image error:', err);
    return serverError('Failed to delete gallery image');
  }
}
