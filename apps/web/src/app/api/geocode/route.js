import { geocodeAddress } from "@/lib/geo";
import { requireAuth } from "@/lib/auth";
import { success, error } from "@/lib/response";

// GET /api/geocode?address=... - Geocode an address to lat/lng
export async function GET(request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address || !address.trim()) {
      return error("Address is required", 400);
    }

    const coords = await geocodeAddress(address.trim());
    if (!coords) {
      return error("Could not geocode address", 404);
    }

    return success({
      lat: coords.lat,
      lng: coords.lng,
      address: address.trim(),
    });
  } catch (err) {
    if (err.message === "Unauthorized") {
      return error("Unauthorized", 401);
    }
    console.error("Geocode error:", err);
    return error("Failed to geocode address", 500);
  }
}
