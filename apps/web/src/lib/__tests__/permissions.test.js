/**
 * @file src/lib/__tests__/permissions.test.js
 *
 * Unit tests for the server-side DB access-control helpers in /lib/permissions.js
 *
 * Strategy: mock @/lib/db so no real database is needed.
 * Each test verifies the correct access decision for every role scenario.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock @/lib/db ──────────────────────────────────────────────────────────
vi.mock('@/lib/db', () => ({
  getOne: vi.fn(),
}));

import { getOne } from '@/lib/db';

import {
  checkSalonAccess,
  checkServiceAccess,
  checkStaffAccess,
  canManageStaff,
} from '@/lib/permissions-server';

beforeEach(() => {
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// checkSalonAccess
// ══════════════════════════════════════════════════════════════════════════════
describe('checkSalonAccess', () => {
  it('✅ admin always gets access (no DB call)', async () => {
    const result = await checkSalonAccess(1, '99', 'admin');
    expect(result).toBe(true);
    expect(getOne).not.toHaveBeenCalled();
  });

  it('✅ owner gets access — Number() coercion: DB int vs JWT string', async () => {
    // owner_id comes from DB as integer 42, userId from JWT as string "42"
    getOne.mockResolvedValueOnce({ owner_id: 42 });
    const result = await checkSalonAccess(1, '42', 'owner');
    expect(result).toBe(true);
  });

  it('❌ wrong owner is denied', async () => {
    getOne.mockResolvedValueOnce({ owner_id: 42 });
    // second call = staff check → returns nothing
    getOne.mockResolvedValueOnce(null);
    const result = await checkSalonAccess(1, '99', 'owner');
    expect(result).toBe(false);
  });

  it('✅ manager staff gets access', async () => {
    getOne.mockResolvedValueOnce({ owner_id: 42 });   // salon lookup
    getOne.mockResolvedValueOnce({ id: 7 });           // staff record found
    const result = await checkSalonAccess(1, '55', 'staff');
    expect(result).toBe(true);
  });

  it('❌ regular staff (no manager role) is denied', async () => {
    getOne.mockResolvedValueOnce({ owner_id: 42 });   // salon lookup
    getOne.mockResolvedValueOnce(null);                // no manager record
    const result = await checkSalonAccess(1, '55', 'staff');
    expect(result).toBe(false);
  });

  it('❌ salon not found returns false', async () => {
    getOne.mockResolvedValueOnce(null);
    const result = await checkSalonAccess(999, '42', 'owner');
    expect(result).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// checkServiceAccess  (THE KEY BUG FIX — no plain staff allowed to mutate)
// ══════════════════════════════════════════════════════════════════════════════
describe('checkServiceAccess', () => {
  it('✅ admin always gets access', async () => {
    const result = await checkServiceAccess(1, '99', 'admin');
    expect(result).toBe(true);
    expect(getOne).not.toHaveBeenCalled();
  });

  it('✅ salon owner can mutate the service (Number() coercion)', async () => {
    getOne.mockResolvedValueOnce({ salon_id: 1, owner_id: 42 });
    const result = await checkServiceAccess(10, '42', 'owner');
    expect(result).toBe(true);
  });

  it('✅ manager staff can mutate services', async () => {
    getOne.mockResolvedValueOnce({ salon_id: 1, owner_id: 42 });  // service lookup
    getOne.mockResolvedValueOnce({ id: 7 });                        // manager found
    const result = await checkServiceAccess(10, '55', 'staff');
    expect(result).toBe(true);
  });

  it('❌ plain stylist CANNOT mutate services (the fixed bug)', async () => {
    getOne.mockResolvedValueOnce({ salon_id: 1, owner_id: 42 });  // service lookup
    getOne.mockResolvedValueOnce(null);                             // NOT a manager
    const result = await checkServiceAccess(10, '55', 'staff');
    expect(result).toBe(false);
  });

  it('❌ service not found returns false', async () => {
    getOne.mockResolvedValueOnce(null);
    const result = await checkServiceAccess(999, '42', 'owner');
    expect(result).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// checkStaffAccess
// ══════════════════════════════════════════════════════════════════════════════
describe('checkStaffAccess', () => {
  const mockStaff = { id: 7, user_id: 55, salon_id: 1, owner_id: 42 };

  it('✅ admin gets the staff record back', async () => {
    getOne.mockResolvedValueOnce(mockStaff);
    const result = await checkStaffAccess(7, '99', 'admin');
    expect(result).toMatchObject({ id: 7 });
  });

  it('✅ salon owner gets access (Number() coercion: int 42 vs string "42")', async () => {
    getOne.mockResolvedValueOnce(mockStaff);
    const result = await checkStaffAccess(7, '42', 'owner');
    expect(result).toMatchObject({ id: 7 });
  });

  it('✅ staff member can access their own record (self-access)', async () => {
    getOne.mockResolvedValueOnce(mockStaff);
    const result = await checkStaffAccess(7, '55', 'staff');
    expect(result).toMatchObject({ id: 7 });
  });

  it('✅ manager at same salon gets access', async () => {
    getOne.mockResolvedValueOnce(mockStaff);    // staff lookup
    getOne.mockResolvedValueOnce({ id: 8 });    // manager record found
    const result = await checkStaffAccess(7, '66', 'staff');
    expect(result).toMatchObject({ id: 7 });
  });

  it('❌ unrelated staff member is denied', async () => {
    getOne.mockResolvedValueOnce(mockStaff);    // staff lookup
    getOne.mockResolvedValueOnce(null);          // no manager record
    const result = await checkStaffAccess(7, '99', 'staff');
    expect(result).toBeNull();
  });

  it('❌ staff record not found returns null', async () => {
    getOne.mockResolvedValueOnce(null);
    const result = await checkStaffAccess(999, '42', 'owner');
    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// canManageStaff  (THE REGRESSION FIX — plain staff cannot manage peer schedules)
// ══════════════════════════════════════════════════════════════════════════════
describe('canManageStaff', () => {
  const mockStaff = { user_id: 55, salon_id: 1, owner_id: 42 };

  it('✅ admin always gets access', async () => {
    const result = await canManageStaff(7, '99', 'admin');
    expect(result).toBe(true);
    expect(getOne).not.toHaveBeenCalled();
  });

  it('✅ salon owner can manage any staff schedule (Number() coercion)', async () => {
    getOne.mockResolvedValueOnce(mockStaff);
    const result = await canManageStaff(7, '42', 'owner');
    expect(result).toBe(true);
  });

  it('✅ staff member can manage their OWN schedule (self-service)', async () => {
    getOne.mockResolvedValueOnce(mockStaff);
    const result = await canManageStaff(7, '55', 'staff');
    expect(result).toBe(true);
  });

  it('✅ manager (role=manager) can manage peer schedules', async () => {
    getOne.mockResolvedValueOnce(mockStaff);    // target staff lookup
    getOne.mockResolvedValueOnce({ id: 8 });    // manager record found
    const result = await canManageStaff(7, '66', 'staff');
    expect(result).toBe(true);
  });

  it('❌ plain stylist CANNOT manage a colleague\'s schedule (the fixed regression)', async () => {
    getOne.mockResolvedValueOnce(mockStaff);    // target staff lookup
    getOne.mockResolvedValueOnce(null);          // NOT a manager
    const result = await canManageStaff(7, '77', 'staff');
    expect(result).toBe(false);
  });

  it('❌ staff record not found returns false', async () => {
    getOne.mockResolvedValueOnce(null);
    const result = await canManageStaff(999, '42', 'owner');
    expect(result).toBe(false);
  });
});
