import { query, getOne } from "@/lib/db";
import { getSession, requireAuth } from "@/lib/auth";
import {
  success,
  error,
  created,
  unauthorized,
  forbidden,
} from "@/lib/response";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request, context) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized("Not authenticated");

    const params = await context.params;
    const { id: salonId } = params;

    // Verify user owns this salon or is an admin
    const checkOwner = await getOne(
      "SELECT * FROM salons WHERE id = ? AND owner_id = ?",
      [salonId, session.userId],
    );

    if (!checkOwner) {
      return forbidden(
        "You do not have permission to manage this salon's staff.",
      );
    }

    const { email } = await request.json();
    if (!email) {
      return error("Email address is required", 400);
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // == NEW CROSS-BUSINESS CONFLICT CHECKS ==
    const targetUser = await getOne(
      "SELECT id, role, first_name FROM users WHERE email = ?",
      [email],
    );
    let notificationAdded = false;

    if (targetUser) {
      if (targetUser.role === "owner") {
        const ownsSalon = await getOne(
          "SELECT name FROM salons WHERE owner_id = ?",
          [targetUser.id],
        );
        if (ownsSalon) {
          return error(
            `This exact email is already registered as the owner of another business (${ownsSalon.name}). They must use a different email to join your team as staff to avoid account conflicts.`,
            409,
          );
        }
      }

      const activeStaffOtherBusiness = await getOne(
        "SELECT s.id, sa.name FROM staff s JOIN salons sa ON s.salon_id = sa.id WHERE s.user_id = ? AND s.salon_id != ? AND s.is_active = 1",
        [targetUser.id, salonId],
      );

      if (activeStaffOtherBusiness) {
        return error(
          `This user is already an active staff member at another salon (${activeStaffOtherBusiness.name}). They cannot join multiple separate businesses under the identical staff account.`,
          409,
        );
      }
    }
    // ========================================

    // Check if staff is already joined to this salon
    const existingStaff = await getOne(
      `
      SELECT s.* FROM staff s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.salon_id = ? AND u.email = ?
    `,
      [salonId, email],
    );

    if (existingStaff) {
      return error("This user is already a staff member at this salon.", 409);
    }

    // Check if an invitation already exists and is pending
    const existingInvite = await getOne(
      "SELECT id FROM staff_invitations WHERE salon_id = ? AND email = ? AND status = 'pending'",
      [salonId, email],
    );

    const inviteId = crypto.randomUUID();

    if (existingInvite) {
      // Update existing pending invitation with new token & expiry
      await query(
        "UPDATE staff_invitations SET token = ?, expires_at = ? WHERE id = ?",
        [token, expiresAt, existingInvite.id],
      );
    } else {
      // Insert new invitation
      await query(
        `INSERT INTO staff_invitations 
        (id, salon_id, email, token, expires_at) 
        VALUES (?, ?, ?, ?, ?)`,
        [inviteId, salonId, email, token, expiresAt],
      );
    }

    // Send email via Resend
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteLink = `${origin}/invite?token=${token}`;

    if (targetUser) {
      // In-App Notification (Because the user already exists!)
      const notifData = JSON.stringify({
        action: "invite",
        token: token,
        origin: origin,
      });
      await query(
        `INSERT INTO notifications 
        (user_id, type, title, message, data, sent_at) 
        VALUES (?, 'push', ?, ?, ?, NOW())`,
        [
          targetUser.id,
          `Invitation to join ${checkOwner.name}`,
          `You have been invited to join ${checkOwner.name} as a staff member. Check your email or click here to accept!`,
          notifData,
        ],
      );
    }

    await sendEmail({
      to: email,
      subject: `You've been invited to join ${checkOwner.name} on Fresh`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited!</h2>
          <p>Hello,</p>
          <p>You have been invited to join the team at <strong>${checkOwner.name}</strong> on Fresh.</p>
          <p>Click the secure link below to accept your invitation and create your staff profile:</p>
          <div style="margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
          </div>
          <p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">If you did not expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    });

    return created({ message: "Invitation sent successfully" });
  } catch (err) {
    if (err.message === "Unauthorized")
      return unauthorized("Not authenticated");
    console.error("Invite staff error:", err);
    return error("Failed to send invitation");
  }
}
