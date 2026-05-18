/**
 * /api/payments — listing + single-booking POST
 *
 * Listing refactored per the products-and-sales-improvements spec (Task 6.1):
 *   - Accepts both `salon_id` and `salonId`; conflicting values → ERROR_400
 *     (Req 10.1, 10.6).
 *   - Owners scoped to owned salons even without `salon_id` (Req 10.3).
 *     Staff scoped to salons with an Active_Staff_Record (Req 10.2).
 *   - Filters: status, method (canonical enums, case-sensitive),
 *     start_date / end_date (YYYY-MM-DD, inclusive 00:00:00 / 23:59:59 server tz,
 *     reject start > end), search, page, limit, sort. All filters AND-composed
 *     server-side (Req 11.1–11.8).
 *   - Canonical snake_case row shape with `0` defaults for nullable numerics
 *     (Req 13.1). booking_datetime / created_at as ISO 8601 UTC.
 *   - Walk-in / orphan client mapping: client_id=null, client_name="Walk-in Guest",
 *     client_email=null (Req 13.5).
 *   - Wraps in standard `success({ data: rows, meta })`.
 *
 * The POST handler (creating a payment for a booking) is preserved as-is —
 * Task 6.1 only refactors the listing endpoint.
 */

import { decodeId } from '@/lib/id';
import { query, getOne } from '@/lib/db';
import { requireAuth, getSession } from '@/lib/auth';
import { assertSalonAccess } from '@/lib/permissions-server';
import {
  success,
  error,
  created,
  unauthorized,
  forbidden,
} from '@/lib/response';

// ─── Vocabulary ────────────────────────────────────────────────────────────

const STATUS_ENUM = new Set(['pending', 'paid', 'refunded', 'partially_refunded']);
const METHOD_ENUM = new Set(['card', 'cash']);

const SORT_MAP = {
  created_desc: 'p.created_at DESC, p.id DESC',
  created_asc: 'p.created_at ASC, p.id ASC',
  amount_desc: 'p.amount DESC, p.id DESC',
  amount_asc: 'p.amount ASC, p.id ASC',
};

const WALK_IN_NAME = 'Walk-in Guest';

// ─── Validation helpers ────────────────────────────────────────────────────

function badParameter(parameter, message) {
  return error(
    {
      code: 'ERROR_400',
      message: message || `Invalid parameter: ${parameter}`,
      details: { parameter },
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

function parseSalonIdParam(raw) {
  // Accepts numeric strings or encoded ids.
  if (raw === null || raw === undefined || raw === '') return { empty: true };
  // Try numeric first.
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isInteger(n) && n > 0) return { value: n };
    return { invalid: true };
  }
  // Otherwise try the encoded path (legacy callers may send opaque ids).
  const decoded = decodeId(raw);
  if (typeof decoded === 'number' && Number.isInteger(decoded) && decoded > 0) {
    return { value: decoded };
  }
  return { invalid: true };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(raw, parameterName) {
  if (raw === null || raw === undefined || raw === '') return { empty: true };
  if (typeof raw !== 'string' || !DATE_RE.test(raw)) {
    return { invalid: true, parameter: parameterName };
  }
  // Round-trip check rejects 2026-02-30 etc.
  const [y, m, d] = raw.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return { invalid: true, parameter: parameterName };
  }
  return { value: raw };
}

/**
 * Convert a MySQL `dateStrings: true` value (e.g. `"2026-05-13 14:30:00"` or a
 * Date instance) to ISO 8601 UTC. The stored datetime is interpreted as
 * server-local time, matching how the rest of the codebase reads it.
 */
function toIsoUtc(raw) {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw !== 'string') return null;
  // Replace the space separator so `Date` parses it as a local-tz datetime.
  const parsed = new Date(raw.replace(' ', 'T'));
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function numericOrZero(v) {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ─── Salon scope resolution ────────────────────────────────────────────────
//
// Listing accepts both `salon_id` and `salonId` (Req 10.1) and rejects
// conflicting values (Req 10.6). Returns `{ salonId, role }` on success or
// an error response on failure.

async function resolveListingScope(searchParams, session) {
  const rawA = searchParams.get('salon_id');
  const rawB = searchParams.get('salonId');

  // Conflict detection — both supplied with different non-empty values.
  const a = parseSalonIdParam(rawA);
  const b = parseSalonIdParam(rawB);
  
  if (rawA && rawB && rawA !== rawB) {
    if (a.value == null || b.value == null || a.value !== b.value) {
      return {
        response: error(
          {
            code: 'ERROR_400',
            message: 'salon_id and salonId must match when both are supplied',
            details: { parameter: 'salon_id' },
          },
          400,
        ),
      };
    }
  }

  const raw = rawA || rawB;
  const parsed = a.empty ? b : a;

  // Admin without a salon: allowed, returns all.
  if (session.role === 'admin' && parsed.empty) {
    return { salonId: null, role: 'admin' };
  }

  // Owner without a salon: scope by owned salons (Req 10.3).
  if (session.role === 'owner' && parsed.empty) {
    return { salonId: null, role: 'owner', ownerScope: true };
  }

  // Otherwise the caller must pass a salon and have access.
  const access = await assertSalonAccess({
    session,
    salonId: parsed.invalid ? raw : (parsed.value ?? raw),
    perm: 'sales',
  });
  if (!access.ok) {
    if (access.code === 'UNAUTHORIZED') {
      return { response: unauthorized() };
    }
    if (access.code === 'FORBIDDEN') {
      return { response: forbidden() };
    }
    return {
      response: error(
        { code: access.code, message: access.code },
        access.status,
      ),
    };
  }
  return { salonId: access.salonId, role: access.role };
}

// ─── Row mapping ───────────────────────────────────────────────────────────

function mapPaymentRow(r) {
  const hasUser = r.client_id != null;
  const fullName = hasUser
    ? [r.first_name, r.last_name].filter(Boolean).join(' ').trim()
    : '';
  return {
    id: r.id,
    booking_id: r.booking_id,
    client_id: hasUser ? r.client_id : null,
    client_name: hasUser && fullName ? fullName : WALK_IN_NAME,
    client_email: hasUser ? r.email ?? null : null,
    booking_datetime: toIsoUtc(r.start_datetime),
    amount: numericOrZero(r.amount),
    method: r.method,
    status: r.status,
    refunded_amount: numericOrZero(r.refunded_amount),
    tip_amount: numericOrZero(r.tip_amount),
    stripe_payment_id: r.stripe_payment_id ?? null,
    notes: r.notes ?? null,
    created_at: toIsoUtc(r.created_at),
  };
}

// ─── GET /api/payments ─────────────────────────────────────────────────────

export async function GET(request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);

  // 1. Salon scope (handles salon_id / salonId / conflicts / owner-wide).
  const scope = await resolveListingScope(searchParams, session);
  if (scope.response) return scope.response;

  // 2. Filter validation (totally before any DB query).
  const status = searchParams.get('status');
  if (status !== null && status !== '' && !STATUS_ENUM.has(status)) {
    return badParameter('status', 'Invalid status value');
  }

  const method = searchParams.get('method');
  if (method !== null && method !== '' && !METHOD_ENUM.has(method)) {
    return badParameter('method', 'Invalid method value');
  }

  const startCheck = validateDate(searchParams.get('start_date'), 'start_date');
  if (startCheck.invalid) return badParameter('start_date');
  const endCheck = validateDate(searchParams.get('end_date'), 'end_date');
  if (endCheck.invalid) return badParameter('end_date');

  if (startCheck.value && endCheck.value && startCheck.value > endCheck.value) {
    return badParameter('end_date', 'start_date must be on or before end_date');
  }

  const search = searchParams.get('search');
  if (search !== null && search.length > 100) {
    return badParameter('search', 'search must be 0–100 characters');
  }

  // has_refund: boolean filter — when 'true', only rows with refunded_amount > 0
  const rawHasRefund = searchParams.get('has_refund');
  let hasRefundFilter = null;
  if (rawHasRefund !== null && rawHasRefund !== '') {
    if (rawHasRefund === 'true') hasRefundFilter = true;
    else if (rawHasRefund === 'false') hasRefundFilter = false;
    else return badParameter('has_refund', 'has_refund must be true or false');
  }

  const sortKey = searchParams.get('sort') || 'created_desc';
  if (!SORT_MAP[sortKey]) return badParameter('sort');

  // Pagination.
  const rawPage = searchParams.get('page');
  let page = 1;
  if (rawPage !== null && rawPage !== '') {
    const parsed = parsePositiveInt(rawPage);
    if (parsed.invalid) return badParameter('page');
    page = parsed.value;
  }

  const rawLimit = searchParams.get('limit');
  let limit = 20;
  if (rawLimit !== null && rawLimit !== '') {
    const parsed = parsePositiveInt(rawLimit);
    if (parsed.invalid) return badParameter('limit');
    limit = parsed.value;
  }
  if (limit > 100) return badParameter('limit', 'limit must be <= 100');

  // 3. WHERE clause assembly.
  const whereClauses = [];
  const params = [];

  if (scope.ownerScope) {
    whereClauses.push('s.owner_id = ?');
    params.push(session.userId);
  } else if (scope.salonId != null) {
    whereClauses.push('b.salon_id = ?');
    params.push(scope.salonId);
  }
  // Admin without salonId: no salon scoping.

  if (status) {
    whereClauses.push('p.status = BINARY ?');
    params.push(status);
  }

  if (method) {
    whereClauses.push('p.method = BINARY ?');
    params.push(method);
  }

  if (startCheck.value) {
    whereClauses.push('p.created_at >= ?');
    params.push(`${startCheck.value} 00:00:00`);
  }

  if (endCheck.value) {
    whereClauses.push('p.created_at <= ?');
    params.push(`${endCheck.value} 23:59:59`);
  }

  if (search && search.trim() !== '') {
    const like = `%${search.trim()}%`;
    whereClauses.push(
      `(
        CONCAT_WS(' ', u.first_name, u.last_name) LIKE ?
        OR u.email LIKE ?
        OR CAST(p.id AS CHAR) LIKE ?
        OR CAST(b.id AS CHAR) LIKE ?
      )`,
    );
    params.push(like, like, like, like);
  }

  if (hasRefundFilter === true) {
    whereClauses.push('COALESCE(p.refunded_amount, 0) > 0');
  } else if (hasRefundFilter === false) {
    whereClauses.push('COALESCE(p.refunded_amount, 0) = 0');
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 4. Total count.
  const countRow = await getOne(
    `SELECT COUNT(*) AS total
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       JOIN salons s ON s.id = b.salon_id
       LEFT JOIN users u ON u.id = b.client_id AND u.deleted_at IS NULL
       ${whereSql}`,
    params,
  );
  const total = Number(countRow?.total || 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  // 5. Page query (200 with empty data when page > totalPages && total > 0).
  let rows = [];
  if (total > 0 && page <= totalPages) {
    const offset = (page - 1) * limit;
    rows = await query(
      `SELECT
         p.id,
         p.booking_id,
         p.amount,
         p.method,
         p.status,
         p.stripe_payment_id,
         p.refunded_amount,
         p.tip_amount,
         p.notes,
         p.created_at,
         b.client_id,
         b.start_datetime,
         u.first_name,
         u.last_name,
         u.email
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       JOIN salons s ON s.id = b.salon_id
       LEFT JOIN users u ON u.id = b.client_id AND u.deleted_at IS NULL
       ${whereSql}
       ORDER BY ${SORT_MAP[sortKey]}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
  }

  return success({
    data: rows.map(mapPaymentRow),
    meta: { page, limit, total, totalPages },
  });
}

// ─── POST /api/payments — preserved from original implementation ───────────

async function checkBookingAccess(bookingId, userId, role) {
  const booking = await getOne(
    `SELECT b.*, s.owner_id
     FROM bookings b
     JOIN salons s ON s.id = b.salon_id
     WHERE b.id = ?`,
    [bookingId],
  );

  if (!booking) return { access: false, booking: null };

  if (role === 'admin') return { access: true, booking };
  if (booking.owner_id === userId) return { access: true, booking };

  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1",
    [booking.salon_id, userId],
  );
  if (staff) return { access: true, booking };

  return { access: false, booking: null };
}

export async function POST(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { bookingId, amount, method, stripePaymentId } = body;

    if (
      !bookingId ||
      amount === undefined ||
      amount === null ||
      isNaN(amount) ||
      amount < 0 ||
      !method
    ) {
      return error(
        'Booking ID, valid amount (>= 0), and method are required',
        400,
      );
    }

    const { access } = await checkBookingAccess(
      bookingId,
      session.userId,
      session.role,
    );

    // Also allow client to pay for their own booking
    const bookingCheck = await getOne(
      'SELECT client_id FROM bookings WHERE id = ?',
      [bookingId],
    );
    if (!access && bookingCheck?.client_id !== session.userId) {
      return forbidden('Not authorized to create payment for this booking');
    }

    // Check if payment already exists
    const existingPayment = await getOne(
      'SELECT id, status FROM payments WHERE booking_id = ?',
      [bookingId],
    );
    if (existingPayment && existingPayment.status === 'paid') {
      return error('Payment already exists for this booking', 409);
    }

    const result = await query(
      `INSERT INTO payments (booking_id, amount, method, status, stripe_payment_id, created_at)
       VALUES (?, ?, ?, 'pending', ?, NOW())
       ON DUPLICATE KEY UPDATE
          amount = VALUES(amount),
          method = VALUES(method),
          status = VALUES(status),
          stripe_payment_id = VALUES(stripe_payment_id),
          updated_at = NOW()`,
      [bookingId, amount, method, stripePaymentId || null],
    );

    // If card payment with Stripe, set as paid immediately (assuming webhook confirmation)
    if (method === 'card' && stripePaymentId) {
      await query("UPDATE payments SET status = 'paid' WHERE id = ?", [
        result.insertId,
      ]);
    }

    return created({
      id: result.insertId,
      bookingId,
      amount,
      method,
      status: method === 'card' && stripePaymentId ? 'paid' : 'pending',
      stripePaymentId,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create payment error:', err);
    return error('Failed to create payment', 500);
  }
}
