import fs from 'fs';

let content = fs.readFileSync('src/app/api/staff/request-join/route.js', 'utf8');

const badNotifInsert = `        await query(
          "INSERT INTO notifications (id, user_id, salon_id, type, title, message, is_read, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [uuidv4(), admin.user_id, salonId, "STAFF_JOIN_REQUEST", "New Join Request", \\\`\\\${fullName} has requested to join your business.\\\`, 0, JSON.stringify({ invitationId: id, email: user.email, message: cleanMessage })]
        );`;

const newNotifInsert = `        await query(
          "INSERT INTO notifications (user_id, type, title, message, sent_at, is_read, data) VALUES (?, ?, ?, ?, NOW(), ?, ?)",
          [admin.user_id, 'push', "New Join Request", \`\${fullName} has requested to join your business.\`, 0, JSON.stringify({ action: 'STAFF_JOIN_REQUEST', invitationId: id, salonId: salonId, email: user.email, message: cleanMessage })]
        );`;

// Need to do this properly
content = content.replace(/await query\(\s*"INSERT INTO notifications \(id, user_id, salon_id, type, title, message, is_read, data\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)",\s*\[uuidv4\(\), admin\.user_id, salonId, "STAFF_JOIN_REQUEST", "New Join Request", `\${fullName} has requested to join your business\.`, 0, JSON\.stringify\(\{ invitationId: id, email: user\.email, message: cleanMessage \}\)\]\s*\);/g, newNotifInsert);

fs.writeFileSync('src/app/api/staff/request-join/route.js', content);
