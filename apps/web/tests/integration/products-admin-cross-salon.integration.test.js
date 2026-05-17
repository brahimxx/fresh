/**
 * Integration test for the Products listing endpoint:
 * admin without `salon_id` returns all non-deleted products across salons.
 *
 * Validates: Requirement 1.7
 *
 * The route handler is exercised directly. Surrounding modules are mocked
 * at the `@/` alias boundary so the test stays deterministic and free of
 * any DB / network coupling:
 *
 *   - `@/lib/auth`        → `getSession` (admin caller)
 *   - `@/lib/db`          → `query` (page rows), `getOne` (count)
 *   - `@/lib/permissions` → `assertSalonAccess` returns `ok=true` with
 *                           `salonId=null` to model the admin / no-salon path
 *
 * Coverage:
 *   1. The handler responds 200 with rows drawn from multiple salons.
 *   2. Neither the count SQL nor the page SQL contains a
 *      `p.salon_id = ?` filter clause — the cross-salon listing is
 *      structurally enforced at the SQL boundary, not just at the
 *      application boundary.
 *   3. Both SQL statements still apply `p.deleted_at IS NULL`, so the
 *      "no salon filter" branch does not accidentally drop the soft-delete
 *      guard required by Requirement 1.5.
 *   4. The bind parameters do not contain a salon id (no leftover binding
 *      from a stripped clause).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Module mocks (registered before the route is imported) ───────────────

const getSessionMock = vi.fn();
const requireAuthMock = vi.fn();
vi.mock('@/lib/auth', () => ({
  getSession: (...args) => getSessionMock(...args),
  requireAuth: (...args) => requireAuthMock(...args),
}));

const queryMock = vi.fn();
const getOneMock = vi.fn();
vi.mock('@/lib/db', () => ({
  query: (...args) => queryMock(...args),
  getOne: (...args) => getOneMock(...args),
}));

const assertSalonAccessMock = vi.fn();
vi.mock('@/lib/permissions', () => ({
  assertSalonAccess: (...args) => assertSalonAccessMock(...args),
}));

// Import the handler after mocks are registered so it picks up the
// mocked `@/lib/...` modules rather than the real ones.
const { GET } = await import('@/app/api/products/route');

// ─── Helpers ──────────────────────────────────────────────────────────────

const ADMIN_SESSION = { userId: 1, role: 'admin' };

/** Build the GET request, optionally with query string params. */
function getRequest(qs = '') {
  const url = `http://localhost/api/products${qs ? `?${qs}` : ''}`;
  return new Request(url, { method: 'GET' });
}

async function readJson(res) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Multi-salon product fixture rows the page query should resolve to. */
const MULTI_SALON_ROWS = [
  {
    id: 11,
    salon_id: 100,
    category_id: null,
    category_name: null,
    brand: 'Acme',
    name: 'Shampoo Pro',
    description: null,
    price: '9.90',
    cost_price: '4.00',
    sku: 'A-1',
    barcode: null,
    stock_quantity: 12,
    low_stock_threshold: 5,
    is_active: 1,
    image_url: null,
    created_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-05-01T10:00:00Z',
  },
  {
    id: 22,
    salon_id: 200,
    category_id: 7,
    category_name: 'Hair Care',
    brand: 'Beta',
    name: 'Conditioner',
    description: null,
    price: '12.50',
    cost_price: '5.50',
    sku: 'B-2',
    barcode: null,
    stock_quantity: 0,
    low_stock_threshold: 5,
    is_active: 1,
    image_url: null,
    created_at: '2026-05-02T10:00:00Z',
    updated_at: '2026-05-02T10:00:00Z',
  },
  {
    id: 33,
    salon_id: 300,
    category_id: null,
    category_name: null,
    brand: 'Gamma',
    name: 'Hair Spray',
    description: null,
    price: '6.00',
    cost_price: '2.50',
    sku: 'G-3',
    barcode: null,
    stock_quantity: 50,
    low_stock_threshold: 10,
    is_active: 1,
    image_url: null,
    created_at: '2026-05-03T10:00:00Z',
    updated_at: '2026-05-03T10:00:00Z',
  },
];

beforeEach(() => {
  getSessionMock.mockReset();
  requireAuthMock.mockReset();
  queryMock.mockReset();
  getOneMock.mockReset();
  assertSalonAccessMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────
// Admin without salon_id → all non-deleted products across salons (Req 1.7)
// ──────────────────────────────────────────────────────────────────────────

describe('Products_API GET — admin without salon_id (Requirement 1.7)', () => {
  beforeEach(() => {
    // Authenticated admin caller.
    getSessionMock.mockResolvedValue(ADMIN_SESSION);
    // assertSalonAccess returns ok=true with salonId=null to model the
    // admin / no-salon path. The route then suppresses the salon filter.
    assertSalonAccessMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      role: 'admin',
      salonId: null,
    });
    // Count query first, then the page query.
    getOneMock.mockResolvedValueOnce({ total: MULTI_SALON_ROWS.length });
    queryMock.mockResolvedValueOnce(MULTI_SALON_ROWS);
  });

  it('returns 200 with products drawn from multiple salons', async () => {
    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    const json = await readJson(res);

    expect(json).toEqual({
      success: true,
      data: {
        data: expect.any(Array),
        meta: expect.objectContaining({
          page: 1,
          total: MULTI_SALON_ROWS.length,
          totalPages: 1,
        }),
      },
    });

    // Distinct salons appear in the listing — proves the listing is not
    // scoped to a single salon when the admin omits `salon_id`.
    const distinctSalons = new Set(json.data.data.map((p) => p.salon_id));
    expect(distinctSalons.size).toBeGreaterThan(1);
    expect([...distinctSalons].sort()).toEqual([100, 200, 300]);
  });

  it('issues SQL that does not filter by `salon_id` (no salon clause, no salon bind)', async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(200);

    // Both queries (COUNT and page SELECT) ran.
    expect(getOneMock).toHaveBeenCalledTimes(1);
    expect(queryMock).toHaveBeenCalledTimes(1);

    const [countSql, countParams] = getOneMock.mock.calls[0];
    const [pageSql, pageParams] = queryMock.mock.calls[0];

    // Neither statement includes a salon scope filter. The check is
    // robust to whitespace and column qualifier (`p.salon_id` or
    // `salon_id`).
    const SALON_FILTER = /\bsalon_id\s*=\s*\?/i;
    expect(SALON_FILTER.test(countSql)).toBe(false);
    expect(SALON_FILTER.test(pageSql)).toBe(false);

    // Both statements still apply the soft-delete guard (Req 1.5).
    const SOFT_DELETE_GUARD = /deleted_at\s+IS\s+NULL/i;
    expect(SOFT_DELETE_GUARD.test(countSql)).toBe(true);
    expect(SOFT_DELETE_GUARD.test(pageSql)).toBe(true);

    // No salon id leaked into either bind list. The count query has no
    // binds at all in this scenario; the page query only carries the
    // LIMIT / OFFSET pair.
    const containsSalonId = (params) =>
      Array.isArray(params) &&
      params.some((p) => [100, 200, 300].includes(p));
    expect(containsSalonId(countParams)).toBe(false);
    expect(containsSalonId(pageParams)).toBe(false);

    // Page query's trailing binds are exactly LIMIT, OFFSET — confirming
    // there is no orphaned salon parameter.
    expect(pageParams.slice(-2)).toEqual([25, 0]);
    // And no other binds are passed (no search / category / stock / active).
    expect(pageParams).toHaveLength(2);
  });

  it('passes salonId=null into assertSalonAccess so the route takes the cross-salon branch', async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(200);

    expect(assertSalonAccessMock).toHaveBeenCalledTimes(1);
    expect(assertSalonAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        session: ADMIN_SESSION,
        salonId: null,
        perm: 'products',
      }),
    );
  });
});
