import { decodeId } from '@/lib/id';
import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error, unauthorized, forbidden } from "@/lib/response";

export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized("Not authenticated");

    const rawParams = await params;
    const salonId = decodeId(rawParams.id);

    // Verify user is owner or manager
    const roleCheck = await getOne(
      "SELECT role FROM staff WHERE salon_id = ? AND user_id = ? AND is_active = 1",
      [salonId, session.userId]
    );
    
    // Check if owner directly if no staff role found
    const ownerCheck = await getOne("SELECT owner_id FROM salons WHERE id = ?", [salonId]);

    const isAuthorized = 
      (roleCheck && ['owner', 'manager'].includes(roleCheck.role)) || 
      (ownerCheck && Number(ownerCheck.owner_id) === Number(session.userId));

    if (!isAuthorized) {
      return forbidden("Permission denied");
    }

    // Fetch pending invitations joined with user details
    const requests = await query(
      `SELECT 
          i.id, i.email, i.role, i.status, i.created_at, i.message,
          u.first_name, u.last_name, u.avatar_url
       FROM staff_invitations i
       LEFT JOIN users u ON u.email = i.email
       WHERE i.salon_id = ? AND i.status = 'pending'
       ORDER BY i.created_at DESC`,
      [salonId]
    );

    return success({ requests });
  } catch (err) {
    console.error("Fetch Staff Requests Error:", err);
    return error("Failed to fetch requests", 500);
  }
}
