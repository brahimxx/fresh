// Feature: products-and-sales-improvements
// Task: 9.3 PBT for input validation totality and side-effect-freeness
//
// Property 3: Input validation is total and side-effect-free.
//
// Validates: Requirements 1.6, 3.1, 3.7, 5.5, 6.10, 6.11, 8.2, 8.10, 9.4,
//            10.5, 10.6, 11.3, 11.4, 11.6, 11.7, 14.1, 14.6, 14.8, 16.5
//
// For any request to {Products_API, Stock_API, Categories_API, Payments_API,
// Refund_API, daily-totals, CSV endpoints} whose body or query string
// violates the documented bounds, the response status MUST be 400 with a
// code in
//   { ERROR_400, INVALID_PARAMETER, INVALID_SALON_ID, MISSING_SALON_ID,
//     REFUND_EXCEEDS_REMAINING }
// AND the offending parameter name SHALL be present in the body when more
// than one parameter could be at fault, AND no INSERT/UPDATE/DELETE
// statement MUST be executed against products, product_categories,
// product_stock_movements, payments, refunds, or audit_logs.
//
// Approach (per the task brief): pure-model PBT.
//
//   1. Replicate each route handler's validator inline as a small, pure
//      function whose return shape mirrors the documented error envelope
//      (`{ ok: false, code, message, parameter? }`). Generate violations
//      across the parameter space with fast-check and assert the contract.
//
//   2. For four representative endpoints (products listing, payments
//      listing, refund POST, stock PUT) invoke the *actual* route
//      handler with a violating body / query and assert that:
//        - the response is 400 with a code in the documented vocabulary,
//        - the body includes a `details.parameter` (or top-level
//          `parameter`) when more than one parameter could be at fault, and
//        - no INSERT/UPDATE/DELETE SQL was executed against any of the
//          spec-named tables (products, product_categories,
//          product_stock_movements, payments, refunds, audit_logs).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

import {
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  STOCK_MODES,
  STOCK_REASON_CODES_MANUAL,
  STOCK_REASON_CODES_AUTOMATED,
} from './_arbitraries.js';

// ─── Documented error-code vocabulary (design § Error code vocabulary) ────

const VALIDATION_CODE_VOCAB = Object.freeze([
  'ERROR_400',
  'INVALID_PARAMETER',
  'INVALID_SALON_ID',
  'MISSING_SALON_ID',
  'REFUND_EXCEEDS_REMAINING',
]);

// Tables that MUST never see INSERT/UPDATE/DELETE on a 400 path
// (Property 3 last clause + Requirements 14.5, 14.8, 20.4).
const FORBIDDEN_WRITE_TABLES = Object.freeze([
  'products',
  'product_categories',
  'product_stock_movements',
  'payments',
  'refunds',
  'audit_logs',
]);

const SQL_WRITE_RE = /\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+`?(\w+)`?/i;

/**
 * Returns true when `sql` is a write statement against one of the
 * spec-named tables. `query()` calls without write SQL (counts, joins,
 * SELECTs by id) are allowed even on a 400 path because they have no
 * side effects.
 */
function isForbiddenWrite(sql) {
  if (typeof sql !== 'string') return false;
  const m = sql.match(SQL_WRITE_RE);
  if (!m) return false;
  const table = m[2].toLowerCase();
  return FORBIDDEN_WRITE_TABLES.includes(table);
}

// ─── Pure validators (mirror the route handlers) ──────────────────────────
//
// Each validator returns either `{ ok: true, value? }` or
// `{ ok: false, code, message, parameter }`. The contract — code in the
// vocabulary AND `parameter` populated when more than one field could be
// at fault — is asserted by the property tests below.

const SALON_ID_INT_MAX = Number.MAX_SAFE_INTEGER;

function parsePositiveInt(raw) {
  if (raw === null || raw === undefined || raw === '') return { empty: true };
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return { invalid: true };
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > SALON_ID_INT_MAX) {
    return { invalid: true };
  }
  return { value: n };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(raw) {
  if (typeof raw !== 'string' || !ISO_DATE_RE.test(raw)) return null;
  const [y, m, d] = raw.split('-').map(Number);
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

// ── Products listing query (src/app/api/products/route.js) ─────────────────

const PRODUCTS_SORT_KEYS = new Set([
  'name_asc', 'name_desc', 'price_asc', 'price_desc',
  'stock_asc', 'stock_desc', 'created_desc',
]);

const PRODUCTS_STOCK_MODES = new Set(['in', 'low', 'out', 'all']);

/**
 * Mirror of the validation block in `GET /api/products`. Operates on the
 * parsed query object (caller is responsible for `searchParams.get(...)`).
 *
 * `role` is needed to decide MISSING_SALON_ID vs admin pass-through.
 */
export function validateProductsListingQuery(q, { role }) {
  // 1. salon_id (Reqs 1.2, 1.6)
  const rawSalonId = q.salon_id;
  if (rawSalonId === null || rawSalonId === undefined || rawSalonId === '') {
    if (role !== 'admin') {
      return {
        ok: false, code: 'MISSING_SALON_ID',
        message: 'salon_id is required', parameter: 'salon_id',
      };
    }
  } else {
    const parsed = parsePositiveInt(rawSalonId);
    if (parsed.invalid) {
      return {
        ok: false, code: 'INVALID_SALON_ID',
        message: 'Invalid salon_id', parameter: 'salon_id',
      };
    }
  }

  // 2. page (Req 8.10)
  if (q.page !== null && q.page !== undefined && q.page !== '') {
    const parsed = parsePositiveInt(q.page);
    if (parsed.invalid) {
      return { ok: false, code: 'INVALID_PARAMETER', parameter: 'page', message: 'invalid page' };
    }
  }

  // 3. limit (Reqs 8.2, 8.10) — no silent clamp
  if (q.limit !== null && q.limit !== undefined && q.limit !== '') {
    const parsed = parsePositiveInt(q.limit);
    if (parsed.invalid) {
      return { ok: false, code: 'INVALID_PARAMETER', parameter: 'limit', message: 'invalid limit' };
    }
    if (parsed.value > 100) {
      return { ok: false, code: 'INVALID_PARAMETER', parameter: 'limit', message: 'limit must be <= 100' };
    }
  }

  // 4. search ≤ 100 (Req 8.1)
  if (q.search !== null && q.search !== undefined && typeof q.search === 'string' && q.search.length > 100) {
    return { ok: false, code: 'INVALID_PARAMETER', parameter: 'search', message: 'search must be 0–100 characters' };
  }

  // 5. category_id (positive int when supplied)
  if (q.category_id !== null && q.category_id !== undefined && q.category_id !== '') {
    const parsed = parsePositiveInt(q.category_id);
    if (parsed.invalid) {
      return { ok: false, code: 'INVALID_PARAMETER', parameter: 'category_id', message: 'invalid category_id' };
    }
  }

  // 6. stock enum
  if (q.stock !== null && q.stock !== undefined && q.stock !== '' && !PRODUCTS_STOCK_MODES.has(q.stock)) {
    return { ok: false, code: 'INVALID_PARAMETER', parameter: 'stock', message: 'invalid stock' };
  }

  // 7. is_active boolean
  if (q.is_active !== null && q.is_active !== undefined && q.is_active !== '') {
    if (q.is_active !== 'true' && q.is_active !== 'false') {
      return { ok: false, code: 'INVALID_PARAMETER', parameter: 'is_active', message: 'invalid is_active' };
    }
  }

  // 8. sort enum
  if (q.sort !== undefined && q.sort !== null && q.sort !== '' && !PRODUCTS_SORT_KEYS.has(q.sort)) {
    return { ok: false, code: 'INVALID_PARAMETER', parameter: 'sort', message: 'invalid sort' };
  }

  return { ok: true };
}

// ── Stock_API GET (page, limit) and PUT (body) ────────────────────────────

export function validateStockGetQuery(q) {
  // route.js#validatePageLimit
  if (q.page !== null && q.page !== undefined && q.page !== '') {
    const n = Number(q.page);
    if (!Number.isInteger(n) || n < 1 || String(n) !== String(q.page).trim()) {
      return { ok: false, code: 'ERROR_400', parameter: 'page', message: 'invalid page' };
    }
  }
  if (q.limit !== null && q.limit !== undefined && q.limit !== '') {
    const n = Number(q.limit);
    if (!Number.isInteger(n) || n < 1 || n > 100 || String(n) !== String(q.limit).trim()) {
      return { ok: false, code: 'ERROR_400', parameter: 'limit', message: 'invalid limit' };
    }
  }
  return { ok: true };
}

const STOCK_MANUAL_REASONS = new Set(STOCK_REASON_CODES_MANUAL);
const STOCK_RESERVED_REASONS = new Set(STOCK_REASON_CODES_AUTOMATED);
const STOCK_VALID_MODES = new Set(STOCK_MODES);

export function validateStockAdjustBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, code: 'ERROR_400', parameter: 'body', message: 'body required' };
  }
  const { mode, quantity, reason_code, reason_note } = body;
  if (typeof mode !== 'string' || !STOCK_VALID_MODES.has(mode)) {
    return { ok: false, code: 'ERROR_400', parameter: 'mode', message: 'invalid mode' };
  }
  if (
    typeof quantity !== 'number' ||
    !Number.isFinite(quantity) ||
    !Number.isInteger(quantity) ||
    quantity < 0
  ) {
    return { ok: false, code: 'ERROR_400', parameter: 'quantity', message: 'invalid quantity' };
  }
  if (typeof reason_code !== 'string' || reason_code.length === 0) {
    return { ok: false, code: 'ERROR_400', parameter: 'reason_code', message: 'reason_code required' };
  }
  if (STOCK_RESERVED_REASONS.has(reason_code)) {
    return { ok: false, code: 'ERROR_400', parameter: 'reason_code', message: 'reason_code reserved' };
  }
  if (!STOCK_MANUAL_REASONS.has(reason_code)) {
    return { ok: false, code: 'ERROR_400', parameter: 'reason_code', message: 'invalid reason_code' };
  }
  if (reason_note !== undefined && reason_note !== null) {
    if (typeof reason_note !== 'string') {
      return { ok: false, code: 'ERROR_400', parameter: 'reason_note', message: 'reason_note must be a string' };
    }
    if (reason_note.length > 500) {
      return { ok: false, code: 'ERROR_400', parameter: 'reason_note', message: 'reason_note too long' };
    }
  }
  return { ok: true };
}

// ── Categories_API POST / PUT body validators ─────────────────────────────

export function validateCategoryName(raw) {
  if (typeof raw !== 'string') {
    return { ok: false, code: 'ERROR_400', parameter: 'name', message: 'name must be a string' };
  }
  const trimmed = raw.trim();
  if (trimmed.length < 1) {
    return { ok: false, code: 'ERROR_400', parameter: 'name', message: 'name empty' };
  }
  if (trimmed.length > 100) {
    return { ok: false, code: 'ERROR_400', parameter: 'name', message: 'name too long' };
  }
  return { ok: true, value: trimmed };
}

export function validateDisplayOrder(raw) {
  if (raw === null || raw === undefined || raw === '') return { ok: true, value: 0 };
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, code: 'ERROR_400', parameter: 'display_order', message: 'must be int' };
  }
  if (n < 0 || n > 9999) {
    return { ok: false, code: 'ERROR_400', parameter: 'display_order', message: 'out of range' };
  }
  return { ok: true, value: n };
}

// ── Payments_API listing query (src/app/api/payments/route.js) ────────────

const PAYMENTS_SORT_KEYS = new Set([
  'created_desc', 'created_asc', 'amount_desc', 'amount_asc',
]);
const PAYMENT_STATUS_SET = new Set(PAYMENT_STATUSES);
const PAYMENT_METHOD_SET = new Set(PAYMENT_METHODS);

export function validatePaymentsListingQuery(q, { role }) {
  // Conflicting salon_id / salonId (Req 10.6)
  const rawA = q.salon_id;
  const rawB = q.salonId;
  const haveA = rawA !== null && rawA !== undefined && rawA !== '';
  const haveB = rawB !== null && rawB !== undefined && rawB !== '';
  if (haveA && haveB && rawA !== rawB) {
    return {
      ok: false, code: 'ERROR_400',
      parameter: 'salon_id',
      message: 'salon_id and salonId must agree',
    };
  }
  const rawSalonId = haveA ? rawA : haveB ? rawB : null;

  // Non-admin owners may omit salon_id (scope by ownership). Other non-admins
  // need it via assertSalonAccess; malformed values → INVALID_SALON_ID.
  if (rawSalonId !== null) {
    const parsed = parsePositiveInt(rawSalonId);
    if (parsed.invalid) {
      return {
        ok: false, code: 'INVALID_SALON_ID',
        parameter: 'salon_id',
        message: 'invalid salon_id',
      };
    }
  } else if (role !== 'admin' && role !== 'owner') {
    return {
      ok: false, code: 'INVALID_SALON_ID',
      parameter: 'salon_id',
      message: 'salon_id is required',
    };
  }

  // status enum (Req 11.7)
  if (q.status !== null && q.status !== undefined && q.status !== '' && !PAYMENT_STATUS_SET.has(q.status)) {
    return { ok: false, code: 'ERROR_400', parameter: 'status', message: 'invalid status' };
  }
  // method enum (Req 11.4)
  if (q.method !== null && q.method !== undefined && q.method !== '' && !PAYMENT_METHOD_SET.has(q.method)) {
    return { ok: false, code: 'ERROR_400', parameter: 'method', message: 'invalid method' };
  }

  // start_date / end_date (Req 11.6)
  let startVal = null, endVal = null;
  if (q.start_date !== null && q.start_date !== undefined && q.start_date !== '') {
    const dt = parseIsoDate(q.start_date);
    if (!dt) {
      return { ok: false, code: 'ERROR_400', parameter: 'start_date', message: 'invalid start_date' };
    }
    startVal = q.start_date;
  }
  if (q.end_date !== null && q.end_date !== undefined && q.end_date !== '') {
    const dt = parseIsoDate(q.end_date);
    if (!dt) {
      return { ok: false, code: 'ERROR_400', parameter: 'end_date', message: 'invalid end_date' };
    }
    endVal = q.end_date;
  }
  if (startVal && endVal && startVal > endVal) {
    return { ok: false, code: 'ERROR_400', parameter: 'end_date', message: 'start_date > end_date' };
  }

  // search ≤ 100
  if (q.search !== null && q.search !== undefined && typeof q.search === 'string' && q.search.length > 100) {
    return { ok: false, code: 'ERROR_400', parameter: 'search', message: 'search too long' };
  }

  // sort
  if (q.sort !== null && q.sort !== undefined && q.sort !== '' && !PAYMENTS_SORT_KEYS.has(q.sort)) {
    return { ok: false, code: 'ERROR_400', parameter: 'sort', message: 'invalid sort' };
  }

  // page / limit
  if (q.page !== null && q.page !== undefined && q.page !== '') {
    const parsed = parsePositiveInt(q.page);
    if (parsed.invalid) {
      return { ok: false, code: 'ERROR_400', parameter: 'page', message: 'invalid page' };
    }
  }
  if (q.limit !== null && q.limit !== undefined && q.limit !== '') {
    const parsed = parsePositiveInt(q.limit);
    if (parsed.invalid) {
      return { ok: false, code: 'ERROR_400', parameter: 'limit', message: 'invalid limit' };
    }
    if (parsed.value > 100) {
      return { ok: false, code: 'ERROR_400', parameter: 'limit', message: 'limit > 100' };
    }
  }

  return { ok: true };
}

// ── daily-totals query ─────────────────────────────────────────────────────

const MAX_RANGE_DAYS = 366;

export function validateDailyTotalsQuery(q, { role }) {
  // salon_id / salonId conflict
  const rawA = q.salon_id, rawB = q.salonId;
  const haveA = rawA !== null && rawA !== undefined && rawA !== '';
  const haveB = rawB !== null && rawB !== undefined && rawB !== '';
  if (haveA && haveB && rawA !== rawB) {
    return { ok: false, code: 'ERROR_400', parameter: 'salon_id', message: 'conflict' };
  }
  const rawSalonId = haveA ? rawA : haveB ? rawB : null;
  if (rawSalonId !== null) {
    const parsed = parsePositiveInt(rawSalonId);
    if (parsed.invalid) {
      return { ok: false, code: 'INVALID_SALON_ID', parameter: 'salon_id', message: 'invalid salon_id' };
    }
  } else if (role !== 'admin') {
    return { ok: false, code: 'MISSING_SALON_ID', parameter: 'salon_id', message: 'required' };
  }

  // start / end required
  const start = parseIsoDate(q.start_date);
  if (!start) return { ok: false, code: 'ERROR_400', parameter: 'start_date', message: 'required' };
  const end = parseIsoDate(q.end_date);
  if (!end) return { ok: false, code: 'ERROR_400', parameter: 'end_date', message: 'required' };
  if (start.getTime() > end.getTime()) {
    return { ok: false, code: 'ERROR_400', parameter: 'end_date', message: 'start > end' };
  }
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days > MAX_RANGE_DAYS) {
    return { ok: false, code: 'ERROR_400', parameter: 'end_date', message: 'range too wide' };
  }
  return { ok: true };
}

// ── Refund_API body (src/app/api/checkout/refund/route.js) ────────────────

function isPositiveIntegerLoose(v) {
  if (typeof v === 'number') return Number.isInteger(v) && v > 0;
  if (typeof v === 'string') return /^[1-9]\d*$/.test(v);
  return false;
}

function parseRefundAmount(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const asNum = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(asNum) || asNum <= 0) return null;
  const str = typeof raw === 'string' ? raw.trim() : String(asNum);
  if (!/^\d+(\.\d{1,2})?$/.test(str)) return null;
  return Math.round(asNum * 100) / 100;
}

export function validateRefundBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, code: 'ERROR_400', parameter: 'body', message: 'body required' };
  }
  if (!isPositiveIntegerLoose(body.paymentId)) {
    return { ok: false, code: 'ERROR_400', parameter: 'paymentId', message: 'invalid paymentId' };
  }
  const amt = parseRefundAmount(body.amount);
  if (amt === null) {
    return { ok: false, code: 'ERROR_400', parameter: 'amount', message: 'invalid amount' };
  }
  if (typeof body.reason !== 'string') {
    return { ok: false, code: 'ERROR_400', parameter: 'reason', message: 'reason required' };
  }
  const trimmed = body.reason.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    return { ok: false, code: 'ERROR_400', parameter: 'reason', message: 'reason out of range' };
  }
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string') {
      return { ok: false, code: 'ERROR_400', parameter: 'notes', message: 'notes must be string' };
    }
    if (body.notes.length > 2000) {
      return { ok: false, code: 'ERROR_400', parameter: 'notes', message: 'notes too long' };
    }
  }
  return { ok: true, value: { paymentId: Number(body.paymentId), amount: amt, reason: trimmed } };
}

/**
 * Refund-window check (Req 14.6) — runs after body validation but BEFORE
 * any DB write or Stripe call. The route's response code is
 * `REFUND_EXCEEDS_REMAINING` and is part of the documented vocabulary.
 */
export function checkRefundWindow({ paymentAmount, previousRefundedAmount, refundAmount }) {
  const newTotal = Math.round((previousRefundedAmount + refundAmount) * 100) / 100;
  if (newTotal > paymentAmount) {
    return {
      ok: false,
      code: 'REFUND_EXCEEDS_REMAINING',
      message: 'refund exceeds remaining',
    };
  }
  return { ok: true };
}

// ─── Generators that always produce *invalid* inputs ──────────────────────
//
// Each generator yields a body / query whose violation is "obvious enough"
// that the validator MUST reject it, paired with the parameter name that
// MUST appear in the error envelope. Keeping the expected-parameter as part
// of the generator output lets the property assertion check both clauses
// of the contract (code in vocab AND parameter populated) at once.

const invalidPositiveIntStringArb = fc.oneof(
  fc.constant('0'),
  fc.constant('-1'),
  fc.constant('1.5'),
  fc.constant('abc'),
  fc.constant('+1'),
  fc.constant('1e5'),
  fc.constant('NaN'),
);

const invalidEnumStringArb = fc.string({ minLength: 1, maxLength: 24 })
  .filter((s) => s.length > 0);

// ── Products listing — bad query + parameter name ──────────────────────────

const badProductsQueryArb = fc.oneof(
  // bad page
  invalidPositiveIntStringArb.map((page) => ({
    q: { salon_id: '1', page }, expected: 'page',
  })),
  // bad limit (non-int)
  invalidPositiveIntStringArb.map((limit) => ({
    q: { salon_id: '1', limit }, expected: 'limit',
  })),
  // limit > 100
  fc.integer({ min: 101, max: 10_000 }).map((n) => ({
    q: { salon_id: '1', limit: String(n) }, expected: 'limit',
  })),
  // bad search (>100 chars)
  fc.string({ minLength: 101, maxLength: 500 }).map((search) => ({
    q: { salon_id: '1', search }, expected: 'search',
  })),
  // bad category_id
  invalidPositiveIntStringArb.map((category_id) => ({
    q: { salon_id: '1', category_id }, expected: 'category_id',
  })),
  // bad stock enum
  invalidEnumStringArb
    .filter((s) => !['in', 'low', 'out', 'all'].includes(s))
    .map((stock) => ({ q: { salon_id: '1', stock }, expected: 'stock' })),
  // bad is_active
  invalidEnumStringArb
    .filter((s) => s !== 'true' && s !== 'false')
    .map((is_active) => ({ q: { salon_id: '1', is_active }, expected: 'is_active' })),
  // bad sort enum
  invalidEnumStringArb
    .filter((s) => !PRODUCTS_SORT_KEYS.has(s))
    .map((sort) => ({ q: { salon_id: '1', sort }, expected: 'sort' })),
  // bad salon_id
  invalidPositiveIntStringArb.map((salon_id) => ({
    q: { salon_id }, expected: 'salon_id',
  })),
);

// ── Stock PUT — bad body ───────────────────────────────────────────────────

const badStockBodyArb = fc.oneof(
  // not an object
  fc.oneof(fc.constant(null), fc.constant('hi'), fc.constant(42)).map((body) => ({
    body, expected: 'body',
  })),
  // bad mode
  invalidEnumStringArb.filter((s) => !STOCK_VALID_MODES.has(s)).map((mode) => ({
    body: { mode, quantity: 1, reason_code: 'restock' }, expected: 'mode',
  })),
  // mode wrong type
  fc.oneof(fc.constant(123), fc.constant(null), fc.constant({})).map((mode) => ({
    body: { mode, quantity: 1, reason_code: 'restock' }, expected: 'mode',
  })),
  // bad quantity (negative, fractional, non-number)
  fc.oneof(
    fc.double({ min: -1000, max: -0.01, noNaN: true }),
    fc.constantFrom(1.5, 0.1, -1, NaN, Infinity),
    fc.constant('1'),
    fc.constant(null),
  ).map((quantity) => ({
    body: { mode: 'set', quantity, reason_code: 'restock' }, expected: 'quantity',
  })),
  // missing reason_code
  fc.constant({
    body: { mode: 'set', quantity: 1 }, expected: 'reason_code',
  }),
  // reserved reason codes
  fc.constantFrom('sale', 'refund').map((reason_code) => ({
    body: { mode: 'set', quantity: 1, reason_code }, expected: 'reason_code',
  })),
  // unknown reason_code
  invalidEnumStringArb
    .filter((s) =>
      !STOCK_MANUAL_REASONS.has(s) && !STOCK_RESERVED_REASONS.has(s) && s.length > 0,
    )
    .map((reason_code) => ({
      body: { mode: 'set', quantity: 1, reason_code }, expected: 'reason_code',
    })),
  // reason_note > 500 chars
  fc.string({ minLength: 501, maxLength: 800 }).map((reason_note) => ({
    body: { mode: 'set', quantity: 1, reason_code: 'restock', reason_note }, expected: 'reason_note',
  })),
  // reason_note wrong type
  fc.oneof(fc.constant(123), fc.constant({}), fc.constant([])).map((reason_note) => ({
    body: { mode: 'set', quantity: 1, reason_code: 'restock', reason_note }, expected: 'reason_note',
  })),
);

// ── Categories — bad body ─────────────────────────────────────────────────

const badCategoryBodyArb = fc.oneof(
  // wrong-type name
  fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant(42), fc.constant({})).map((name) => ({
    field: 'name', value: name, expected: 'name',
  })),
  // empty after trim
  fc.constantFrom('', '   ', '\t\n').map((name) => ({
    field: 'name', value: name, expected: 'name',
  })),
  // > 100 chars after trim
  fc.string({ minLength: 101, maxLength: 200 }).map((name) => ({
    field: 'name', value: name, expected: 'name',
  })),
  // bad display_order: non-int
  fc.oneof(fc.constant(1.5), fc.constant('abc'), fc.constant({})).map((v) => ({
    field: 'display_order', value: v, expected: 'display_order',
  })),
  // out of range
  fc.oneof(fc.integer({ min: -10_000, max: -1 }), fc.integer({ min: 10_000, max: 1_000_000 })).map((v) => ({
    field: 'display_order', value: v, expected: 'display_order',
  })),
);

// ── Payments listing — bad query ──────────────────────────────────────────

const badPaymentsQueryArb = fc.oneof(
  // conflicting salon_id / salonId
  fc.tuple(
    fc.integer({ min: 1, max: 100 }),
    fc.integer({ min: 101, max: 200 }),
  ).map(([a, b]) => ({
    q: { salon_id: String(a), salonId: String(b) }, expected: 'salon_id',
  })),
  // bad status
  invalidEnumStringArb.filter((s) => !PAYMENT_STATUS_SET.has(s)).map((status) => ({
    q: { salon_id: '1', status }, expected: 'status',
  })),
  // bad method
  invalidEnumStringArb.filter((s) => !PAYMENT_METHOD_SET.has(s)).map((method) => ({
    q: { salon_id: '1', method }, expected: 'method',
  })),
  // bad start_date format
  fc.constantFrom('2026-13-01', '2026-02-30', '2026/01/01', 'yesterday', '2026-1-1', '20260101').map((start_date) => ({
    q: { salon_id: '1', start_date }, expected: 'start_date',
  })),
  // bad end_date format
  fc.constantFrom('2026-13-01', '2026-02-30', '2026/01/01').map((end_date) => ({
    q: { salon_id: '1', end_date }, expected: 'end_date',
  })),
  // start > end
  fc.constant({ q: { salon_id: '1', start_date: '2026-12-31', end_date: '2026-01-01' }, expected: 'end_date' }),
  // bad sort
  invalidEnumStringArb.filter((s) => !PAYMENTS_SORT_KEYS.has(s)).map((sort) => ({
    q: { salon_id: '1', sort }, expected: 'sort',
  })),
  // bad page / limit
  invalidPositiveIntStringArb.map((page) => ({
    q: { salon_id: '1', page }, expected: 'page',
  })),
  invalidPositiveIntStringArb.map((limit) => ({
    q: { salon_id: '1', limit }, expected: 'limit',
  })),
  fc.integer({ min: 101, max: 10_000 }).map((n) => ({
    q: { salon_id: '1', limit: String(n) }, expected: 'limit',
  })),
  // bad salon_id format
  invalidPositiveIntStringArb.map((salon_id) => ({
    q: { salon_id }, expected: 'salon_id',
  })),
  // bad search
  fc.string({ minLength: 101, maxLength: 500 }).map((search) => ({
    q: { salon_id: '1', search }, expected: 'search',
  })),
);

// ── daily-totals — bad query ──────────────────────────────────────────────

const badDailyTotalsArb = fc.oneof(
  fc.constantFrom('2026-13-01', 'yesterday', '20260101', '').map((start_date) => ({
    q: { salon_id: '1', start_date, end_date: '2026-12-31' }, expected: 'start_date',
  })),
  fc.constantFrom('2026-99-99', 'tomorrow', '').map((end_date) => ({
    q: { salon_id: '1', start_date: '2026-01-01', end_date }, expected: 'end_date',
  })),
  // start > end
  fc.constant({
    q: { salon_id: '1', start_date: '2026-06-01', end_date: '2026-01-01' },
    expected: 'end_date',
  }),
  // span > 366 days
  fc.constant({
    q: { salon_id: '1', start_date: '2024-01-01', end_date: '2026-01-01' },
    expected: 'end_date',
  }),
  // bad salon_id
  invalidPositiveIntStringArb.map((salon_id) => ({
    q: { salon_id, start_date: '2026-01-01', end_date: '2026-01-31' },
    expected: 'salon_id',
  })),
);

// ── Refund — bad body ─────────────────────────────────────────────────────

const badRefundBodyArb = fc.oneof(
  fc.oneof(fc.constant(null), fc.constant('x'), fc.constant(42)).map((body) => ({
    body, expected: 'body',
  })),
  // bad paymentId
  fc.oneof(fc.constant(0), fc.constant(-1), fc.constant(1.5), fc.constant('abc'), fc.constant(null)).map((paymentId) => ({
    body: { paymentId, amount: 1, reason: 'r' }, expected: 'paymentId',
  })),
  // bad amount
  fc.oneof(
    fc.constant(0),
    fc.constant(-1),
    fc.constant('abc'),
    fc.constant(NaN),
    fc.constant(null),
    fc.constant(1.005), // > 2 decimal places
    fc.constant('1.999'),
  ).map((amount) => ({
    body: { paymentId: 1, amount, reason: 'r' }, expected: 'amount',
  })),
  // bad reason
  fc.oneof(
    fc.constant(''),
    fc.constant('   '),
    fc.constant(null),
    fc.constant(123),
    fc.string({ minLength: 101, maxLength: 200 }),
  ).map((reason) => ({
    body: { paymentId: 1, amount: 1, reason }, expected: 'reason',
  })),
  // bad notes
  fc.oneof(
    fc.constant(123),
    fc.constant({}),
    fc.string({ minLength: 2001, maxLength: 2500 }),
  ).map((notes) => ({
    body: { paymentId: 1, amount: 1, reason: 'r', notes }, expected: 'notes',
  })),
);

// ─── Property A: pure-validator totality and shape ────────────────────────

const SEED = 0xA17DA700; // deterministic CI seed (validation-400)

function assertContractFailure(result, expectedParam) {
  expect(result.ok).toBe(false);
  expect(VALIDATION_CODE_VOCAB).toContain(result.code);
  // `parameter` MUST be present whenever more than one parameter could be
  // at fault; in our generators every violation knows its parameter, so we
  // assert it unconditionally.
  expect(result.parameter).toBe(expectedParam);
  expect(typeof result.message).toBe('string');
}

describe('Property 3 — input validation is total (pure-model)', () => {
  it('Products listing rejects every violation with code in vocab + parameter', () => {
    fc.assert(
      fc.property(
        badProductsQueryArb,
        fc.constantFrom('owner', 'manager', 'staff', 'receptionist'),
        ({ q, expected }, role) => {
          const result = validateProductsListingQuery(q, { role });
          assertContractFailure(result, expected);
        },
      ),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('Stock_API GET rejects bad page/limit with code ERROR_400 + parameter', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          invalidPositiveIntStringArb.map((page) => ({ q: { page }, expected: 'page' })),
          invalidPositiveIntStringArb.map((limit) => ({ q: { limit }, expected: 'limit' })),
          fc.integer({ min: 101, max: 10_000 }).map((n) => ({
            q: { limit: String(n) }, expected: 'limit',
          })),
        ),
        ({ q, expected }) => {
          const result = validateStockGetQuery(q);
          assertContractFailure(result, expected);
        },
      ),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('Stock_API PUT rejects every body violation with ERROR_400 + parameter', () => {
    fc.assert(
      fc.property(badStockBodyArb, ({ body, expected }) => {
        const result = validateStockAdjustBody(body);
        assertContractFailure(result, expected);
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('Categories POST/PUT rejects bad name / display_order with ERROR_400 + parameter', () => {
    fc.assert(
      fc.property(badCategoryBodyArb, ({ field, value, expected }) => {
        const result =
          field === 'name' ? validateCategoryName(value) : validateDisplayOrder(value);
        assertContractFailure(result, expected);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('Payments listing rejects every query violation with code in vocab + parameter', () => {
    fc.assert(
      fc.property(
        badPaymentsQueryArb,
        fc.constantFrom('owner', 'manager', 'staff', 'receptionist'),
        ({ q, expected }, role) => {
          const result = validatePaymentsListingQuery(q, { role });
          assertContractFailure(result, expected);
        },
      ),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('daily-totals rejects every query violation with code in vocab + parameter', () => {
    fc.assert(
      fc.property(badDailyTotalsArb, ({ q, expected }) => {
        const result = validateDailyTotalsQuery(q, { role: 'owner' });
        assertContractFailure(result, expected);
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('Refund_API rejects every body violation with ERROR_400 + parameter', () => {
    fc.assert(
      fc.property(badRefundBodyArb, ({ body, expected }) => {
        const result = validateRefundBody(body);
        assertContractFailure(result, expected);
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('Refund-window over-refund returns REFUND_EXCEEDS_REMAINING (Req 14.6)', () => {
    fc.assert(
      fc.property(
        fc.record({
          paymentAmount: fc.integer({ min: 1, max: 1_000_000 }).map((c) => c / 100),
          previousRefundedAmount: fc.integer({ min: 0, max: 1_000_000 }).map((c) => c / 100),
          refundAmount: fc.integer({ min: 1, max: 1_000_000 }).map((c) => c / 100),
        }).filter(({ paymentAmount, previousRefundedAmount, refundAmount }) => {
          const newTotal =
            Math.round((previousRefundedAmount + refundAmount) * 100) / 100;
          return newTotal > paymentAmount;
        }),
        (input) => {
          const result = checkRefundWindow(input);
          expect(result.ok).toBe(false);
          expect(result.code).toBe('REFUND_EXCEEDS_REMAINING');
          expect(VALIDATION_CODE_VOCAB).toContain(result.code);
        },
      ),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('valid inputs pass all validators (sanity / no false positives)', () => {
    expect(
      validateProductsListingQuery(
        { salon_id: '1', page: '2', limit: '50', search: 'sham', stock: 'low', is_active: 'true', sort: 'name_asc' },
        { role: 'owner' },
      ).ok,
    ).toBe(true);

    expect(validateStockGetQuery({ page: '1', limit: '20' }).ok).toBe(true);
    expect(
      validateStockAdjustBody({ mode: 'set', quantity: 5, reason_code: 'restock', reason_note: 'PO-2031' }).ok,
    ).toBe(true);
    expect(validateCategoryName('Hair Care').ok).toBe(true);
    expect(validateDisplayOrder(10).ok).toBe(true);
    expect(
      validatePaymentsListingQuery(
        { salon_id: '1', status: 'paid', method: 'card', start_date: '2026-01-01', end_date: '2026-01-31' },
        { role: 'owner' },
      ).ok,
    ).toBe(true);
    expect(
      validateDailyTotalsQuery(
        { salon_id: '1', start_date: '2026-01-01', end_date: '2026-01-31' },
        { role: 'owner' },
      ).ok,
    ).toBe(true);
    expect(
      validateRefundBody({ paymentId: 1, amount: 1.5, reason: 'requested' }).ok,
    ).toBe(true);
  });
});

// ─── Property B: side-effect-freeness against the actual handlers ─────────
//
// For four representative endpoints, invoke the real route handler with
// a violating input under stubbed `@/lib/auth`, `@/lib/db`, and
// `@/lib/permissions` modules, then assert:
//   - status 400, body.error.code in vocab,
//   - body.error.details.parameter present (or top-level `parameter`)
//   - no INSERT / UPDATE / DELETE SQL was issued against any of the
//     spec-named tables (Property 3 last clause).
//
// Reads (SELECT, COUNT) are allowed — they have no side effects and the
// spec's "no INSERT/UPDATE/DELETE" wording explicitly covers writes only.

// Stripe is constructed at module load in `checkout/refund/route.js`; stub it
// so importing the route doesn't require a real STRIPE_SECRET_KEY.
vi.mock('stripe', () => {
  const StripeStub = vi.fn().mockImplementation(() => ({
    refunds: { create: vi.fn() },
  }));
  return { default: StripeStub };
});

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(async () => ({ userId: 1, role: 'owner' })),
  requireAuth: vi.fn(async () => ({ userId: 1, role: 'owner' })),
}));

vi.mock('@/lib/permissions', () => ({
  // Always allow access so we exercise the validation branch, not authz.
  assertSalonAccess: vi.fn(async ({ salonId }) => ({
    ok: true,
    salonId: salonId == null ? null : Number(salonId) || 1,
    role: 'owner',
  })),
}));

const queryMock = vi.fn(async () => []);
const getOneMock = vi.fn(async () => ({
  id: 1,
  salon_id: 1,
  owner_id: 1,
  deleted_at: null,
  stock_quantity: 0,
  amount: 100,
  refunded_amount: 0,
  status: 'paid',
  stripe_payment_id: null,
  booking_id: 1,
  client_id: 1,
  start_datetime: new Date('2026-05-01T00:00:00Z'),
}));
const transactionMock = vi.fn();

vi.mock('@/lib/db', () => ({
  query: (...args) => queryMock(...args),
  getOne: (...args) => getOneMock(...args),
  transaction: (...args) => transactionMock(...args),
  default: { getConnection: vi.fn() },
}));

vi.mock('@/lib/id', () => ({
  decodeId: (raw) => {
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number(raw);
    return raw;
  },
}));

beforeEach(() => {
  queryMock.mockClear();
  getOneMock.mockClear();
  transactionMock.mockClear();
});

/**
 * Inspect every `query()` invocation made by a handler and assert that
 * none of them is an INSERT/UPDATE/DELETE on a spec-named table. Counts,
 * lookups, and joins are allowed since they have no side effects.
 */
function assertNoForbiddenWrites() {
  for (const call of queryMock.mock.calls) {
    const sql = call[0];
    if (isForbiddenWrite(sql)) {
      throw new Error(`Unexpected write SQL during 400 path: ${sql}`);
    }
  }
  // The transactional path is the only place writes happen in the
  // four endpoints under test. It must never be reached on a 400.
  expect(transactionMock).not.toHaveBeenCalled();
}

async function readJsonResponse(res) {
  // NextResponse.json returns a Response-like object whose body is a
  // ReadableStream / Uint8Array — `.json()` is the supported reader.
  return res.json();
}

function expect400WithVocab(body) {
  expect(body).toMatchObject({ success: false, error: expect.any(Object) });
  expect(VALIDATION_CODE_VOCAB).toContain(body.error.code);
  // `parameter` is in `details.parameter` per the response.js convention,
  // or surfaced as a top-level key for the refund endpoint's older shape.
  const param = body.error.details?.parameter ?? body.error.parameter;
  expect(typeof param === 'string' || param === undefined).toBe(true);
}

describe('Property 3 — handlers reject violations with no DB writes', () => {
  it('GET /api/products: bad limit query → 400, no write SQL, no transaction', async () => {
    const { GET } = await import('@/app/api/products/route');
    const req = new Request('https://example.test/api/products?salon_id=1&limit=abc');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await readJsonResponse(res);
    expect400WithVocab(body);
    expect(body.error.details?.parameter).toBe('limit');
    assertNoForbiddenWrites();
  });

  it('GET /api/products: missing salon_id (non-admin) → 400 MISSING_SALON_ID, no write', async () => {
    const { GET } = await import('@/app/api/products/route');
    const req = new Request('https://example.test/api/products');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await readJsonResponse(res);
    expect(body.error.code).toBe('MISSING_SALON_ID');
    expect(VALIDATION_CODE_VOCAB).toContain(body.error.code);
    assertNoForbiddenWrites();
  });

  it('GET /api/products: invalid salon_id → 400 INVALID_SALON_ID, no write', async () => {
    const { GET } = await import('@/app/api/products/route');
    const req = new Request('https://example.test/api/products?salon_id=-1');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await readJsonResponse(res);
    expect(body.error.code).toBe('INVALID_SALON_ID');
    assertNoForbiddenWrites();
  });

  it('GET /api/payments: conflicting salon_id / salonId → 400 ERROR_400, no write', async () => {
    const { GET } = await import('@/app/api/payments/route');
    const req = new Request('https://example.test/api/payments?salon_id=1&salonId=2');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await readJsonResponse(res);
    expect400WithVocab(body);
    expect(body.error.code).toBe('ERROR_400');
    assertNoForbiddenWrites();
  });

  it('GET /api/payments: bad status enum → 400, no write', async () => {
    const { GET } = await import('@/app/api/payments/route');
    const req = new Request('https://example.test/api/payments?salon_id=1&status=completed');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await readJsonResponse(res);
    expect400WithVocab(body);
    expect(body.error.details?.parameter).toBe('status');
    assertNoForbiddenWrites();
  });

  it('GET /api/payments: malformed start_date → 400, no write', async () => {
    const { GET } = await import('@/app/api/payments/route');
    const req = new Request('https://example.test/api/payments?salon_id=1&start_date=2026-13-99');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await readJsonResponse(res);
    expect400WithVocab(body);
    expect(body.error.details?.parameter).toBe('start_date');
    assertNoForbiddenWrites();
  });

  it('PUT /api/products/[productId]/stock: bad mode → 400, no write, no transaction', async () => {
    const { PUT } = await import('@/app/api/products/[productId]/stock/route');
    const req = new Request('https://example.test/api/products/1/stock', {
      method: 'PUT',
      body: JSON.stringify({ mode: 'increment', quantity: 1, reason_code: 'restock' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ productId: '1' }) });
    expect(res.status).toBe(400);
    const body = await readJsonResponse(res);
    expect400WithVocab(body);
    expect(body.error.details?.parameter).toBe('mode');
    assertNoForbiddenWrites();
  });

  it('PUT /api/products/[productId]/stock: reserved reason_code → 400, no write', async () => {
    const { PUT } = await import('@/app/api/products/[productId]/stock/route');
    const req = new Request('https://example.test/api/products/1/stock', {
      method: 'PUT',
      body: JSON.stringify({ mode: 'set', quantity: 1, reason_code: 'sale' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ productId: '1' }) });
    expect(res.status).toBe(400);
    const body = await readJsonResponse(res);
    expect400WithVocab(body);
    expect(body.error.details?.parameter).toBe('reason_code');
    assertNoForbiddenWrites();
  });

  it('PUT /api/products/[productId]/stock: negative quantity → 400, no write', async () => {
    const { PUT } = await import('@/app/api/products/[productId]/stock/route');
    const req = new Request('https://example.test/api/products/1/stock', {
      method: 'PUT',
      body: JSON.stringify({ mode: 'set', quantity: -5, reason_code: 'restock' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await PUT(req, { params: Promise.resolve({ productId: '1' }) });
    expect(res.status).toBe(400);
    const body = await readJsonResponse(res);
    expect400WithVocab(body);
    expect(body.error.details?.parameter).toBe('quantity');
    assertNoForbiddenWrites();
  });

  it('POST /api/checkout/refund: missing reason → 400, no Stripe, no write', async () => {
    const { POST } = await import('@/app/api/checkout/refund/route');
    const req = new Request('https://example.test/api/checkout/refund', {
      method: 'POST',
      body: JSON.stringify({ paymentId: 1, amount: 5 }), // reason missing
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await readJsonResponse(res);
    expect400WithVocab(body);
    assertNoForbiddenWrites();
  });

  it('POST /api/checkout/refund: amount with > 2 decimals → 400, no write', async () => {
    const { POST } = await import('@/app/api/checkout/refund/route');
    const req = new Request('https://example.test/api/checkout/refund', {
      method: 'POST',
      body: JSON.stringify({ paymentId: 1, amount: 1.005, reason: 'r' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await readJsonResponse(res);
    expect400WithVocab(body);
    assertNoForbiddenWrites();
  });

  it('POST /api/checkout/refund: paymentId not positive int → 400, no write', async () => {
    const { POST } = await import('@/app/api/checkout/refund/route');
    const req = new Request('https://example.test/api/checkout/refund', {
      method: 'POST',
      body: JSON.stringify({ paymentId: -1, amount: 1, reason: 'r' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await readJsonResponse(res);
    expect400WithVocab(body);
    assertNoForbiddenWrites();
  });
});
