/**
 * Unit tests for `src/lib/permissions.js`.
 *
 * Covers task 2.6:
 *   - `resolvePermission` alias map
 *       (`'products.manage'` → `'products_manage'`,
 *        `'sales.manage'` → `'sales_manage'`)
 *   - `assertSalonAccess` decision matrix
 *       admin / owner / staff with permission / staff without permission /
 *       no session / malformed salon_id / cross-salon
 *
 * Validates: Requirements 1.3, 1.4, 2.1, 2.2, 15.1, 15.2
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock the DB layer that `assertSalonAccess` consults ──────────────────
// `assertSalonAccess` issues two queries through `getOne`:
//   1. SELECT owner_id FROM salons WHERE id = ? AND deleted_at IS NULL
//   2. SELECT id, role, permissions FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1
// The mock dispatches off the SQL fragment so individual tests stay readable.
const getOneMock = vi.fn();
vi.mock('@/lib/db', () => ({
  getOne: (...args) => getOneMock(...args),
}));

// Re-import after mock registration. Because both `@/lib/db` and the relative
// `./db.js` import inside `permissions.js` resolve to the same module file,
// the mock is picked up by the source under test.
const {
  resolvePermission,
  assertSalonAccess,
  PERMISSION_KEYS,
} = await import('@/lib/permissions');

beforeEach(() => {
  getOneMock.mockReset();
});

/**
 * Helper: configure the `getOne` mock with the rows it should return for
 * the salon and staff lookups respectively. Either may be `null` to model
 * "row not found".
 */
function mockDb({ salonRow = null, staffRow = null } = {}) {
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

// ────────────────────────────────────────────────────────────────────────────
// resolvePermission — alias map
// ────────────────────────────────────────────────────────────────────────────

describe('resolvePermission alias map', () => {
  it('exposes the canonical underscore keys', () => {
    expect(PERMISSION_KEYS.products_manage).toBeDefined();
    expect(PERMISSION_KEYS.sales_manage).toBeDefined();
  });

  describe('"products.manage" → "products_manage"', () => {
    it('returns true for the manager role default', () => {
      expect(resolvePermission('manager', null, 'products.manage')).toBe(true);
      expect(resolvePermission('manager', null, 'products_manage')).toBe(true);
    });

    it('returns false for the staff role default', () => {
      expect(resolvePermission('staff', null, 'products.manage')).toBe(false);
      expect(resolvePermission('staff', null, 'products_manage')).toBe(false);
    });

    it('honours a custom override registered under the canonical key', () => {
      expect(
        resolvePermission('staff', { products_manage: true }, 'products.manage'),
      ).toBe(true);
      expect(
        resolvePermission('manager', { products_manage: false }, 'products.manage'),
      ).toBe(false);
    });

    it('owner short-circuit beats the alias lookup', () => {
      expect(
        resolvePermission('owner', { products_manage: false }, 'products.manage'),
      ).toBe(true);
    });
  });

  describe('"sales.manage" → "sales_manage"', () => {
    it('returns true for the manager role default', () => {
      expect(resolvePermission('manager', null, 'sales.manage')).toBe(true);
      expect(resolvePermission('manager', null, 'sales_manage')).toBe(true);
    });

    it('returns false for the receptionist role default', () => {
      expect(resolvePermission('receptionist', null, 'sales.manage')).toBe(false);
      expect(resolvePermission('receptionist', null, 'sales_manage')).toBe(false);
    });

    it('honours a custom override registered under the canonical key', () => {
      expect(
        resolvePermission('staff', { sales_manage: true }, 'sales.manage'),
      ).toBe(true);
      expect(
        resolvePermission('manager', { sales_manage: false }, 'sales.manage'),
      ).toBe(false);
    });
  });

  it('falls through to false for an unknown key (alias map does not invent permissions)', () => {
    expect(resolvePermission('manager', null, 'totally.unknown')).toBe(false);
    expect(resolvePermission('staff', null, 'totally.unknown')).toBe(false);
  });

  it('non-aliased dotted keys are not silently rewritten', () => {
    // Only the two documented aliases are translated; everything else is
    // looked up verbatim and therefore resolves to false.
    expect(resolvePermission('manager', null, 'products.delete')).toBe(false);
    expect(resolvePermission('manager', null, 'sales.refund')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// assertSalonAccess — full decision matrix
// ────────────────────────────────────────────────────────────────────────────

describe('assertSalonAccess', () => {
  describe('no session', () => {
    it('returns 401 UNAUTHORIZED when session is null', async () => {
      const res = await assertSalonAccess({ session: null, salonId: 1 });
      expect(res).toEqual({ ok: false, code: 'UNAUTHORIZED', status: 401 });
      expect(getOneMock).not.toHaveBeenCalled();
    });

    it('returns 401 UNAUTHORIZED when session is undefined', async () => {
      const res = await assertSalonAccess({ session: undefined, salonId: 1 });
      expect(res).toEqual({ ok: false, code: 'UNAUTHORIZED', status: 401 });
    });

    it('returns 401 UNAUTHORIZED when session has no userId', async () => {
      const res = await assertSalonAccess({ session: { role: 'admin' }, salonId: 1 });
      expect(res).toEqual({ ok: false, code: 'UNAUTHORIZED', status: 401 });
    });

    it('returns 401 UNAUTHORIZED with no arguments at all', async () => {
      const res = await assertSalonAccess();
      expect(res).toEqual({ ok: false, code: 'UNAUTHORIZED', status: 401 });
    });
  });

  describe('admin', () => {
    it('is allowed without consulting the database', async () => {
      const res = await assertSalonAccess({
        session: { userId: 99, role: 'admin' },
        salonId: 7,
      });
      expect(res).toEqual({ ok: true, status: 200, role: 'admin', salonId: 7 });
      expect(getOneMock).not.toHaveBeenCalled();
    });

    it('is allowed when salonId is null (admin listing endpoints)', async () => {
      const res = await assertSalonAccess({
        session: { userId: 99, role: 'admin' },
        salonId: null,
      });
      expect(res).toEqual({ ok: true, status: 200, role: 'admin', salonId: null });
      expect(getOneMock).not.toHaveBeenCalled();
    });

    it('bypasses ownerOnly and perm checks', async () => {
      const res = await assertSalonAccess({
        session: { userId: 99, role: 'admin' },
        salonId: 7,
        ownerOnly: true,
        perm: 'products_manage',
      });
      expect(res.ok).toBe(true);
      expect(res.role).toBe('admin');
    });
  });

  describe('malformed salon_id (non-admin)', () => {
    const session = { userId: 5, role: 'user' };

    it('returns 400 MISSING_SALON_ID for null', async () => {
      const res = await assertSalonAccess({ session, salonId: null });
      expect(res).toEqual({ ok: false, code: 'MISSING_SALON_ID', status: 400 });
      expect(getOneMock).not.toHaveBeenCalled();
    });

    it('returns 400 MISSING_SALON_ID for undefined', async () => {
      const res = await assertSalonAccess({ session, salonId: undefined });
      expect(res).toEqual({ ok: false, code: 'MISSING_SALON_ID', status: 400 });
    });

    it('returns 400 MISSING_SALON_ID for empty string', async () => {
      const res = await assertSalonAccess({ session, salonId: '' });
      expect(res).toEqual({ ok: false, code: 'MISSING_SALON_ID', status: 400 });
    });

    it.each([
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['negative', -1],
      ['zero', 0],
      ['fractional', 1.5],
      ['non-numeric string', 'abc'],
      ['trailing junk string', '12abc'],
      ['whitespace string', '  '],
      ['fractional string', '12.5'],
      ['object', { id: 1 }],
    ])('returns 400 INVALID_SALON_ID for %s', async (_label, value) => {
      const res = await assertSalonAccess({ session, salonId: value });
      expect(res).toEqual({ ok: false, code: 'INVALID_SALON_ID', status: 400 });
      expect(getOneMock).not.toHaveBeenCalled();
    });

    it('returns 400 INVALID_SALON_ID for an unknown / soft-deleted salon', async () => {
      mockDb({ salonRow: null });
      const res = await assertSalonAccess({ session, salonId: 9999 });
      expect(res).toEqual({ ok: false, code: 'INVALID_SALON_ID', status: 400 });
      expect(getOneMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('owner of the salon', () => {
    const session = { userId: 42, role: 'user' };

    it('is allowed without a staff lookup', async () => {
      mockDb({ salonRow: { owner_id: 42 } });
      const res = await assertSalonAccess({ session, salonId: 1 });
      expect(res).toEqual({ ok: true, status: 200, role: 'owner', salonId: 1 });
      // Only the salon lookup ran; no staff query needed.
      expect(getOneMock).toHaveBeenCalledTimes(1);
    });

    it('is allowed when ownerOnly=true', async () => {
      mockDb({ salonRow: { owner_id: 42 } });
      const res = await assertSalonAccess({
        session,
        salonId: 1,
        ownerOnly: true,
      });
      expect(res.ok).toBe(true);
      expect(res.role).toBe('owner');
    });

    it('is allowed even when a perm is requested (owner short-circuit)', async () => {
      mockDb({ salonRow: { owner_id: 42 } });
      const res = await assertSalonAccess({
        session,
        salonId: 1,
        perm: 'products_manage',
      });
      expect(res.ok).toBe(true);
      expect(res.role).toBe('owner');
    });

    it('accepts numeric-string salon ids', async () => {
      mockDb({ salonRow: { owner_id: 42 } });
      const res = await assertSalonAccess({ session, salonId: '1' });
      expect(res).toEqual({ ok: true, status: 200, role: 'owner', salonId: 1 });
    });
  });

  describe('staff with permission', () => {
    const session = { userId: 7, role: 'user' };

    it('is allowed when role default grants the permission', async () => {
      mockDb({
        salonRow: { owner_id: 100 },
        staffRow: { id: 21, role: 'manager', permissions: null },
      });
      const res = await assertSalonAccess({
        session,
        salonId: 1,
        perm: 'products_manage',
      });
      expect(res).toEqual({ ok: true, status: 200, role: 'manager', salonId: 1 });
    });

    it('is allowed when a custom override grants the permission', async () => {
      mockDb({
        salonRow: { owner_id: 100 },
        staffRow: {
          id: 21,
          role: 'staff',
          permissions: { products_manage: true },
        },
      });
      const res = await assertSalonAccess({
        session,
        salonId: 1,
        perm: 'products_manage',
      });
      expect(res).toEqual({ ok: true, status: 200, role: 'staff', salonId: 1 });
    });

    it('parses a JSON-string permissions column before resolving', async () => {
      mockDb({
        salonRow: { owner_id: 100 },
        staffRow: {
          id: 21,
          role: 'staff',
          permissions: JSON.stringify({ sales_manage: true }),
        },
      });
      const res = await assertSalonAccess({
        session,
        salonId: 1,
        perm: 'sales.manage',
      });
      expect(res.ok).toBe(true);
      expect(res.role).toBe('staff');
    });

    it('is allowed when no perm is requested (any active staff record suffices)', async () => {
      mockDb({
        salonRow: { owner_id: 100 },
        staffRow: { id: 21, role: 'staff', permissions: null },
      });
      const res = await assertSalonAccess({ session, salonId: 1 });
      expect(res).toEqual({ ok: true, status: 200, role: 'staff', salonId: 1 });
    });
  });

  describe('staff without permission', () => {
    const session = { userId: 7, role: 'user' };

    it('returns 403 FORBIDDEN when role default denies the permission', async () => {
      mockDb({
        salonRow: { owner_id: 100 },
        staffRow: { id: 21, role: 'staff', permissions: null },
      });
      const res = await assertSalonAccess({
        session,
        salonId: 1,
        perm: 'products_manage',
      });
      expect(res).toEqual({ ok: false, code: 'FORBIDDEN', status: 403 });
    });

    it('returns 403 FORBIDDEN when a custom override denies the permission', async () => {
      mockDb({
        salonRow: { owner_id: 100 },
        staffRow: {
          id: 21,
          role: 'manager',
          permissions: { sales_manage: false },
        },
      });
      const res = await assertSalonAccess({
        session,
        salonId: 1,
        perm: 'sales.manage',
      });
      expect(res).toEqual({ ok: false, code: 'FORBIDDEN', status: 403 });
    });

    it('returns 403 FORBIDDEN when ownerOnly=true and caller is not the owner', async () => {
      mockDb({
        salonRow: { owner_id: 100 },
        staffRow: { id: 21, role: 'manager', permissions: null },
      });
      const res = await assertSalonAccess({
        session,
        salonId: 1,
        ownerOnly: true,
      });
      expect(res).toEqual({ ok: false, code: 'FORBIDDEN', status: 403 });
      // ownerOnly should short-circuit before a staff lookup is issued.
      expect(getOneMock).toHaveBeenCalledTimes(1);
    });

    it('treats a malformed JSON permissions string as no override (falls back to role default)', async () => {
      mockDb({
        salonRow: { owner_id: 100 },
        staffRow: {
          id: 21,
          role: 'staff',
          permissions: '{not json',
        },
      });
      const res = await assertSalonAccess({
        session,
        salonId: 1,
        perm: 'products_manage',
      });
      // staff role default for products_manage is false → 403
      expect(res).toEqual({ ok: false, code: 'FORBIDDEN', status: 403 });
    });
  });

  describe('cross-salon access', () => {
    const session = { userId: 7, role: 'user' };

    it('returns 403 FORBIDDEN when no Active_Staff_Record exists on the resource salon', async () => {
      // Salon exists, owner is someone else, and the staff lookup yields null
      // (caller is staff on a different salon, or has been deactivated).
      mockDb({ salonRow: { owner_id: 100 }, staffRow: null });
      const res = await assertSalonAccess({
        session,
        salonId: 1,
        perm: 'products_manage',
      });
      expect(res).toEqual({ ok: false, code: 'FORBIDDEN', status: 403 });
      // Both the salon and staff lookups should have run.
      expect(getOneMock).toHaveBeenCalledTimes(2);
    });

    it('staff lookup is parameterised by the requested salon id and caller user id', async () => {
      mockDb({ salonRow: { owner_id: 100 }, staffRow: null });
      await assertSalonAccess({
        session: { userId: 7, role: 'user' },
        salonId: 42,
        perm: 'sales_manage',
      });
      // Second call is the staff lookup; verify its parameters bind the
      // resolved salon id and the session user id (prevents cross-salon
      // privilege escalation by reusing a staff row from another salon).
      const staffCall = getOneMock.mock.calls.find(([sql]) =>
        typeof sql === 'string' && sql.includes('FROM staff'),
      );
      expect(staffCall).toBeDefined();
      const [, params] = staffCall;
      expect(params).toEqual([42, 7]);
    });
  });
});
