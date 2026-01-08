import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';

// Helper to check if user owns the salon
async function checkSalonOwnership(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  return salon && salon.owner_id === userId;
}

// GET /api/salons/[id]/photos - Get salon photos
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const photos = await query(
      'SELECT id, image_url, is_cover FROM salon_photos WHERE salon_id = ? ORDER BY is_cover DESC',
      [id]
    );

    return success({
      photos: photos.map((p) => ({
        id: p.id,
        imageUrl: p.image_url,
        isCover: p.is_cover,
      })),
    });
  } catch (err) {
    console.error('Get salon photos error:', err);
    return error('Failed to get salon photos', 500);
  }
}

// POST /api/salons/[id]/photos - Add salon photo
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const isOwner = await checkSalonOwnership(id, session.userId, session.role);
    if (!isOwner) {
      return forbidden('Not authorized to add photos');
    }

    const body = await request.json();
    const { imageUrl, isCover = false } = body;

    if (!imageUrl) {
      return error('Image URL is required');
    }

    // If this is a cover photo, unset existing cover
    if (isCover) {
      await query('UPDATE salon_photos SET is_cover = 0 WHERE salon_id = ?', [id]);
    }

    const result = await query(
      'INSERT INTO salon_photos (salon_id, image_url, is_cover) VALUES (?, ?, ?)',
      [id, imageUrl, isCover]
    );

    return created({
      id: result.insertId,
      imageUrl,
      isCover,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Add salon photo error:', err);
    return error('Failed to add salon photo', 500);
  }
}

// DELETE /api/salons/[id]/photos - Delete salon photo (pass photoId in body)
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const isOwner = await checkSalonOwnership(id, session.userId, session.role);
    if (!isOwner) {
      return forbidden('Not authorized to delete photos');
    }

    const body = await request.json();
    const { photoId } = body;

    if (!photoId) {
      return error('Photo ID is required');
    }

    await query('DELETE FROM salon_photos WHERE id = ? AND salon_id = ?', [photoId, id]);

    return success({ message: 'Photo deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete salon photo error:', err);
    return error('Failed to delete salon photo', 500);
  }
}
