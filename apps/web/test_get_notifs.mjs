import { config } from 'dotenv';
config({ path: '.env.local' });
import('./src/lib/db.js').then(async (db) => {
  const notifs = await db.query("SELECT * FROM notifications ORDER BY sent_at DESC LIMIT 5");
  console.log(notifs.map(n => ({ id: n.id, user_id: n.user_id, title: n.title })));
  process.exit(0);
});
