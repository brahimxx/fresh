/**
 * permissions-server.js — Server-only authorization helpers.
 *
 * This file imports from `db.js` (mysql2) and must NEVER be imported by
 * client components or any file that is part of the client bundle.
 * Client-safe permission utilities live in `permissions.js`.
 */

import { getOne } from './db.js';
import { resolvePermission } from './permissions.js';

// ─── API authorization helper ──────────────────────────────────────────────
// Centralises the read/write authorization matrix for the salon-scoped API
// endpoints (products, product-categories, payments, refunds, …). Returns a
// plain `{ ok, code, status }` object rather than throwing so callers can
// translate it into the existing `response.js` helpers (`unauthorized()`,
// `forbidden()`, `error()`) and keep route-level control flow readable.
//
// Decision matrix (see design.md "Authorization model"):
//
//   No session                                                 → 401 UNAUTHORIZED
//   Session, admin                                             → 200 ALLOWED (regardless of salon_id)
//   Session, non-admin, missing salon_id                       → 400 MISSING_SALON_ID
//   Session, non-admin, malformed salon_id                     → 400 INVALID_SALON_ID
//   Session, non-admin, salon_id does not resolve to a salon   → 400 INVALID_SALON_ID
//   Session, owns the resource salon                           → 200 ALLOWED
//   Session, ownerOnly=true and not the owner                  → 403 FORBIDDEN
//   Session, has Active_Staff_Record AND `perm` resolves true  → 200 ALLOWED
//   Session, has Active_Staff_Record but `perm` resolves false → 403 FORBIDDEN
//   Session, no Active_Staff_Record on resource salon          → 403 FORBIDDEN
//
// `Active_Staff_Record` = `staff` row with `user_id = session.userId`,
// `salon_id = resolved`, `is_active = 1`.

const SALON_ID_INT_MAX = Number.MAX_SAFE_INTEGER;

function normaliseSalonId(raw) {
  if (raw === null || raw === undefined || raw === '') return { code: 'MISSING_SALON_ID' };
  // Accept integers and numeric strings; reject everything else.
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber)) {
    return { code: 'INVALID_SALON_ID' };
  }
  if (asNumber <= 0 || asNumber > SALON_ID_INT_MAX) {
    return { code: 'INVALID_SALON_ID' };
  }
  // Trailing junk like "12abc" coerces to NaN above; "12.5" fails the integer
  // check; explicit string compare guards against "12 " etc.
  if (typeof raw === 'string' && String(asNumber) !== raw.trim()) {
    return { code: 'INVALID_SALON_ID' };
  }
  return { id: asNumber };
}

/**
 * Assert that the caller may operate on the given salon-scoped resource.
 *
 * @param {object} args
 * @param {object|null} args.session     The auth session (`{ userId, role, ... }`) or `null`.
 * @param {number|string|null} args.salonId The resolved salon id for the resource.
 *                                          May be `null` for admin listing endpoints.
 * @param {string} [args.perm]           Permission key to resolve for non-owner staff
 *                                       (e.g. `'products'`, `'products.manage'`,
 *                                       `'sales'`, `'sales.manage'`). When omitted,
 *                                       any Active_Staff_Record is sufficient.
 * @param {boolean} [args.ownerOnly]     When true, only admin or salon owner are allowed.
 *
 * @returns {Promise<{ ok: true, status: 200, role: string, salonId: number|null }
 *                  | { ok: false, code: string, status: number }>}
 */
export async function assertSalonAccess({ session, salonId, perm, ownerOnly = false } = {}) {
  // 1. No session → 401
  if (!session || !session.userId) {
    return { ok: false, code: 'UNAUTHORIZED', status: 401 };
  }

  // 2. Admin bypasses every salon check (Req 1.7).
  if (session.role === 'admin') {
    return { ok: true, status: 200, role: 'admin', salonId: salonId == null ? null : Number(salonId) };
  }

  // 3. Non-admin must supply a well-formed salon_id.
  const norm = normaliseSalonId(salonId);
  if (norm.code) {
    return { ok: false, code: norm.code, status: 400 };
  }
  const resolvedSalonId = norm.id;

  // 4. Look up the salon to confirm it exists and find its owner.
  const salon = await getOne(
    'SELECT owner_id FROM salons WHERE id = ?',
    [resolvedSalonId],
  );
  if (!salon) {
    // Treat unknown / deleted salons as a malformed identifier so callers
    // can return a uniform 400 rather than leaking existence (the cross-salon
    // 404 shape on single-resource endpoints is enforced separately).
    return { ok: false, code: 'INVALID_SALON_ID', status: 400 };
  }

  // 5. Salon owner is always allowed (cannot be restricted, mirrors
  //    `resolvePermission` short-circuit for the `'owner'` staff role).
  //    Use Number() on both sides — JWT payloads can deserialise integer IDs
  //    as strings on older tokens, and MySQL returns numeric owner_id.
  if (Number(salon.owner_id) === Number(session.userId)) {
    return { ok: true, status: 200, role: 'owner', salonId: resolvedSalonId };
  }

  // 6. ownerOnly paths reject everyone except admin / salon owner.
  if (ownerOnly) {
    return { ok: false, code: 'FORBIDDEN', status: 403 };
  }

  // 7. Otherwise the caller must have an Active_Staff_Record on this salon.
  const staff = await getOne(
    'SELECT id, role, permissions FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1',
    [resolvedSalonId, session.userId],
  );
  if (!staff) {
    return { ok: false, code: 'FORBIDDEN', status: 403 };
  }

  // 8. If a permission key was supplied, the staff record must resolve it true.
  if (perm) {
    let parsedPerms = staff.permissions;
    if (typeof parsedPerms === 'string') {
      try {
        parsedPerms = JSON.parse(parsedPerms);
      } catch {
        parsedPerms = null;
      }
    }
    const allowed = resolvePermission(staff.role, parsedPerms || null, perm);
    if (!allowed) {
      return { ok: false, code: 'FORBIDDEN', status: 403 };
    }
  }

  return { ok: true, status: 200, role: staff.role, salonId: resolvedSalonId };
}


// ─────────────────────────────────────────────────────────────────────────────
// checkSalonAccess
// Used by: services/route.js, staff/route.js, salons/[id]/*/route.js, etc.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Can the user manage a salon and its resources?
 *
 * @param {number|string} salonId
 * @param {number|string} userId  — from JWT, may be a string
 * @param {string}        role    — global users.role
 * @returns {Promise<boolean>}
 */
export async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;

  const salon = await getOne(
    'SELECT owner_id FROM salons WHERE id = ? AND deleted_at IS NULL',
    [salonId],
  );
  if (!salon) return false;

  if (Number(salon.owner_id) === Number(userId)) return true;

  const staff = await getOne(
    `SELECT id FROM staff
     WHERE salon_id = ? AND user_id = ? AND role IN ('manager', 'owner') AND is_active = 1`,
    [salonId, userId],
  );
  return !!staff;
}

// ─────────────────────────────────────────────────────────────────────────────
// checkServiceAccess
// Used by: services/[serviceId]/route.js  (PUT, DELETE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Can the user mutate (PUT / DELETE) a specific service?
 * Regular stylists cannot edit services — only owner or manager/owner staff.
 *
 * @param {number|string} serviceId
 * @param {number|string} userId
 * @param {string}        role
 * @returns {Promise<boolean>}
 */
export async function checkServiceAccess(serviceId, userId, role) {
  if (role === 'admin') return true;

  const service = await getOne(
    `SELECT s.salon_id, sa.owner_id
     FROM services s
     JOIN salons sa ON sa.id = s.salon_id
     WHERE s.id = ? AND s.deleted_at IS NULL`,
    [serviceId],
  );
  if (!service) return false;

  if (Number(service.owner_id) === Number(userId)) return true;

  const staff = await getOne(
    `SELECT id FROM staff
     WHERE salon_id = ? AND user_id = ? AND role IN ('manager', 'owner') AND is_active = 1`,
    [service.salon_id, userId],
  );
  return !!staff;
}

// ─────────────────────────────────────────────────────────────────────────────
// checkStaffAccess
// Used by: staff/[staffId]/route.js, emergency-contacts, services, etc.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Can the user view or edit a staff record?
 * Returns the staff row on success (so callers can use it), or null on failure.
 *
 * @param {number|string} staffId
 * @param {number|string} userId
 * @param {string}        role
 * @returns {Promise<object|null>}
 */
export async function checkStaffAccess(staffId, userId, role) {
  const staff = await getOne(
    `SELECT s.*, sal.owner_id
     FROM staff s
     JOIN salons sal ON sal.id = s.salon_id
     WHERE s.id = ?`,
    [staffId],
  );

  if (role === 'admin') return staff || null;
  if (!staff) return null;

  if (Number(staff.owner_id) === Number(userId)) return staff;
  if (Number(staff.user_id) === Number(userId)) return staff;

  const manager = await getOne(
    `SELECT id FROM staff
     WHERE salon_id = ? AND user_id = ? AND role IN ('manager', 'owner') AND is_active = 1`,
    [staff.salon_id, userId],
  );
  return manager ? staff : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// canManageStaff
// Used by: staff/[staffId]/schedule, time-off, working-hours
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Can the user manage operational data for a staff member?
 * (schedule, time-off, working hours)
 *
 * KEY DISTINCTION from checkStaffAccess:
 *   The "peer" branch is restricted to role = 'manager' ONLY.
 *   A plain stylist must NOT be able to overwrite a colleague's schedule.
 *
 * @param {number|string} staffId
 * @param {number|string} userId
 * @param {string}        role
 * @returns {Promise<boolean>}
 */
export async function canManageStaff(staffId, userId, role) {
  if (role === 'admin') return true;

  const staff = await getOne(
    `SELECT st.user_id, st.salon_id, s.owner_id
     FROM staff st
     JOIN salons s ON s.id = st.salon_id
     WHERE st.id = ?`,
    [staffId],
  );
  if (!staff) return false;

  if (Number(staff.owner_id) === Number(userId)) return true;
  if (Number(staff.user_id) === Number(userId)) return true;

  // Managers only — regular staff cannot manage peers
  const manager = await getOne(
    `SELECT id FROM staff
     WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1`,
    [staff.salon_id, userId],
  );
  return !!manager;
}