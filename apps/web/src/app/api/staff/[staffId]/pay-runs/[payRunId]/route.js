import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';
import { decodeId } from '@/lib/id';

// PATCH /api/staff/[staffId]/pay-runs/[payRunId] - Update pay run status
export async function PATCH(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawStaffId, payRunId: rawPayRunId } = await params;
    
    const staffId = decodeId(rawStaffId);
    const payRunId = decodeId(rawPayRunId);

    // Verify staff exists and user is owner
    const staff = await getOne(
      `SELECT st.salon_id, s.owner_id
       FROM staff st 
       JOIN salons s ON s.id = st.salon_id
       WHERE st.id = ?`,
      [staffId]
    );

    if (!staff) return error('Staff not found', 404);
    if (session.role !== 'admin' && Number(staff.owner_id) !== Number(session.userId)) {
      return forbidden('Only the salon owner can modify pay runs');
    }

    const body = await request.json();
    const { status } = body;

    if (!['generated', 'paid'].includes(status)) {
      return error('Invalid status', 400);
    }

    await query('UPDATE staff_pay_runs SET status = ? WHERE id = ? AND staff_id = ?', [status, payRunId, staffId]);

    return success({ message: 'Pay run updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update pay run error:', err);
    return error('Failed to update pay run', 500);
  }
}

// DELETE /api/staff/[staffId]/pay-runs/[payRunId] - Delete a pay run
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { staffId: rawStaffId, payRunId: rawPayRunId } = await params;
    
    const staffId = decodeId(rawStaffId);
    const payRunId = decodeId(rawPayRunId);

    // Verify staff exists and user is owner
    const staff = await getOne(
      `SELECT st.salon_id, s.owner_id
       FROM staff st 
       JOIN salons s ON s.id = st.salon_id
       WHERE st.id = ?`,
      [staffId]
    );

    if (!staff) return error('Staff not found', 404);
    if (session.role !== 'admin' && Number(staff.owner_id) !== Number(session.userId)) {
      return forbidden('Only the salon owner can delete pay runs');
    }

    // Only allow deletion if status is generated (not paid)
    const payRun = await getOne('SELECT status FROM staff_pay_runs WHERE id = ? AND staff_id = ?', [payRunId, staffId]);
    if (!payRun) return error('Pay run not found', 404);
    if (payRun.status === 'paid') return error('Cannot delete a finalized paid run. Mark it as generated first.', 400);

    await query('DELETE FROM staff_pay_runs WHERE id = ? AND staff_id = ?', [payRunId, staffId]);

    return success({ message: 'Pay run deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete pay run error:', err);
    return error('Failed to delete pay run', 500);
  }
}
