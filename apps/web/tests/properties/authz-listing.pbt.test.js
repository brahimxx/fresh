// Feature: products-and-sales-improvements
// Task: 9.1 PBT for read-endpoint authorization decision is total and consistent
//
// Property 1: Authorization decision is total and consistent for read endpoints
//
// **Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 4.3, 6.6, 9.2, 10.2,
//              10.3, 16.2, 17.5, 17.8**
//
// Every read endpoint in the products / sales surface (`/api/products`,
// `/api/products/stats`, `/api/products/export.csv`, `/api/products/[id]/stock`,
// `/api/product-categories`, `/api/payments`, `/api/payments/[id]`,
// `/api/payments/daily-totals`, `/api/payments/export.csv`) funnels its
// authorization decision through the *same* helper —
// `assertSalonAccess({ session, salonId, perm })` in `@/lib/permissions.js`.
// The PBT therefore exercises the helper directly so we get cross-endpoint
// consistency by construction: if `assertSalonAccess` is total and matches
// the documented matrix on every input, then so is every endpoint that
// dispatches to it.
//
// Approach (per the task brief):
//   - **Use the actual `assertSalonAccess`** — it is the single source of
//     truth.
//   - **Mock only `getOne`** so we can drive the salon / staff lookup table
//     deterministically from the generators.
//   - fast-check generates:
//       * caller     — { session: null | admin | owner | staff with custom
//                        permission combos | non-staff non-owner }
//       * endpoint   — one of the read endpoints, each mapped to its
//                      documented `perm` key (`'products'` or `'sales'`)
//       * salonId    — well-formed integers and an explicit pool of malformed
//                      values, exercising both happy and rejection paths
//   - Assert the response code / shape matches the documented decision
//     matrix (401 / 400 / 200 / 403) AND that the returned `access.salonId`
//     scope is permitted (admins may receive `null` for cross-salon listings;
//     every other allow-path is bound to the specific salon the caller
//     requested, never another).
//
// Decision matrix (mirrors `assertSalonAccess` JSDoc and design.md
// "Authorization model"):
//
//   No session                                                 → 401 UNAUTHORIZED
//   Session, admin                                             → 200 ALLOWED  (regardless of salon_id; admin sees cross-salon when null)
//   Session, non-admin, missing salon_id                       → 400 MISSING_SALON_ID
//   Session, non-admin, malformed salon_id                     → 400 INVALID_SALON_ID
//   Session, non-admin, salon_id does not resolve to a salon   → 400 INVALID_SALON_ID
//   Session, owns the resource salon                           → 200 ALLOWED  (role='owner')
//   Session, has Active_Staff_Record AND `perm` resolves true  → 200 ALLOWED  (role=staff role)
//   Session, has Active_Staff_Record but `perm` resolves false → 403 FORBIDDEN
//   Session, no Active_Staff_Record on resource salon          → 403 FORBIDDEN

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';

import {
  customPermissionsArb,
  PERMISSION_KEYS,
  STAFF_ROLES,
} from './_arbitraries.js';

// ─── Mock the DB layer the helper consults ────────────────────────────────
//
// `assertSalonAccess` issues at most two queries through `getOne`:
//
//   1. SELECT owner_id FROM salons WHERE id = ? AND deleted_at IS NULL
//   2. SELECT id, role, permissions FROM staff
//        WHERE salon_id = ? AND user_id = ? AND is_active = 1
//
// We dispatch off the SQL fragment so the mock stays decoupled from any
// formatting drift in the helper. The current scenario's salon / staff
// rows live in `currentScenario` and are swapped per fc-invocation.
const getOneMock = vi.fn();
vi.mock('@/lib/db', () => ({
  getOne: (...args) => getOneMock(...args),
}));

// Re-import after mock registration. Both `@/lib/db` and the relative
// `./db.js` import inside `permissions.js` resolve to the same module
// file, so the mock is picked up by the source under test.
const { assertSalonAccess, resolvePermission } = await import('@/lib/permissions');

// ─── Test scenario state (driven by the generator each iteration) ─────────

let currentScenario = null;

beforeEach(() => {
  getOneMock.mockReset();
  // Default implementation routes lookups to the active scenario; per-test
  // properties below set `currentScenario` before each `assertSalonAccess`
  // call.
  getOneMock.mockImplementation(async (sql, params) => {
    if (typeof sql !== 'string' || !currentScenario) return null;
    if (sql.includes('FROM salons')) {
      // The helper passes `[resolvedSalonId]`; the scenario already has
      // the salon row keyed by id, but we don't need the param for the
      // matrix tests — return the configured salon row when present.
      return currentScenario.salonRow ?? null;
    }
    if (sql.includes('FROM staff')) {
      // The helper passes `[salonId, userId]`. Return the configured
      // staff row when the requesting user matches; otherwise no match.
      const [salonId, userId] = params || [];
      if (
        currentScenario.staffRow &&
        currentScenario.staffRow.user_id === userId &&
        currentScenario.staffRow.salon_id === salonId &&
        currentScenario.staffRow.is_active !== 0
      ) {
        // Strip the synthetic match keys before returning — the real
        // SQL projects only `id, role, permissions`.
        const { user_id, salon_id, is_active, ...projected } = currentScenario.staffRow;
        return projected;
      }
      return null;
    }
    return null;
  });
});

// ─── Endpoint catalogue ───────────────────────────────────────────────────
//
// Every read endpoint that funnels through `assertSalonAccess` for its
// authorization decision. The `perm` column is the key the route handler
// passes; the matrix is otherwise identical across endpoints.
//
// Sources (kept in sync with the route handlers — task references in
// parens):
//   - /api/products listing                 (task 5.1, perm 'products')
//   - /api/products/stats                   (task 5.3, perm 'products')
//   - /api/products/export.csv              (task 5.4, perm 'products')
//   - /api/products/[id]/stock GET history  (task 3.1, perm 'products')
//   - /api/product-categories list          (task 4.1, perm 'products')
//   - /api/payments listing                 (task 6.1, perm 'sales')
//   - /api/payments/[id] detail             (task 6.2, perm 'sales')
//   - /api/payments/daily-totals            (task 6.3, perm 'sales')
//   - /api/payments/export.csv              (task 6.4, perm 'sales')
const READ_ENDPOINTS = Object.freeze([
  { name: 'products.list', perm: 'products' },
  { name: 'products.stats', perm: 'products' },
  { name: 'products.export', perm: 'products' },
  { name: 'products.stock.history', perm: 'products' },
  { name: 'product_categories.list', perm: 'products' },
  { name: 'payments.list', perm: 'sales' },
  { name: 'payments.detail', perm: 'sales' },
  { name: 'payments.daily_totals', perm: 'sales' },
  { name: 'payments.export', perm: 'sales' },
]);

const endpointArb = fc.constantFrom(...READ_ENDPOINTS);

// ─── Reference decision (mirrors the matrix in JSDoc) ─────────────────────
//
// Pure function with no side effects; takes the same DB rows the mock
// returns. Used as the executable spec of the matrix — the test asserts
// `assertSalonAccess` agrees with this reference for every generated
// input.
function normaliseSalonIdRef(raw) {
  if (raw === null || raw === undefined || raw === '') {
    return { code: 'MISSING_SALON_ID' };
  }
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber)) {
    return { code: 'INVALID_SALON_ID' };
  }
  if (asNumber <= 0 || asNumber > Number.MAX_SAFE_INTEGER) {
    return { code: 'INVALID_SALON_ID' };
  }
  if (typeof raw === 'string' && String(asNumber) !== raw.trim()) {
    return { code: 'INVALID_SALON_ID' };
  }
  return { id: asNumber };
}

function parsePermissionsRef(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

function expectedDecision({ session, salonId, perm, salonRow, staffRow }) {
  // 1. No session → 401.
  if (!session || !session.userId) {
    return { ok: false, code: 'UNAUTHORIZED', status: 401 };
  }
  // 2. Admin bypass.
  if (session.role === 'admin') {
    return {
      ok: true,
      status: 200,
      role: 'admin',
      salonId: salonId == null ? null : Number(salonId),
    };
  }
  // 3. Salon id well-formedness.
  const norm = normaliseSalonIdRef(salonId);
  if (norm.code) return { ok: false, code: norm.code, status: 400 };
  // 4. Salon must exist.
  if (!salonRow) return { ok: false, code: 'INVALID_SALON_ID', status: 400 };
  // 5. Owner short-circuit.
  if (salonRow.owner_id === session.userId) {
    return { ok: true, status: 200, role: 'owner', salonId: norm.id };
  }
  // 6. Active staff record required.
  // The mock returns null when the staff row's salon/user don't match the
  // resolved request; the reference uses the same gate.
  const matches =
    staffRow &&
    staffRow.user_id === session.userId &&
    staffRow.salon_id === norm.id &&
    staffRow.is_active !== 0;
  if (!matches) return { ok: false, code: 'FORBIDDEN', status: 403 };
  // 7. Permission gate.
  if (perm) {
    const allowed = resolvePermission(
      staffRow.role,
      parsePermissionsRef(staffRow.permissions),
      perm,
    );
    if (!allowed) return { ok: false, code: 'FORBIDDEN', status: 403 };
  }
  return { ok: true, status: 200, role: staffRow.role, salonId: norm.id };
}

// ─── Generators ───────────────────────────────────────────────────────────

const userIdArb = fc.integer({ min: 1, max: 1_000_000 });
const salonIdArb = fc.integer({ min: 1, max: 1_000_000 });

/**
 * Malformed salonId values that exercise the 400 paths. Includes the
 * "missing" representations (null / undefined / empty string) and the
 * "invalid" representations (NaN, negative, fractional, non-numeric, …).
 */
const malformedSalonIdArb = fc.constantFrom(
  null,
  undefined,
  '',
  '   ',
  'abc',
  '12abc',
  '12.5',
  -1,
  0,
  1.5,
  NaN,
  Infinity,
  -Infinity,
);

/**
 * Build the four caller archetypes plus a randomised "non-admin" branch
 * with sub-archetypes for owner / staff / no-staff. Each emits a fully
 * formed scenario that the test sets as `currentScenario`.
 *
 * Scenario shape:
 *   {
 *     callerKind: string,        // tag for shrinking + assertions
 *     session,                   // null | { userId, role, ... }
 *     salonRow: { owner_id } | null,
 *     staffRow: { user_id, salon_id, is_active, role, permissions } | null,
 *     resolvedSalonId: number,   // the salon whose access is being tested
 *   }
 */

// --- Caller A: no session ------------------------------------------------
const noSessionScenarioArb = fc.record({
  callerKind: fc.constant('noSession'),
  session: fc.constant(null),
  salonRow: fc.constant(null),
  staffRow: fc.constant(null),
  resolvedSalonId: salonIdArb,
});

// --- Caller B: admin ------------------------------------------------------
//
// Admin bypasses the salon/staff lookup entirely; the row mocks will
// never be consulted. We still seed them so the scenario shape is uniform.
const adminScenarioArb = fc
  .tuple(userIdArb, salonIdArb)
  .map(([userId, salonId]) => ({
    callerKind: 'admin',
    session: { userId, role: 'admin' },
    salonRow: { owner_id: userId + 99 }, // deliberately not the admin
    staffRow: null,
    resolvedSalonId: salonId,
  }));

// --- Caller C: salon owner -----------------------------------------------
const ownerScenarioArb = fc
  .tuple(userIdArb, salonIdArb)
  .map(([userId, salonId]) => ({
    callerKind: 'owner',
    session: { userId, role: 'user' },
    salonRow: { owner_id: userId },
    staffRow: null,
    resolvedSalonId: salonId,
  }));

// --- Caller D: staff with custom permission combos -----------------------
//
// Owner is a different user; the caller has an Active_Staff_Record on the
// resolved salon with a generated role and permissions object. Permissions
// may grant or deny `products` / `sales` so both 200 and 403 paths are
// reachable from this archetype.
const staffScenarioArb = fc
  .tuple(
    userIdArb,
    salonIdArb,
    fc.constantFrom(...STAFF_ROLES.filter((r) => r !== 'owner')),
    customPermissionsArb,
  )
  .map(([userId, salonId, role, permissions]) => ({
    callerKind: 'staff',
    session: { userId, role: 'user' },
    salonRow: { owner_id: userId + 1 }, // someone else owns the salon
    staffRow: {
      user_id: userId,
      salon_id: salonId,
      is_active: 1,
      role,
      permissions,
    },
    resolvedSalonId: salonId,
  }));

// --- Caller E: authenticated, but no Active_Staff_Record on this salon ---
//
// Session present, salon exists, the caller is neither owner nor staff
// (or the staff record is on a different salon / inactive — modelled by
// returning null from the staff lookup).
const noStaffScenarioArb = fc
  .tuple(userIdArb, salonIdArb)
  .map(([userId, salonId]) => ({
    callerKind: 'noStaff',
    session: { userId, role: 'user' },
    salonRow: { owner_id: userId + 1 },
    staffRow: null,
    resolvedSalonId: salonId,
  }));

// --- Caller F: authenticated, but the salon does not exist ---------------
const unknownSalonScenarioArb = fc
  .tuple(userIdArb, salonIdArb)
  .map(([userId, salonId]) => ({
    callerKind: 'unknownSalon',
    session: { userId, role: 'user' },
    salonRow: null, // SELECT FROM salons returns no row
    staffRow: null,
    resolvedSalonId: salonId,
  }));

const wellFormedScenarioArb = fc.oneof(
  { weight: 1, arbitrary: noSessionScenarioArb },
  { weight: 2, arbitrary: adminScenarioArb },
  { weight: 2, arbitrary: ownerScenarioArb },
  { weight: 4, arbitrary: staffScenarioArb },
  { weight: 1, arbitrary: noStaffScenarioArb },
  { weight: 1, arbitrary: unknownSalonScenarioArb },
);

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Run `assertSalonAccess` against a scenario, returning the raw decision. */
async function callUnderTest({ scenario, salonIdArg, perm }) {
  currentScenario = scenario;
  return assertSalonAccess({ session: scenario.session, salonId: salonIdArg, perm });
}

const SEED = 0xA47A_215; // deterministic CI seed (AuTh-Listing)

// ─── Properties ───────────────────────────────────────────────────────────

describe('Property 1 — read-endpoint authorization is total and consistent', () => {
  // ──────────────────────────────────────────────────────────────────────
  // 1. Totality + matrix consistency on the well-formed-input branch.
  //    For every (caller, endpoint, well-formed salonId) input,
  //    `assertSalonAccess` produces a decision in the documented
  //    vocabulary that matches the reference.
  // ──────────────────────────────────────────────────────────────────────

  it('returns a well-typed decision for every (caller, endpoint) pair (totality)', async () => {
    await fc.assert(
      fc.asyncProperty(
        wellFormedScenarioArb,
        endpointArb,
        async (scenario, endpoint) => {
          const got = await callUnderTest({
            scenario,
            salonIdArg: scenario.resolvedSalonId,
            perm: endpoint.perm,
          });
          // Decision is total: returns an object with a known `ok`
          // boolean and either a 200 status (allow) or one of the
          // documented codes (deny).
          expect(typeof got).toBe('object');
          expect(typeof got.ok).toBe('boolean');
          if (got.ok) {
            expect(got.status).toBe(200);
            expect(typeof got.role).toBe('string');
            // Allowed callers have either a numeric salon scope or null
            // (admin cross-salon listing).
            expect(
              got.salonId === null || Number.isInteger(got.salonId),
            ).toBe(true);
          } else {
            expect([
              'UNAUTHORIZED',
              'MISSING_SALON_ID',
              'INVALID_SALON_ID',
              'FORBIDDEN',
            ]).toContain(got.code);
            expect([400, 401, 403]).toContain(got.status);
          }
        },
      ),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('matches the reference decision for every (caller, endpoint) pair', async () => {
    await fc.assert(
      fc.asyncProperty(
        wellFormedScenarioArb,
        endpointArb,
        async (scenario, endpoint) => {
          const expected = expectedDecision({
            session: scenario.session,
            salonId: scenario.resolvedSalonId,
            perm: endpoint.perm,
            salonRow: scenario.salonRow,
            staffRow: scenario.staffRow,
          });
          const got = await callUnderTest({
            scenario,
            salonIdArg: scenario.resolvedSalonId,
            perm: endpoint.perm,
          });
          expect(got).toEqual(expected);
        },
      ),
      { seed: SEED, numRuns: 300 },
    );
  });

  // ──────────────────────────────────────────────────────────────────────
  // 2. Salon scope: every allowed call returns a salonId scope that
  //    permits only data the caller is authorized for. Concretely:
  //      - admin can have salonId=null (cross-salon) or =requested
  //      - owner / staff are bound to the requested salonId; any
  //        downstream `WHERE salon_id = access.salonId` clause therefore
  //        scopes results to the caller's authorized salon (Reqs 1.4,
  //        10.2, 10.3, 16.2, 17.5, 17.8).
  // ──────────────────────────────────────────────────────────────────────

  it('every allowed decision binds salonId to the caller\'s authorized scope', async () => {
    await fc.assert(
      fc.asyncProperty(
        wellFormedScenarioArb,
        endpointArb,
        async (scenario, endpoint) => {
          const got = await callUnderTest({
            scenario,
            salonIdArg: scenario.resolvedSalonId,
            perm: endpoint.perm,
          });
          if (!got.ok) return; // denial paths assert nothing about scope
          if (got.role === 'admin') {
            // Admin scope: either the requested salon (when supplied)
            // or null (cross-salon listing). Both are acceptable.
            expect(
              got.salonId === null ||
                got.salonId === Number(scenario.resolvedSalonId),
            ).toBe(true);
          } else {
            // Non-admin: scope is exactly the requested salon. Any
            // downstream query of the form `WHERE salon_id = ?` bound
            // to `access.salonId` therefore returns rows only for the
            // authorized salon — never another tenant's data.
            expect(got.salonId).toBe(Number(scenario.resolvedSalonId));
          }
        },
      ),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('owner short-circuit does not require a staff lookup (DB call count check)', async () => {
    // Owners pass without a staff query (Reqs 1.4, 6.6). This pins the
    // optimisation so a future refactor cannot accidentally widen the
    // attack surface by issuing a staff query under owner role.
    await fc.assert(
      fc.asyncProperty(ownerScenarioArb, endpointArb, async (scenario, endpoint) => {
        getOneMock.mockClear();
        const got = await callUnderTest({
          scenario,
          salonIdArg: scenario.resolvedSalonId,
          perm: endpoint.perm,
        });
        expect(got.ok).toBe(true);
        expect(got.role).toBe('owner');
        // Exactly one DB call: the salon lookup. No staff lookup.
        expect(getOneMock).toHaveBeenCalledTimes(1);
        const sqls = getOneMock.mock.calls.map((c) => c[0]);
        expect(sqls.some((s) => typeof s === 'string' && s.includes('FROM salons'))).toBe(true);
        expect(sqls.some((s) => typeof s === 'string' && s.includes('FROM staff'))).toBe(false);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('admin bypass does not consult the database at all (Req 1.7)', async () => {
    // Admins are allowed regardless of salonId; the helper must not
    // perform any DB lookup on this branch.
    await fc.assert(
      fc.asyncProperty(adminScenarioArb, endpointArb, async (scenario, endpoint) => {
        getOneMock.mockClear();
        const got = await callUnderTest({
          scenario,
          salonIdArg: scenario.resolvedSalonId,
          perm: endpoint.perm,
        });
        expect(got).toEqual({
          ok: true,
          status: 200,
          role: 'admin',
          salonId: scenario.resolvedSalonId,
        });
        expect(getOneMock).not.toHaveBeenCalled();
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('admin without salon_id receives null scope (cross-salon listing, Req 1.7)', async () => {
    await fc.assert(
      fc.asyncProperty(adminScenarioArb, endpointArb, async (scenario, endpoint) => {
        currentScenario = scenario;
        const got = await assertSalonAccess({
          session: scenario.session,
          salonId: null,
          perm: endpoint.perm,
        });
        expect(got).toEqual({
          ok: true,
          status: 200,
          role: 'admin',
          salonId: null,
        });
      }),
      { seed: SEED, numRuns: 50 },
    );
  });

  // ──────────────────────────────────────────────────────────────────────
  // 3. No-session and malformed-salon-id branches are total: every shape
  //    of bad input maps to its documented 400/401 code without ever
  //    hitting the DB.
  // ──────────────────────────────────────────────────────────────────────

  it('no session always returns 401 UNAUTHORIZED with no DB calls (Req 1.1)', async () => {
    await fc.assert(
      fc.asyncProperty(
        endpointArb,
        // salonId can be anything — the helper short-circuits on session
        // before touching salonId.
        fc.oneof(salonIdArb, malformedSalonIdArb, fc.constant(null)),
        async (endpoint, salonId) => {
          getOneMock.mockClear();
          currentScenario = null;
          const got = await assertSalonAccess({
            session: null,
            salonId,
            perm: endpoint.perm,
          });
          expect(got).toEqual({ ok: false, code: 'UNAUTHORIZED', status: 401 });
          expect(getOneMock).not.toHaveBeenCalled();
        },
      ),
      { seed: SEED, numRuns: 100 },
    );
  });

  it('non-admin + malformed salonId always returns 400 with no DB calls (Reqs 1.6, 9.2, 10.5)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Authenticated non-admin caller (no salon row needed — we
        // expect the short-circuit to fire on salonId before any DB call).
        userIdArb,
        endpointArb,
        malformedSalonIdArb,
        async (userId, endpoint, badSalonId) => {
          getOneMock.mockClear();
          currentScenario = null;
          const got = await assertSalonAccess({
            session: { userId, role: 'user' },
            salonId: badSalonId,
            perm: endpoint.perm,
          });
          expect(got.ok).toBe(false);
          expect([400]).toContain(got.status);
          expect(['MISSING_SALON_ID', 'INVALID_SALON_ID']).toContain(got.code);
          // The helper must not consult the salons table when the input
          // is structurally malformed.
          expect(getOneMock).not.toHaveBeenCalled();
        },
      ),
      { seed: SEED, numRuns: 200 },
    );
  });

  it('non-admin + unknown salon returns 400 INVALID_SALON_ID after a single DB lookup', async () => {
    await fc.assert(
      fc.asyncProperty(unknownSalonScenarioArb, endpointArb, async (scenario, endpoint) => {
        getOneMock.mockClear();
        const got = await callUnderTest({
          scenario,
          salonIdArg: scenario.resolvedSalonId,
          perm: endpoint.perm,
        });
        expect(got).toEqual({ ok: false, code: 'INVALID_SALON_ID', status: 400 });
        // Exactly one DB call (the salon lookup). The staff lookup is
        // skipped because the salon doesn't exist.
        expect(getOneMock).toHaveBeenCalledTimes(1);
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  // ──────────────────────────────────────────────────────────────────────
  // 4. Staff-with-permission-combos branch: when role default + custom
  //    overrides resolve `true`, the call is allowed; when they resolve
  //    `false`, the call is denied. The combos are exhaustive over the
  //    PERMISSION_KEYS subset (`customPermissionsArb` already enumerates
  //    the override space).
  // ──────────────────────────────────────────────────────────────────────

  it('staff allow / deny tracks resolvePermission exactly (Reqs 4.3, 6.6, 9.2, 16.2, 17.5)', async () => {
    await fc.assert(
      fc.asyncProperty(staffScenarioArb, endpointArb, async (scenario, endpoint) => {
        const got = await callUnderTest({
          scenario,
          salonIdArg: scenario.resolvedSalonId,
          perm: endpoint.perm,
        });
        const allowed = resolvePermission(
          scenario.staffRow.role,
          parsePermissionsRef(scenario.staffRow.permissions),
          endpoint.perm,
        );
        if (allowed) {
          expect(got).toEqual({
            ok: true,
            status: 200,
            role: scenario.staffRow.role,
            salonId: scenario.resolvedSalonId,
          });
        } else {
          expect(got).toEqual({ ok: false, code: 'FORBIDDEN', status: 403 });
        }
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it('staff with no Active_Staff_Record on the salon → 403 FORBIDDEN', async () => {
    await fc.assert(
      fc.asyncProperty(noStaffScenarioArb, endpointArb, async (scenario, endpoint) => {
        const got = await callUnderTest({
          scenario,
          salonIdArg: scenario.resolvedSalonId,
          perm: endpoint.perm,
        });
        expect(got).toEqual({ ok: false, code: 'FORBIDDEN', status: 403 });
      }),
      { seed: SEED, numRuns: 100 },
    );
  });

  // ──────────────────────────────────────────────────────────────────────
  // 5. Cross-endpoint consistency: holding (caller, salon, salon-rows)
  //    fixed and varying only the endpoint's `perm`, the decision either
  //    stays the same (perm doesn't change resolution) or flips between
  //    allow and 403 — never to 401 or 400. This pins the invariant that
  //    different read endpoints share the same authentication / shape
  //    contract and only differ on the permission gate.
  // ──────────────────────────────────────────────────────────────────────

  it('varying only the endpoint perm never produces 401 or 400 differences', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Restrict to scenarios with a session and a well-formed salon
        // — the perm gate is the last decision so this is where it can
        // matter.
        fc.oneof(ownerScenarioArb, staffScenarioArb, noStaffScenarioArb, adminScenarioArb),
        async (scenario) => {
          currentScenario = scenario;
          const decisions = await Promise.all(
            READ_ENDPOINTS.map((ep) =>
              assertSalonAccess({
                session: scenario.session,
                salonId: scenario.resolvedSalonId,
                perm: ep.perm,
              }),
            ),
          );
          // No decision should be 401 or 400 — those are determined
          // before the perm gate and by construction we supplied a valid
          // session and salonId.
          for (const d of decisions) {
            expect(d.status).not.toBe(401);
            expect(d.status).not.toBe(400);
          }
          // All allow decisions in the same scenario must report the
          // same `salonId` scope and `role`.
          const allowed = decisions.filter((d) => d.ok);
          if (allowed.length > 1) {
            const first = allowed[0];
            for (const d of allowed) {
              expect(d.salonId).toBe(first.salonId);
              expect(d.role).toBe(first.role);
            }
          }
        },
      ),
      { seed: SEED, numRuns: 100 },
    );
  });
});

// ─── Pinned matrix table — drift detection ────────────────────────────────
//
// A small fixed table that pins the eight rows of the decision matrix.
// Property tests randomise the input space; the pinned table catches
// regressions that would shift a row from one cell to another.

describe('Property 1 — pinned decision matrix', () => {
  const SCENARIOS = [
    {
      label: 'no session → 401 UNAUTHORIZED',
      arrange: () => {
        currentScenario = null;
        return { session: null, salonId: 1 };
      },
      expected: { ok: false, code: 'UNAUTHORIZED', status: 401 },
    },
    {
      label: 'admin + salonId=null → 200 cross-salon scope',
      arrange: () => {
        currentScenario = null;
        return { session: { userId: 99, role: 'admin' }, salonId: null };
      },
      expected: { ok: true, status: 200, role: 'admin', salonId: null },
    },
    {
      label: 'admin + salonId=7 → 200 with salonId=7',
      arrange: () => {
        currentScenario = null;
        return { session: { userId: 99, role: 'admin' }, salonId: 7 };
      },
      expected: { ok: true, status: 200, role: 'admin', salonId: 7 },
    },
    {
      label: 'non-admin + missing salonId → 400 MISSING_SALON_ID',
      arrange: () => {
        currentScenario = null;
        return { session: { userId: 5, role: 'user' }, salonId: null };
      },
      expected: { ok: false, code: 'MISSING_SALON_ID', status: 400 },
    },
    {
      label: 'non-admin + malformed salonId → 400 INVALID_SALON_ID',
      arrange: () => {
        currentScenario = null;
        return { session: { userId: 5, role: 'user' }, salonId: 'abc' };
      },
      expected: { ok: false, code: 'INVALID_SALON_ID', status: 400 },
    },
    {
      label: 'salon owner → 200 role=owner',
      arrange: () => {
        currentScenario = {
          salonRow: { owner_id: 42 },
          staffRow: null,
        };
        return { session: { userId: 42, role: 'user' }, salonId: 1 };
      },
      expected: { ok: true, status: 200, role: 'owner', salonId: 1 },
    },
    {
      label: 'staff with role default true → 200 role=manager',
      arrange: () => {
        currentScenario = {
          salonRow: { owner_id: 100 },
          staffRow: {
            user_id: 7,
            salon_id: 1,
            is_active: 1,
            role: 'manager',
            permissions: null,
          },
        };
        return { session: { userId: 7, role: 'user' }, salonId: 1 };
      },
      expected: { ok: true, status: 200, role: 'manager', salonId: 1 },
      perm: 'products',
    },
    {
      label: 'staff with role default false → 403 FORBIDDEN',
      arrange: () => {
        currentScenario = {
          salonRow: { owner_id: 100 },
          staffRow: {
            user_id: 7,
            salon_id: 1,
            is_active: 1,
            role: 'staff',
            permissions: null,
          },
        };
        return { session: { userId: 7, role: 'user' }, salonId: 1 };
      },
      expected: { ok: false, code: 'FORBIDDEN', status: 403 },
      perm: 'products',
    },
    {
      label: 'staff with custom override → flips role default',
      arrange: () => {
        currentScenario = {
          salonRow: { owner_id: 100 },
          staffRow: {
            user_id: 7,
            salon_id: 1,
            is_active: 1,
            role: 'staff',
            permissions: { products: true },
          },
        };
        return { session: { userId: 7, role: 'user' }, salonId: 1 };
      },
      expected: { ok: true, status: 200, role: 'staff', salonId: 1 },
      perm: 'products',
    },
    {
      label: 'no Active_Staff_Record on salon → 403 FORBIDDEN',
      arrange: () => {
        currentScenario = {
          salonRow: { owner_id: 100 },
          staffRow: null,
        };
        return { session: { userId: 7, role: 'user' }, salonId: 1 };
      },
      expected: { ok: false, code: 'FORBIDDEN', status: 403 },
      perm: 'products',
    },
    {
      label: 'unknown salon → 400 INVALID_SALON_ID',
      arrange: () => {
        currentScenario = {
          salonRow: null,
          staffRow: null,
        };
        return { session: { userId: 7, role: 'user' }, salonId: 1 };
      },
      expected: { ok: false, code: 'INVALID_SALON_ID', status: 400 },
    },
  ];

  for (const sc of SCENARIOS) {
    it(sc.label, async () => {
      const args = sc.arrange();
      const got = await assertSalonAccess({ ...args, perm: sc.perm });
      expect(got).toEqual(sc.expected);
    });
  }
});
