import { decodeId } from '@/lib/id';
import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertSalonAccess } from '@/lib/permissions-server';
import {
  success,
  error,
  created,
  unauthorized,
} from '@/lib/response';

// ─── Validation helpers ────────────────────────────────────────────────────

function validateName(raw) {
  if (typeof raw !== 'string') {
    return { code: 'ERROR_400', message: 'name must be a string', parameter: 'name' };
  }
  const trimmed = raw.trim();
  if (trimmed.length < 1) {
    return { code: 'ERROR_400', message: 'name must not be empty', parameter: 'name' };
  }
  if (trimmed.length > 100) {
    return { code: 'ERROR_400', message: 'name must be at most 100 characters', parameter: 'name' };
  }
  return { value: trimmed };
}

function validateDisplayOrder(raw) {
  // Optional. When omitted, defaults to 0.
  if (raw === null || raw === undefined || raw === '') return { value: 0 };
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return {
      code: 'ERROR_400',
      message: 'display_order must be an integer',
      parameter: 'display_order',
    };
  }
  if (n < 0 || n > 9999) {
    return {
      code: 'ERROR_400',
      message: 'display_order must be between 0 and 9999',
      parameter: 'display_order',
    };
  }
  return { value: n };
}

function mapCategory(row) {
  return {
    id: row.id,
    salon_id: row.salon_id,
    name: row.name,
    display_order: row.display_order,
    created_at: row.created_at,
    deleted_at: row.deleted_at ?? null,
  };
}

// ─── GET /api/product-categories?salon_id={id} ─────────────────────────────
// Lists non-deleted categories for the salon, ordered by display_order ASC,
// then name ASC. Returns an empty array when the salon has none.
export async function GET(request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const rawSalonId = searchParams.get('salon_id');

    const access = await assertSalonAccess({
      session,
      salonId: rawSalonId !== null && rawSalonId !== '' ? decodeId(rawSalonId) : null,
      perm: 'products',
    });
    if (!access.ok) {
      return error({ code: access.code, message: access.code }, access.status);
    }

    // Admin without salon_id is not supported here — this listing is per-salon.
    if (access.salonId == null) {
      return error(
        { code: 'MISSING_SALON_ID', message: 'salon_id is required' },
        400,
      );
    }

    const rows = await query(
      `SELECT id, salon_id, name, display_order, created_at, deleted_at
         FROM product_categories
        WHERE salon_id = ?
          AND deleted_at IS NULL
        ORDER BY display_order ASC, name ASC`,
      [access.salonId],
    );

    return success(rows.map(mapCategory));
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get product categories error:', err);
    return error('Failed to get product categories', 500);
  }
}

// ─── POST /api/product-categories ──────────────────────────────────────────
// Creates a new category. Requires the `products_manage` permission.
export async function POST(request) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const { salon_id, name, display_order } = body || {};

    const access = await assertSalonAccess({
      session,
      salonId: salon_id != null && salon_id !== '' ? decodeId(String(salon_id)) : null,
      perm: 'products_manage',
    });
    if (!access.ok) {
      return error({ code: access.code, message: access.code }, access.status);
    }

    if (access.salonId == null) {
      return error(
        { code: 'MISSING_SALON_ID', message: 'salon_id is required' },
        400,
      );
    }

    const nameCheck = validateName(name);
    if (nameCheck.code) {
      return error(nameCheck, 400);
    }

    const orderCheck = validateDisplayOrder(display_order);
    if (orderCheck.code) {
      return error(orderCheck, 400);
    }

    const result = await query(
      `INSERT INTO product_categories (salon_id, name, display_order)
       VALUES (?, ?, ?)`,
      [access.salonId, nameCheck.value, orderCheck.value],
    );

    const row = await getOne(
      `SELECT id, salon_id, name, display_order, created_at, deleted_at
         FROM product_categories
        WHERE id = ?`,
      [result.insertId],
    );

    return created(mapCategory(row));
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create product category error:', err);
    return error('Failed to create product category', 500);
  }
}
