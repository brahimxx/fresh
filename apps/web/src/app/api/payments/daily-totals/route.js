/**
 * GET /api/payments/daily-totals
 *
 * Returns a per-day revenue / transaction / refund series for the inclusive
 * window `[start_date, end_date]`, with one row per day (zero-filled for days
 * without transactions). The KPI card in the Sales_Page binds to this endpoint
 * to render the daily-revenue line chart.
 *
 * Spec: products-and-sales-improvements (Task 6.3, Req 16.1, 16.2, 16.5)
 *   - Date-spine recursive CTE LEFT JOINed against the same revenue computation
 *     as the KPI card (Req 12.4):
 *         revenue       = SUM(amount - COALESCE(refunded_amount, 0))
 *                           where status IN ('paid','partially_refunded')
 *         transactions  = COUNT(*)         over the same set
 *         refunded      = SUM(COALESCE(refunded_amount, 0))   over all rows in W
 *   - Range capped at 366 days; reject malformed dates / `start > end` /
 *     span > 366 with `ERROR_400` (Req 16.5).
 *   - Same authorization as the listing endpoint (Req 16.2): owner / admin
 *     always allowed; staff with Active_Staff_Record + `sales` permission
 *     allowed; non-admin must supply `salon_id`/`salonId`.
 *   - Conflicting `salon_id` and `salonId` query parameters → 400 ERROR_400
 *     (mirrors Req 10.6 on the listing endpoint).
 */

import { decodeId } from '@/lib/id';
import { getSession } from '@/lib/auth';
import { assertSalonAccess } from '@/lib/permissions-server';
import pool from '@/lib/db';
import { success, error, unauthorized, forbidden } from '@/lib/response';

const SALON_ID_INT_MAX = Number.MAX_SAFE_INTEGER;
const MAX_RANGE_DAYS = 366;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseSalonId(raw) {
  if (raw === null || raw === undefined || raw === '') return { empty: true };
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isInteger(n) && n > 0 && n <= SALON_ID_INT_MAX) return { value: n };
    return { invalid: true };
  }
  const decoded = decodeId(raw);
  if (typeof decoded === 'number' && Number.isInteger(decoded) && decoded > 0 && decoded <= SALON_ID_INT_MAX) {
    return { value: decoded };
  }
  return { invalid: true };
}

/**
 * Validate `YYYY-MM-DD` and return a UTC `Date` at midnight or `null`.
 * Guards against shapes like `2026-02-30` that `new Date()` happily rolls over.
 */
function parseIsoDate(raw) {
  if (typeof raw !== 'string' || !ISO_DATE_RE.test(raw)) return null;
  const [y, m, d] = raw.split('-').map(Number);
  // Build via UTC and round-trip to catch invalid calendar dates (e.g. Feb 30).
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

function toNonNegativeNumber(v) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export async function GET(request) {
  // 1. Auth (401 if no session — Req 1.1, mirrored from listing).
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);

  // 2. Resolve salon_id, accepting both snake_case and camelCase.
  //    Conflicting non-empty values are rejected (Req 10.6 parity).
  const rawSnake = searchParams.get('salon_id');
  const rawCamel = searchParams.get('salonId');
  const haveSnake = rawSnake !== null && rawSnake !== '';
  const haveCamel = rawCamel !== null && rawCamel !== '';
  
  const parsedSnake = parseSalonId(rawSnake);
  const parsedCamel = parseSalonId(rawCamel);

  if (haveSnake && haveCamel && rawSnake !== rawCamel) {
    if (parsedSnake.value == null || parsedCamel.value == null || parsedSnake.value !== parsedCamel.value) {
      return error('Conflicting salon_id and salonId values', 400);
    }
  }
  const rawSalonId = haveSnake ? rawSnake : haveCamel ? rawCamel : null;
  const parsed = haveSnake ? parsedSnake : parsedCamel;

  const isAdmin = session.role === 'admin';
  let salonIdNum = null;
  if (rawSalonId !== null) {
    if (parsed.invalid) {
      return error({ code: 'INVALID_SALON_ID', message: 'Invalid salon_id' }, 400);
    }
    salonIdNum = parsed.value;
  } else if (!isAdmin) {
    return error({ code: 'MISSING_SALON_ID', message: 'salon_id is required' }, 400);
  }

  // 3. Parse and validate the date window (Req 16.5).
  const rawStart = searchParams.get('start_date');
  const rawEnd = searchParams.get('end_date');
  const startDate = parseIsoDate(rawStart);
  const endDate = parseIsoDate(rawEnd);
  if (!startDate || !endDate) {
    return error('start_date and end_date are required as YYYY-MM-DD', 400);
  }
  if (startDate.getTime() > endDate.getTime()) {
    return error('start_date must be on or before end_date', 400);
  }
  const inclusiveDays =
    Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  if (inclusiveDays > MAX_RANGE_DAYS) {
    return error(`Date range exceeds ${MAX_RANGE_DAYS} days`, 400);
  }

  // 4. Authorization — mirror /api/payments listing (Req 16.2 → Req 10).
  const access = await assertSalonAccess({
    session,
    salonId: salonIdNum,
    perm: 'sales',
  });
  if (!access.ok) {
    if (access.code === 'UNAUTHORIZED') return unauthorized();
    if (access.code === 'FORBIDDEN') return forbidden();
    return error({ code: access.code, message: access.code }, access.status);
  }

  // 5. Date-spine recursive CTE + per-day aggregation, LEFT JOINed so days
  //    without transactions still appear as zeroes (Req 16.1).
  //
  //    Revenue computation matches Req 12.4 exactly:
  //      - revenue:      SUM(amount - COALESCE(refunded_amount, 0))
  //                        over rows whose status ∈ ('paid','partially_refunded')
  //      - transactions: COUNT(*) over the same rows
  //      - refunded:     SUM(COALESCE(refunded_amount, 0)) over all rows in W
  const startStr = rawStart;
  const endStr = rawEnd;

  const aggWhere = ['DATE(p.created_at) BETWEEN ? AND ?'];
  const aggParams = [startStr, endStr];
  if (access.salonId != null) {
    aggWhere.push('b.salon_id = ?');
    aggParams.push(access.salonId);
  } else if (access.role === 'admin') {
    // Admin without salon_id aggregates across all salons (mirrors listing
    // Req 1.7 admin scope).
  }

  const sql = `
    WITH RECURSIVE date_spine AS (
      SELECT DATE(?) AS d
      UNION ALL
      SELECT DATE_ADD(d, INTERVAL 1 DAY) FROM date_spine WHERE d < DATE(?)
    ),
    agg AS (
      SELECT
        DATE(p.created_at) AS d,
        COALESCE(SUM(
          CASE WHEN p.status IN ('paid','partially_refunded')
               THEN p.amount - COALESCE(p.refunded_amount, 0)
               ELSE 0 END
        ), 0) AS revenue,
        COALESCE(SUM(
          CASE WHEN p.status IN ('paid','partially_refunded') THEN 1 ELSE 0 END
        ), 0) AS transactions,
        COALESCE(SUM(COALESCE(p.refunded_amount, 0)), 0) AS refunded
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      WHERE ${aggWhere.join(' AND ')}
      GROUP BY DATE(p.created_at)
    )
    SELECT
      DATE_FORMAT(ds.d, '%Y-%m-%d') AS date,
      COALESCE(agg.revenue, 0)      AS revenue,
      COALESCE(agg.transactions, 0) AS transactions,
      COALESCE(agg.refunded, 0)     AS refunded
    FROM date_spine ds
    LEFT JOIN agg ON agg.d = ds.d
    ORDER BY ds.d ASC
  `;
  const sqlParams = [startStr, endStr, ...aggParams];

  // 6. Execute on a single pooled connection so the SET SESSION takes effect
  //    for the recursive CTE (`cte_max_recursion_depth` defaults to 1000 on
  //    MySQL 8.0+, but we set it explicitly so the 366-day cap is honoured
  //    regardless of server config).
  const conn = await pool.getConnection();
  try {
    await conn.query(`SET SESSION cte_max_recursion_depth = ${MAX_RANGE_DAYS + 32}`);
    const [rows] = await conn.query(sql, sqlParams);
    const data = rows.map((r) => ({
      date: r.date,
      revenue: toNonNegativeNumber(r.revenue),
      transactions: toNonNegativeNumber(r.transactions),
      refunded: toNonNegativeNumber(r.refunded),
    }));
    return success(data);
  } catch (err) {
    console.error('Get daily totals error:', err);
    return error('Failed to compute daily totals', 500);
  } finally {
    conn.release();
  }
}
