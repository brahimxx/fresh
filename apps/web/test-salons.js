const { query } = require('./src/lib/db.js');
async function test() {
  const userId = 1251;
  const userSql = `
    SELECT s.* 
    FROM salons s
    LEFT JOIN staff st ON st.salon_id = s.id AND st.user_id = ?
    WHERE (s.owner_id = ? OR st.user_id = ?) 
    AND s.deleted_at IS NULL
    GROUP BY s.id
    ORDER BY s.created_at DESC 
    LIMIT 20 OFFSET 0
  `;
  const salons = await query(userSql, [userId, userId, userId]);
  console.log(salons);
  process.exit(0);
}
test();
