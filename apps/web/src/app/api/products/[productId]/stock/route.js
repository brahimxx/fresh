/**
 * Stock_API — /api/products/[productId]/stock
 *
 * GET  → paginated movement history for a product
 * PUT  → adjust stock with `mode` ∈ {set, add, subtract}, `quantity` ≥ 0,
 *        `reason_code` (manual codes only), optional `reason_note` ≤ 500 chars
 *
 * Implements Requirements 3.x and 4.x of the products-and-sales-improvements spec:
 *   - Auth + per-salon access via assertSalonAccess (403 → 404 for cross-salon parity)
 *   - Single transaction: UPDATE products + INSERT product_stock_movements
 *     + INSERT audit_logs (manual codes only). Any failure rolls back the whole tx.
 *   - Clamp-at-zero arithmetic, signed delta recorded.
 *   - Reserved sale-driven codes ('sale', 'refund') are rejected here.
 */

import { decodeId } from '@/lib/id';
import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { assertSalonAccess } from '@/lib/permissions-server';
import {
  success,
  error,
  unauthorized,
  notFound,
} from '@/lib/response';

const MANUAL_REASON_CODES = new Set([
  'manual_set',
  'manual_adjustment',
  'restock',
  'waste',
  'correction',
]);

const RESERVED_REASON_CODES = new Set(['sale', 'refund']);
const VALID_MODES = new Set(['set', 'add', 'subtract']);
const MAX_REASON_NOTE = 500;

/**
 * Map an `assertSalonAccess` failure to the appropriate response.
 *
 * For this endpoint's threat model the difference between "wrong salon"
 * and "salon does not exist" must not be observable, so any failure that
 * is not `UNAUTHORIZED` collapses to a 404 with the standard NOT_FOUND
 * envelope (Requirements 3.9, 4.6).
 */
function denialToResponse(access) {
  if (access.code === 'UNAUTHORIZED') return unauthorized();
  // FORBIDDEN, INVALID_SALON_ID, MISSING_SALON_ID all collapse to 404 here:
  // we already located the product, so the only reason these can fire is
  // because the caller is not on the salon owning that product.
  return notFound('Product not found');
}

function validatePageLimit(searchParams) {
  const rawPage = searchParams.get('page');
  const rawLimit = searchParams.get('limit');

  let page = 1;
  let limit = 20;

  if (rawPage !== null && rawPage !== '') {
    const n = Number(rawPage);
    if (!Number.isInteger(n) || n < 1 || String(n) !== String(rawPage).trim()) {
      return { ok: false, parameter: 'page' };
    }
    page = n;
  }
  if (rawLimit !== null && rawLimit !== '') {
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n < 1 || n > 100 || String(n) !== String(rawLimit).trim()) {
      return { ok: false, parameter: 'limit' };
    }
    limit = n;
  }
  return { ok: true, page, limit };
}

function validateAdjustBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, parameter: 'body', message: 'Request body is required' };
  }

  const { mode, quantity, reason_code, reason_note } = body;

  if (typeof mode !== 'string' || !VALID_MODES.has(mode)) {
    return { ok: false, parameter: 'mode', message: 'mode must be one of set, add, subtract' };
  }

  if (
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    !Number.isFinite(quantity)
  ) {
    return {
      ok: false,
      parameter: 'quantity',
      message: 'quantity must be a non-negative integer',
    };
  }

  if (typeof reason_code !== 'string' || reason_code.length === 0) {
    return { ok: false, parameter: 'reason_code', message: 'reason_code is required' };
  }
  if (RESERVED_REASON_CODES.has(reason_code)) {
    return {
      ok: false,
      parameter: 'reason_code',
      message: 'reason_code "sale" and "refund" are reserved for the checkout flow',
    };
  }
  if (!MANUAL_REASON_CODES.has(reason_code)) {
    return {
      ok: false,
      parameter: 'reason_code',
      message: 'reason_code must be one of manual_set, manual_adjustment, restock, waste, correction',
    };
  }

  let normalisedNote = null;
  if (reason_note !== undefined && reason_note !== null) {
    if (typeof reason_note !== 'string') {
      return { ok: false, parameter: 'reason_note', message: 'reason_note must be a string' };
    }
    if (reason_note.length > MAX_REASON_NOTE) {
      return {
        ok: false,
        parameter: 'reason_note',
        message: `reason_note must be ${MAX_REASON_NOTE} characters or fewer`,
      };
    }
    normalisedNote = reason_note;
  }

  return {
    ok: true,
    mode,
    quantity,
    reason_code,
    reason_note: normalisedNote,
  };
}

/**
 * Compute the post-write stock and the actual signed delta written.
 * Implements Requirements 3.2-3.5: set / add / subtract with clamp at 0.
 */
function computeNewQuantity(currentQty, mode, quantity) {
  const before = Number(currentQty);
  let after;
  if (mode === 'set') {
    after = quantity;
  } else if (mode === 'add') {
    after = before + quantity;
  } else {
    // mode === 'subtract'
    after = Math.max(0, before - quantity);
  }
  return { before, after, delta: after - before };
}

// ─── GET — movement history ────────────────────────────────────────────────
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

    const { searchParams } = new URL(request.url);
    const pageLimit = validatePageLimit(searchParams);
    if (!pageLimit.ok) {
      return error(
        {
          message: `Invalid ${pageLimit.parameter} parameter`,
          code: 'ERROR_400',
          details: { parameter: pageLimit.parameter },
        },
        400,
      );
    }
    const { page, limit } = pageLimit;

    const product = await getOne(
      'SELECT id, salon_id FROM products WHERE id = ? AND deleted_at IS NULL',
      [productId],
    );
    if (!product) {
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

    const offset = (page - 1) * limit;
    const totalRow = await getOne(
      'SELECT COUNT(*) AS cnt FROM product_stock_movements WHERE product_id = ?',
      [productId],
    );
    const total = Number(totalRow?.cnt || 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const rows = await query(
      `SELECT
         psm.id,
         psm.product_id,
         psm.salon_id,
         psm.change_type,
         psm.quantity_before,
         psm.quantity_after,
         psm.delta,
         psm.reason_code,
         psm.reason_note,
         psm.performed_by,
         NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), '') AS performed_by_name,
         psm.booking_id,
         psm.created_at
       FROM product_stock_movements psm
       LEFT JOIN users u ON u.id = psm.performed_by
       WHERE psm.product_id = ?
       ORDER BY psm.created_at DESC, psm.id DESC
       LIMIT ? OFFSET ?`,
      [productId, limit, offset],
    );

    return success({
      data: rows,
      meta: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error('Stock history error:', err);
    return error('Failed to load stock history', 500);
  }
}

// ─── PUT — adjust stock ────────────────────────────────────────────────────
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

    let body;
    try {
      body = await request.json();
    } catch {
      return error(
        { message: 'Invalid JSON body', code: 'ERROR_400', details: { parameter: 'body' } },
        400,
      );
    }

    const validated = validateAdjustBody(body);
    if (!validated.ok) {
      return error(
        {
          message: validated.message,
          code: 'ERROR_400',
          details: { parameter: validated.parameter },
        },
        400,
      );
    }

    // Locate the product (and its salon) before authorization so cross-salon
    // and "doesn't exist" return the same 404 body shape.
    const product = await getOne(
      'SELECT id, salon_id FROM products WHERE id = ? AND deleted_at IS NULL',
      [productId],
    );
    if (!product) {
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

    const { mode, quantity, reason_code, reason_note } = validated;

    // ── Deduplication guard ──────────────────────────────────────────────
    // Reject duplicate adjustments from double-clicks or network retries.
    // If an identical adjustment (same product, user, mode, quantity,
    // reason_code) was recorded in the last 10 seconds, return the existing
    // result as an idempotent success rather than double-adjusting.
    const recentDupe = await getOne(
      `SELECT id AS movement_id, quantity_after AS stock_quantity
         FROM product_stock_movements
        WHERE product_id = ?
          AND performed_by = ?
          AND change_type = ?
          AND reason_code = ?
          AND CASE WHEN ? = 'set' THEN quantity_after = ? ELSE ABS(delta) = ? END
          AND created_at >= NOW() - INTERVAL 10 SECOND
        ORDER BY id DESC
        LIMIT 1`,
      [productId, session.userId, mode, reason_code, mode, quantity, quantity],
    );
    if (recentDupe) {
      return success({
        id: productId,
        stock_quantity: recentDupe.stock_quantity,
        movement_id: recentDupe.movement_id,
      });
    }

    // ── Single transaction: lock row → update → insert movement → audit ──
    const result = await transaction(async (conn) => {
      // 1. Lock the product row to serialise concurrent stock writes.
      const [lockedRows] = await conn.query(
        'SELECT id, salon_id, stock_quantity, deleted_at FROM products WHERE id = ? FOR UPDATE',
        [productId],
      );
      const locked = lockedRows[0];
      if (!locked || locked.deleted_at !== null) {
        // The product was soft-deleted between the pre-check and the lock.
        const err = new Error('PRODUCT_GONE');
        err.code = 'PRODUCT_GONE';
        throw err;
      }

      const { before, after, delta } = computeNewQuantity(
        locked.stock_quantity,
        mode,
        quantity,
      );

      // 2. Update stock_quantity. Any failure rolls the entire tx back so
      //    the movement and audit rows are never partially written.
      await conn.query(
        'UPDATE products SET stock_quantity = ?, updated_at = NOW() WHERE id = ?',
        [after, productId],
      );

      // 3. Insert the movement row.
      const [movementResult] = await conn.query(
        `INSERT INTO product_stock_movements
           (product_id, salon_id, change_type, quantity_before, quantity_after, delta,
            reason_code, reason_note, performed_by, booking_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          productId,
          locked.salon_id,
          mode,
          before,
          after,
          delta,
          reason_code,
          reason_note,
          session.userId,
        ],
      );
      const movementId = movementResult.insertId;

      // 4. Audit log row — manual codes only (sale/refund are rejected
      //    upstream and live on the booking/payment audit trail).
      await conn.query(
        `INSERT INTO audit_logs
           (user_id, action, entity_type, entity_id, old_data, new_data)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          session.userId,
          'stock_change',
          'product',
          productId,
          JSON.stringify({ stock_quantity: before }),
          JSON.stringify({
            stock_quantity: after,
            mode,
            quantity,
            delta,
            reason_code,
            reason_note,
            movement_id: movementId,
          }),
        ],
      );

      return { id: productId, stock_quantity: after, movement_id: movementId };
    });

    return success(result);
  } catch (err) {
    if (err && err.code === 'PRODUCT_GONE') {
      return notFound('Product not found');
    }
    console.error('Stock adjust error:', err);
    return error('Failed to adjust stock', 500);
  }
}
