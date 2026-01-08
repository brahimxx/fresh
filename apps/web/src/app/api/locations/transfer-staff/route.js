import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// POST /api/locations/transfer-staff - Transfer staff between locations
export async function POST(request) {
  try {
    const session = await requireAuth();

    if (session.role !== 'admin' && session.role !== 'owner') {
      return forbidden('Only owners can transfer staff');
    }

    const body = await request.json();
    const { staffId, fromSalonId, toSalonId, keepServices = true } = body;

    if (!staffId || !fromSalonId || !toSalonId) {
      return error('Staff ID, source salon, and destination salon are required');
    }

    // Verify ownership of both salons
    const fromSalon = await getOne('SELECT id FROM salons WHERE id = ? AND owner_id = ?', [fromSalonId, session.userId]);
    const toSalon = await getOne('SELECT id FROM salons WHERE id = ? AND owner_id = ?', [toSalonId, session.userId]);

    if (!fromSalon || !toSalon) {
      return forbidden('You must own both salons to transfer staff');
    }

    // Verify staff exists
    const staff = await getOne('SELECT id, user_id FROM staff WHERE id = ? AND salon_id = ?', [staffId, fromSalonId]);
    if (!staff) {
      return error('Staff not found in source salon', 404);
    }

    await transaction(async (conn) => {
      // Update staff's salon
      await conn.execute('UPDATE staff SET salon_id = ? WHERE id = ?', [toSalonId, staffId]);

      if (keepServices) {
        // Get services the staff can perform
        const [currentServices] = await conn.execute(
          'SELECT service_id FROM service_staff WHERE staff_id = ?',
          [staffId]
        );

        // Delete old service assignments
        await conn.execute('DELETE FROM service_staff WHERE staff_id = ?', [staffId]);

        // Try to map to equivalent services in new salon
        for (const svc of currentServices) {
          // Find service with same name in new salon
          const [targetService] = await conn.execute(
            `SELECT s2.id FROM services s1 
             JOIN services s2 ON s2.name = s1.name
             WHERE s1.id = ? AND s2.salon_id = ?`,
            [svc.service_id, toSalonId]
          );

          if (targetService.length > 0) {
            await conn.execute('INSERT INTO service_staff (service_id, staff_id) VALUES (?, ?)', [
              targetService[0].id,
              staffId,
            ]);
          }
        }
      } else {
        // Just delete service assignments
        await conn.execute('DELETE FROM service_staff WHERE staff_id = ?', [staffId]);
      }

      // Transfer working hours (they stay the same)
      // Commission settings stay the same
    });

    return success({
      message: 'Staff transferred successfully',
      staffId,
      fromSalonId,
      toSalonId,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Transfer staff error:', err);
    return error('Failed to transfer staff', 500);
  }
}
