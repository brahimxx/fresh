import { getSession } from '@/lib/auth';
import { query, getOne } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/response';

export async function PUT(request, { params }) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized();
        }

        const { id } = await params;
        const body = await request.json();
        const { status, priority } = body;

        // Fetch old data for audit log
        const oldTicket = await getOne('SELECT status, priority FROM support_tickets WHERE id = ?', [id]);
        if (!oldTicket) {
            return error({ message: 'Ticket not found' }, 404);
        }

        const updates = [];
        const values = [];

        if (status && status !== oldTicket.status) {
            updates.push('status = ?');
            values.push(status);
        }

        if (priority && priority !== oldTicket.priority) {
            updates.push('priority = ?');
            values.push(priority);
        }

        if (updates.length === 0) {
            return success({ message: 'No changes detected' });
        }

        values.push(id);

        await query(`
            UPDATE support_tickets 
            SET ${updates.join(', ')}
            WHERE id = ?
        `, values);

        // Re-fetch to log new data
        const newTicket = await getOne('SELECT status, priority FROM support_tickets WHERE id = ?', [id]);

        // Audit Log
        await query(`
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            session.userId,
            'update_ticket',
            'support_ticket',
            id,
            JSON.stringify(oldTicket),
            JSON.stringify(newTicket)
        ]);

        return success({ message: 'Ticket updated successfully', status: newTicket.status, priority: newTicket.priority });
    } catch (err) {
        console.error('Update Ticket Error:', err);
        return error({ message: 'Failed to update ticket' }, 500);
    }
}
