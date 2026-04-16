import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error, forbidden } from "@/lib/response";

export async function POST(request) {
  try {
    const session = await requireAuth();
    if (!session)
      return forbidden("You must be logged in to accept invitations");

    const body = await request.json();
    const token = body.token;

    if (!token) return error("Token is required");

    // Look up the invite and ensure the salon is not deleted
    const invite = await getOne(
      `SELECT i.* FROM staff_invitations i 
       JOIN salons s ON i.salon_id = s.id 
       WHERE i.token = ? AND i.status = 'pending' AND s.deleted_at IS NULL`,
      [token],
    );

    if (!invite) {
      return error("Invalid, expired, or already accepted invitation.", 400);
    }

    if (new Date(invite.expires_at) < new Date()) {
      return error("This invitation has expired.", 400);
    }

    // Double check email matching user's currently authenticated session
    // Because maybe the user logged into a different account but the page let them click (client side bypassed)
    // Actually, I need to fetch the session user's email to make sure they match!
    const user = await getOne(
      "SELECT email, first_name, last_name FROM users WHERE id = ?",
      [session.userId],
    );

    if (!user || user.email !== invite.email) {
      return error(
        `Account mismatch. Invitation is for ${invite.email}, you are logged in as ${user?.email}`,
        403,
      );
    }

    // 1. Transactionally check if user is already a staff member in that salon
    const existing = await getOne(
      "SELECT id FROM staff WHERE user_id = ? AND salon_id = ?",
      [session.userId, invite.salon_id],
    );

    if (existing) {
      // User is already staff. Just mark invite as accepted
      await query(
        "UPDATE staff_invitations SET status = 'accepted' WHERE id = ?",
        [invite.id],
      );
      return success({
        message: "You are already a staff member at this salon",
        salonId: invite.salon_id,
      });
    }

    // 2. Add user to `staff` table
    await query(
      `
      INSERT INTO staff (salon_id, user_id, first_name, last_name, role, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `,
      [
        invite.salon_id,
        session.userId,
        user.first_name || "",
        user.last_name || "",
        invite.role,
      ],
    );

    // Update global user role to staff if they are currently just a client
    await query(
      "UPDATE users SET role = 'staff' WHERE id = ? AND role = 'client'",
      [session.userId],
    );

    // 3. Mark invite as accepted
    await query(
      "UPDATE staff_invitations SET status = 'accepted' WHERE id = ?",
      [invite.id],
    );

    return success({
      message: "Invitation accepted",
      salonId: invite.salon_id,
    });
  } catch (err) {
    if (err.message === "Unauthorized") return forbidden("Not authenticated");
    console.error("Accept invite error:", err);
    return error("Internal server error");
  }
}
