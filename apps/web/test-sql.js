import { query } from './src/lib/db.js';

async function run() {
  try {
    const sql = `SELECT booking_id, amount FROM payments WHERE status = 'paid' LIMIT 1`;
    const res = await query(sql, []);
    console.log("PAID BOOKING:", res);
  } catch (e) {
    console.error("SQL ERROR:", e.message);
  }
}
run();
