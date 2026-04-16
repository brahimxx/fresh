import { getOne } from "@/lib/db";
import { success, error } from "@/lib/response";
import rateLimiter, { RateLimitPresets } from "@/lib/rate-limit";

// POST /api/auth/check - Check if an email exists
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Basic rate limit to prevent email enumeration bots
    const ip =
      request.ip ||
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
      
    const rateLimit = rateLimiter.check(
      `check:${ip}`,
      RateLimitPresets.AUTH.maxAttempts * 2,
      RateLimitPresets.AUTH.windowMs
    );

    if (!rateLimit.success) {
      return error(
        `Too many attempts. Please try again in ${rateLimit.retryAfter} seconds.`,
        429
      );
    }

    if (!email) {
      return error(
        { code: "MISSING_EMAIL", message: "Email is required" },
        400
      );
    }

    // Validate email format basic
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return error(
        { code: "INVALID_EMAIL", message: "Invalid email format." },
        400
      );
    }

    // Find user
    const user = await getOne(
      "SELECT id, first_name, avatar_url FROM users WHERE email = ?",
      [email]
    );

    // Return whether the user exists, and optionally public safe data (like first name)
    // to personalize the login screen e.g. "Welcome back, John!"
    return success({
      exists: !!user,
      firstName: user?.first_name || null,
      avatarUrl: user?.avatar_url || null,
    });
  } catch (err) {
    console.error("Auth check error:", err);
    return error("Failed to verify email", 500);
  }
}
