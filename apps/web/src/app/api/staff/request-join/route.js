import { query, getOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { success, error } from "@/lib/response";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "@/lib/email";

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.userId) return error("Unauthorized", 401);

    const { salonId, message } = await request.json();
    if (!salonId) return error("Salon ID is required", 400);

    // Get salon
    const salon = await getOne(
      "SELECT * FROM salons WHERE id = ? AND deleted_at IS NULL",
      [salonId],
    );
    if (!salon) return error("Salon not found", 404);

    // Get user info
    const user = await getOne(
      "SELECT first_name, last_name, email FROM users WHERE id = ?",
      [session.userId],
    );
    if (!user) return error("User not found", 404);

    const fullName =
      `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email;

    // Check if staff already exists
    const existingStaff = await getOne(
      "SELECT * FROM staff WHERE salon_id = ? AND user_id = ?",
      [salonId, session.userId],
    );

    if (existingStaff) {
      return error("You are already associated with this business.", 400);
    }

    // Check if invitation already exists
    const existingRequest = await getOne(
      "SELECT * FROM staff_invitations WHERE salon_id = ? AND email = ? AND status = 'pending'",
      [salonId, user.email],
    );

    if (existingRequest) {
      return error(
        "A request or invitation is already pending for this business.",
        400,
      );
    }

    // Insert staff invitation marking it as pending request
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const token = uuidv4();
    const id = uuidv4();

    // Default message constraint
    const maxMessageLength = 255;
    const cleanMessage = message
      ? String(message).slice(0, maxMessageLength)
      : null;

    try {
      await query(
        "INSERT INTO staff_invitations (id, salon_id, email, role, token, status, expires_at, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          id,
          salonId,
          user.email,
          "staff",
          token,
          "pending",
          expiresAt,
          cleanMessage,
        ],
      );
    } catch (e) {
      // In case they haven't manually run the migration yet, fallback to inserting without message
      if (e.message && e.message.includes("Unknown column")) {
        await query(
          "INSERT INTO staff_invitations (id, salon_id, email, role, token, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [id, salonId, user.email, "staff", token, "pending", expiresAt],
        );
        console.warn(
          "Inserted invitation without message due to missing column. Run migrations.",
        );
      } else {
        throw e;
      }
    }

    // Attempt to notify owner/managers
    try {
      const recipientSql = `
        SELECT u.id as user_id, u.email FROM users u 
        JOIN staff s ON s.user_id = u.id 
        WHERE s.salon_id = ? AND s.role IN ('owner', 'manager') AND s.is_active = 1
        UNION
        SELECT u.id as user_id, u.email FROM users u 
        JOIN salons sal ON sal.owner_id = u.id 
        WHERE sal.id = ?
      `;
      const recipients = await query(recipientSql, [salonId, salonId]);

      const adminUsers = [];
      const seenIds = new Set();
      for (const r of recipients) {
        if (!seenIds.has(r.user_id) && r.user_id) {
          seenIds.add(r.user_id);
          adminUsers.push(r);
        }
      }

      console.log(
        `[Join Request] Found ${adminUsers.length} admins for salon ${salonId}`,
      );

      for (const admin of adminUsers) {
        await query(
          "INSERT INTO notifications (user_id, type, title, message, sent_at, is_read, data) VALUES (?, ?, ?, ?, NOW(), ?, ?)",
          [
            admin.user_id,
            "push",
            "New Join Request",
            `${fullName} has requested to join your business.`,
            0,
            JSON.stringify({
              action: "STAFF_JOIN_REQUEST",
              invitationId: id,
              salonId: salonId,
              email: user.email,
              message: cleanMessage,
            }),
          ],
        );

        if (admin.email) {
          await sendEmail({
            to: admin.email,
            subject: `New joining request from ${fullName} (${salon.name})`,
            html: `
              <h2>New Staff Request</h2>
              <p><strong>${fullName}</strong> (${user.email}) has requested to join your business, <b>${salon.name}</b>, on Fresh.</p>
              ${cleanMessage ? `<p><b>Message:</b> "<br/><i>${cleanMessage}</i><br/>"</p>` : ""}
              <p>You can review and accept or decline this request on your salon dashboard.</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/salon/${salonId}/team" style="display:inline-block;padding:10px 20px;background:#3B82F6;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">View Request</a></p>
            `,
          }).catch((err) => {
            console.error(
              "Failed to send join request email to",
              admin.email,
              err,
            );
          });
        }
      }
    } catch (notifErr) {
      console.error(
        "Failed to insert notification or email:",
        notifErr.message,
        notifErr.stack,
      );
      // Suppress notification error to allow success return
    }

    return success({ message: "Request sent successfully", id });
  } catch (err) {
    console.error("Request Join Error:", err);
    return error("Failed to send request", 500);
  }
}
