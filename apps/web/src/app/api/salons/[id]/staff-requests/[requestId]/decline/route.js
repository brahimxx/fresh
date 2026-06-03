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
      (ownerCheck && Number(ownerCheck.owner_id) === Number(session.userId));

    if (!isAuthorized) return forbidden("Permission denied");

    // Get the request
    const invite = await getOne(
      "SELECT * FROM staff_invitations WHERE id = ? AND salon_id = ? AND status = 'pending'",
      [requestId, salonId],
    );
    if (!invite) return error("Request not found or already processed", 404);

    // Mark request as revoked/declined
    await query(
      "UPDATE staff_invitations SET status = 'revoked' WHERE id = ?",
      [requestId],
    );

    // Send notifications to the user
    try {
      const salon = await getOne("SELECT name FROM salons WHERE id = ?", [
        salonId,
      ]);
      const user = await getOne("SELECT id FROM users WHERE email = ?", [
        invite.email,
      ]);

      // In-app notification
      if (user) {
        await query(
          "INSERT INTO notifications (user_id, type, title, message, sent_at, is_read, data) VALUES (?, ?, ?, ?, NOW(), ?, ?)",
          [
            user.id,
            "push",
            "Request Declined",
            `Your request to join ${salon?.name || "the business"} has been declined by the owner or manager.`,
            0,
            JSON.stringify({
              action: "STAFF_REQUEST_DECLINED",
              salonId: salonId,
            }),
          ],
        );
      }

      // Email notification
      if (invite.email) {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await sendEmail({
          to: invite.email,
          subject: `Update on your Join Request - ${salon?.name || "Fresh"}`,
          html: `
            <h2>Join Request Update</h2>
            <p>Your request to join <b>${salon?.name || "the business"}</b> on Fresh has been declined by the business administrator.</p>
            <p>If you believe this was a mistake, please reach out to the business directly. You can also explore other businesses to join.</p>
            <br/>
            <a href="${appUrl}/onboarding/choose" style="display:inline-block;padding:10px 20px;background-color:#3B82F6;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">
              Explore Workplaces
            </a>
          `,
        }).catch((err) => {
          console.error("Failed to send declined email:", err.message);
        });
      }
    } catch (notifErr) {
      console.error("Failed to send decline notifications:", notifErr);
    }

    return success({ message: "Staff request declined" });
  } catch (err) {
    console.error("Decline Staff Request Error:", err);
    return error("Failed to decline request", 500);
  }
}
