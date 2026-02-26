import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { success, error, unauthorized } from '@/lib/response';

export async function GET(request) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized('Admin access required');
        }

        const discounts = await query(`
            SELECT id, code, type, value, min_purchase, max_uses, current_uses, is_active, start_date, end_date
            FROM global_discounts
            ORDER BY created_at DESC
        `);

        return success(discounts);
    } catch (err) {
        console.error('Global Discounts GET Error:', err);
        return error({ message: 'Failed to fetch global discounts' }, 500);
    }
}

export async function POST(request) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized('Admin access required');
        }

        const body = await request.json();
        const { code, type, value, minPurchase = 0, maxUses = null, startDate = null, endDate = null } = body;

        if (!code || !type || value === undefined) {
            return error({ message: 'Code, type, and value are required' }, 400);
        }

        // Validate promo code format (no spaces, alphanumeric)
        const formatCode = String(code).toUpperCase().replace(/\s+/g, '');

        if (type !== 'fixed' && type !== 'percentage') {
            return error({ message: 'Type must be fixed or percentage' }, 400);
        }

        const [insert] = await query(`
            INSERT INTO global_discounts (code, type, value, min_purchase, max_uses, start_date, end_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [formatCode, type, value, minPurchase, maxUses, startDate, endDate]);

        const [[newDiscount]] = await query('SELECT * FROM global_discounts WHERE id = ?', [insert.insertId]);

        return success({ message: 'Global discount created', discount: newDiscount }, 201);
    } catch (err) {
        console.error('Global Discounts POST Error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return error({ message: 'Discount code already exists.' }, 409);
        }
        return error({ message: 'Failed to create global discount' }, 500);
    }
}
