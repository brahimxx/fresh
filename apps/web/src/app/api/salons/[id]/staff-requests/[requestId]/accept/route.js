import { decodeId } from "@/lib/id";
import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error, unauthorized, forbidden } from "@/lib/response";
import { sendEmail } from "@/lib/email";

export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized("Not authenticated");

    const rawParams = await params;
    const salonId = decodeId(rawParams.id);
    const requestId = rawParams.requestId;

    // Verify user is owner or manager
    const roleCheck = await getOne(
      "SELECT role FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1",
      [salonId, session.userId],
    );
    const ownerCheck = await getOne(
      "SELECT owner_id FROM salons WHERE id = ?",
      [salonId],
    );

    const isAuthorized =
      (roleCheck && ["owner", "manager"].includes(roleCheck.role)) ||
      (ownerCheck && ownerCheck.owner_id === session.userId);

    if (!isAuthorized) return forbidden("Permission denied");

    // Get the request
    const invite = await getOne(
      "SELECT * FROM staff_invitations WHERE id = ? AND salon_id = ? AND status = 'pending'",
      [requestId, salonId],
    );
    if (!invite) return error("Request not found or already processed", 404);

    // Ensure user exists
    const user = await getOne(
      "SELECT id, first_name, last_name, avatar_url FROM users WHERE email = ?",
      [invite.email],
    );
    if (!user)
      return error(
        "The user associated with this request could not be found",
        404,
      );

    // Create staff member
    await query(
      `INSERT INTO staff (salon_id, user_id, first_name, last_name, avatar_url, role, is_active, display_order)
       VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
      [
        salonId,
        user.id,
        user.first_name,
        user.last_name,
        user.avatar_url,
        invite.role,
      ],
    );

    // Update the user's global role to staff if they are just a client
    await query(
      "UPDATE users SET role = 'staff' WHERE id = ? AND role = 'client'",
      [user.id],
    );

    // Mark request as accepted
    await query(
      "UPDATE staff_invitations SET status = 'accepted' WHERE id = ?",
      [requestId],
    );

    // Send notifications to the user
    try {
      const salon = await getOne("SELECT name FROM salons WHERE id = ?", [
        salonId,
      ]);

      // In-app notification
      await query(
        "INSERT INTO notifications (user_id, type, title, message, sent_at, is_read, data) VALUES (?, ?, ?, ?, NOW(), ?, ?)",
        [
          user.id,
          "push",
          "Request Accepted",
          `Your request to join ${salon?.name || "the business"} has been accepted.`,
          0,
          JSON.stringify({
            action: "STAFF_REQUEST_ACCEPTED",
            salonId: salonId,
          }),
        ],
      );

      // Email notification
      if (invite.email) {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await sendEmail({
          to: invite.email,
          subject: `Join Request Accepted - ${salon?.name || "Fresh"}`,
          html: `
            <h2>You've been added to the team!</h2>
            <p>Your request to join <b>${salon?.name || "the business"}</b> on Fresh has been accepted.</p>
            <p>You can now access your staff dashboard to manage your schedule, clients, and services.</p>
            <br/>
            <a href="${appUrl}/dashboard" style="display:inline-block;padding:10px 20px;background-color:#3B82F6;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">
              Go to Dashboard
            </a>
          `,
        }).catch((err) => {
          console.error("Failed to send accepted email:", err.message);
        });
      }
    } catch (notifErr) {
      console.error("Failed to send acceptance notifications:", notifErr);
    }

    return success({ message: "Staff request accepted successfully" });
  } catch (err) {
    console.error("Accept Staff Request Error:", err);
    return error("Failed to accept request", 500);
  }
}
