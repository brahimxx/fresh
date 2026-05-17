// Feature: products-and-sales-improvements
//
// Task 9.2 — PBT for mutating-endpoint authorization decision is total and
//            consistent.
//
// Property 2: Authorization decision is total and consistent for mutating
//             endpoints.
//
// Validates: Requirements 2.1, 2.2, 2.4, 2.5, 4.3, 6.6, 14.9, 15.1, 15.2,
//            15.3
//
// Mutating endpoints in scope (design § Components / Authorization model):
//
//   POST   /api/products                              perm: 'products.manage'
//   PUT    /api/products/[id]                         perm: 'products.manage'
//   DELETE /api/products/[id]                         perm: 'products.manage'
//   PUT    /api/products/[id]/stock                   perm: 'products.manage'
//   POST   /api/product-categories                    perm: 'products_manage'
//   PUT    /api/product-categories/[id]               perm: 'products_manage'
//   DELETE /api/product-categories/[id]               perm: 'products_manage'
//   POST   /api/checkout/refund                       perm: 'sales_manage'
//
// All four perm strings funnel through the alias map in
// `resolvePermission` / `assertSalonAccess`, so the authorization decision
// is — by construction — a function of:
//
//     (caller, salonId, perm key)
//
// where `caller` is one of `{no_session, admin, owner, staff_with_perm,
// staff_without_perm, no_staff_on_salon}` and `salonId` resolves to a real
// salon. The decision matrix per the design and Requirements 2.1/2.2/15.1/
// 15.2 is:
//
//   no_session            → 401 UNAUTHORIZED
//   admin                 → 200 ALLOWED (regardless of salonId / perm)
//   owner of salon        → 200 ALLOWED (regardless of perm)
//   staff_with_perm       → 200 ALLOWED
//   staff_without_perm    → 403 FORBIDDEN
//   no_staff_on_salon     → 403 FORBIDDEN
//
// The PBT has two parts:
//
//   Part A — Decision matrix property:
//     Run the *real* `assertSalonAccess` with a mocked `getOne` and a
//     generator over the input space, and assert the response matches the
//     matrix above for every input. This pins the contract that every
//     mutating endpoint relies on.
//
//   Part B — No-write-on-denial property:
//     For every mutating route handler, run the handler under each denial
//     scenario and assert that no DB write was issued — neither
//     `transaction()` nor any INSERT/UPDATE/DELETE through `query()` /
//     `getOne()`. This pins the structural side-effect-freeness that
//     Requirements 14.9 and 15.3 depend on.
//
// References:
//  - design.md "Property 2: Authorization decision is total and consistent
//    for mutating endpoints"
//  - permissions.js#assertSalonAccess (decision matrix implementation)
//  - tasks.md task 9.2

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';

// ─── Module-level mock handles ────────────────────────────────────────────
//
// `assertSalonAccess` lives in `@/lib/permissions` and is consumed by every
// mutating route handler. We mock the DB layer it talks to (`@/lib/db`) so
// the real engine still computes the decision but the salon/staff lookups
// are fed deterministic rows. Auth (`@/lib/auth`) is mocked so we can
// inject any caller shape (no session / admin / owner / staff). Stripe is
// stubbed out for the refund route — the property only touches the
// pre-write authorization branches.

const queryMock = vi.fn();
const getOneMock = vi.fn();
const transactionMock = vi.fn();

const requireAuthMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock('@/lib/db', () => ({
  query: (...args) => queryMock(...args),
  getOne: (...args) => getOneMock(...args),
  transaction: (...args) => transactionMock(...args),
  default: {},
}));

vi.mock('@/lib/auth', () => ({
  requireAuth: (...args) => requireAuthMock(...args),
  getSession: (...args) => getSessionMock(...args),
}));

// Stripe is touched only on the refund happy path; mock it to a no-op so
// the refund route never makes an outbound call from within a property
// loop. (Tests in this file never reach the Stripe branch — every assertion
// targets pre-write denial paths — but the import must resolve.)
vi.mock('stripe', () => ({
  default: class {
    constructor() {
      this.refunds = { create: vi.fn(async () => ({ id: 'pi_test' })) };
    }
  },
}));

// Re-import the modules under test AFTER the mocks are registered. The
// permission engine is the real one — only its `getOne` dependency is a
// stub. Each route handler is also the real one; `transaction()` and the
// write-issuing `query()` calls are guarded by the mocks so we can detect
// any leak past a denial branch.
const { assertSalonAccess } = await import('@/lib/permissions');
const productItemRoute = await import('@/app/api/products/[productId]/route');
const stockRoute = await import('@/app/api/products/[productId]/stock/route');
const categoriesRoute = await import('@/app/api/product-categories/route');
const categoryItemRoute = await import('@/app/api/product-categories/[id]/route');
const refundRoute = await import('@/app/api/checkout/refund/route');

// ─── Constants — the perm keys used by every mutating endpoint ────────────
//
// The aliases `'products.manage' → 'products_manage'` and
// `'sales.manage' → 'sales_manage'` are exercised in both directions so
// the property fires regardless of which spelling a route happens to pass.

const MUTATING_PERMS = Object.freeze([
  'products.manage',
  'products_manage',
  'sales.manage',
  'sales_manage',
]);

const PERM_ALIAS = Object.freeze({
  'products.manage': 'products_manage',
  'sales.manage': 'sales_manage',
  products_manage: 'products_manage',
  sales_manage: 'sales_manage',
});

// Role → default permission table for a given canonical perm key. Mirrors
// `PERMISSION_KEYS[*].roleDefault` in `src/lib/permissions.js`. Used both
// to construct `staff_with_perm` / `staff_without_perm` callers and to
// drive the "expected" branch of the decision matrix.
const ROLE_RANK = { staff: 1, receptionist: 2, manager: 3, owner: 4 };
function defaultPermFor(role, canonicalKey) {
  // products_manage / sales_manage both default to manager+; the engine's
  // owner short-circuit is handled in `assertSalonAccess`, not here.
  if (canonicalKey === 'products_manage' || canonicalKey === 'sales_manage') {
    return (ROLE_RANK[role] || 0) >= ROLE_RANK.manager;
  }
  return false;
}

// ─── Generators ───────────────────────────────────────────────────────────

const SALON_ID_ARB = fc.integer({ min: 1, max: 1_000_000 });
const USER_ID_ARB = fc.integer({ min: 1, max: 1_000_000 });

// `resolvePermission` short-circuits to `true` for the `'owner'` role
// regardless of any custom override. The "staff_with_perm" /
// "staff_without_perm" scenarios depend on the engine actually consulting
// the override, so we restrict synthesised staff records to non-owner
// roles. The salon-owner branch (different concept!) is exercised
// separately via `callerKind === 'owner'`.
const ROLE_ARB = fc.constantFrom('staff', 'receptionist', 'manager');

/**
 * A "callerKind" is the categorical input the matrix is keyed on. The
 * full caller record (session + DB rows) is materialised below.
 */
const CALLER_KIND_ARB = fc.constantFrom(
  'no_session',
  'admin',
  'owner',
  'staff_with_perm',
  'staff_without_perm',
  'no_staff_on_salon',
);

const PERM_ARB = fc.constantFrom(...MUTATING_PERMS);

/**
 * Build a caller scenario — `session`, the salon row to be returned by
 * `getOne` for the `FROM salons` query, and the staff row to be returned
 * by the `FROM staff` query. Returning the inputs verbatim lets the test
 * compute the expected matrix outcome alongside the actual one.
 */
const SCENARIO_ARB = fc
  .record({
    callerKind: CALLER_KIND_ARB,
    perm: PERM_ARB,
    salonId: SALON_ID_ARB,
    callerUserId: USER_ID_ARB,
    ownerUserId: USER_ID_ARB,
    staffRole: ROLE_ARB,
    customPerm: fc.option(fc.boolean(), { nil: undefined, freq: 2 }),
  })
  // Avoid accidental owner-collision when the caller is meant to be a
  // non-owner staff member — the matrix branches on owner first.
  .map((s) => {
    if (
      s.callerKind === 'staff_with_perm' ||
      s.callerKind === 'staff_without_perm' ||
      s.callerKind === 'no_staff_on_salon'
    ) {
      if (s.callerUserId === s.ownerUserId) {
        return { ...s, ownerUserId: s.ownerUserId + 1 };
      }
    }
    if (s.callerKind === 'owner') {
      return { ...s, ownerUserId: s.callerUserId };
    }
    return s;
  });

/**
 * Compute the expected outcome of `assertSalonAccess(scenario)` per the
 * decision matrix. Returns either `{ ok: true }` or
 * `{ ok: false, code, status }` exactly as the engine would.
 */
function expectedDecision(scenario) {
  const { callerKind, perm, staffRole, customPerm } = scenario;

  if (callerKind === 'no_session') {
    return { ok: false, code: 'UNAUTHORIZED', status: 401 };
  }
  if (callerKind === 'admin') {
    return { ok: true, status: 200 };
  }
  if (callerKind === 'owner') {
    return { ok: true, status: 200 };
  }

  // staff branches — owner short-circuit doesn't apply.
  if (callerKind === 'no_staff_on_salon') {
    return { ok: false, code: 'FORBIDDEN', status: 403 };
  }

  // staff_with_perm / staff_without_perm: build a synthetic staff row whose
  // resolved permission for `perm` matches the requested kind, then check
  // whether the engine resolves it true.
  const canonical = PERM_ALIAS[perm];
  const wantTrue = callerKind === 'staff_with_perm';
  // The custom override takes precedence if set; otherwise role default.
  const resolved =
    customPerm === true || customPerm === false
      ? customPerm
      : defaultPermFor(staffRole, canonical);

  // The scenario builder enforces an exact match below (see staffRowFor),
  // so we just translate the kind into the expected branch.
  if (wantTrue && resolved) return { ok: true, status: 200 };
  if (!wantTrue && !resolved) return { ok: false, code: 'FORBIDDEN', status: 403 };

  // The synthetic row didn't match the requested kind — the test arbitrary
  // adapts it via `staffRowFor` to keep a 1:1 mapping. We never hit this
  // branch in practice; expressing it makes the property total.
  return wantTrue
    ? { ok: true, status: 200 }
    : { ok: false, code: 'FORBIDDEN', status: 403 };
}

/**
 * Build the `staff` row the mocked `getOne` should return so the resolved
 * permission for `scenario.perm` matches `scenario.callerKind`. If the
 * caller kind is `no_staff_on_salon`, returns `null` (no row).
 */
function staffRowFor(scenario) {
  const { callerKind, perm, staffRole, customPerm } = scenario;
  if (
    callerKind === 'no_session' ||
    callerKind === 'admin' ||
    callerKind === 'owner' ||
    callerKind === 'no_staff_on_salon'
  ) {
    return null;
  }

  const canonical = PERM_ALIAS[perm];
  const wantTrue = callerKind === 'staff_with_perm';

  // Pick a custom override that forces the desired outcome regardless of
  // the role's default. This keeps the test arbitrary deterministic and
  // independent of role-default drift.
  const permissions = { [canonical]: wantTrue };

  // `staffRole` and `customPerm` from the scenario are kept as-is so the
  // engine still walks both branches of `resolvePermission`. We override
  // the canonical key with the deterministic value built above.
  return {
    id: 1,
    role: staffRole,
    permissions: { ...(typeof customPerm === 'boolean' ? { [canonical]: customPerm } : {}), ...permissions },
  };
}

/**
 * Configure `getOneMock` to answer the two queries `assertSalonAccess`
 * issues. The dispatcher matches on the SQL fragment so the order of the
 * underlying SQL doesn't have to be hardcoded.
 */
function mockDbForScenario(scenario) {
  const salonRow = { owner_id: scenario.ownerUserId };
  const staffRow = staffRowFor(scenario);

  getOneMock.mockImplementation(async (sql) => {
    if (typeof sql === 'string' && sql.includes('FROM salons')) {
      return salonRow;
    }
    if (typeof sql === 'string' && sql.includes('FROM staff')) {
      return staffRow;
    }
    return null;
  });
}

/**
 * Materialise the session object for the scenario.
 */
function sessionFor(scenario) {
  const { callerKind, callerUserId } = scenario;
  if (callerKind === 'no_session') return null;
  if (callerKind === 'admin') return { userId: callerUserId, role: 'admin' };
  return { userId: callerUserId, role: 'user' };
}

// ─── Reset between tests ──────────────────────────────────────────────────

beforeEach(() => {
  queryMock.mockReset();
  getOneMock.mockReset();
  transactionMock.mockReset();
  requireAuthMock.mockReset();
  getSessionMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────
// Part A — Decision matrix property
// Validates: Requirements 2.1, 2.2, 2.4, 2.5, 6.6, 15.1, 15.2
// ─────────────────────────────────────────────────────────────────────────

describe('Property 2 — assertSalonAccess decision matrix is total and consistent', () => {
  const SEED = 0xA21_B12; // pinned for reproducible CI runs

  it('every (callerKind × perm) combination matches the documented matrix', async () => {
    await fc.assert(
      fc.asyncProperty(SCENARIO_ARB, async (scenario) => {
        getOneMock.mockReset();
        mockDbForScenario(scenario);

        const session = sessionFor(scenario);
        const result = await assertSalonAccess({
          session,
          salonId: scenario.salonId,
          perm: scenario.perm,
        });

        const expected = expectedDecision(scenario);

        // We only assert the parts of the response the matrix pins down.
        // Extra ok-path fields (role / salonId) are inspected separately.
        expect(result.ok).toBe(expected.ok);
        expect(result.status).toBe(expected.status);
        if (!expected.ok) {
          expect(result.code).toBe(expected.code);
        }
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('admin bypasses every salon check and never reads from the database', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          salonId: fc.option(SALON_ID_ARB, { nil: null, freq: 2 }),
          perm: PERM_ARB,
          userId: USER_ID_ARB,
        }),
        async ({ salonId, perm, userId }) => {
          getOneMock.mockReset();
          // Admin shouldn't touch `getOne` at all — leaving the mock
          // unprimed and asserting it stays untouched is the test.
          const result = await assertSalonAccess({
            session: { userId, role: 'admin' },
            salonId,
            perm,
          });

          expect(result).toEqual({
            ok: true,
            status: 200,
            role: 'admin',
            salonId: salonId == null ? null : Number(salonId),
          });
          expect(getOneMock).not.toHaveBeenCalled();
        },
      ),
      { seed: SEED, numRuns: 50 },
    );
  });

  it('owner of the salon is allowed regardless of perm', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          salonId: SALON_ID_ARB,
          perm: PERM_ARB,
          userId: USER_ID_ARB,
        }),
        async ({ salonId, perm, userId }) => {
          getOneMock.mockReset();
          // Salon owner_id matches the caller. No staff row needed.
          getOneMock.mockImplementation(async (sql) => {
            if (sql.includes('FROM salons')) return { owner_id: userId };
            return null;
          });

          const result = await assertSalonAccess({
            session: { userId, role: 'user' },
            salonId,
            perm,
          });

          expect(result.ok).toBe(true);
          expect(result.status).toBe(200);
          expect(result.role).toBe('owner');
        },
      ),
      { seed: SEED, numRuns: 50 },
    );
  });

  it('alias keys "products.manage" and "sales.manage" resolve identically to their canonical forms', async () => {
    // For every caller kind that exercises the staff branch, the dotted
    // alias and the canonical underscore key MUST yield the same decision.
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          callerKind: fc.constantFrom('staff_with_perm', 'staff_without_perm'),
          salonId: SALON_ID_ARB,
          callerUserId: USER_ID_ARB,
          ownerUserId: USER_ID_ARB,
          staffRole: ROLE_ARB,
          family: fc.constantFrom('products', 'sales'),
        }),
        async ({ callerKind, salonId, callerUserId, ownerUserId, staffRole, family }) => {
          if (callerUserId === ownerUserId) ownerUserId = ownerUserId + 1;

          const dotted = `${family}.manage`;
          const canonical = `${family}_manage`;

          const scenarioBase = {
            callerKind,
            salonId,
            callerUserId,
            ownerUserId,
            staffRole,
            customPerm: undefined,
          };

          // Run with the dotted alias.
          getOneMock.mockReset();
          mockDbForScenario({ ...scenarioBase, perm: dotted });
          const r1 = await assertSalonAccess({
            session: { userId: callerUserId, role: 'user' },
            salonId,
            perm: dotted,
          });

          // Run with the canonical key.
          getOneMock.mockReset();
          mockDbForScenario({ ...scenarioBase, perm: canonical });
          const r2 = await assertSalonAccess({
            session: { userId: callerUserId, role: 'user' },
            salonId,
            perm: canonical,
          });

          expect(r1.ok).toBe(r2.ok);
          expect(r1.status).toBe(r2.status);
          expect(r1.code).toBe(r2.code);
        },
      ),
      { seed: SEED, numRuns: 60 },
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Part B — No-write-on-denial property
// Validates: Requirements 2.4, 2.5, 4.3, 14.9, 15.3
//
// For every mutating endpoint and every denial scenario, the route MUST
// reject the call without issuing an INSERT/UPDATE/DELETE. We assert this
// by checking that:
//   - `transaction()` was never invoked (the wrapper for every multi-step
//     mutation), AND
//   - no `query()` call carried a SQL fragment matching INSERT/UPDATE/
//     DELETE (single-statement mutations like the products PUT/DELETE).
// ─────────────────────────────────────────────────────────────────────────

const WRITE_SQL_RE = /^\s*(INSERT|UPDATE|DELETE)\b/i;

function noWritesIssued() {
  // No transactional mutation
  if (transactionMock.mock.calls.length !== 0) return false;
  // No raw INSERT/UPDATE/DELETE through `query()`
  for (const call of queryMock.mock.calls) {
    const sql = call[0];
    if (typeof sql === 'string' && WRITE_SQL_RE.test(sql)) return false;
  }
  return true;
}

/**
 * Each entry below describes one mutating endpoint:
 *   - `name` — human-readable label for failure messages
 *   - `perm` — the perm key the route passes to `assertSalonAccess`
 *   - `invoke({ session, productId, salonId, body })` — call the handler
 *     with a representative request and return the `Response`
 *
 * The handler is responsible for issuing zero writes when authorization
 * fails. The harness provides the fixture: a known product/category/payment
 * row that resolves to `salonId`, a body that would otherwise pass
 * validation, and a session driven by the scenario.
 *
 * Note: `POST /api/products` is intentionally NOT in this list. Per the
 * route's own comment, that endpoint is a carry-over from the pre-spec
 * implementation that uses an inline `checkSalonAccess` helper rather
 * than the `assertSalonAccess` engine — its full refactor is tracked
 * separately. Property 2 in this file pins down the engine's contract;
 * the listing-level implementation parity is enforced by integration
 * tests once the refactor lands.
 */
const ENDPOINTS = [
  {
    name: 'PUT /api/products/[id]',
    perm: 'products.manage',
    async invoke({ session, productId, salonId, body }) {
      requireAuthMock.mockImplementation(async () => {
        if (!session) throw new Error('Unauthorized');
        return session;
      });
      const req = new Request(`http://localhost/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || { name: 'Updated', price: 2 }),
      });
      return productItemRoute.PUT(req, { params: Promise.resolve({ productId: String(productId) }) });
    },
  },
  {
    name: 'DELETE /api/products/[id]',
    perm: 'products.manage',
    async invoke({ session, productId }) {
      requireAuthMock.mockImplementation(async () => {
        if (!session) throw new Error('Unauthorized');
        return session;
      });
      const req = new Request(`http://localhost/api/products/${productId}`, {
        method: 'DELETE',
      });
      return productItemRoute.DELETE(req, { params: Promise.resolve({ productId: String(productId) }) });
    },
  },
  {
    name: 'PUT /api/products/[id]/stock',
    perm: 'products.manage',
    async invoke({ session, productId, body }) {
      requireAuthMock.mockImplementation(async () => {
        if (!session) throw new Error('Unauthorized');
        return session;
      });
      const req = new Request(`http://localhost/api/products/${productId}/stock`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || { mode: 'set', quantity: 5, reason_code: 'manual_set' }),
      });
      return stockRoute.PUT(req, { params: Promise.resolve({ productId: String(productId) }) });
    },
  },
  {
    name: 'POST /api/product-categories',
    perm: 'products_manage',
    async invoke({ session, salonId, body }) {
      requireAuthMock.mockImplementation(async () => {
        if (!session) throw new Error('Unauthorized');
        return session;
      });
      const req = new Request('http://localhost/api/product-categories', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || { salon_id: salonId, name: 'New Category' }),
      });
      return categoriesRoute.POST(req);
    },
  },
  {
    name: 'PUT /api/product-categories/[id]',
    perm: 'products_manage',
    async invoke({ session, productId: categoryId, body }) {
      getSessionMock.mockResolvedValue(session);
      const req = new Request(`http://localhost/api/product-categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || { name: 'Renamed' }),
      });
      return categoryItemRoute.PUT(req, { params: Promise.resolve({ id: String(categoryId) }) });
    },
  },
  {
    name: 'DELETE /api/product-categories/[id]',
    perm: 'products_manage',
    async invoke({ session, productId: categoryId }) {
      getSessionMock.mockResolvedValue(session);
      const req = new Request(`http://localhost/api/product-categories/${categoryId}`, {
        method: 'DELETE',
      });
      return categoryItemRoute.DELETE(req, { params: Promise.resolve({ id: String(categoryId) }) });
    },
  },
  {
    name: 'POST /api/checkout/refund',
    perm: 'sales_manage',
    async invoke({ session, body }) {
      getSessionMock.mockResolvedValue(session);
      const req = new Request('http://localhost/api/checkout/refund', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || { paymentId: 1, amount: 1.0, reason: 'duplicate' }),
      });
      return refundRoute.POST(req);
    },
  },
];

/**
 * Configure the mocked DB to return:
 *   - The product/category/payment row at id `RESOURCE_ID` belongs to
 *     `salonId` (so the route locates it before authorising).
 *   - The salon's owner is `ownerUserId` (so `assertSalonAccess` can
 *     compute the owner branch).
 *   - The staff lookup returns the row from `staffRowFor(scenario)` so
 *     the staff branch resolves the perm correctly.
 *
 * `transaction()` is never primed — the property asserts it is never
 * called on denial paths. (If a test reaches the happy path it would
 * blow up inside the mock; that's the property in action.)
 */
const RESOURCE_ID = 4242;

function mockDbForRouteScenario(scenario) {
  getOneMock.mockReset();
  queryMock.mockReset();
  transactionMock.mockReset();

  const salonRow = { owner_id: scenario.ownerUserId };
  const staffRow = staffRowFor(scenario);

  getOneMock.mockImplementation(async (sql) => {
    // Salon ownership lookup (assertSalonAccess)
    if (sql.includes('FROM salons')) return salonRow;
    // Staff record lookup (assertSalonAccess)
    if (sql.includes('FROM staff')) return staffRow;
    // Product / category / payment lookup performed by the routes
    // before authorisation. We always pretend the resource exists and
    // belongs to the scenario's salon so the route reaches the authz
    // branch (rather than short-circuiting on "not found").
    if (sql.includes('FROM products')) {
      return {
        id: RESOURCE_ID,
        salon_id: scenario.salonId,
        deleted_at: null,
        stock_quantity: 10,
      };
    }
    if (sql.includes('FROM product_categories')) {
      return {
        id: RESOURCE_ID,
        salon_id: scenario.salonId,
        name: 'Existing',
        display_order: 0,
        deleted_at: null,
      };
    }
    if (sql.includes('FROM payments')) {
      return {
        id: RESOURCE_ID,
        booking_id: 1,
        salon_id: scenario.salonId,
        amount: 100,
        refunded_amount: 0,
        status: 'paid',
        stripe_payment_id: null,
        client_id: null,
      };
    }
    return null;
  });

  // Most route handlers call `query()` only for write paths (which we
  // expect not to fire on denial). A few (e.g. legacy POST /api/products)
  // do an extra read; default to a benign empty result so the read
  // itself doesn't crash if it slips past authz on the happy path.
  queryMock.mockResolvedValue([]);
}

// ─── Build the denial-only scenario arbitrary ────────────────────────────

const DENIAL_KIND_ARB = fc.constantFrom(
  'no_session',
  'staff_without_perm',
  'no_staff_on_salon',
);

const DENIAL_SCENARIO_ARB = fc
  .record({
    callerKind: DENIAL_KIND_ARB,
    salonId: SALON_ID_ARB,
    callerUserId: USER_ID_ARB,
    ownerUserId: USER_ID_ARB,
    staffRole: ROLE_ARB,
    customPerm: fc.option(fc.boolean(), { nil: undefined, freq: 2 }),
  })
  .map((s) => {
    // Owner-collision avoidance — denial scenarios must not land on the
    // owner branch.
    if (s.callerUserId === s.ownerUserId) {
      return { ...s, ownerUserId: s.ownerUserId + 1 };
    }
    return s;
  });

describe('Property 2 — mutating endpoints issue zero DB writes on denial paths', () => {
  const SEED = 0xA22_C99; // pinned for reproducible CI runs

  for (const endpoint of ENDPOINTS) {
    it(`${endpoint.name}: every denial scenario produces no INSERT/UPDATE/DELETE`, async () => {
      await fc.assert(
        fc.asyncProperty(DENIAL_SCENARIO_ARB, async (raw) => {
          // Bind the perm key from the endpoint into the scenario so
          // `staffRowFor` can build the correct synthetic staff row.
          const scenario = { ...raw, perm: endpoint.perm };
          mockDbForRouteScenario(scenario);

          const session = sessionFor(scenario);

          let res;
          try {
            res = await endpoint.invoke({
              session,
              salonId: scenario.salonId,
              productId: RESOURCE_ID,
            });
          } catch (err) {
            // The route handler may throw on `requireAuth()` for the
            // `no_session` branch, depending on how it surfaces it.
            // The contract here is "no DB writes on denial", which is
            // strictly preserved when the handler throws before doing
            // any work — so an exception is also acceptable. We only
            // assert "no writes were issued" below.
            res = null;
          }

          // The decision is denial — the route MUST NOT issue any DB
          // write regardless of how it surfaces the rejection (the design
          // permits 401 / 403 / 404 collapsing for cross-salon parity).
          // The status code itself is pinned by Part A's matrix property
          // and the route-level integration tests; here we focus on the
          // structural side-effect-freeness called out by Requirements
          // 14.9 and 15.3.
          void res;
          expect(noWritesIssued()).toBe(true);
        }),
        { seed: SEED, numRuns: 40 },
      );
    });
  }

  it('no_session denial: every endpoint short-circuits before any DB write or transaction', async () => {
    // Pinned table for the unauthenticated branch — exhaustive over the
    // endpoint set so a regression in any single route is caught quickly.
    for (const endpoint of ENDPOINTS) {
      mockDbForRouteScenario({
        callerKind: 'no_session',
        salonId: 7,
        callerUserId: 1,
        ownerUserId: 2,
        staffRole: 'manager',
        customPerm: undefined,
        perm: endpoint.perm,
      });

      let res;
      try {
        res = await endpoint.invoke({
          session: null,
          salonId: 7,
          productId: RESOURCE_ID,
        });
      } catch {
        res = null;
      }

      // The handler must have rejected without writing. Status pinning
      // belongs to the integration tests + Part A's matrix property; the
      // structural invariant is "no INSERT/UPDATE/DELETE issued".
      void res;
      expect(noWritesIssued()).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Pinned decision-table self-test
// Catches regressions where a refactor accidentally changes the matrix.
// ─────────────────────────────────────────────────────────────────────────

describe('Property 2 — pinned decision table (drift guard)', () => {
  const cases = [
    // [callerKind,            perm,                expected]
    ['no_session',             'products.manage',   { ok: false, status: 401, code: 'UNAUTHORIZED' }],
    ['no_session',             'sales.manage',      { ok: false, status: 401, code: 'UNAUTHORIZED' }],
    ['admin',                  'products.manage',   { ok: true,  status: 200 }],
    ['admin',                  'sales_manage',      { ok: true,  status: 200 }],
    ['owner',                  'products_manage',   { ok: true,  status: 200 }],
    ['owner',                  'sales.manage',      { ok: true,  status: 200 }],
    ['staff_with_perm',        'products.manage',   { ok: true,  status: 200 }],
    ['staff_with_perm',        'sales.manage',      { ok: true,  status: 200 }],
    ['staff_without_perm',     'products.manage',   { ok: false, status: 403, code: 'FORBIDDEN' }],
    ['staff_without_perm',     'sales.manage',      { ok: false, status: 403, code: 'FORBIDDEN' }],
    ['no_staff_on_salon',      'products_manage',   { ok: false, status: 403, code: 'FORBIDDEN' }],
    ['no_staff_on_salon',      'sales_manage',      { ok: false, status: 403, code: 'FORBIDDEN' }],
  ];

  it.each(cases)('caller=%s perm=%s → %j', async (callerKind, perm, expected) => {
    const scenario = {
      callerKind,
      perm,
      salonId: 100,
      callerUserId: 10,
      ownerUserId: callerKind === 'owner' ? 10 : 20,
      staffRole: 'manager',
      customPerm: undefined,
    };

    getOneMock.mockReset();
    mockDbForScenario(scenario);

    const result = await assertSalonAccess({
      session: sessionFor(scenario),
      salonId: scenario.salonId,
      perm,
    });

    expect(result.ok).toBe(expected.ok);
    expect(result.status).toBe(expected.status);
    if (!expected.ok) {
      expect(result.code).toBe(expected.code);
    }
  });
});
