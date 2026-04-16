import { config } from 'dotenv';
config({ path: '.env.local' });
import('./src/lib/db.js').then(async (db) => {
  const schema = await db.query("DESCRIBE notifications");
  console.log(schema);
  process.exit(0);
});
