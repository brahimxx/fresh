import { success, error, unauthorized } from '@/lib/response';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request) {
    try {
        const session = await getSession(request);
        if (!session || session.role !== 'admin') {
            return unauthorized('Admin access required');
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 20;
        const page = parseInt(searchParams.get('page')) || 1;
        const offset = (page - 1) * limit;

        // Filters
        const status = searchParams.get('status');
        const paymentStatus = searchParams.get('payment_status');
        const search = searchParams.get('search');

        let sql = `
      SELECT 
        b.id,
        b.start_datetime,
        b.status,
        s.name as salon_name,
        c.first_name as client_fname,
        c.last_name as client_lname,
        c.email as client_email,
        CONCAT(st.first_name, ' ', st.last_name) as staff_name,
        COALESCE(p.amount, 0) as total_price,
        p.status as payment_status,
        p.id as payment_id,
        p.refunded_amount
      FROM bookings b
      JOIN salons s ON b.salon_id = s.id
      JOIN users c ON b.client_id = c.id
      JOIN staff st ON b.staff_id = st.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE 1=1
    `;
        const sqlParams = [];

        if (status) {
            sql += ` AND b.status = ?`;
            sqlParams.push(status);
        }

        if (paymentStatus) {
            if (paymentStatus === 'unpaid') {
                sql += ` AND (p.status IS NULL OR p.status = 'pending')`;
            } else {
                sql += ` AND p.status = ?`;
                sqlParams.push(paymentStatus);
            }
        }

        if (search) {
            sql += ` AND (c.email LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR s.name LIKE ? OR b.id = ?)`;
            const searchLike = `%${search}%`;
            // Check if it's a number for ID search
            const searchId = isNaN(search) ? 0 : parseInt(search);
            sqlParams.push(searchLike, searchLike, searchLike, searchLike, searchId);
        }

        // Count before pagination
        const countSql = sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await query(countSql, sqlParams);

        // Apply pagination
        sql += ` ORDER BY b.start_datetime DESC LIMIT ? OFFSET ?`;
        sqlParams.push(limit, offset);

        const bookings = await query(sql, sqlParams);

        return success({
            bookings: bookings.map(b => ({
                id: b.id,
                startDatetime: b.start_datetime,
                status: b.status,
                salonName: b.salon_name,
                clientName: b.client_fname ? `${b.client_fname} ${b.client_lname || ''}`.trim() : 'Unknown Client',
                clientEmail: b.client_email,
                staffName: b.staff_name,
                totalPrice: parseFloat(b.total_price),
                paymentStatus: b.payment_status || 'unpaid',
                paymentId: b.payment_id,
                refundedAmount: parseFloat(b.refunded_amount || 0)
            })),
            pagination: {
                page,
                limit,
                total: countResult?.total || 0,
                totalPages: Math.ceil((countResult?.total || 0) / limit),
            },
        });

    } catch (err) {
        console.error('Admin Bookings API Error:', err);
        return error({ message: 'Failed to fetch platform bookings' }, 500);
    }
}
