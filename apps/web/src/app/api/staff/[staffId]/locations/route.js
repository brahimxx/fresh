import { query, getOne, transaction } from '@/lib/db';
import { decodeId } from '@/lib/id';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';
import { checkStaffAccess } from '@/lib/permissions-server';

// GET /api/staff/[staffId]/locations - Get multi-location assignments for a staff member
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawStaffId } = await params;
    const staffId = decodeId(rawStaffId);

    // Verify access to the staff member
    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return forbidden('Not authorized to access this staff member');
    }

    // Only owner or admin can edit locations
    const canEdit = session.role === 'admin' || Number(staff.owner_id) === Number(session.userId);

    // Find all salons owned by this staff member's salon owner
    const allSalons = await query(
      'SELECT id, name FROM salons WHERE owner_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name ASC',
      [staff.owner_id]
    );

    if (allSalons.length === 0) {
      return success({ locations: [], canEdit });
    }

    const salonIds = allSalons.map((s) => s.id);

    // Find active staff records for this user across these salons
    const assignments = await query(
      `SELECT salon_id, is_active FROM staff WHERE user_id = ? AND salon_id IN (?)`,
      [staff.user_id, salonIds]
    );

    const activeSalonIds = new Set(
      assignments.filter((a) => a.is_active === 1).map((a) => a.salon_id)
    );

    const locations = allSalons.map((salon) => ({
      id: salon.id,
      name: salon.name,
      isAssigned: activeSalonIds.has(salon.id) || salon.id === staff.salon_id,
      isCurrentContext: salon.id === staff.salon_id,
    }));

    return success({ locations, canEdit });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get staff locations error:', err);
    return error('Failed to get staff locations', 500);
  }
}

// PUT /api/staff/[staffId]/locations - Update multi-location assignments
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawStaffId } = await params;
    const staffId = decodeId(rawStaffId);
    
    const body = await request.json();
    const { locations } = body; // Array of salonIds

    if (!Array.isArray(locations)) {
      return error('locations must be an array', 400);
    }

    // Verify access to the staff member
    const staff = await checkStaffAccess(staffId, session.userId, session.role);
    if (!staff) {
      return forbidden('Not authorized to access this staff member');
    }

    // Only owner or admin can edit locations
    if (session.role !== 'admin' && Number(staff.owner_id) !== Number(session.userId)) {
      return forbidden('Only the salon owner can assign staff to multiple locations');
    }

    // Ensure the current salonId is always included to prevent self-eviction from current view
    const targetSalonIds = new Set(locations.map(Number));
    targetSalonIds.add(Number(staff.salon_id));

    // Get all valid salons owned by the owner
    const allSalons = await query(
      'SELECT id FROM salons WHERE owner_id = ? AND deleted_at IS NULL AND is_active = 1',
      [staff.owner_id]
    );
    const validSalonIds = new Set(allSalons.map((s) => Number(s.id)));

    // Filter target to only include valid salons owned by this owner
    const finalSalonIds = Array.from(targetSalonIds).filter((id) => validSalonIds.has(id));

    await transaction(async (conn) => {
      for (const salonId of validSalonIds) {
        const isSelected = finalSalonIds.includes(salonId);

        const [existingStaff] = await conn.execute(
          'SELECT id, is_active FROM staff WHERE user_id = ? AND salon_id = ?',
          [staff.user_id, salonId]
        );

        if (isSelected) {
          if (existingStaff.length > 0) {
            if (existingStaff[0].is_active === 0) {
              // Reactivate
              await conn.execute(
                'UPDATE staff SET is_active = 1 WHERE user_id = ? AND salon_id = ?',
                [staff.user_id, salonId]
              );
            }
          } else {
            // Create new staff record carrying over their current role
            await conn.execute(
              'INSERT INTO staff (salon_id, user_id, role, is_active) VALUES (?, ?, ?, 1)',
              [salonId, staff.user_id, staff.role]
            );
          }
        } else {
          // Soft-delete if not selected (and it exists)
          if (existingStaff.length > 0 && existingStaff[0].is_active === 1) {
            await conn.execute(
              'UPDATE staff SET is_active = 0 WHERE user_id = ? AND salon_id = ?',
              [staff.user_id, salonId]
            );
          }
        }
      }
    });

    return success({ message: 'Locations updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update staff locations error:', err);
    return error('Failed to update staff locations', 500);
  }
}
