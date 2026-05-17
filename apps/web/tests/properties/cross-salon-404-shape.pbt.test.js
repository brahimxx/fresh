// Feature: products-and-sales-improvements
//
// Property 4 — 404 vs 403 cross-salon body shape is non-leaking.
//
// Validates: Requirements 1.3, 3.9, 4.6, 6.3
//
// For every single-resource endpoint listed in task 9.4, the body returned
// for a cross-salon access (the row exists but `assertSalonAccess` denies
// with FORBIDDEN) MUST be byte-equal to the body returned for a genuine
// not-found (the row simply does not exist). The HTTP status on both
// branches must also match. This makes existence-by-id un-observable
// across salons, which is the design's stated parity guarantee:
//
//   "403 and 404 bodies for cross-salon access are intentionally identical
//    in shape so existence can't be inferred (Requirements 1.3, 3.9, 4.6)."
//
// Endpoints covered:
//   - /api/products/[productId]                  GET, PUT, DELETE
//   - /api/products/[productId]/stock            GET, PUT
//   - /api/product-categories/[id]               PUT, DELETE
//   - /api/payments/[id]                         GET, PUT
//
// Approach: invoke each route's handler directly with mocked db / auth /
// permissions, exercise both branches with the *same* generated resource id,
// salon id, and caller, and compare the literal response text. This mirrors
// the harness used in `tests/integration/stock-api.integration.test.js`
// (per the task brief).

import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// ─── Module mocks (registered before any route is imported) ───────────────

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

// Payments GET reaches into checkout.calculateBookingTotal once authorisation
// passes; on the 404 / cross-salon branches it never gets that far, but
// stub it anyway so any accidental control-flow leak surfaces as an
// observable mock invocation rather than a network/db hit.
const calculateBookingTotalMock = vi.fn();
vi.mock('@/lib/checkout', () => ({
  calculateBookingTotal: (...args) => calculateBookingTotalMock(...args),
}));

// Import all route handlers after the mocks are registered so they pick
// up the mocked `@/lib/...` modules instead of the real ones.
const productsItemRoute = await import('@/app/api/products/[productId]/route');
const stockRoute = await import('@/app/api/products/[productId]/stock/route');
const categoriesItemRoute = await import('@/app/api/product-categories/[id]/route');
const paymentsItemRoute = await import('@/app/api/payments/[id]/route');

// ─── Shared helpers ───────────────────────────────────────────────────────

/** Read response body as raw text so byte-equality is observable. */
function readText(res) {
  return res.text();
}

/** A `params` proxy the App Router awaits. */
function paramsFor(name, value) {
  return Promise.resolve({ [name]: String(value) });
}

/** Reset every mock to a clean slate between scenarios. */
function resetMocks() {
  requireAuthMock.mockReset();
  getSessionMock.mockReset();
  queryMock.mockReset();
  getOneMock.mockReset();
  transactionMock.mockReset();
  assertSalonAccessMock.mockReset();
  calculateBookingTotalMock.mockReset();
}

/**
 * Force `assertSalonAccess` to deny every call with FORBIDDEN. The handlers
 * collapse this signal to a 404 with the genuine-not-found body shape
 * (or, for payments PUT, return a `forbidden()` 403 — see the property
 * doc-comment for that case).
 */
function denyForbidden() {
  assertSalonAccessMock.mockResolvedValue({
    ok: false,
    code: 'FORBIDDEN',
    status: 403,
  });
}

/**
 * For each scenario we run two passes through the same handler:
 *   - "missing": the row genuinely doesn't exist
 *   - "cross":   the row exists but on a salon the caller can't see
 *
 * The property asserts that the resulting `{ status, body }` pair is
 * byte-equal between the two passes.
 */
async function runParity(scenario) {
  // ── Pass 1: row missing ────────────────────────────────────────────────
  resetMocks();
  scenario.setupCommon();
  scenario.setupMissing();
  const missingRes = await scenario.invoke();
  const missingStatus = missingRes.status;
  const missingBody = await readText(missingRes);

  // ── Pass 2: cross-salon row exists ─────────────────────────────────────
  resetMocks();
  scenario.setupCommon();
  scenario.setupCrossSalon();
  const crossRes = await scenario.invoke();
  const crossStatus = crossRes.status;
  const crossBody = await readText(crossRes);

  return {
    missing: { status: missingStatus, body: missingBody },
    cross: { status: crossStatus, body: crossBody },
  };
}

/** Assert `runParity` returns equal status and body across both passes. */
function expectParity(result) {
  expect(result.missing.status).toBe(result.cross.status);
  expect(result.missing.body).toBe(result.cross.body);
}

// ─── Generators ───────────────────────────────────────────────────────────

const resourceIdArb = fc.integer({ min: 1, max: 1_000_000 });
const salonIdArb = fc.integer({ min: 1, max: 1_000_000 });
const userIdArb = fc.integer({ min: 1, max: 1_000_000 });
const callerArb = fc.record({
  userId: userIdArb,
  role: fc.constantFrom('staff', 'receptionist', 'manager'),
});

// ─── Reset hook for the per-test default mocks ────────────────────────────

beforeEach(() => {
  resetMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const SEED = 0xC0FFEE_404;

// ─────────────────────────────────────────────────────────────────────────
// /api/products/[productId] — GET
// ─────────────────────────────────────────────────────────────────────────

describe('Property 4 — /api/products/[productId] GET cross-salon parity', () => {
  it('GET → missing-row body is byte-equal to cross-salon body', async () => {
    await fc.assert(
      fc.asyncProperty(
        resourceIdArb,
        salonIdArb,
        callerArb,
        async (productId, salonId, caller) => {
          const url = `http://localhost/api/products/${productId}`;
          const result = await runParity({
            setupCommon: () => {
              requireAuthMock.mockResolvedValue(caller);
            },
            setupMissing: () => {
              // The detail SELECT joins product_categories, returns null when
              // the row is absent. The handler treats deleted_at !== null the
              // same way; we exercise the "row absent entirely" branch here.
              getOneMock.mockResolvedValueOnce(null);
            },
            setupCrossSalon: () => {
              getOneMock.mockResolvedValueOnce({
                id: productId,
                salon_id: salonId,
                category_id: null,
                brand: null,
                name: 'Locked',
                description: null,
                price: 1,
                cost_price: 0,
                sku: null,
                barcode: null,
                stock_quantity: 0,
                low_stock_threshold: 0,
                is_active: 1,
                image_url: null,
                created_at: '2026-06-01T00:00:00Z',
                updated_at: '2026-06-01T00:00:00Z',
                deleted_at: null,
                category_name: null,
              });
              denyForbidden();
            },
            invoke: () =>
              productsItemRoute.GET(new Request(url, { method: 'GET' }), {
                params: paramsFor('productId', productId),
              }),
          });
          expectParity(result);
        },
      ),
      { seed: SEED, numRuns: 50 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// /api/products/[productId] — PUT
// ─────────────────────────────────────────────────────────────────────────

describe('Property 4 — /api/products/[productId] PUT cross-salon parity', () => {
  it('PUT → missing-row body is byte-equal to cross-salon body', async () => {
    await fc.assert(
      fc.asyncProperty(
        resourceIdArb,
        salonIdArb,
        callerArb,
        async (productId, salonId, caller) => {
          const url = `http://localhost/api/products/${productId}`;
          const result = await runParity({
            setupCommon: () => {
              requireAuthMock.mockResolvedValue(caller);
            },
            setupMissing: () => {
              // PUT looks up the row before parsing the body; null short-
              // circuits to notFound('Product not found').
              getOneMock.mockResolvedValueOnce(null);
            },
            setupCrossSalon: () => {
              getOneMock.mockResolvedValueOnce({
                id: productId,
                salon_id: salonId,
                deleted_at: null,
              });
              denyForbidden();
            },
            invoke: () =>
              productsItemRoute.PUT(
                new Request(url, {
                  method: 'PUT',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ name: 'irrelevant', price: 1 }),
                }),
                { params: paramsFor('productId', productId) },
              ),
          });
          expectParity(result);
        },
      ),
      { seed: SEED + 1, numRuns: 50 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// /api/products/[productId] — DELETE
// ─────────────────────────────────────────────────────────────────────────

describe('Property 4 — /api/products/[productId] DELETE cross-salon parity', () => {
  it('DELETE → missing-row body is byte-equal to cross-salon body', async () => {
    await fc.assert(
      fc.asyncProperty(
        resourceIdArb,
        salonIdArb,
        callerArb,
        async (productId, salonId, caller) => {
          const url = `http://localhost/api/products/${productId}`;
          const result = await runParity({
            setupCommon: () => {
              requireAuthMock.mockResolvedValue(caller);
            },
            setupMissing: () => {
              getOneMock.mockResolvedValueOnce(null);
            },
            setupCrossSalon: () => {
              getOneMock.mockResolvedValueOnce({
                id: productId,
                salon_id: salonId,
                deleted_at: null,
              });
              denyForbidden();
            },
            invoke: () =>
              productsItemRoute.DELETE(new Request(url, { method: 'DELETE' }), {
                params: paramsFor('productId', productId),
              }),
          });
          expectParity(result);
        },
      ),
      { seed: SEED + 2, numRuns: 50 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// /api/products/[productId]/stock — GET
// ─────────────────────────────────────────────────────────────────────────

describe('Property 4 — /api/products/[productId]/stock GET cross-salon parity', () => {
  it('GET → missing-row body is byte-equal to cross-salon body', async () => {
    await fc.assert(
      fc.asyncProperty(
        resourceIdArb,
        salonIdArb,
        callerArb,
        async (productId, salonId, caller) => {
          const url = `http://localhost/api/products/${productId}/stock`;
          const result = await runParity({
            setupCommon: () => {
              requireAuthMock.mockResolvedValue(caller);
            },
            setupMissing: () => {
              // Stock GET looks up the product with `deleted_at IS NULL`;
              // null → genuine 404.
              getOneMock.mockResolvedValueOnce(null);
            },
            setupCrossSalon: () => {
              getOneMock.mockResolvedValueOnce({
                id: productId,
                salon_id: salonId,
              });
              denyForbidden();
            },
            invoke: () =>
              stockRoute.GET(new Request(url, { method: 'GET' }), {
                params: paramsFor('productId', productId),
              }),
          });
          expectParity(result);
        },
      ),
      { seed: SEED + 3, numRuns: 50 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// /api/products/[productId]/stock — PUT
// ─────────────────────────────────────────────────────────────────────────

describe('Property 4 — /api/products/[productId]/stock PUT cross-salon parity', () => {
  it('PUT → missing-row body is byte-equal to cross-salon body', async () => {
    await fc.assert(
      fc.asyncProperty(
        resourceIdArb,
        salonIdArb,
        callerArb,
        async (productId, salonId, caller) => {
          const url = `http://localhost/api/products/${productId}/stock`;
          // A body that survives validation so the handler reaches the row
          // lookup. `manual_set` is one of the allowed manual reason codes.
          const validBody = { mode: 'set', quantity: 5, reason_code: 'manual_set' };
          const result = await runParity({
            setupCommon: () => {
              requireAuthMock.mockResolvedValue(caller);
            },
            setupMissing: () => {
              getOneMock.mockResolvedValueOnce(null);
            },
            setupCrossSalon: () => {
              getOneMock.mockResolvedValueOnce({
                id: productId,
                salon_id: salonId,
              });
              denyForbidden();
            },
            invoke: () =>
              stockRoute.PUT(
                new Request(url, {
                  method: 'PUT',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify(validBody),
                }),
                { params: paramsFor('productId', productId) },
              ),
          });
          expectParity(result);
        },
      ),
      { seed: SEED + 4, numRuns: 50 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// /api/product-categories/[id] — PUT
// ─────────────────────────────────────────────────────────────────────────

describe('Property 4 — /api/product-categories/[id] PUT cross-salon parity', () => {
  it('PUT → missing-row body is byte-equal to cross-salon body', async () => {
    await fc.assert(
      fc.asyncProperty(
        resourceIdArb,
        salonIdArb,
        callerArb,
        async (categoryId, salonId, caller) => {
          const url = `http://localhost/api/product-categories/${categoryId}`;
          const result = await runParity({
            setupCommon: () => {
              getSessionMock.mockResolvedValue(caller);
            },
            setupMissing: () => {
              // Categories PUT does ONE getOne for the lookup before authz.
              getOneMock.mockResolvedValueOnce(null);
            },
            setupCrossSalon: () => {
              getOneMock.mockResolvedValueOnce({
                id: categoryId,
                salon_id: salonId,
                name: 'Locked',
                display_order: 0,
                deleted_at: null,
              });
              denyForbidden();
            },
            invoke: () =>
              categoriesItemRoute.PUT(
                new Request(url, {
                  method: 'PUT',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ name: 'New name' }),
                }),
                { params: paramsFor('id', categoryId) },
              ),
          });
          expectParity(result);
        },
      ),
      { seed: SEED + 5, numRuns: 50 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// /api/product-categories/[id] — DELETE
// ─────────────────────────────────────────────────────────────────────────

describe('Property 4 — /api/product-categories/[id] DELETE cross-salon parity', () => {
  it('DELETE → missing-row body is byte-equal to cross-salon body', async () => {
    await fc.assert(
      fc.asyncProperty(
        resourceIdArb,
        salonIdArb,
        callerArb,
        async (categoryId, salonId, caller) => {
          const url = `http://localhost/api/product-categories/${categoryId}`;
          const result = await runParity({
            setupCommon: () => {
              getSessionMock.mockResolvedValue(caller);
            },
            setupMissing: () => {
              getOneMock.mockResolvedValueOnce(null);
            },
            setupCrossSalon: () => {
              getOneMock.mockResolvedValueOnce({
                id: categoryId,
                salon_id: salonId,
                deleted_at: null,
              });
              denyForbidden();
            },
            invoke: () =>
              categoriesItemRoute.DELETE(new Request(url, { method: 'DELETE' }), {
                params: paramsFor('id', categoryId),
              }),
          });
          expectParity(result);
        },
      ),
      { seed: SEED + 6, numRuns: 50 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// /api/payments/[id] — GET
// ─────────────────────────────────────────────────────────────────────────
//
// `fetchPayment()` issues a single `query()` (a multi-table SELECT) and
// returns `rows[0] || null`. We mock the query response to control the
// missing vs cross-salon branches.

describe('Property 4 — /api/payments/[id] GET cross-salon parity', () => {
  it('GET → missing-row body is byte-equal to cross-salon body', async () => {
    await fc.assert(
      fc.asyncProperty(
        resourceIdArb,
        salonIdArb,
        callerArb,
        async (paymentId, salonId, caller) => {
          const url = `http://localhost/api/payments/${paymentId}`;
          const result = await runParity({
            setupCommon: () => {
              getSessionMock.mockResolvedValue(caller);
            },
            setupMissing: () => {
              // `fetchPayment` → empty result set.
              queryMock.mockResolvedValueOnce([]);
            },
            setupCrossSalon: () => {
              queryMock.mockResolvedValueOnce([
                {
                  id: paymentId,
                  booking_id: 99,
                  amount: 0,
                  method: 'cash',
                  status: 'paid',
                  refunded_amount: 0,
                  tip_amount: 0,
                  stripe_payment_id: null,
                  notes: null,
                  created_at: '2026-06-01T00:00:00Z',
                  salon_id: salonId,
                  client_id: null,
                  start_datetime: '2026-06-01T00:00:00Z',
                  user_id: null,
                  first_name: null,
                  last_name: null,
                  email: null,
                  user_deleted_at: null,
                },
              ]);
              denyForbidden();
            },
            invoke: () =>
              paymentsItemRoute.GET(new Request(url, { method: 'GET' }), {
                params: paramsFor('id', paymentId),
              }),
          });
          expectParity(result);
        },
      ),
      { seed: SEED + 7, numRuns: 50 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// /api/payments/[id] — PUT
// ─────────────────────────────────────────────────────────────────────────

describe('Property 4 — /api/payments/[id] PUT cross-salon parity', () => {
  it('PUT → missing-row body is byte-equal to cross-salon body', async () => {
    await fc.assert(
      fc.asyncProperty(
        resourceIdArb,
        salonIdArb,
        callerArb,
        async (paymentId, salonId, caller) => {
          const url = `http://localhost/api/payments/${paymentId}`;
          // The handler validates the body BEFORE the lookup, so the body
          // must be a valid canonical-status payload to reach the missing/
          // cross-salon branches.
          const validBody = { status: 'paid' };
          const result = await runParity({
            setupCommon: () => {
              getSessionMock.mockResolvedValue(caller);
            },
            setupMissing: () => {
              queryMock.mockResolvedValueOnce([]);
            },
            setupCrossSalon: () => {
              queryMock.mockResolvedValueOnce([
                {
                  id: paymentId,
                  booking_id: 99,
                  amount: 0,
                  method: 'cash',
                  status: 'paid',
                  refunded_amount: 0,
                  tip_amount: 0,
                  stripe_payment_id: null,
                  notes: null,
                  created_at: '2026-06-01T00:00:00Z',
                  salon_id: salonId,
                  client_id: null,
                  start_datetime: '2026-06-01T00:00:00Z',
                  user_id: null,
                  first_name: null,
                  last_name: null,
                  email: null,
                  user_deleted_at: null,
                },
              ]);
              denyForbidden();
            },
            invoke: () =>
              paymentsItemRoute.PUT(
                new Request(url, {
                  method: 'PUT',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify(validBody),
                }),
                { params: paramsFor('id', paymentId) },
              ),
          });
          expectParity(result);
        },
      ),
      { seed: SEED + 8, numRuns: 50 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Sanity check: a static expectation on the canonical NOT_FOUND envelope
// shape so a regression in `response.js` would surface as a unit-style
// failure rather than only via the property runs above.
// ─────────────────────────────────────────────────────────────────────────

describe('Property 4 — sanity: canonical NOT_FOUND envelope', () => {
  it('product detail GET → row missing returns the standard NOT_FOUND envelope', async () => {
    requireAuthMock.mockResolvedValue({ userId: 1218, role: 'manager' });
    getOneMock.mockResolvedValueOnce(null);
    const res = await productsItemRoute.GET(
      new Request('http://localhost/api/products/123', { method: 'GET' }),
      { params: paramsFor('productId', 123) },
    );
    expect(res.status).toBe(404);
    const json = JSON.parse(await res.text());
    expect(json).toEqual({
      success: false,
      error: { message: 'Product not found', code: 'NOT_FOUND', details: undefined },
    });
  });
});
