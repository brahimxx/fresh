import { query, getOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId");
  const salonId = searchParams.get("salonId");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";

  if (!bookingId || !salonId) {
    return NextResponse.redirect(`${baseUrl}/`);
  }

  try {
    // Check if the booking is still pending payment
    const payment = await getOne(
      "SELECT status FROM payments WHERE booking_id = ? AND method = 'card'",
      [bookingId]
    );

    if (payment && payment.status === "pending") {
      // The user hit the "Back" button on Stripe without paying. 
      // Instantly cancel the abandoned booking to free up the calendar slot.
      await query(
        "UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Abandoned Checkout' WHERE id = ?",
        [bookingId]
      );
      await query(
        "UPDATE payments SET status = 'refunded' WHERE booking_id = ?",
        [bookingId]
      );
    }
  } catch (error) {
    console.error("Failed to cancel abandoned checkout:", error);
  }

  // Redirect them back to the booking page with an error/reset step
  return NextResponse.redirect(`${baseUrl}/book/${salonId}?error=checkout_cancelled`);
}