import { query } from '@/lib/db';
import { success, error } from '@/lib/response';

export async function GET() {
  try {
    // We want to dump all current bookings and their services to see why it didn't conflict
    const bookings = await query(
      `SELECT b.id as b_id, b.status, b.deleted_at, b.staff_id as b_staff, 
              bs.staff_id as bs_staff, bs.start_datetime, bs.end_datetime
       FROM bookings b
       JOIN booking_services bs ON bs.booking_id = b.id
       ORDER BY b.id DESC LIMIT 10`
    );
    return success(bookings);
  } catch (err) {
    return error(err.message, 500);
  }
}
