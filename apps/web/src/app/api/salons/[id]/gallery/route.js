import { decodeId } from '@/lib/id';
import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden, serverError } from '@/lib/response';
import { validate, formatValidationErrors } from '@/lib/validate';
import { gallerySchema, galleryReorderSchema } from '@/lib/validate';
import { hasMinRole } from '@/lib/permissions';
import rateLimiter, { RateLimitPresets } from '@/lib/rate-limit';

// Helper to check if user has gallery management access
async function checkGalleryAccess(salonId, userId, role) {
  // Admin fast-return
  if (role === 'admin') return true;

  // Owner check
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ? AND deleted_at IS NULL', [salonId]);
  if (!salon) return false;
  if (salon.owner_id === userId) return true;

  // Staff/manager check — must be at least manager level
  const staffRow = await getOne(
    'SELECT role FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
    [salonId, userId]
  );
  if (staffRow && hasMinRole(staffRow.role, 'manager')) return true;

  return false;
}

// GET /api/salons/[id]/gallery — Fetch all gallery images
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const salonId = decodeId(rawId);

    const hasAccess = await checkGalleryAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to view gallery');
    }

    const images = await query(
      'SELECT id, salon_id, image_url, display_order FROM salon_gallery WHERE salon_id = ? ORDER BY display_order ASC',
      [salonId]
    );

    return success({
      images: images.map((img) => ({
        id: img.id,
        salonId: img.salon_id,
        imageUrl: img.image_url,
        displayOrder: img.display_order,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get gallery error:', err);
    return serverError('Failed to fetch gallery images');
  }
}

// POST /api/salons/[id]/gallery — Add a new gallery image
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const salonId = decodeId(rawId);

    // Rate limit (20 requests per minute)
    const rateLimitKey = `gallery_post:${session.userId}`;
    const rateCheck = rateLimiter.check(rateLimitKey, RateLimitPresets.API.maxAttempts, RateLimitPresets.API.windowMs);
    if (!rateCheck.success) {
      return error('Too many requests. Please try again later.', 429);
    }

    const hasAccess = await checkGalleryAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to add gallery images');
    }

    const body = await request.json();
    const validation = validate(gallerySchema, body);
    if (!validation.success) {
      return error(formatValidationErrors(validation.errors), 400);
    }

    const { image_url, display_order } = validation.data;

    // Get current max display_order to place new image at the end if not specified
    const maxRow = await getOne(
      'SELECT COALESCE(MAX(display_order), -1) as max_order FROM salon_gallery WHERE salon_id = ?',
      [salonId]
    );
    const finalOrder = display_order || (maxRow.max_order + 1);

    // Raw pool.execute via db.js — strict adherence to Golden Rules (no ORM)
    const result = await query(
      'INSERT INTO salon_gallery (salon_id, image_url, display_order) VALUES (?, ?, ?)',
      [salonId, image_url, finalOrder]
    );

    return created({
      id: result.insertId,
      salonId,
      imageUrl: image_url,
      displayOrder: finalOrder,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Add gallery image error:', err);
    return serverError('Failed to add gallery image');
  }
}

// PUT /api/salons/[id]/gallery — Bulk reorder gallery images
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id: rawId } = await params;
    const salonId = decodeId(rawId);

    // Rate limit (20 requests per minute)
    const rateLimitKey = `gallery_put:${session.userId}`;
    const rateCheck = rateLimiter.check(rateLimitKey, RateLimitPresets.API.maxAttempts, RateLimitPresets.API.windowMs);
    if (!rateCheck.success) {
      return error('Too many requests. Please try again later.', 429);
    }

    const hasAccess = await checkGalleryAccess(salonId, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to reorder gallery');
    }

    const body = await request.json();
    const validation = validate(galleryReorderSchema, body);
    if (!validation.success) {
      return error(formatValidationErrors(validation.errors), 400);
    }

    const { items } = validation.data;

    // Use transaction to safely batch-update display_order
    await transaction(async (conn) => {
      for (const item of items) {
        await conn.execute(
          'UPDATE salon_gallery SET display_order = ? WHERE id = ? AND salon_id = ?',
          [item.display_order, item.id, salonId]
        );
      }
    });

    return success({ message: 'Gallery order updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Reorder gallery error:', err);
    return serverError('Failed to reorder gallery');
  }
}
