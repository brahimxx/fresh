import { config } from 'dotenv';
config({ path: '.env.local' });
import('./src/lib/db.js').then(async (db) => {
  const recipientSql = "SELECT u.id as user_id, u.email FROM users u INNER JOIN salons sal ON sal.owner_id = u.id WHERE sal.id = ?";
  const salons = await db.query(recipientSql, [163]);
  console.log("Salons owner query:", salons);
  
  const staffSql = "SELECT u.id as user_id, u.email FROM users u INNER JOIN staff s ON s.user_id = u.id WHERE s.salon_id = ? AND s.role IN ('owner', 'manager') AND s.is_active = 1";
  const staff = await db.query(staffSql, [163]);
  console.log("Staff query:", staff);
  process.exit(0);
});
