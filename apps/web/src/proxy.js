import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge middleware — runs before every matched request.
 *
 * Responsibilities:
 *  1. Protect /dashboard/* and /onboarding/* — redirect to /login when the
 *     JWT cookie is missing or invalid.
 *  2. Block `client`-role users from /dashboard/* — redirect to /.
 *  3. Redirect already-authenticated users away from the auth pages
 *     (/login, /register, /forgot-password, /reset-password) to /dashboard
 *     so they don't see a flash of the login form after refresh.
 *
 * NOTE: middleware runs at the Edge runtime and cannot use Node.js APIs
 * (mysql2, fs, etc.).  JWT is verified only by signature — no DB lookup.
 * The /auth/me API route (called by auth-provider on the client) handles
 * the authoritative DB role check.
 */

const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/choose",
];

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];

async function getPayload(token) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  // ── 1. Protected routes ──────────────────────────────────────────────────
  if (isProtected) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await getPayload(token);

    if (!payload) {
      // Expired / tampered token — clear it and send to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete("token");
      return res;
    }

    // Clients should not access the management dashboard
    if (pathname.startsWith("/dashboard") && payload.role === "client") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Admin users: redirect /dashboard (not /dashboard/admin) to /dashboard/admin
    if (
      payload.role === "admin" &&
      pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/dashboard/admin")
    ) {
      return NextResponse.redirect(new URL("/dashboard/admin", request.url));
    }

    // Non-admin users should not access admin dashboard
    if (
      pathname.startsWith("/dashboard/admin") &&
      payload.role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // ── 2. Auth pages — redirect authenticated users away ────────────────────
  if (isAuthPage && token) {
    const payload = await getPayload(token);
    if (payload) {
      // Route by role: admin → admin dashboard, owner/staff → dashboard, client → marketplace
      let dest = "/";
      if (payload.role === "admin") dest = "/dashboard/admin";
      else if (payload.role !== "client") dest = "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (Next.js build assets)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - /api/*        (API routes handle their own auth via requireAuth())
     *  - /public/*     (static files)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/|public/).*)",
  ],
};
