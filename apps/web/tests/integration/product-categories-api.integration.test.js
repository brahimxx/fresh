/**
 * Integration tests for the Categories_API route handlers.
 *
 * Covers task 4.3:
 *   - CRUD happy paths (GET list, POST create, PUT rename, DELETE soft-delete)
 *   - Transactional rollback on simulated failure (DELETE)
 *   - Cross-salon 404 body shape parity with genuine-not-found
 *   - `name` and `display_order` bounds enforced consistently across POST/PUT
 *
 * Validates: Requirements 6.1, 6.3, 6.5, 6.11
 *
 * Harness notes
 * -------------
 * The handlers are invoked directly (no HTTP layer). `@/lib/auth`,
 * `@/lib/db`, and `@/lib/permissions` are mocked at the module boundary so
 * the tests stay deterministic and free of any MySQL or JWT dependency.
 *
 * `assertSalonAccess` is mocked with a tiny ACL table keyed by
 * `(userId, salonId)` so cross-salon scenarios can be expressed declaratively.
 *
 * `transaction()` is replayed with an in-memory connection that records
 * every `conn.query(sql, params)` invocation and lets a test toggle a
 * single failure point. The mock mirrors `src/lib/db.js#transaction`
 * exactly: enter → run callback → commit on resolve, rollback on reject.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Module-level mock handles ────────────────────────────────────────────

const queryMock = vi.fn();
const getOneMock = vi.fn();
const transactionMock = vi.fn();

const requireAuthMock = vi.fn();
const getSessionMock = vi.fn();

const assertSalonAccessMock = vi.fn();

vi.mock('@/lib/db', () => ({
  query: (...args) => queryMock(...args),
  getOne: (...args) => getOneMock(...args),
  transaction: (...args) => transactionMock(...args),
}));

vi.mock('@/lib/auth', () => ({
  requireAuth: (...args) => requireAuthMock(...args),
  getSession: (...args) => getSessionMock(...args),
}));

vi.mock('@/lib/permissions', () => ({
  assertSalonAccess: (...args) => assertSalonAccessMock(...args),
}));

// ─── Import the route handlers AFTER mocks are registered ────────────────

const listRoute = await import('@/app/api/product-categories/route');
const itemRoute = await import('@/app/api/product-categories/[id]/route');

// ─── Test helpers ─────────────────────────────────────────────────────────

const OWNER_USER_ID = 4001;
const STAFF_USER_ID = 4002;
const ADMIN_USER_ID = 4003;
const SALON_A = 100;
const SALON_B = 200;

/**
 * Resolve `assertSalonAccess` against a tiny in-memory ACL.
 * - Admin always passes.
 * - Owner of the salon always passes.
 * - Anyone else gets FORBIDDEN.
 * Missing salon_id → MISSING_SALON_ID; malformed → INVALID_SALON_ID.
 */
function aclResolve({ session, salonId }) {
  if (!session || !session.userId) {
    return { ok: false, code: 'UNAUTHORIZED', status: 401 };
  }
  if (session.role === 'admin') {
    return { ok: true, status: 200, role: 'admin', salonId: salonId == null ? null : Number(salonId) };
  }
  if (salonId === undefined || salonId === null || salonId === '') {
    return { ok: false, code: 'MISSING_SALON_ID', status: 400 };
  }
  const asNumber = Number(salonId);
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber) || asNumber <= 0) {
    return { ok: false, code: 'INVALID_SALON_ID', status: 400 };
  }
  // Owner of SALON_A only.
  if (session.userId === OWNER_USER_ID && asNumber === SALON_A) {
    return { ok: true, status: 200, role: 'owner', salonId: asNumber };
  }
  return { ok: false, code: 'FORBIDDEN', status: 403 };
}

/** Build a `Request` object the handlers can read from. */
function buildRequest({ method = 'GET', url = 'http://localhost/api/product-categories', body } = {}) {
  const init = { method, headers: { 'content-type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(url, init);
}

/** Read a NextResponse (extends Response) into `{ status, json }`. */
async function readResponse(res) {
  const status = res.status;
  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status, json };
}

/**
 * In-memory connection used to replay `transaction(async conn => …)`.
 *
 * Each `conn.query(sql, params)` is recorded and (optionally) made to
 * throw at a chosen call index. The replay matches the production
 * `transaction()` semantics: throw → caller catches, real impl rolls
 * back. We additionally expose `committed` so tests can assert that
 * COMMIT happened when expected.
 */
function makeFakeTransaction({ failAtCallIndex = -1 } = {}) {
  const calls = [];
  let committed = false;
  let rolledBack = false;

  async function transaction(callback) {
    const conn = {
      query: vi.fn(async (sql, params) => {
        const index = calls.length;
        calls.push({ sql, params });
        if (index === failAtCallIndex) {
          const err = new Error(`SIMULATED_FAILURE_AT_${index}`);
          err.code = 'SIMULATED_FAILURE';
          throw err;
        }
        return [{ affectedRows: 1, insertId: 0 }];
      }),
    };

    try {
      const result = await callback(conn);
      committed = true;
      return result;
    } catch (err) {
      rolledBack = true;
      throw err;
    }
  }

  return {
    transaction,
    get calls() { return calls; },
    get committed() { return committed; },
    get rolledBack() { return rolledBack; },
  };
}

// ─── Reset between tests ──────────────────────────────────────────────────

beforeEach(() => {
  queryMock.mockReset();
  getOneMock.mockReset();
  transactionMock.mockReset();
  requireAuthMock.mockReset();
  getSessionMock.mockReset();
  assertSalonAccessMock.mockReset();

  // Default ACL behaviour. Individual tests override session as needed.
  assertSalonAccessMock.mockImplementation(async (args) => aclResolve(args || {}));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/product-categories
// ─────────────────────────────────────────────────────────────────────────

describe('GET /api/product-categories — list', () => {
  it('returns categories for the salon ordered by display_order ASC, name ASC', async () => {
    requireAuthMock.mockResolvedValue({ userId: OWNER_USER_ID, role: 'owner' });
    const rows = [
      { id: 11, salon_id: SALON_A, name: 'Hair Care', display_order: 0, created_at: '2026-01-01T00:00:00Z', deleted_at: null },
      { id: 22, salon_id: SALON_A, name: 'Tools', display_order: 1, created_at: '2026-01-02T00:00:00Z', deleted_at: null },
      { id: 33, salon_id: SALON_A, name: 'Skin Care', display_order: 1, created_at: '2026-01-03T00:00:00Z', deleted_at: null },
    ];
    queryMock.mockResolvedValue(rows);

    const req = buildRequest({
      url: `http://localhost/api/product-categories?salon_id=${SALON_A}`,
    });
    const { status, json } = await readResponse(await listRoute.GET(req));

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(rows.map((r) => ({
      id: r.id,
      salon_id: r.salon_id,
      name: r.name,
      display_order: r.display_order,
      created_at: r.created_at,
      deleted_at: null,
    })));

    // Verify the WHERE/ORDER BY shape — the route MUST scope by salon_id and
    // exclude soft-deleted rows in deterministic order.
    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/WHERE\s+salon_id\s*=\s*\?/);
    expect(sql).toMatch(/deleted_at\s+IS\s+NULL/);
    expect(sql).toMatch(/ORDER BY\s+display_order\s+ASC,\s*name\s+ASC/);
    expect(params).toEqual([SALON_A]);
  });

  it('returns an empty array when the salon has no categories', async () => {
    requireAuthMock.mockResolvedValue({ userId: OWNER_USER_ID, role: 'owner' });
    queryMock.mockResolvedValue([]);

    const req = buildRequest({
      url: `http://localhost/api/product-categories?salon_id=${SALON_A}`,
    });
    const { status, json } = await readResponse(await listRoute.GET(req));

    expect(status).toBe(200);
    expect(json.data).toEqual([]);
  });

  it('returns 400 MISSING_SALON_ID when salon_id is omitted by a non-admin', async () => {
    requireAuthMock.mockResolvedValue({ userId: OWNER_USER_ID, role: 'owner' });

    const req = buildRequest({ url: 'http://localhost/api/product-categories' });
    const { status, json } = await readResponse(await listRoute.GET(req));

    expect(status).toBe(400);
    expect(json.error.code).toBe('MISSING_SALON_ID');
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('returns 401 UNAUTHORIZED when no session is present', async () => {
    requireAuthMock.mockRejectedValue(new Error('Unauthorized'));

    const req = buildRequest({
      url: `http://localhost/api/product-categories?salon_id=${SALON_A}`,
    });
    const { status, json } = await readResponse(await listRoute.GET(req));

    expect(status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('returns 403 FORBIDDEN when the caller has no access to the salon', async () => {
    requireAuthMock.mockResolvedValue({ userId: STAFF_USER_ID, role: 'staff' });

    const req = buildRequest({
      url: `http://localhost/api/product-categories?salon_id=${SALON_B}`,
    });
    const { status, json } = await readResponse(await listRoute.GET(req));

    expect(status).toBe(403);
    expect(json.error.code).toBe('FORBIDDEN');
    expect(queryMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/product-categories
// ─────────────────────────────────────────────────────────────────────────

describe('POST /api/product-categories — create', () => {
  function setupOwner() {
    requireAuthMock.mockResolvedValue({ userId: OWNER_USER_ID, role: 'owner' });
  }

  it('creates a category and returns 201 with the inserted row', async () => {
    setupOwner();
    queryMock.mockResolvedValueOnce({ insertId: 77 }); // INSERT
    getOneMock.mockResolvedValueOnce({
      id: 77,
      salon_id: SALON_A,
      name: 'Hair Care',
      display_order: 3,
      created_at: '2026-06-01T00:00:00Z',
      deleted_at: null,
    });

    const req = buildRequest({
      method: 'POST',
      body: { salon_id: SALON_A, name: '  Hair Care  ', display_order: 3 },
    });
    const { status, json } = await readResponse(await listRoute.POST(req));

    expect(status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      id: 77,
      salon_id: SALON_A,
      name: 'Hair Care',
      display_order: 3,
    });

    // INSERT was issued with the trimmed name and the resolved display_order.
    const insertCall = queryMock.mock.calls.find((call) => /INSERT INTO product_categories/i.test(call[0]));
    expect(insertCall).toBeTruthy();
    expect(insertCall[1]).toEqual([SALON_A, 'Hair Care', 3]);
  });

  it('defaults display_order to 0 when not supplied', async () => {
    setupOwner();
    queryMock.mockResolvedValueOnce({ insertId: 78 });
    getOneMock.mockResolvedValueOnce({
      id: 78,
      salon_id: SALON_A,
      name: 'Tools',
      display_order: 0,
      created_at: '2026-06-01T00:00:00Z',
      deleted_at: null,
    });

    const req = buildRequest({
      method: 'POST',
      body: { salon_id: SALON_A, name: 'Tools' },
    });
    const { status, json } = await readResponse(await listRoute.POST(req));

    expect(status).toBe(201);
    expect(json.data.display_order).toBe(0);
    const insertCall = queryMock.mock.calls.find((call) => /INSERT INTO product_categories/i.test(call[0]));
    expect(insertCall[1]).toEqual([SALON_A, 'Tools', 0]);
  });

  describe('validation — `name` bounds (Req 6.11)', () => {
    it.each([
      ['empty after trim', '   '],
      ['empty string', ''],
      ['101 characters', 'a'.repeat(101)],
    ])('rejects "%s" with 400 ERROR_400 and parameter=name', async (_label, badName) => {
      setupOwner();
      const req = buildRequest({
        method: 'POST',
        body: { salon_id: SALON_A, name: badName },
      });
      const { status, json } = await readResponse(await listRoute.POST(req));

      expect(status).toBe(400);
      expect(json.error.code).toBe('ERROR_400');
      expect(json.error.message?.toLowerCase()).toContain('name');
      expect(queryMock).not.toHaveBeenCalled();
    });

    it.each([
      ['number', 42],
      ['boolean', true],
      ['null', null],
    ])('rejects non-string name (%s) with 400 ERROR_400', async (_label, badName) => {
      setupOwner();
      const req = buildRequest({
        method: 'POST',
        body: { salon_id: SALON_A, name: badName },
      });
      const { status, json } = await readResponse(await listRoute.POST(req));

      expect(status).toBe(400);
      expect(json.error.code).toBe('ERROR_400');
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('accepts a 100-character name (boundary inclusive)', async () => {
      setupOwner();
      queryMock.mockResolvedValueOnce({ insertId: 1 });
      getOneMock.mockResolvedValueOnce({
        id: 1,
        salon_id: SALON_A,
        name: 'a'.repeat(100),
        display_order: 0,
        created_at: '2026-06-01T00:00:00Z',
        deleted_at: null,
      });
      const req = buildRequest({
        method: 'POST',
        body: { salon_id: SALON_A, name: 'a'.repeat(100) },
      });
      const { status } = await readResponse(await listRoute.POST(req));
      expect(status).toBe(201);
    });
  });

  describe('validation — `display_order` bounds (Req 6.11)', () => {
    it.each([
      ['negative', -1],
      ['10000 (over max)', 10000],
      ['non-integer (1.5)', 1.5],
      ['non-numeric string', 'abc'],
    ])('rejects display_order=%s with 400 ERROR_400 and parameter=display_order', async (_label, badOrder) => {
      setupOwner();
      const req = buildRequest({
        method: 'POST',
        body: { salon_id: SALON_A, name: 'OK', display_order: badOrder },
      });
      const { status, json } = await readResponse(await listRoute.POST(req));

      expect(status).toBe(400);
      expect(json.error.code).toBe('ERROR_400');
      expect(json.error.message?.toLowerCase()).toContain('display_order');
      expect(queryMock).not.toHaveBeenCalled();
    });

    it.each([
      ['lower bound 0', 0],
      ['upper bound 9999', 9999],
    ])('accepts display_order=%s (boundary inclusive)', async (_label, order) => {
      setupOwner();
      queryMock.mockResolvedValueOnce({ insertId: 1 });
      getOneMock.mockResolvedValueOnce({
        id: 1,
        salon_id: SALON_A,
        name: 'OK',
        display_order: order,
        created_at: '2026-06-01T00:00:00Z',
        deleted_at: null,
      });
      const req = buildRequest({
        method: 'POST',
        body: { salon_id: SALON_A, name: 'OK', display_order: order },
      });
      const { status } = await readResponse(await listRoute.POST(req));
      expect(status).toBe(201);
    });
  });

  it('returns 401 when there is no session', async () => {
    requireAuthMock.mockRejectedValue(new Error('Unauthorized'));
    const req = buildRequest({
      method: 'POST',
      body: { salon_id: SALON_A, name: 'OK' },
    });
    const { status, json } = await readResponse(await listRoute.POST(req));
    expect(status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when the caller is not allowed on the salon', async () => {
    requireAuthMock.mockResolvedValue({ userId: STAFF_USER_ID, role: 'staff' });
    const req = buildRequest({
      method: 'POST',
      body: { salon_id: SALON_B, name: 'OK' },
    });
    const { status, json } = await readResponse(await listRoute.POST(req));
    expect(status).toBe(403);
    expect(json.error.code).toBe('FORBIDDEN');
    expect(queryMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// PUT /api/product-categories/[id]
// ─────────────────────────────────────────────────────────────────────────

describe('PUT /api/product-categories/[id] — rename / reorder', () => {
  function setupOwner() {
    getSessionMock.mockResolvedValue({ userId: OWNER_USER_ID, role: 'owner' });
  }

  function mockCategoryLookup({ id, salon_id, name = 'Hair Care', display_order = 0, deleted_at = null }) {
    // The handler issues two SELECTs via getOne: the lookup (with deleted_at)
    // and the read-back (without). Provide rows for both call sites.
    getOneMock
      .mockResolvedValueOnce({ id, salon_id, name, display_order, deleted_at })
      .mockResolvedValueOnce({ id, salon_id, name, display_order });
  }

  it('updates the category and returns the new state', async () => {
    setupOwner();
    mockCategoryLookup({ id: 11, salon_id: SALON_A });
    // After the UPDATE, the read-back row should reflect the new values.
    getOneMock.mockReset();
    getOneMock
      .mockResolvedValueOnce({ id: 11, salon_id: SALON_A, name: 'Hair Care', display_order: 0, deleted_at: null })
      .mockResolvedValueOnce({ id: 11, salon_id: SALON_A, name: 'Hair', display_order: 5 });

    const fakeTx = makeFakeTransaction();
    transactionMock.mockImplementation(fakeTx.transaction);

    const req = buildRequest({
      method: 'PUT',
      url: 'http://localhost/api/product-categories/11',
      body: { name: 'Hair', display_order: 5 },
    });
    const res = await itemRoute.PUT(req, { params: Promise.resolve({ id: '11' }) });
    const { status, json } = await readResponse(res);

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ id: 11, salon_id: SALON_A, name: 'Hair', display_order: 5 });

    // The UPDATE ran inside a transaction with the new values.
    expect(fakeTx.committed).toBe(true);
    expect(fakeTx.calls).toHaveLength(1);
    expect(fakeTx.calls[0].sql).toMatch(/UPDATE\s+product_categories\s+SET\s+name\s*=\s*\?,\s*display_order\s*=\s*\?/i);
    expect(fakeTx.calls[0].params).toEqual(['Hair', 5, 11]);
  });

  it('returns 404 with the same body shape when the category belongs to another salon (cross-salon)', async () => {
    setupOwner();
    // Category exists, but on SALON_B which the owner does NOT own.
    getOneMock.mockResolvedValueOnce({
      id: 99, salon_id: SALON_B, name: 'Other', display_order: 0, deleted_at: null,
    });

    const req = buildRequest({
      method: 'PUT',
      url: 'http://localhost/api/product-categories/99',
      body: { name: 'Renamed' },
    });
    const res = await itemRoute.PUT(req, { params: Promise.resolve({ id: '99' }) });
    const cross = await readResponse(res);

    // Genuine miss: id valid but no row exists (deleted_at NULL).
    getOneMock.mockResolvedValueOnce(null);
    const req2 = buildRequest({
      method: 'PUT',
      url: 'http://localhost/api/product-categories/12345',
      body: { name: 'Renamed' },
    });
    const res2 = await itemRoute.PUT(req2, { params: Promise.resolve({ id: '12345' }) });
    const genuine = await readResponse(res2);

    // Both responses MUST share status, code, and body shape so existence is
    // not leaked through 403 vs 404 differentiation (Req 6.3).
    expect(cross.status).toBe(404);
    expect(genuine.status).toBe(404);
    expect(cross.json.error.code).toBe('NOT_FOUND');
    expect(genuine.json.error.code).toBe('NOT_FOUND');
    expect(cross.json).toEqual(genuine.json);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the category was previously soft-deleted', async () => {
    setupOwner();
    getOneMock.mockResolvedValueOnce({
      id: 11, salon_id: SALON_A, name: 'Old', display_order: 0, deleted_at: '2026-05-01T00:00:00Z',
    });
    const req = buildRequest({
      method: 'PUT',
      url: 'http://localhost/api/product-categories/11',
      body: { name: 'New' },
    });
    const res = await itemRoute.PUT(req, { params: Promise.resolve({ id: '11' }) });
    const { status, json } = await readResponse(res);
    expect(status).toBe(404);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  describe('validation — bounds match POST (Req 6.11)', () => {
    function mockExistingCategory() {
      // PUT issues two getOne calls per the handler; mock the first lookup.
      getOneMock.mockResolvedValueOnce({
        id: 11, salon_id: SALON_A, name: 'Hair', display_order: 0, deleted_at: null,
      });
    }

    it.each([
      ['empty name after trim', { name: '   ' }],
      ['name longer than 100 chars', { name: 'a'.repeat(101) }],
      ['non-string name', { name: 123 }],
    ])('rejects %s with 400 ERROR_400', async (_label, body) => {
      setupOwner();
      mockExistingCategory();
      const req = buildRequest({
        method: 'PUT',
        url: 'http://localhost/api/product-categories/11',
        body,
      });
      const res = await itemRoute.PUT(req, { params: Promise.resolve({ id: '11' }) });
      const { status, json } = await readResponse(res);
      expect(status).toBe(400);
      expect(json.error.code).toBe('ERROR_400');
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it.each([
      ['negative display_order', { display_order: -1 }],
      ['display_order > 9999',   { display_order: 10000 }],
      ['non-integer display_order', { display_order: 1.5 }],
    ])('rejects %s with 400 ERROR_400', async (_label, body) => {
      setupOwner();
      mockExistingCategory();
      const req = buildRequest({
        method: 'PUT',
        url: 'http://localhost/api/product-categories/11',
        body,
      });
      const res = await itemRoute.PUT(req, { params: Promise.resolve({ id: '11' }) });
      const { status, json } = await readResponse(res);
      expect(status).toBe(400);
      expect(json.error.code).toBe('ERROR_400');
      expect(transactionMock).not.toHaveBeenCalled();
    });
  });

  it('returns 401 when no session is present', async () => {
    getSessionMock.mockResolvedValue(null);
    const req = buildRequest({
      method: 'PUT',
      url: 'http://localhost/api/product-categories/11',
      body: { name: 'X' },
    });
    const res = await itemRoute.PUT(req, { params: Promise.resolve({ id: '11' }) });
    const { status, json } = await readResponse(res);
    expect(status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// DELETE /api/product-categories/[id]
// ─────────────────────────────────────────────────────────────────────────

describe('DELETE /api/product-categories/[id] — soft delete + transactional cascade', () => {
  function setupOwner() {
    getSessionMock.mockResolvedValue({ userId: OWNER_USER_ID, role: 'owner' });
  }

  it('runs both UPDATE statements inside a single transaction and commits (Req 6.5)', async () => {
    setupOwner();
    getOneMock.mockResolvedValueOnce({ id: 11, salon_id: SALON_A, deleted_at: null });

    const fakeTx = makeFakeTransaction();
    transactionMock.mockImplementation(fakeTx.transaction);

    const req = buildRequest({
      method: 'DELETE',
      url: 'http://localhost/api/product-categories/11',
    });
    const res = await itemRoute.DELETE(req, { params: Promise.resolve({ id: '11' }) });
    const { status, json } = await readResponse(res);

    expect(status).toBe(200);
    expect(json.success).toBe(true);

    // Exactly one transaction was opened and committed.
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(fakeTx.committed).toBe(true);
    expect(fakeTx.rolledBack).toBe(false);

    // Two statements ran inside the same transaction:
    //   1) UPDATE product_categories SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL
    //   2) UPDATE products SET category_id = NULL WHERE category_id = ?
    expect(fakeTx.calls).toHaveLength(2);

    expect(fakeTx.calls[0].sql).toMatch(/UPDATE\s+product_categories\s+SET\s+deleted_at\s*=\s*NOW\(\)/i);
    expect(fakeTx.calls[0].sql).toMatch(/deleted_at\s+IS\s+NULL/i);
    expect(fakeTx.calls[0].params).toEqual([11]);

    expect(fakeTx.calls[1].sql).toMatch(/UPDATE\s+products\s+SET\s+category_id\s*=\s*NULL\s+WHERE\s+category_id\s*=\s*\?/i);
    expect(fakeTx.calls[1].params).toEqual([11]);
  });

  it('rolls back the entire transaction when the second UPDATE fails (Req 6.5)', async () => {
    setupOwner();
    getOneMock.mockResolvedValueOnce({ id: 11, salon_id: SALON_A, deleted_at: null });

    // Inject failure at the SECOND statement (products UPDATE) — the spec
    // case "any statement in the soft-delete + product nullify transaction
    // fails → the entire transaction SHALL roll back".
    const fakeTx = makeFakeTransaction({ failAtCallIndex: 1 });
    transactionMock.mockImplementation(fakeTx.transaction);

    const req = buildRequest({
      method: 'DELETE',
      url: 'http://localhost/api/product-categories/11',
    });
    const res = await itemRoute.DELETE(req, { params: Promise.resolve({ id: '11' }) });
    const { status, json } = await readResponse(res);

    // The route's outer try/catch maps the thrown error to a 500 envelope.
    expect(status).toBe(500);
    expect(json.success).toBe(false);

    // Both queries were attempted but the transaction did NOT commit.
    expect(fakeTx.calls).toHaveLength(2);
    expect(fakeTx.committed).toBe(false);
    expect(fakeTx.rolledBack).toBe(true);
  });

  it('rolls back when the FIRST UPDATE fails (no products statement runs)', async () => {
    setupOwner();
    getOneMock.mockResolvedValueOnce({ id: 11, salon_id: SALON_A, deleted_at: null });

    const fakeTx = makeFakeTransaction({ failAtCallIndex: 0 });
    transactionMock.mockImplementation(fakeTx.transaction);

    const req = buildRequest({
      method: 'DELETE',
      url: 'http://localhost/api/product-categories/11',
    });
    const res = await itemRoute.DELETE(req, { params: Promise.resolve({ id: '11' }) });
    const { status } = await readResponse(res);

    expect(status).toBe(500);
    // Only the first call (the categories UPDATE) was attempted before the
    // transaction aborted; the products UPDATE never ran.
    expect(fakeTx.calls).toHaveLength(1);
    expect(fakeTx.committed).toBe(false);
    expect(fakeTx.rolledBack).toBe(true);
  });

  it('returns 404 with the same body shape for cross-salon vs genuine-not-found (Req 6.3 parity)', async () => {
    setupOwner();

    // Cross-salon: category belongs to SALON_B, owner only owns SALON_A.
    getOneMock.mockResolvedValueOnce({ id: 99, salon_id: SALON_B, deleted_at: null });
    const req1 = buildRequest({
      method: 'DELETE',
      url: 'http://localhost/api/product-categories/99',
    });
    const res1 = await itemRoute.DELETE(req1, { params: Promise.resolve({ id: '99' }) });
    const cross = await readResponse(res1);

    // Genuine miss.
    getOneMock.mockResolvedValueOnce(null);
    const req2 = buildRequest({
      method: 'DELETE',
      url: 'http://localhost/api/product-categories/12345',
    });
    const res2 = await itemRoute.DELETE(req2, { params: Promise.resolve({ id: '12345' }) });
    const genuine = await readResponse(res2);

    expect(cross.status).toBe(404);
    expect(genuine.status).toBe(404);
    expect(cross.json).toEqual(genuine.json);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('returns 404 (not 200) when the category is already soft-deleted', async () => {
    setupOwner();
    getOneMock.mockResolvedValueOnce({
      id: 11, salon_id: SALON_A, deleted_at: '2026-05-01T00:00:00Z',
    });
    const req = buildRequest({
      method: 'DELETE',
      url: 'http://localhost/api/product-categories/11',
    });
    const res = await itemRoute.DELETE(req, { params: Promise.resolve({ id: '11' }) });
    const { status, json } = await readResponse(res);

    expect(status).toBe(404);
    expect(json.error.code).toBe('NOT_FOUND');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('returns 401 when no session is present', async () => {
    getSessionMock.mockResolvedValue(null);
    const req = buildRequest({
      method: 'DELETE',
      url: 'http://localhost/api/product-categories/11',
    });
    const res = await itemRoute.DELETE(req, { params: Promise.resolve({ id: '11' }) });
    const { status, json } = await readResponse(res);
    expect(status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
