/**
 * GET /api/products/export.csv
 *
 * Streams the products catalogue as an RFC 4180 CSV.
 *
 * Spec: products-and-sales-improvements (Task 5.4)
 *   - Same filters and authorization as the listing endpoint (Req 17.1, 17.5, 17.8).
 *   - Header row always emitted, even on empty result (Req 17.9).
 *   - Bounded memory: query is paginated in fixed-size chunks and pushed
 *     through a ReadableStream (Req 17.6).
 *   - `Content-Type: text/csv; charset=utf-8` and `Content-Disposition:
 *     attachment; filename="products-{salonId}-{YYYYMMDD-HHmm}.csv"`.
 */

import { getSession } from '@/lib/auth';
import { assertSalonAccess } from '@/lib/permissions-server';
import { query } from '@/lib/db';
import { csvRow } from '@/lib/csv';
import { unauthorized, forbidden, error } from '@/lib/response';

// ─── Filter / sort vocabulary (mirrors the listing endpoint contract) ──────

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

const HEADER = [
  'id',
  'name',
  'brand',
  'sku',
  'barcode',
  'category',
  'price',
  'cost_price',
  'stock_quantity',
  'low_stock_threshold',
  'is_active',
  'created_at',
];

const CHUNK_SIZE = 500;

// ─── Helpers ───────────────────────────────────────────────────────────────

function pad2(n) {
  return String(n).padStart(2, '0');
}

function timestampForFilename(d = new Date()) {
  return (
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
    `-${pad2(d.getHours())}${pad2(d.getMinutes())}`
  );
}

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

// ─── Handler ───────────────────────────────────────────────────────────────

export async function GET(request) {
  // 1. Auth (401 if no session — Req 17.8 mirrors listing 1.1).
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);

  // 2. salon_id parsing (admin may omit; non-admin enforced by assertSalonAccess).
  const rawSalonId = searchParams.get('salon_id');
  let salonIdNum = null;
  if (rawSalonId !== null && rawSalonId !== '') {
    const parsed = parsePositiveInt(rawSalonId);
    if (parsed.invalid) {
      return error({ code: 'INVALID_SALON_ID', message: 'Invalid salon_id' }, 400);
    }
    salonIdNum = parsed.value;
  }

  // 3. Filter / sort validation — done before authorization-success allocations
  //    but after auth so unauthenticated callers can't probe parameter shapes.
  const search = searchParams.get('search');
  if (search !== null && search.length > 100) {
    return badParameter('search', 'search must be 0–100 characters');
  }

  const rawCategory = searchParams.get('category_id');
  let categoryId = null;
  if (rawCategory !== null && rawCategory !== '') {
    const parsed = parsePositiveInt(rawCategory);
    if (parsed.invalid) return badParameter('category_id');
    categoryId = parsed.value;
  }

  const stock = searchParams.get('stock');
  if (stock !== null && stock !== '' && !STOCK_MODES.has(stock)) {
    return badParameter('stock');
  }

  const rawIsActive = searchParams.get('is_active');
  let isActiveFilter = null;
  if (rawIsActive !== null && rawIsActive !== '') {
    if (rawIsActive === 'true') isActiveFilter = 1;
    else if (rawIsActive === 'false') isActiveFilter = 0;
    else return badParameter('is_active');
  }

  const sortKey = searchParams.get('sort') || 'name_asc';
  if (!SORT_MAP[sortKey]) return badParameter('sort');

  // 4. Authorization (mirrors listing endpoint — Req 17.5, 17.8).
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

  // 5. Build the WHERE / ORDER BY for the streaming query.
  const whereClauses = ['p.deleted_at IS NULL'];
  const baseParams = [];

  if (access.salonId != null) {
    whereClauses.push('p.salon_id = ?');
    baseParams.push(access.salonId);
  }

  if (categoryId != null) {
    whereClauses.push('p.category_id = ?');
    baseParams.push(categoryId);
  }

  if (search) {
    whereClauses.push(
      '(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ?)',
    );
    const like = `%${search}%`;
    baseParams.push(like, like, like, like);
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
    baseParams.push(isActiveFilter);
  }

  const baseSql = `
    SELECT p.id,
           p.name,
           p.brand,
           p.sku,
           p.barcode,
           pc.name AS category_name,
           p.price,
           p.cost_price,
           p.stock_quantity,
           p.low_stock_threshold,
           p.is_active,
           p.created_at
      FROM products p
      LEFT JOIN product_categories pc ON pc.id = p.category_id
     WHERE ${whereClauses.join(' AND ')}
     ORDER BY ${SORT_MAP[sortKey]}, p.id ASC
  `;

  // 6. Stream the CSV (header row first, then chunked rows).
  const encoder = new TextEncoder();
  const filenameSalonSlug = access.salonId == null ? 'all' : String(access.salonId);
  const filename = `products-${filenameSalonSlug}-${timestampForFilename()}.csv`;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Header row — emitted even when the result set is empty (Req 17.9).
        controller.enqueue(encoder.encode(csvRow(HEADER)));

        let offset = 0;
        // Loop in fixed-size chunks for bounded memory.
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const rows = await query(`${baseSql} LIMIT ? OFFSET ?`, [
            ...baseParams,
            CHUNK_SIZE,
            offset,
          ]);

          for (const r of rows) {
            controller.enqueue(
              encoder.encode(
                csvRow([
                  r.id,
                  r.name,
                  r.brand,
                  r.sku,
                  r.barcode,
                  r.category_name, // null → empty cell via csvCell
                  r.price,
                  r.cost_price,
                  r.stock_quantity,
                  r.low_stock_threshold,
                  r.is_active,
                  r.created_at,
                ]),
              ),
            );
          }

          if (rows.length < CHUNK_SIZE) break;
          offset += CHUNK_SIZE;
        }

        controller.close();
      } catch (err) {
        // Surface stream-time failures so the client connection terminates
        // rather than receiving a half-written CSV with no error indication.
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
