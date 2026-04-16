import { config } from 'dotenv';
config({ path: '.env.local' });
import('./src/lib/db.js').then(async (db) => {
  const salons = await db.query("SELECT id FROM salons LIMIT 1");
  const salonId = salons[0].id;
  const recipientSql = "SELECT u.id as user_id, u.email FROM users u INNER JOIN staff s ON s.user_id = u.id WHERE s.salon_id = ? AND s.role IN ('owner', 'manager') AND s.is_active = 1 UNION SELECT u.id as user_id, u.email FROM users u INNER JOIN salons sal ON sal.owner_id = u.id WHERE sal.id = ?";
  const recipients = await db.query(recipientSql, [salonId, salonId]);
  
  const adminUsers = [];
  const seenIds = new Set();
  for (const r of recipients) {
    if (!seenIds.has(r.user_id) && r.user_id) {
      seenIds.add(r.user_id);
      adminUsers.push(r);
    }
  }
  
  for (const admin of adminUsers) {
    try {
      await db.query(
        "INSERT INTO notifications (user_id, type, title, message, sent_at, is_read, data) VALUES (?, ?, ?, ?, NOW(), ?, ?)",
        [admin.user_id, 'push', "New Join Request", "Test has requested to join your business.", 0, JSON.stringify({ action: 'STAFF_JOIN_REQUEST', invitationId: '123', salonId: salonId, email: 'test@example.com', message: 'test message' })]
      );
      console.log("Success for admin:", admin.user_id);
    } catch(e) {
      console.error("FAIL for admin:", admin.user_id, e.message);
    }
  }
  process.exit(0);
});
