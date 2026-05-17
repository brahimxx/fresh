import { getOne, transaction } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { assertSalonAccess } from '@/lib/permissions-server';
import {
  success,
  error,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from '@/lib/response';

// ─── Validation helpers ────────────────────────────────────────────────────

function parseCategoryId(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const asNumber = Number(raw);
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber)) return null;
  if (asNumber <= 0) return null;
  if (typeof raw === 'string' && String(asNumber) !== raw.trim()) return null;
  return asNumber;
}

function validateName(raw) {
  if (raw === undefined) return { skip: true };
  if (typeof raw !== 'string') {
    return { error: 'name must be a string' };
  }
  const trimmed = raw.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    return { error: 'name must be between 1 and 100 characters' };
  }
  return { value: trimmed };
}

function validateDisplayOrder(raw) {
  if (raw === undefined || raw === null) return { skip: true };
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber)) {
    return { error: 'display_order must be an integer' };
  }
  if (asNumber < 0 || asNumber > 9999) {
    return { error: 'display_order must be between 0 and 9999' };
  }
  return { value: asNumber };
}

// Map an `assertSalonAccess` decision to the standard response helper.
function mapAccessDenial(decision) {
  switch (decision.code) {
    case 'UNAUTHORIZED':
      return unauthorized();
    case 'FORBIDDEN':
      return forbidden();
    case 'MISSING_SALON_ID':
      return error({ code: 'MISSING_SALON_ID', message: 'salon_id is required' }, 400);
    case 'INVALID_SALON_ID':
      return error({ code: 'INVALID_SALON_ID', message: 'salon_id is invalid' }, 400);
    default:
      return error({ code: decision.code || 'ERROR_400', message: 'Access denied' }, decision.status || 400);
  }
}

// ─── PUT /api/product-categories/[id] ──────────────────────────────────────

export async function PUT(request, { params }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id: rawId } = await params;
    const id = parseCategoryId(rawId);
    if (!id) {
      // Match the cross-salon / genuine-not-found body shape.
      return notFound('Category not found');
    }

    // Fetch the target category. We need its salon_id to drive authorization.
    const category = await getOne(
      'SELECT id, salon_id, name, display_order, deleted_at FROM product_categories WHERE id = ?',
      [id],
    );

    // Genuine not-found and soft-deleted both map to 404.
    if (!category || category.deleted_at !== null) {
      return notFound('Category not found');
    }

    // Authorization: must have products_manage on the owning salon.
    const access = await assertSalonAccess({
      session,
      salonId: category.salon_id,
      perm: 'products_manage',
    });
    if (!access.ok) {
      // Cross-salon access (no Active_Staff_Record on the category's salon)
      // resolves to FORBIDDEN here, but we surface it as a 404 with the same
      // body shape as a genuine miss so existence is not leaked.
      if (access.code === 'FORBIDDEN') {
        return notFound('Category not found');
      }
      return mapAccessDenial(access);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return error({ code: 'ERROR_400', message: 'Invalid JSON body' }, 400);
    }

    const nameCheck = validateName(body?.name);
    if (nameCheck.error) {
      return error({ code: 'ERROR_400', message: nameCheck.error, details: { parameter: 'name' } }, 400);
    }
    const displayOrderCheck = validateDisplayOrder(body?.display_order);
    if (displayOrderCheck.error) {
      return error(
        { code: 'ERROR_400', message: displayOrderCheck.error, details: { parameter: 'display_order' } },
        400,
      );
    }

    if (nameCheck.skip && displayOrderCheck.skip) {
      // Nothing to update; return the existing row so callers stay idempotent.
      return success({
        id: category.id,
        salon_id: category.salon_id,
        name: category.name,
        display_order: category.display_order,
      });
    }

    const nextName = nameCheck.skip ? category.name : nameCheck.value;
    const nextDisplayOrder = displayOrderCheck.skip ? category.display_order : displayOrderCheck.value;

    await transaction(async (conn) => {
      await conn.query(
        'UPDATE product_categories SET name = ?, display_order = ? WHERE id = ? AND deleted_at IS NULL',
        [nextName, nextDisplayOrder, id],
      );
    });

    const updated = await getOne(
      'SELECT id, salon_id, name, display_order FROM product_categories WHERE id = ?',
      [id],
    );

    return success({
      id: updated.id,
      salon_id: updated.salon_id,
      name: updated.name,
      display_order: updated.display_order,
    });
  } catch (err) {
    if (err && err.message === 'Unauthorized') return unauthorized();
    console.error('Update product category error:', err);
    return serverError('Failed to update product category');
  }
}

// ─── DELETE /api/product-categories/[id] ───────────────────────────────────

export async function DELETE(request, { params }) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { id: rawId } = await params;
    const id = parseCategoryId(rawId);
    if (!id) {
      return notFound('Category not found');
    }

    const category = await getOne(
      'SELECT id, salon_id, deleted_at FROM product_categories WHERE id = ?',
      [id],
    );
    if (!category || category.deleted_at !== null) {
      return notFound('Category not found');
    }

    const access = await assertSalonAccess({
      session,
      salonId: category.salon_id,
      perm: 'products_manage',
    });
    if (!access.ok) {
      if (access.code === 'FORBIDDEN') {
        return notFound('Category not found');
      }
      return mapAccessDenial(access);
    }

    // Single transaction: soft-delete the category and null out the
    // category_id of every product currently referencing it. The two
    // statements share a connection so any failure rolls back both.
    // Affected products remain visible (deleted_at + is_active untouched).
    await transaction(async (conn) => {
      await conn.query(
        'UPDATE product_categories SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
        [id],
      );
      await conn.query(
        'UPDATE products SET category_id = NULL WHERE category_id = ?',
        [id],
      );
    });

    return success({ message: 'Category deleted successfully' });
  } catch (err) {
    if (err && err.message === 'Unauthorized') return unauthorized();
    console.error('Delete product category error:', err);
    return serverError('Failed to delete product category');
  }
}
