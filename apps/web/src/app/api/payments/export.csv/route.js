/**
 * GET /api/payments/export.csv
 *
 * Streams the salon's payments ledger as an RFC 4180 CSV.
 *
 * Spec: products-and-sales-improvements (Task 6.4)
 *   - Same filters and authorization as the payments listing
 *     (Req 17.3, 17.5, 17.8) — `salon_id`/`salonId`, `status`, `method`,
 *     `start_date`, `end_date`, `search`.
 *   - Header row always emitted, even on empty result (Req 17.9).
 *   - Bounded memory: query is paginated in fixed-size chunks and pushed
 *     through a `ReadableStream` (Req 17.6).
 *   - `Content-Type: text/csv; charset=utf-8` and
 *     `Content-Disposition: attachment; filename="payments-{salonId}-{YYYYMMDD-HHmm}.csv"`.
 *   - Walk-in / orphan client mapping (Req 13.5) is preserved in the CSV
 *     so the export matches the listing exactly.
 */

import { getSession } from '@/lib/auth';
import { assertSalonAccess } from '@/lib/permissions-server';
import { query } from '@/lib/db';
import { csvRow } from '@/lib/csv';
import { unauthorized, forbidden, error } from '@/lib/response';

// ─── Filter vocabulary (mirrors the listing endpoint contract) ─────────────

const CANONICAL_STATUS = new Set([
  'pending',
  'paid',
  'refunded',
  'partially_refunded',
]);

const CANONICAL_METHOD = new Set(['card', 'cash']);

const HEADER = [
  'id',
  'booking_id',
  'client_name',
  'client_email',
  'amount',
  'refunded_amount',
  'tip_amount',
  'method',
  'status',
  'created_at',
];

const CHUNK_SIZE = 500;

// `YYYY-MM-DD` — strict calendar-date check (no leap-year-day-32 false positives).
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

/**
 * Validate a `YYYY-MM-DD` calendar date. Returns the input string when valid,
 * otherwise `null`. Rejects values like `2026-02-30` that match the regex but
 * don't correspond to a real day.
 */
function parseIsoDate(raw) {
  if (!ISO_DATE_RE.test(raw)) return null;
  const [y, m, d] = raw.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return raw;
}

/**
 * Walk-in / orphan client mapping (Requirement 13.5):
 * when the joined `users` row is missing or soft-deleted, the row stays but
 * `client_id` is null and `client_name` becomes "Walk-in Guest".
 */
function mapClient(row) {
  const hasUser = row.user_id != null && row.user_deleted_at == null;
  if (!hasUser) {
    return { client_name: 'Walk-in Guest', client_email: null };
  }
  const first = (row.first_name || '').trim();
  const last = (row.last_name || '').trim();
  const fullName = [first, last].filter(Boolean).join(' ').trim();
  return {
    client_name: fullName || 'Walk-in Guest',
    client_email: row.email || null,
  };
}

/**
 * Coalesce a possibly-null DB numeric to `0` and round to 2 decimals,
 * matching the listing endpoint's monetary-default rule (Req 13.1).
 */
function num(value) {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Convert a MySQL DATETIME (server tz, returned as a string by `dateStrings`)
 * to ISO 8601 UTC. Returns the empty string when unparseable so the cell
 * serialises as empty rather than `Invalid Date`.
 */
function toIso(dt) {
  if (!dt) return '';
  const d = dt instanceof Date ? dt : new Date(dt);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

// ─── Handler ───────────────────────────────────────────────────────────────

export async function GET(request) {
  // 1. Auth (401 if no session — Req 17.8 mirrors listing).
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);

  // 2. salon_id / salonId parsing — both names accepted (Req 10.1); conflicting
  //    values rejected (Req 10.6). Admin may omit; non-admin enforced by
  //    `assertSalonAccess`.
  const rawSalonSnake = searchParams.get('salon_id');
  const rawSalonCamel = searchParams.get('salonId');
  let rawSalonId = null;
  if (rawSalonSnake !== null && rawSalonCamel !== null) {
    if (rawSalonSnake !== rawSalonCamel) {
      return error(
        {
          code: 'ERROR_400',
          message: 'salon_id and salonId must agree when both supplied',
        },
        400,
      );
    }
    rawSalonId = rawSalonSnake;
  } else {
    rawSalonId = rawSalonSnake ?? rawSalonCamel;
  }

  let salonIdNum = null;
  if (rawSalonId !== null && rawSalonId !== '') {
    const parsed = parsePositiveInt(rawSalonId);
    if (parsed.invalid) {
      return error({ code: 'INVALID_SALON_ID', message: 'Invalid salon_id' }, 400);
    }
    salonIdNum = parsed.value;
  }

  // 3. Filter validation — done before authorization-success allocations
  //    but after auth so unauthenticated callers can't probe parameter shapes.
  const status = searchParams.get('status');
  if (status !== null && status !== '' && !CANONICAL_STATUS.has(status)) {
    return badParameter('status');
  }

  const method = searchParams.get('method');
  if (method !== null && method !== '' && !CANONICAL_METHOD.has(method)) {
    return badParameter('method');
  }

  const startDateRaw = searchParams.get('start_date');
  let startDate = null;
  if (startDateRaw !== null && startDateRaw !== '') {
    startDate = parseIsoDate(startDateRaw);
    if (!startDate) return badParameter('start_date');
  }

  const endDateRaw = searchParams.get('end_date');
  let endDate = null;
  if (endDateRaw !== null && endDateRaw !== '') {
    endDate = parseIsoDate(endDateRaw);
    if (!endDate) return badParameter('end_date');
  }

  if (startDate && endDate && startDate > endDate) {
    return badParameter('start_date', 'start_date must be <= end_date');
  }

  const search = searchParams.get('search');
  if (search !== null && search.length > 100) {
    return badParameter('search', 'search must be 0–100 characters');
  }

  // 4. Authorization (mirrors listing endpoint — Req 17.5, 17.8).
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

  // 5. Build the WHERE / ORDER BY for the streaming query.
  //    The user join is intentionally LEFT so walk-in / soft-deleted clients
  //    still surface the payment row (Req 13.5) — same shape as the listing.
  const whereClauses = ['1=1'];
  const baseParams = [];

  if (access.salonId != null) {
    // Authenticated owner / staff path — scope to the resolved salon.
    whereClauses.push('b.salon_id = ?');
    baseParams.push(access.salonId);
  } else if (access.role !== 'admin') {
    // Non-admin without a resolved salon (covered by `assertSalonAccess`,
    // but defensive belt-and-braces against future regressions).
    return error(
      { code: 'MISSING_SALON_ID', message: 'salon_id is required' },
      400,
    );
  }

  if (status) {
    whereClauses.push('p.status = ?');
    baseParams.push(status);
  }

  if (method) {
    whereClauses.push('p.method = ?');
    baseParams.push(method);
  }

  if (startDate) {
    // Inclusive at the start of day (server tz) — Req 11.1.
    whereClauses.push('p.created_at >= ?');
    baseParams.push(`${startDate} 00:00:00`);
  }

  if (endDate) {
    // Inclusive at the end of day (server tz) — Req 11.2.
    whereClauses.push('p.created_at <= ?');
    baseParams.push(`${endDate} 23:59:59`);
  }

  if (search) {
    // Case-insensitive substring across the fields the Sales_Page already
    // exposes in its search input (client name / email, booking id,
    // stripe payment id). Walk-in rows match only by booking_id /
    // stripe_payment_id since their user fields are NULL.
    whereClauses.push(
      '(' +
        'u.first_name LIKE ? OR ' +
        'u.last_name LIKE ? OR ' +
        'u.email LIKE ? OR ' +
        'CAST(p.booking_id AS CHAR) LIKE ? OR ' +
        'p.stripe_payment_id LIKE ?' +
      ')',
    );
    const like = `%${search}%`;
    baseParams.push(like, like, like, like, like);
  }

  const baseSql = `
    SELECT p.id,
           p.booking_id,
           p.amount,
           p.refunded_amount,
           p.tip_amount,
           p.method,
           p.status,
           p.created_at,
           u.id           AS user_id,
           u.first_name   AS first_name,
           u.last_name    AS last_name,
           u.email        AS email,
           u.deleted_at   AS user_deleted_at
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      LEFT JOIN users u ON u.id = b.client_id
     WHERE ${whereClauses.join(' AND ')}
     ORDER BY p.created_at DESC, p.id ASC
  `;

  // 6. Stream the CSV (header row first, then chunked rows).
  const encoder = new TextEncoder();
  const filenameSalonSlug = access.salonId == null ? 'all' : String(access.salonId);
  const filename = `payments-${filenameSalonSlug}-${timestampForFilename()}.csv`;

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
            const client = mapClient(r);
            controller.enqueue(
              encoder.encode(
                csvRow([
                  r.id,
                  r.booking_id,
                  client.client_name,
                  client.client_email, // null → empty cell via csvCell
                  num(r.amount),
                  num(r.refunded_amount),
                  num(r.tip_amount),
                  r.method,
                  r.status,
                  toIso(r.created_at),
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
