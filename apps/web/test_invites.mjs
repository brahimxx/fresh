import { config } from 'dotenv';
config({ path: '.env.local' });
import('./src/lib/db.js').then(async (db) => {
  const invites = await db.query("SELECT * FROM staff_invitations ORDER BY created_at DESC LIMIT 3");
  console.log(invites);
  process.exit(0);
});
