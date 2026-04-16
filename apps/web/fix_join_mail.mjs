import fs from 'fs';

let content = fs.readFileSync('src/app/api/staff/request-join/route.js', 'utf8');

const topImports = `import { query, getOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { success, error } from "@/lib/response";
import { v4 as uuidv4 } from "uuid";`;

content = content.replace(topImports, topImports + '\nimport { sendEmail } from "@/lib/email";');

const notifBlock = `    // Attempt to notify owner/managers
    try {
      const recipientSql = \`
        SELECT u.id as user_id, u.email FROM users u 
        JOIN staff s ON s.user_id = u.id 
        WHERE s.salon_id = ? AND s.role IN ('owner', 'manager') AND s.is_active = 1
        UNION
        SELECT u.id as user_id, u.email FROM users u 
        JOIN salons sal ON sal.owner_id = u.id 
        WHERE sal.id = ?
      \`;
      const recipients = await query(recipientSql, [salonId, salonId]);
      
      const adminUsers = [];
      const seenIds = new Set();
      for (const r of recipients) {
        if (!seenIds.has(r.user_id) && r.user_id) {
          seenIds.add(r.user_id);
          adminUsers.push(r);
        }
      }
      
      for (const admin of adminUsers) {
        await query(
          "INSERT INTO notifications (id, user_id, salon_id, type, title, message, is_read, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [uuidv4(), admin.user_id, salonId, "STAFF_JOIN_REQUEST", "New Join Request", \`\${fullName} has requested to join your business.\`, 0, JSON.stringify({ invitationId: id, email: user.email, message: cleanMessage })]
        );
        
        if (admin.email) {
          await sendEmail({
            to: admin.email,
            subject: \`New joining request from \${fullName} (\${salon.name})\`,
            html: \`
              <h2>New Staff Request</h2>
              <p><strong>\${fullName}</strong> (\${user.email}) has requested to join your business, <b>\${salon.name}</b>, on Fresh.</p>
              \${cleanMessage ? \`<p><b>Message:</b> "<br/><i>\${cleanMessage}</i><br/>"</p>\` : ''}
              <p>You can review and accept or decline this request on your salon dashboard.</p>
              <p><a href="\${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/salon/\${salonId}/team" style="display:inline-block;padding:10px 20px;background:#3B82F6;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">View Request</a></p>
            \`
          }).catch(err => {
              console.error('Failed to send join request email to', admin.email, err);
          });
        }
      }
    } catch (notifErr) {
      console.error("Failed to insert notification or email:", notifErr);
      // Suppress notification error to allow success return
    }`;

const oldNotifBlockText = `      const recipientSql = \`
        SELECT user_id FROM staff 
        WHERE salon_id = ? AND role IN ('owner', 'manager') AND is_active = 1
        UNION
        SELECT owner_id as user_id FROM salons WHERE id = ?
      \`;
      const recipients = await query(recipientSql, [salonId, salonId]);
      
      const adminUserIds = [...new Set(recipients.map(r => r.user_id).filter(id => id !== null))];
      
      for (const adminId of adminUserIds) {
        await query(
          "INSERT INTO notifications (id, user_id, salon_id, type, title, message, is_read, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [uuidv4(), adminId, salonId, "STAFF_JOIN_REQUEST", "New Join Request", \`\${fullName} has requested to join your business.\`, 0, JSON.stringify({ invitationId: id, email: user.email, message: cleanMessage })]
        );
      }
    } catch (notifErr) {
      console.error("Failed to insert notification:", notifErr);
      // Suppress notification error to allow success return
    }`;

content = content.replace(
  oldNotifBlockText,
  notifBlock.substring(notifBlock.indexOf('      const recipientSql = `'))
);

fs.writeFileSync('src/app/api/staff/request-join/route.js', content);
