import pool from './src/lib/db.js';
async function test() {
  const [rows] = await pool.query('SELECT * FROM salons WHERE id = 163 AND deleted_at IS NULL');
  console.log(rows);
  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
