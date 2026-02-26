import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/response';

export async function GET(request) {
    try {
        const session = await getSession(request);
        if (!session || !session.userId) {
            return unauthorized();
        }

        const tickets = await query(`
            SELECT id, subject, description, status, priority, created_at, updated_at
            FROM support_tickets
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [session.userId]);

        return success(tickets);
    } catch (err) {
        console.error('Fetch Tickets Error:', err);
        return error({ message: 'Failed to fetch tickets' }, 500);
    }
}

export async function POST(request) {
    try {
        const session = await getSession(request);
        if (!session || !session.userId) {
            return unauthorized();
        }

        const body = await request.json();
        const { subject, description, priority = 'normal' } = body;

        if (!subject || !description) {
            return error({ message: 'Subject and description are required' }, 400);
        }

        const result = await query(`
            INSERT INTO support_tickets (user_id, subject, description, priority)
            VALUES (?, ?, ?, ?)
        `, [session.userId, subject, description, priority]);

        return success({ message: 'Ticket created successfully', id: result.insertId });
    } catch (err) {
        console.error('Create Ticket Error:', err);
        return error({ message: 'Failed to create ticket' }, 500);
    }
}
