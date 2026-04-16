import { config } from 'dotenv';
config({ path: '.env.local' });
import('./src/lib/db.js').then(async (db) => {
  const rs = await db.query("DESCRIBE users");
  const roleRow = rs.find(r => r.Field === 'role');
  console.log(roleRow);
  process.exit(0);
});
