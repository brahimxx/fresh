/**
 * /api/products
 *
 * GET  — Paginated, filtered, sorted product listing scoped to a salon.
 *        Spec: products-and-sales-improvements (Task 5.1).
 *        Authorization mirrors the CSV export endpoint via `assertSalonAccess`.
 *
 * POST — Create a single product. Authorization preserved from the prior
 *        implementation; full refactor lands in Task 5.2.
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
         LEFT JOIN product_categories pc ON pc.id = p.category_id
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
// Carry-over from the previous implementation; full refactor lands in Task 5.2.
// Kept functional so callers creating products are not blocked by Task 5.1.

async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [
    salonId,
  ]);
  if (!salon) return false;
  if (salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role IN ('manager') AND is_active = 1",
    [salonId, userId],
  );
  return !!staff;
}

export async function POST(request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const {
      salon_id,
      category_id,
      name,
      description,
      price,
      cost_price,
      sku,
      barcode,
      stock_quantity,
      low_stock_threshold,
      image_url,
    } = body;

    if (!salon_id) {
      return error('salon_id is required', 400);
    }

    if (!name) {
      return error('Product name is required', 400);
    }

    const decodedSalonId =
      typeof salon_id === 'string' ? decodeId(salon_id) : salon_id;

    const hasAccess = await checkSalonAccess(
      decodedSalonId,
      session.userId,
      session.role,
    );
    if (!hasAccess) {
      return forbidden('Not authorized to add products to this salon');
    }

    const result = await query(
      `INSERT INTO products (salon_id, category_id, name, description, price, cost_price, sku, barcode, stock_quantity, low_stock_threshold, image_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        decodedSalonId,
        category_id || null,
        name,
        description || null,
        price || 0,
        cost_price || null,
        sku || null,
        barcode || null,
        stock_quantity || 0,
        low_stock_threshold || 5,
        image_url || null,
      ],
    );

    const newProduct = await getOne(
      `SELECT p.*, pc.name as category_name
         FROM products p
         LEFT JOIN product_categories pc ON pc.id = p.category_id
        WHERE p.id = ?`,
      [result.insertId],
    );

    return created({
      id: newProduct.id,
      salonId: newProduct.salon_id,
      categoryId: newProduct.category_id,
      categoryName: newProduct.category_name,
      name: newProduct.name,
      description: newProduct.description,
      price: newProduct.price,
      costPrice: newProduct.cost_price,
      sku: newProduct.sku,
      stockQuantity: newProduct.stock_quantity,
      isActive: newProduct.is_active,
    });
  } catch (err) {
    console.error('Create product error:', err);
    return error('Failed to create product', 500);
  }
}
