/**
 * Integration tests for Stock_API
 * (`src/app/api/products/[productId]/stock/route.js`).
 *
 * Validates: Requirements 3.7, 3.9, 4.3, 4.6, 4.7
 *
 * The route handler is exercised directly: GET / PUT are imported and called
 * with a mock `Request` and `params`. Surrounding modules are mocked at the
 * `@/` alias boundary so the handler stays pure, deterministic, and free of
 * any DB / network coupling:
 *
 *   - `@/lib/auth`        → `requireAuth` / `getSession`
 *   - `@/lib/db`          → `query`, `getOne`, `transaction`
 *   - `@/lib/permissions` → `assertSalonAccess`
 *
 * Coverage:
 *   1. 401 UNAUTHORIZED when no session is present (GET + PUT).
 *   2. 400 ERROR_400 with `details.parameter` for every body-validation
 *      failure on PUT (`mode`, `quantity`, `reason_code`, `reason_note`).
 *   3. 400 ERROR_400 for invalid `page` / `limit` on GET.
 *   4. 404 NOT_FOUND for a missing product *and* for cross-salon staff,
 *      with byte-equal response bodies (cross-salon non-leakage).
 *   5. The cross-salon FORBIDDEN signal from `assertSalonAccess` collapses
 *      to 404, matching the design's parity guarantee for single-resource
 *      endpoints.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Module mocks (registered before the route is imported) ───────────────

const requireAuthMock = vi.fn();
const getSessionMock = vi.fn();
vi.mock('@/lib/auth', () => ({
  requireAuth: (...args) => requireAuthMock(...args),
  getSession: (...args) => getSessionMock(...args),
}));

const queryMock = vi.fn();
const getOneMock = vi.fn();
const transactionMock = vi.fn();
vi.mock('@/lib/db', () => ({
  query: (...args) => queryMock(...args),
  getOne: (...args) => getOneMock(...args),
  transaction: (...args) => transactionMock(...args),
}));

const assertSalonAccessMock = vi.fn();
vi.mock('@/lib/permissions', () => ({
  assertSalonAccess: (...args) => assertSalonAccessMock(...args),
}));

// Import the handlers after the mocks are registered so the route picks
// up the mocked `@/lib/...` modules rather than the real ones.
const { GET, PUT } = await import('@/app/api/products/[productId]/stock/route');

// ─── Helpers ──────────────────────────────────────────────────────────────

const PRODUCT_ID = 42;
const SALON_ID = 7;

/** Build the `params` proxy the App Router awaits. */
function paramsFor(productId = PRODUCT_ID) {
  return Promise.resolve({ productId: String(productId) });
}

/** Build a mock Request for the GET endpoint with optional query string. */
function getRequest(qs = '') {
  const url = `http://localhost/api/products/${PRODUCT_ID}/stock${qs ? `?${qs}` : ''}`;
  return new Request(url, { method: 'GET' });
}

/** Build a mock Request for the PUT endpoint with a JSON body. */
function putRequest(body) {
  const url = `http://localhost/api/products/${PRODUCT_ID}/stock`;
  return new Request(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Read the JSON envelope produced by `response.js`. */
async function readJson(res) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Default session for an authenticated, non-admin caller. */
const SESSION = { userId: 1218, role: 'manager' };

beforeEach(() => {
  requireAuthMock.mockReset();
  getSessionMock.mockReset();
  queryMock.mockReset();
  getOneMock.mockReset();
  transactionMock.mockReset();
  assertSalonAccessMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────
// 1. 401 UNAUTHORIZED — no session
// ──────────────────────────────────────────────────────────────────────────

describe('Stock_API authentication (Requirement 3.x, 4.3)', () => {
  it('GET → 401 UNAUTHORIZED when requireAuth throws', async () => {
    requireAuthMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const res = await GET(getRequest(), { params: paramsFor() });

    expect(res.status).toBe(401);
    const body = await readJson(res);
    expect(body).toEqual({
      success: false,
      error: { message: 'Unauthorized', code: 'UNAUTHORIZED', details: undefined },
    });
    // No DB / authz lookups were issued.
    expect(getOneMock).not.toHaveBeenCalled();
    expect(assertSalonAccessMock).not.toHaveBeenCalled();
  });

  it('PUT → 401 UNAUTHORIZED when requireAuth throws', async () => {
    requireAuthMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const res = await PUT(
      putRequest({
        mode: 'set',
        quantity: 5,
        reason_code: 'manual_set',
      }),
      { params: paramsFor() },
    );

    expect(res.status).toBe(401);
    const body = await readJson(res);
    expect(body.error.code).toBe('UNAUTHORIZED');
    // Validation, lookup, and transaction never run on the unauthenticated
    // path — confirms 401 short-circuits before any side effect.
    expect(getOneMock).not.toHaveBeenCalled();
    expect(assertSalonAccessMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 2. 400 ERROR_400 — body validation on PUT
// ──────────────────────────────────────────────────────────────────────────

describe('Stock_API PUT body validation (Requirement 3.7)', () => {
  beforeEach(() => {
    // Auth always passes; the validation check happens before the DB
    // lookup, so neither getOne nor assertSalonAccess should fire.
    requireAuthMock.mockResolvedValue(SESSION);
  });

  /**
   * Cover the full 400 surface — every parameter the spec calls out
   * explicitly (`mode`, `quantity`, `reason_code`, `reason_note`) plus the
   * "reserved code" branch which is also a `reason_code` violation.
   */
  const cases = [
    {
      name: 'mode missing',
      body: { quantity: 1, reason_code: 'manual_set' },
      parameter: 'mode',
    },
    {
      name: 'mode invalid',
      body: { mode: 'increment', quantity: 1, reason_code: 'manual_set' },
      parameter: 'mode',
    },
    {
      name: 'quantity missing',
      body: { mode: 'set', reason_code: 'manual_set' },
      parameter: 'quantity',
    },
    {
      name: 'quantity negative',
      body: { mode: 'set', quantity: -3, reason_code: 'manual_set' },
      parameter: 'quantity',
    },
    {
      name: 'quantity non-integer',
      body: { mode: 'set', quantity: 2.5, reason_code: 'manual_set' },
      parameter: 'quantity',
    },
    {
      name: 'quantity wrong type',
      body: { mode: 'set', quantity: '5', reason_code: 'manual_set' },
      parameter: 'quantity',
    },
    {
      name: 'reason_code missing',
      body: { mode: 'set', quantity: 1 },
      parameter: 'reason_code',
    },
    {
      name: 'reason_code unknown enum value',
      body: { mode: 'set', quantity: 1, reason_code: 'shrinkage' },
      parameter: 'reason_code',
    },
    {
      name: 'reason_code reserved (sale)',
      body: { mode: 'set', quantity: 1, reason_code: 'sale' },
      parameter: 'reason_code',
    },
    {
      name: 'reason_code reserved (refund)',
      body: { mode: 'set', quantity: 1, reason_code: 'refund' },
      parameter: 'reason_code',
    },
    {
      name: 'reason_note wrong type',
      body: { mode: 'set', quantity: 1, reason_code: 'manual_set', reason_note: 12 },
      parameter: 'reason_note',
    },
    {
      name: 'reason_note exceeds 500 chars',
      body: {
        mode: 'set',
        quantity: 1,
        reason_code: 'manual_set',
        reason_note: 'a'.repeat(501),
      },
      parameter: 'reason_note',
    },
  ];

  for (const { name, body, parameter } of cases) {
    it(`${name} → 400 ERROR_400 with parameter=${parameter}`, async () => {
      const res = await PUT(putRequest(body), { params: paramsFor() });

      expect(res.status).toBe(400);
      const json = await readJson(res);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('ERROR_400');
      expect(json.error.details).toEqual({ parameter });
      // No DB lookup or authz check ran on the validation path.
      expect(getOneMock).not.toHaveBeenCalled();
      expect(assertSalonAccessMock).not.toHaveBeenCalled();
      expect(transactionMock).not.toHaveBeenCalled();
    });
  }

  it('non-JSON body → 400 ERROR_400 with parameter="body"', async () => {
    const url = `http://localhost/api/products/${PRODUCT_ID}/stock`;
    const malformed = new Request(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });

    const res = await PUT(malformed, { params: paramsFor() });

    expect(res.status).toBe(400);
    const json = await readJson(res);
    expect(json.error.code).toBe('ERROR_400');
    expect(json.error.details).toEqual({ parameter: 'body' });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 3. 400 ERROR_400 — page / limit validation on GET (Requirement 4.7)
// ──────────────────────────────────────────────────────────────────────────

describe('Stock_API GET pagination validation (Requirement 4.7)', () => {
  beforeEach(() => {
    requireAuthMock.mockResolvedValue(SESSION);
  });

  const badCases = [
    { qs: 'page=0', parameter: 'page' },
    { qs: 'page=-1', parameter: 'page' },
    { qs: 'page=abc', parameter: 'page' },
    { qs: 'page=1.5', parameter: 'page' },
    { qs: 'limit=0', parameter: 'limit' },
    { qs: 'limit=101', parameter: 'limit' },
    { qs: 'limit=-5', parameter: 'limit' },
    { qs: 'limit=foo', parameter: 'limit' },
  ];

  for (const { qs, parameter } of badCases) {
    it(`${qs} → 400 ERROR_400 with parameter=${parameter}`, async () => {
      const res = await GET(getRequest(qs), { params: paramsFor() });

      expect(res.status).toBe(400);
      const json = await readJson(res);
      expect(json.error.code).toBe('ERROR_400');
      expect(json.error.details).toEqual({ parameter });
      // The query is rejected before any DB access (Req 4.7).
      expect(getOneMock).not.toHaveBeenCalled();
      expect(queryMock).not.toHaveBeenCalled();
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 4. 404 NOT_FOUND — missing product / cross-salon parity
//    Requirements 3.9, 4.6
// ──────────────────────────────────────────────────────────────────────────

describe('Stock_API 404 cross-salon body-shape parity (Requirements 3.9, 4.6)', () => {
  beforeEach(() => {
    requireAuthMock.mockResolvedValue(SESSION);
  });

  /** Force the product lookup to return null (genuine "not found"). */
  function mockProductMissing() {
    getOneMock.mockResolvedValueOnce(null);
  }

  /**
   * Force the product lookup to succeed but `assertSalonAccess` to deny
   * with FORBIDDEN — modelling a staff member of a different salon
   * dereferencing this product id ("wrong salon").
   */
  function mockProductCrossSalon() {
    getOneMock.mockResolvedValueOnce({ id: PRODUCT_ID, salon_id: SALON_ID });
    assertSalonAccessMock.mockResolvedValueOnce({
      ok: false,
      code: 'FORBIDDEN',
      status: 403,
    });
  }

  it('GET → "not found" returns 404 NOT_FOUND', async () => {
    mockProductMissing();
    const res = await GET(getRequest(), { params: paramsFor() });

    expect(res.status).toBe(404);
    const json = await readJson(res);
    expect(json).toEqual({
      success: false,
      error: { message: 'Product not found', code: 'NOT_FOUND', details: undefined },
    });
  });

  it('GET → "wrong salon" returns 404 NOT_FOUND with the same body shape', async () => {
    mockProductCrossSalon();
    const res = await GET(getRequest(), { params: paramsFor() });

    expect(res.status).toBe(404);
    const json = await readJson(res);
    expect(json).toEqual({
      success: false,
      error: { message: 'Product not found', code: 'NOT_FOUND', details: undefined },
    });
  });

  it('GET → "not found" and "wrong salon" produce byte-equal bodies', async () => {
    // First call: missing product.
    mockProductMissing();
    const missingRes = await GET(getRequest(), { params: paramsFor() });
    const missingBody = await missingRes.text();

    // Second call: cross-salon staff. Reset only the per-call mocks.
    getOneMock.mockReset();
    assertSalonAccessMock.mockReset();
    mockProductCrossSalon();
    const crossRes = await GET(getRequest(), { params: paramsFor() });
    const crossBody = await crossRes.text();

    expect(missingRes.status).toBe(404);
    expect(crossRes.status).toBe(404);
    expect(crossBody).toBe(missingBody);
  });

  it('PUT → "not found" returns 404 NOT_FOUND', async () => {
    mockProductMissing();

    const res = await PUT(
      putRequest({ mode: 'set', quantity: 1, reason_code: 'manual_set' }),
      { params: paramsFor() },
    );

    expect(res.status).toBe(404);
    const json = await readJson(res);
    expect(json).toEqual({
      success: false,
      error: { message: 'Product not found', code: 'NOT_FOUND', details: undefined },
    });
    // No transaction was attempted on the not-found path.
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('PUT → cross-salon FORBIDDEN access collapses to 404 NOT_FOUND', async () => {
    mockProductCrossSalon();

    const res = await PUT(
      putRequest({ mode: 'set', quantity: 1, reason_code: 'manual_set' }),
      { params: paramsFor() },
    );

    expect(res.status).toBe(404);
    const json = await readJson(res);
    expect(json.error.code).toBe('NOT_FOUND');
    // No write happens when authz denies.
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('PUT → "not found" and "wrong salon" produce byte-equal bodies (Requirement 3.9)', async () => {
    mockProductMissing();
    const missingRes = await PUT(
      putRequest({ mode: 'set', quantity: 1, reason_code: 'manual_set' }),
      { params: paramsFor() },
    );
    const missingBody = await missingRes.text();

    getOneMock.mockReset();
    assertSalonAccessMock.mockReset();
    mockProductCrossSalon();
    const crossRes = await PUT(
      putRequest({ mode: 'set', quantity: 1, reason_code: 'manual_set' }),
      { params: paramsFor() },
    );
    const crossBody = await crossRes.text();

    expect(missingRes.status).toBe(404);
    expect(crossRes.status).toBe(404);
    expect(crossBody).toBe(missingBody);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 5. Authorization passes through to `assertSalonAccess` with the right
//    permission key (Requirement 4.3 for GET, 2.4 for PUT). This isn't a
//    new failure path — it's a smoke check that the integration wires the
//    correct permission to the helper.
// ──────────────────────────────────────────────────────────────────────────

describe('Stock_API authorization wiring', () => {
  beforeEach(() => {
    requireAuthMock.mockResolvedValue(SESSION);
  });

  it('GET resolves the `products` permission for the product\'s salon', async () => {
    getOneMock
      // 1. product lookup
      .mockResolvedValueOnce({ id: PRODUCT_ID, salon_id: SALON_ID })
      // 2. count(*) for paginator
      .mockResolvedValueOnce({ cnt: 0 });
    queryMock.mockResolvedValueOnce([]);
    assertSalonAccessMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      role: 'manager',
      salonId: SALON_ID,
    });

    const res = await GET(getRequest(), { params: paramsFor() });

    expect(res.status).toBe(200);
    expect(assertSalonAccessMock).toHaveBeenCalledTimes(1);
    expect(assertSalonAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        session: SESSION,
        salonId: SALON_ID,
        perm: 'products',
      }),
    );
  });

  it('PUT resolves the `products.manage` permission for the product\'s salon', async () => {
    getOneMock.mockResolvedValueOnce({ id: PRODUCT_ID, salon_id: SALON_ID });
    assertSalonAccessMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      role: 'manager',
      salonId: SALON_ID,
    });
    transactionMock.mockResolvedValueOnce({
      id: PRODUCT_ID,
      stock_quantity: 5,
      movement_id: 1,
    });

    const res = await PUT(
      putRequest({ mode: 'set', quantity: 5, reason_code: 'manual_set' }),
      { params: paramsFor() },
    );

    expect(res.status).toBe(200);
    expect(assertSalonAccessMock).toHaveBeenCalledTimes(1);
    expect(assertSalonAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        session: SESSION,
        salonId: SALON_ID,
        perm: 'products.manage',
      }),
    );
  });
});
