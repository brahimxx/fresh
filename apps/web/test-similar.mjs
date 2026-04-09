import pool from './src/lib/db.js';
async function test() {
  const [rows] = await pool.query(`
    SELECT category_name FROM salon_categories WHERE salon_id = 163 ORDER BY is_primary DESC LIMIT 1
  `);
  console.log(rows);
  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
