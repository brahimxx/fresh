/**
 * GET /api/products/stats
 *
 * Returns the four product KPI aggregates over the active, non-deleted catalog
 * for a single salon (or across all salons when the caller is admin and omits
 * `salon_id`).
 *
 * Spec: products-and-sales-improvements (Task 5.3)
 *   - Single SQL with conditional aggregates over
 *     `salon_id = ? AND deleted_at IS NULL AND is_active = 1` (Req 9.1).
 *   - Response `{ totalProducts, lowStockCount, outOfStockCount,
 *     totalInventoryValue }`, all numeric and `>= 0`.
 *   - Same authorization matrix as the listing endpoint (Req 9.2).
 *   - Reject missing/invalid `salon_id` with `INVALID_SALON_ID` (Req 9.4).
 */

import { getSession } from '@/lib/auth';
import { decodeId } from '@/lib/id';
import { assertSalonAccess } from '@/lib/permissions-server';
import { getOne } from '@/lib/db';
import { success, error, unauthorized, forbidden } from '@/lib/response';

const SALON_ID_INT_MAX = Number.MAX_SAFE_INTEGER;

function parseSalonId(raw) {
  // Per Req 9.4 the stats endpoint rejects both missing and malformed
  // `salon_id` with `INVALID_SALON_ID` (the listing's `MISSING_SALON_ID`
  // distinction does not apply here for non-admin callers — admins may
  // still omit it and aggregate across salons via assertSalonAccess).
  if (raw === null || raw === undefined || raw === '') return { empty: true };
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return { invalid: true };
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > SALON_ID_INT_MAX) {
    return { invalid: true };
  }
  return { value: n };
}

function toNonNegativeNumber(v) {
  // MySQL returns DECIMAL/SUM as strings or null depending on driver config.
  // Coerce defensively and clamp at 0 so the contract ("numeric >= 0") holds
  // for the empty-result case as well as any pathological row.
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export async function GET(request) {
  // 1. Auth (401 if no session — mirrors listing Req 1.1).
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);

  // 2. Parse `salon_id`. Admin may omit; everyone else must supply a valid one.
  const rawSalonId = searchParams.get('salon_id');
  const isAdmin = session.role === 'admin';
  let salonIdNum = null;

  if (rawSalonId !== null && rawSalonId !== '') {
    const decoded = decodeId(rawSalonId);
    const parsed = parseSalonId(String(decoded));
    if (parsed.invalid) {
      return error({ code: 'INVALID_SALON_ID', message: 'Invalid salon_id' }, 400);
    }
    salonIdNum = parsed.value;
  } else if (!isAdmin) {
    // Req 9.4: missing salon_id is rejected with INVALID_SALON_ID for the
    // stats endpoint (no `MISSING_SALON_ID` differentiation).
    return error({ code: 'INVALID_SALON_ID', message: 'salon_id is required' }, 400);
  }

  // 3. Authorization (mirrors the listing endpoint — Req 9.2).
  const access = await assertSalonAccess({
    session,
    salonId: salonIdNum,
    perm: 'products',
  });
  if (!access.ok) {
    if (access.code === 'UNAUTHORIZED') return unauthorized();
    if (access.code === 'FORBIDDEN') return forbidden();
    // assertSalonAccess returns INVALID_SALON_ID / MISSING_SALON_ID for the
    // listing contract; remap MISSING → INVALID for parity with Req 9.4.
    const code = access.code === 'MISSING_SALON_ID' ? 'INVALID_SALON_ID' : access.code;
    return error({ code, message: code }, access.status);
  }

  // 4. Single SQL with conditional aggregates over the active, non-deleted set.
  const whereClauses = ['deleted_at IS NULL', 'is_active = 1'];
  const params = [];
  if (access.salonId != null) {
    whereClauses.push('salon_id = ?');
    params.push(access.salonId);
  }

  const sql = `
    SELECT
      COUNT(*) AS totalProducts,
      SUM(CASE WHEN stock_quantity > 0
                AND stock_quantity <= low_stock_threshold THEN 1 ELSE 0 END) AS lowStockCount,
      SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) AS outOfStockCount,
      COALESCE(SUM(price * stock_quantity), 0) AS totalInventoryValue
    FROM products
    WHERE ${whereClauses.join(' AND ')}
  `;

  try {
    const row = (await getOne(sql, params)) || {};
    return success({
      totalProducts: toNonNegativeNumber(row.totalProducts),
      lowStockCount: toNonNegativeNumber(row.lowStockCount),
      outOfStockCount: toNonNegativeNumber(row.outOfStockCount),
      totalInventoryValue: toNonNegativeNumber(row.totalInventoryValue),
    });
  } catch (err) {
    console.error('Get product stats error:', err);
    return error('Failed to compute product stats', 500);
  }
}
