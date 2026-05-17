/**
 * Products_API — /api/products/[productId]
 *
 * GET    → fetch one product, scoped to a salon the caller can read.
 * PUT    → update product fields. Authorization via `products_manage`.
 *          - `brand`     : trim, 1–120 chars; null/empty → SQL NULL;
 *                          non-string non-null → 400.
 *          - `category_id`: positive int that belongs to the SAME salon
 *                          as the product (else 400). Pass null to clear.
 *          - `image_url` : string ≤ 500 chars, or null. Empty string → NULL.
 *          - other fields per the existing contract (name / description /
 *            price / cost_price / sku / barcode / stock_quantity /
 *            low_stock_threshold / is_active).
 * DELETE → soft-delete only:
 *            UPDATE products SET deleted_at = NOW(), is_active = 0
 *             WHERE id = ? AND deleted_at IS NULL
 *          When the row is already soft-deleted → 404.
 *
 * Cross-salon access (FORBIDDEN / MISSING_SALON_ID / INVALID_SALON_ID
 * after the product has been located by id) collapses to a 404 with a
 * body identical to the genuine-not-found shape so the existence of a
 * resource on another salon is not leaked (Requirements 1.3, 3.9).
 *
 * Implements Requirements 2.1, 2.2, 2.3, 2.5, 5.2, 5.3, 5.5, 6.10, 7.7.
 */

import { decodeId } from '@/lib/id';
import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertSalonAccess } from '@/lib/permissions-server';
import {
  success,
  error,
  unauthorized,
  notFound,
} from '@/lib/response';

// ─── Constants from the products schema ────────────────────────────────────
const NAME_MAX = 255;
const BRAND_MAX = 120;
const SKU_MAX = 100;
const BARCODE_MAX = 100;
const IMAGE_URL_MAX = 500;
const PRICE_MAX_DECIMALS = 2;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map an `assertSalonAccess` failure to the appropriate response.
 *
 * The product has already been located by id at the call site, so any
 * non-`UNAUTHORIZED` denial means the caller is not on the salon owning
 * that product. Collapse those to a 404 with the standard NOT_FOUND
 * envelope so the cross-salon body shape matches genuine 404 byte-for-byte.
 */
function denialToResponse(access) {
  if (access.code === 'UNAUTHORIZED') return unauthorized();
  return notFound('Product not found');
}

function badRequest(parameter, message) {
  return error(
    {
      message,
      code: 'ERROR_400',
      details: { parameter },
    },
    400,
  );
}

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function hasAtMostNDecimals(n, max) {
  // Round-trip through a fixed-point string and assert equality so we
  // reject e.g. 9.999 when max=2 without relying on floating-point bias.
  return Number(n.toFixed(max)) === n;
}

/**
 * Validate a "brand" field per Requirement 5.5:
 *   - undefined  → unchanged (skip)
 *   - null       → set to SQL NULL
 *   - empty / whitespace-only string → set to SQL NULL
 *   - non-string non-null → 400 ERROR_400
 *   - string longer than 120 chars after trim → 400 ERROR_400
 *   - otherwise → trimmed string
 */
function validateBrand(raw) {
  if (raw === undefined) return { skip: true };
  if (raw === null) return { value: null };
  if (typeof raw !== 'string') {
    return { error: 'brand must be a string or null' };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { value: null };
  if (trimmed.length > BRAND_MAX) {
    return { error: `brand must be ${BRAND_MAX} characters or fewer` };
  }
  return { value: trimmed };
}

/**
 * Validate `image_url` per Requirement 7.7:
 *   - undefined → skip
 *   - null      → SQL NULL
 *   - empty string → SQL NULL (cleared image)
 *   - non-string non-null → 400
 *   - longer than 500 chars → 400
 */
function validateImageUrl(raw) {
  if (raw === undefined) return { skip: true };
  if (raw === null) return { value: null };
  if (typeof raw !== 'string') {
    return { error: 'image_url must be a string or null' };
  }
  if (raw.length === 0) return { value: null };
  if (raw.length > IMAGE_URL_MAX) {
    return { error: `image_url must be ${IMAGE_URL_MAX} characters or fewer` };
  }
  return { value: raw };
}

/**
 * Validate `category_id`. The same-salon ownership check is performed
 * separately at the call site since it requires a DB round-trip.
 */
function validateCategoryId(raw) {
  if (raw === undefined) return { skip: true };
  if (raw === null || raw === '') return { value: null };
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber) || asNumber <= 0) {
    return { error: 'category_id must be a positive integer or null' };
  }
  if (typeof raw === 'string' && String(asNumber) !== raw.trim()) {
    return { error: 'category_id must be a positive integer or null' };
  }
  return { value: asNumber };
}

function validateName(raw) {
  if (raw === undefined) return { skip: true };
  if (typeof raw !== 'string') {
    return { error: 'name must be a string' };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > NAME_MAX) {
    return { error: `name must be between 1 and ${NAME_MAX} characters` };
  }
  return { value: trimmed };
}

function validateNullableString(raw, parameter, max) {
  if (raw === undefined) return { skip: true };
  if (raw === null) return { value: null };
  if (typeof raw !== 'string') {
    return { error: `${parameter} must be a string or null` };
  }
  // Empty string permitted for description; SKU/barcode collapse to NULL.
  if (parameter === 'description') {
    if (raw.length > 65535) {
      return { error: `${parameter} is too long` };
    }
    return { value: raw };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { value: null };
  if (trimmed.length > max) {
    return { error: `${parameter} must be ${max} characters or fewer` };
  }
  return { value: trimmed };
}

function validatePrice(raw, parameter, { allowNull = false } = {}) {
  if (raw === undefined) return { skip: true };
  if (raw === null) {
    return allowNull ? { value: null } : { error: `${parameter} is required` };
  }
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  if (!isFiniteNumber(asNumber) || asNumber < 0) {
    return { error: `${parameter} must be a non-negative number` };
  }
  if (!hasAtMostNDecimals(asNumber, PRICE_MAX_DECIMALS)) {
    return { error: `${parameter} must have at most ${PRICE_MAX_DECIMALS} decimal places` };
  }
  return { value: asNumber };
}

function validateNonNegativeInt(raw, parameter) {
  if (raw === undefined) return { skip: true };
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber) || asNumber < 0) {
    return { error: `${parameter} must be a non-negative integer` };
  }
  return { value: asNumber };
}

function validateBoolean(raw, parameter) {
  if (raw === undefined) return { skip: true };
  if (typeof raw === 'boolean') return { value: raw ? 1 : 0 };
  if (raw === 0 || raw === 1) return { value: raw };
  return { error: `${parameter} must be a boolean` };
}

/**
 * Read the canonical (snake_case) body field, falling back to the legacy
 * camelCase alias to avoid breaking the existing product form which still
 * emits both `is_active` and `isActive`.
 */
function pick(body, snake, camel) {
  if (body === null || typeof body !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(body, snake)) return body[snake];
  if (camel && Object.prototype.hasOwnProperty.call(body, camel)) return body[camel];
  return undefined;
}

// ─── Shared product serialiser (canonical snake_case) ──────────────────────
function serialiseProduct(row) {
  return {
    id: row.id,
    salon_id: row.salon_id,
    category_id: row.category_id,
    category_name: row.category_name ?? null,
    brand: row.brand ?? null,
    name: row.name,
    description: row.description,
    price: row.price,
    cost_price: row.cost_price,
    sku: row.sku,
    barcode: row.barcode,
    stock_quantity: row.stock_quantity,
    low_stock_threshold: row.low_stock_threshold,
    is_active: row.is_active,
    image_url: row.image_url ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const PRODUCT_SELECT_SQL = `
  SELECT p.id, p.salon_id, p.category_id, p.brand, p.name, p.description,
         p.price, p.cost_price, p.sku, p.barcode, p.stock_quantity,
         p.low_stock_threshold, p.is_active, p.image_url,
         p.created_at, p.updated_at, p.deleted_at,
         pc.name AS category_name
    FROM products p
    LEFT JOIN product_categories pc
      ON pc.id = p.category_id AND pc.deleted_at IS NULL
   WHERE p.id = ?
`;

// ───────────────────────────────────────────────────────────────────────────
// GET /api/products/[productId]
// ───────────────────────────────────────────────────────────────────────────
export async function GET(request, { params }) {
  let session;
  try {
    session = await requireAuth();
  } catch (err) {
    if (err && err.message === 'Unauthorized') return unauthorized();
    throw err;
  }

  try {
    const { productId: rawProductId } = await params;
    const productId = decodeId(rawProductId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return notFound('Product not found');
    }

    const product = await getOne(PRODUCT_SELECT_SQL, [productId]);
    if (!product || product.deleted_at !== null) {
      return notFound('Product not found');
    }

    const access = await assertSalonAccess({
      session,
      salonId: product.salon_id,
      perm: 'products',
    });
    if (!access.ok) {
      return denialToResponse(access);
    }

    return success(serialiseProduct(product));
  } catch (err) {
    console.error('Get product error:', err);
    return error('Failed to get product', 500);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// PUT /api/products/[productId]
// ───────────────────────────────────────────────────────────────────────────
export async function PUT(request, { params }) {
  let session;
  try {
    session = await requireAuth();
  } catch (err) {
    if (err && err.message === 'Unauthorized') return unauthorized();
    throw err;
  }

  try {
    const { productId: rawProductId } = await params;
    const productId = decodeId(rawProductId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return notFound('Product not found');
    }

    // Locate the product before authorisation so cross-salon and
    // genuine-not-found return the same 404 body shape.
    const product = await getOne(
      'SELECT id, salon_id, deleted_at FROM products WHERE id = ?',
      [productId],
    );
    if (!product || product.deleted_at !== null) {
      return notFound('Product not found');
    }

    const access = await assertSalonAccess({
      session,
      salonId: product.salon_id,
      perm: 'products.manage',
    });
    if (!access.ok) {
      return denialToResponse(access);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequest('body', 'Invalid JSON body');
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return badRequest('body', 'Request body must be a JSON object');
    }

    // ── Validate every supplied field. Validators return either
    //    `{ skip: true }` (field absent), `{ value }` (use it), or
    //    `{ error }` (return 400 with the parameter name).
    const checks = {
      name: validateName(pick(body, 'name')),
      description: validateNullableString(pick(body, 'description'), 'description'),
      brand: validateBrand(pick(body, 'brand')),
      sku: validateNullableString(pick(body, 'sku'), 'sku', SKU_MAX),
      barcode: validateNullableString(pick(body, 'barcode'), 'barcode', BARCODE_MAX),
      price: validatePrice(pick(body, 'price'), 'price'),
      cost_price: validatePrice(pick(body, 'cost_price', 'costPrice'), 'cost_price', { allowNull: true }),
      stock_quantity: validateNonNegativeInt(pick(body, 'stock_quantity', 'stockQuantity'), 'stock_quantity'),
      low_stock_threshold: validateNonNegativeInt(
        pick(body, 'low_stock_threshold', 'lowStockThreshold'),
        'low_stock_threshold',
      ),
      is_active: validateBoolean(pick(body, 'is_active', 'isActive'), 'is_active'),
      image_url: validateImageUrl(pick(body, 'image_url', 'imageUrl')),
      category_id: validateCategoryId(pick(body, 'category_id', 'categoryId')),
    };

    for (const [parameter, result] of Object.entries(checks)) {
      if (result.error) return badRequest(parameter, result.error);
    }

    // ── Same-salon ownership check for category_id (Requirement 6.10).
    if (!checks.category_id.skip && checks.category_id.value !== null) {
      const category = await getOne(
        'SELECT id, salon_id FROM product_categories WHERE id = ? AND deleted_at IS NULL',
        [checks.category_id.value],
      );
      if (!category || category.salon_id !== product.salon_id) {
        return badRequest('category_id', 'category_id must belong to the same salon');
      }
    }

    // ── Build a partial UPDATE so only supplied fields are mutated.
    //    Nullable fields (brand, image_url, category_id, cost_price, sku,
    //    barcode, description) can be set explicitly to NULL.
    const sets = [];
    const args = [];
    const COLUMN_FOR = {
      name: 'name',
      description: 'description',
      brand: 'brand',
      sku: 'sku',
      barcode: 'barcode',
      price: 'price',
      cost_price: 'cost_price',
      stock_quantity: 'stock_quantity',
      low_stock_threshold: 'low_stock_threshold',
      is_active: 'is_active',
      image_url: 'image_url',
      category_id: 'category_id',
    };
    for (const [parameter, result] of Object.entries(checks)) {
      if (result.skip) continue;
      sets.push(`${COLUMN_FOR[parameter]} = ?`);
      args.push(result.value);
    }

    if (sets.length === 0) {
      // Nothing to change — return the current row so the call stays idempotent.
      const current = await getOne(PRODUCT_SELECT_SQL, [productId]);
      return success(serialiseProduct(current));
    }

    sets.push('updated_at = NOW()');
    args.push(productId);
    await query(
      `UPDATE products SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      args,
    );

    const updated = await getOne(PRODUCT_SELECT_SQL, [productId]);
    return success(serialiseProduct(updated));
  } catch (err) {
    if (err && err.message === 'Unauthorized') return unauthorized();
    console.error('Update product error:', err);
    return error('Failed to update product', 500);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// DELETE /api/products/[productId] — soft-delete only
// ───────────────────────────────────────────────────────────────────────────
export async function DELETE(request, { params }) {
  let session;
  try {
    session = await requireAuth();
  } catch (err) {
    if (err && err.message === 'Unauthorized') return unauthorized();
    throw err;
  }

  try {
    const { productId: rawProductId } = await params;
    const productId = decodeId(rawProductId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return notFound('Product not found');
    }

    const product = await getOne(
      'SELECT id, salon_id, deleted_at FROM products WHERE id = ?',
      [productId],
    );
    // Genuine not-found AND already-soft-deleted both return 404
    // (Requirement 2.3: precondition is `deleted_at IS NULL`).
    if (!product || product.deleted_at !== null) {
      return notFound('Product not found');
    }

    const access = await assertSalonAccess({
      session,
      salonId: product.salon_id,
      perm: 'products.manage',
    });
    if (!access.ok) {
      return denialToResponse(access);
    }

    const result = await query(
      'UPDATE products SET deleted_at = NOW(), is_active = 0 WHERE id = ? AND deleted_at IS NULL',
      [productId],
    );

    // Race: if another request soft-deleted the row between the SELECT and
    // the UPDATE, affectedRows will be 0 → surface as 404 to keep the
    // contract consistent.
    if (!result || result.affectedRows === 0) {
      return notFound('Product not found');
    }

    return success({ message: 'Product deleted successfully' });
  } catch (err) {
    if (err && err.message === 'Unauthorized') return unauthorized();
    console.error('Delete product error:', err);
    return error('Failed to delete product', 500);
  }
}
