/**
 * /api/products
 *
 * GET  — Paginated, filtered, sorted product listing scoped to a salon.
 *        Spec: products-and-sales-improvements (Task 5.1).
 *        Authorization mirrors the CSV export endpoint via `assertSalonAccess`.
 *
 * POST — Create a single product. Authorization via `assertSalonAccess` with
 *        `products.manage` permission. Validates brand, category_id (same-salon
 *        check), image_url, and all other fields with the same rigour as PUT.
 *        Returns the canonical snake_case product shape.
 *        Implements Requirements 2.1, 5.2, 5.3, 5.5, 6.10, 7.7.
 */

import { decodeId } from '@/lib/id';
import { query, getOne } from '@/lib/db';
import { getSession, requireAuth } from '@/lib/auth';
import { assertSalonAccess } from '@/lib/permissions-server';
import {
  success,
  error,
  created,
  forbidden,
  unauthorized,
} from '@/lib/response';

// ─── Filter / sort vocabulary (mirrors /api/products/export.csv) ───────────

const SORT_MAP = {
  name_asc: 'p.name ASC',
  name_desc: 'p.name DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  stock_asc: 'p.stock_quantity ASC',
  stock_desc: 'p.stock_quantity DESC',
  created_desc: 'p.created_at DESC',
};

const STOCK_MODES = new Set(['in', 'low', 'out', 'all']);

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

// ─── Validation helpers ───────────────────────────────────────────────────

function badParameter(name, message) {
  return error(
    {
      code: 'INVALID_PARAMETER',
      message: message || `Invalid parameter: ${name}`,
      details: { parameter: name },
    },
    400,
  );
}

function parsePositiveInt(raw) {
  if (raw === null || raw === undefined || raw === '') return { empty: true };
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return { invalid: true };
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return { invalid: true };
  return { value: n };
}

// ─── Row → response shape ────────────────────────────────────────────────-

function serialiseProduct(row) {
  return {
    id: row.id,
    salon_id: row.salon_id,
    category_id: row.category_id,
    category_name: row.category_id == null ? null : row.category_name,
    brand: row.brand,
    name: row.name,
    description: row.description,
    price: row.price,
    cost_price: row.cost_price,
    sku: row.sku,
    barcode: row.barcode,
    stock_quantity: row.stock_quantity,
    low_stock_threshold: row.low_stock_threshold,
    is_active: row.is_active,
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ─── GET /api/products ─────────────────────────────────────────────────────

export async function GET(request) {
  // 1. Auth (Req 1.1).
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);

  // 2. salon_id parsing. Admin may omit (Req 1.7); non-admin must supply a
  //    well-formed id (encoded or numeric) (Reqs 1.2, 1.6).
  const rawSalonId = searchParams.get('salon_id');
  let salonIdNum = null;
  if (rawSalonId !== null && rawSalonId !== '') {
    const decoded = decodeId(rawSalonId);
    const parsed = parsePositiveInt(String(decoded));
    if (parsed.invalid) {
      return error(
        { code: 'INVALID_SALON_ID', message: 'Invalid salon_id' },
        400,
      );
    }
    salonIdNum = parsed.value;
  } else if (session.role !== 'admin') {
    return error(
      { code: 'MISSING_SALON_ID', message: 'salon_id is required' },
      400,
    );
  }

  // 3. Filter / sort validation (Req 8.10) — done after auth so unauthenticated
  //    callers can't probe parameter shapes, but before authorization so
  //    malformed input is rejected without DB work.

  // page / limit (Reqs 8.1, 8.2)
  const rawPage = searchParams.get('page');
  let page = 1;
  if (rawPage !== null && rawPage !== '') {
    const parsed = parsePositiveInt(rawPage);
    if (parsed.invalid) return badParameter('page');
    page = parsed.value;
  }

  const rawLimit = searchParams.get('limit');
  let limit = DEFAULT_LIMIT;
  if (rawLimit !== null && rawLimit !== '') {
    const parsed = parsePositiveInt(rawLimit);
    if (parsed.invalid) return badParameter('limit');
    if (parsed.value > MAX_LIMIT) return badParameter('limit');
    limit = parsed.value;
  }

  // search (Req 8.1: 0–100 chars)
  const search = searchParams.get('search');
  if (search !== null && search.length > 100) {
    return badParameter('search', 'search must be 0–100 characters');
  }

  // category_id (positive int when supplied)
  const rawCategory = searchParams.get('category_id');
  let categoryId = null;
  if (rawCategory !== null && rawCategory !== '') {
    const parsed = parsePositiveInt(rawCategory);
    if (parsed.invalid) return badParameter('category_id');
    categoryId = parsed.value;
  }

  // stock ∈ {in, low, out, all}
  const stock = searchParams.get('stock');
  if (stock !== null && stock !== '' && !STOCK_MODES.has(stock)) {
    return badParameter('stock');
  }

  // is_active boolean
  const rawIsActive = searchParams.get('is_active');
  let isActiveFilter = null;
  if (rawIsActive !== null && rawIsActive !== '') {
    if (rawIsActive === 'true') isActiveFilter = 1;
    else if (rawIsActive === 'false') isActiveFilter = 0;
    else return badParameter('is_active');
  }

  // sort enum (default 'name_asc')
  const sortKey = searchParams.get('sort') || 'name_asc';
  if (!SORT_MAP[sortKey]) return badParameter('sort');

  // 4. Authorization (Reqs 1.3, 1.4, 1.7).
  const access = await assertSalonAccess({
    session,
    salonId: salonIdNum,
    perm: 'products',
  });
  if (!access.ok) {
    if (access.code === 'UNAUTHORIZED') return unauthorized();
    if (access.code === 'FORBIDDEN') return forbidden();
    return error({ code: access.code, message: access.code }, access.status);
  }

  // 5. Build the WHERE clause. Always exclude soft-deleted rows (Req 1.5).
  const whereClauses = ['p.deleted_at IS NULL'];
  const params = [];

  // Admin without salon_id → no salon filter (Req 1.7); otherwise scope.
  if (access.salonId != null) {
    whereClauses.push('p.salon_id = ?');
    params.push(access.salonId);
  }

  if (categoryId != null) {
    whereClauses.push('p.category_id = ?');
    params.push(categoryId);
  }

  if (search) {
    whereClauses.push(
      '(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ?)',
    );
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  if (stock === 'in') {
    whereClauses.push('p.stock_quantity > p.low_stock_threshold');
  } else if (stock === 'low') {
    whereClauses.push(
      'p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold',
    );
  } else if (stock === 'out') {
    whereClauses.push('p.stock_quantity = 0');
  }
  // 'all' or null → no stock filter

  if (isActiveFilter != null) {
    whereClauses.push('p.is_active = ?');
    params.push(isActiveFilter);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  // 6. Count + page query. Run them sequentially so the count's params are not
  //    polluted by the page query's LIMIT/OFFSET binds.
  const countRow = await getOne(
    `SELECT COUNT(*) AS total
       FROM products p
      ${whereSql}`,
    params,
  );
  const total = Number(countRow?.total ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  // (Req 8.11) When page > totalPages and total > 0, respond with empty data
  // and the real meta so clients can paginate back without a 4xx.
  let rows = [];
  if (total > 0 && page <= totalPages) {
    const offset = (page - 1) * limit;
    rows = await query(
      `SELECT p.id,
              p.salon_id,
              p.category_id,
              p.brand,
              p.name,
              p.description,
              p.price,
              p.cost_price,
              p.sku,
              p.barcode,
              p.stock_quantity,
              p.low_stock_threshold,
              p.is_active,
              p.image_url,
              p.created_at,
              p.updated_at,
              pc.name AS category_name
         FROM products p
         LEFT JOIN product_categories pc ON pc.id = p.category_id AND pc.deleted_at IS NULL
        ${whereSql}
        ORDER BY ${SORT_MAP[sortKey]}, p.id ASC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
  }

  return success({
    data: rows.map(serialiseProduct),
    meta: { page, limit, total, totalPages },
  });
}

// ─── POST /api/products ────────────────────────────────────────────────────
// Refactored to align with the PUT handler's validation, authorization, and
// response shape. Uses `assertSalonAccess` with `products.manage`, validates
// brand / category_id (same-salon check) / image_url, and returns the
// canonical snake_case product shape.
//
// Implements Requirements 2.1, 5.2, 5.3, 5.5, 6.10, 7.7.

// ─── POST validation constants ─────────────────────────────────────────────
const NAME_MAX = 255;
const BRAND_MAX = 120;
const SKU_MAX = 100;
const BARCODE_MAX = 100;
const IMAGE_URL_MAX = 500;
const PRICE_MAX_DECIMALS = 2;

function postBadRequest(parameter, message) {
  return error(
    { message, code: 'ERROR_400', details: { parameter } },
    400,
  );
}

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function hasAtMostNDecimals(n, max) {
  return Number(n.toFixed(max)) === n;
}

function validatePostName(raw) {
  if (raw === undefined || raw === null) {
    return { error: 'name is required' };
  }
  if (typeof raw !== 'string') {
    return { error: 'name must be a string' };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > NAME_MAX) {
    return { error: `name must be between 1 and ${NAME_MAX} characters` };
  }
  return { value: trimmed };
}

function validatePostBrand(raw) {
  if (raw === undefined || raw === null) return { value: null };
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

function validatePostImageUrl(raw) {
  if (raw === undefined || raw === null) return { value: null };
  if (typeof raw !== 'string') {
    return { error: 'image_url must be a string or null' };
  }
  if (raw.length === 0) return { value: null };
  if (raw.length > IMAGE_URL_MAX) {
    return { error: `image_url must be ${IMAGE_URL_MAX} characters or fewer` };
  }
  return { value: raw };
}

function validatePostCategoryId(raw) {
  if (raw === undefined || raw === null || raw === '') return { value: null };
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber) || asNumber <= 0) {
    return { error: 'category_id must be a positive integer or null' };
  }
  return { value: asNumber };
}

function validatePostPrice(raw, parameter, { allowNull = false } = {}) {
  if (raw === undefined || raw === null) {
    return allowNull ? { value: null } : { value: 0 };
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

function validatePostNonNegativeInt(raw, parameter, defaultValue) {
  if (raw === undefined || raw === null) return { value: defaultValue };
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber) || asNumber < 0) {
    return { error: `${parameter} must be a non-negative integer` };
  }
  return { value: asNumber };
}

function validatePostNullableString(raw, parameter, max) {
  if (raw === undefined || raw === null) return { value: null };
  if (typeof raw !== 'string') {
    return { error: `${parameter} must be a string or null` };
  }
  if (parameter === 'description') {
    if (raw.length > 65535) return { error: `${parameter} is too long` };
    return { value: raw };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { value: null };
  if (trimmed.length > max) {
    return { error: `${parameter} must be ${max} characters or fewer` };
  }
  return { value: trimmed };
}

export async function POST(request) {
  // 1. Auth — require a session (Req 1.1, 2.5).
  let session;
  try {
    session = await requireAuth();
  } catch (err) {
    if (err && err.message === 'Unauthorized') return unauthorized();
    throw err;
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return postBadRequest('body', 'Invalid JSON body');
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return postBadRequest('body', 'Request body must be a JSON object');
    }

    // 2. salon_id — required, decoded, validated via assertSalonAccess with
    //    `products.manage` permission (Req 2.1, 2.2).
    const rawSalonId = body.salon_id ?? body.salonId;
    if (rawSalonId === undefined || rawSalonId === null || rawSalonId === '') {
      return error(
        { code: 'MISSING_SALON_ID', message: 'salon_id is required' },
        400,
      );
    }
    const decodedSalonId = typeof rawSalonId === 'string'
      ? decodeId(rawSalonId)
      : rawSalonId;

    const access = await assertSalonAccess({
      session,
      salonId: decodedSalonId,
      perm: 'products.manage',
    });
    if (!access.ok) {
      if (access.code === 'UNAUTHORIZED') return unauthorized();
      if (access.code === 'FORBIDDEN') return forbidden();
      return error({ code: access.code, message: access.code }, access.status);
    }

    // 3. Validate all fields with the same rigour as the PUT handler.
    const checks = {
      name: validatePostName(body.name),
      description: validatePostNullableString(body.description, 'description'),
      brand: validatePostBrand(body.brand),
      sku: validatePostNullableString(body.sku, 'sku', SKU_MAX),
      barcode: validatePostNullableString(body.barcode, 'barcode', BARCODE_MAX),
      price: validatePostPrice(body.price, 'price'),
      cost_price: validatePostPrice(
        body.cost_price ?? body.costPrice,
        'cost_price',
        { allowNull: true },
      ),
      stock_quantity: validatePostNonNegativeInt(
        body.stock_quantity ?? body.stockQuantity,
        'stock_quantity',
        0,
      ),
      low_stock_threshold: validatePostNonNegativeInt(
        body.low_stock_threshold ?? body.lowStockThreshold,
        'low_stock_threshold',
        5,
      ),
      image_url: validatePostImageUrl(body.image_url ?? body.imageUrl),
      category_id: validatePostCategoryId(body.category_id ?? body.categoryId),
    };

    for (const [parameter, result] of Object.entries(checks)) {
      if (result.error) return postBadRequest(parameter, result.error);
    }

    // 4. Same-salon ownership check for category_id (Requirement 6.10).
    if (checks.category_id.value !== null) {
      const category = await getOne(
        'SELECT id, salon_id FROM product_categories WHERE id = ? AND deleted_at IS NULL',
        [checks.category_id.value],
      );
      if (!category || category.salon_id !== access.salonId) {
        return postBadRequest('category_id', 'category_id must belong to the same salon');
      }
    }

    // 5. Insert the product.
    const result = await query(
      `INSERT INTO products
         (salon_id, category_id, brand, name, description, price, cost_price,
          sku, barcode, stock_quantity, low_stock_threshold, image_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        access.salonId,
        checks.category_id.value,
        checks.brand.value,
        checks.name.value,
        checks.description.value,
        checks.price.value,
        checks.cost_price.value,
        checks.sku.value,
        checks.barcode.value,
        checks.stock_quantity.value,
        checks.low_stock_threshold.value,
        checks.image_url.value,
      ],
    );

    // 6. Read back the full row with joined category_name and return the
    //    canonical snake_case shape (same as the listing and PUT responses).
    const newProduct = await getOne(
      `SELECT p.id, p.salon_id, p.category_id, p.brand, p.name, p.description,
              p.price, p.cost_price, p.sku, p.barcode, p.stock_quantity,
              p.low_stock_threshold, p.is_active, p.image_url,
              p.created_at, p.updated_at,
              pc.name AS category_name
         FROM products p
         LEFT JOIN product_categories pc ON pc.id = p.category_id AND pc.deleted_at IS NULL
        WHERE p.id = ?`,
      [result.insertId],
    );

    return created(serialiseProduct(newProduct));
  } catch (err) {
    if (err && err.message === 'Unauthorized') return unauthorized();
    console.error('Create product error:', err);
    return error('Failed to create product', 500);
  }
}
