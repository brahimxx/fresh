import { config } from 'dotenv';
config({ path: '.env.local' });
import('./src/lib/db.js').then(async (db) => {
  const users = await db.query("SELECT * FROM users ORDER BY id DESC LIMIT 5");
  console.log("Recent users:", users.map(u => ({id: u.id, email: u.email, first_name: u.first_name, last_name: u.last_name })));
  
  const staff = await db.query("SELECT * FROM staff ORDER BY id DESC LIMIT 5");
  console.log("Recent staff:", staff.map(s => ({id: s.id, salon_id: s.salon_id, user_id: s.user_id, first_name: s.first_name, last_name: s.last_name, is_active: s.is_active })));
  process.exit(0);
});
