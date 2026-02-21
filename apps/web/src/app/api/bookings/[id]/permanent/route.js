import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  success,
  error,
  notFound,
  forbidden,
  unauthorized,
} from "@/lib/response";

// Helper to check booking access
async function checkBookingAccess(bookingId, userId, userRole) {
  const booking = await getOne(
    `SELECT b.*, s.owner_id 
     FROM bookings b
     JOIN salons s ON s.id = b.salon_id
     WHERE b.id = ?`,
    [bookingId],
  );

  if (!booking) {
    return { access: false, booking: null };
  }

  // Admin has full access
  if (userRole === "admin") {
    return { access: true, booking };
  }

  // Owner has access to their salon's bookings
  if (booking.owner_id === userId) {
    return { access: true, booking };
  }

  // Manager has access to their salon's bookings
  const isManager = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [booking.salon_id, userId],
  );
  if (isManager) {
    return { access: true, booking };
  }

  return { access: false, booking };
}

// DELETE /api/bookings/[id]/permanent - Permanently delete booking
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const { access, booking } = await checkBookingAccess(
      id,
      session.userId,
      session.role,
    );
    if (!access) {
      return forbidden("Not authorized to delete this booking");
    }

    if (!booking) {
      return notFound("Booking not found");
    }

    // Delete related records first (foreign key constraints)
    await query("DELETE FROM booking_services WHERE booking_id = ?", [id]);

    // Delete the booking
    await query("DELETE FROM bookings WHERE id = ?", [id]);

    return success({ message: "Booking deleted permanently" });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Delete booking error:", err);
    return error("Failed to delete booking", 500);
  }
}
