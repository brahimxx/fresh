import { config } from 'dotenv';
config({ path: '.env.local' });
import('./src/lib/db.js').then(async (db) => {
  const salons = await db.query("SELECT id, owner_id FROM salons ORDER BY id DESC LIMIT 5");
  console.log("Recent salons:", salons);
  const staff = await db.query("SELECT * FROM staff WHERE role='owner' ORDER BY id DESC LIMIT 5");
  console.log("Recent owners in staff:", staff);
  process.exit(0);
});
