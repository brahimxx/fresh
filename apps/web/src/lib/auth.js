import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('SECURITY ERROR: JWT_SECRET environment variable is required');
  }
  if (secret.length < 32) {
    throw new Error('SECURITY ERROR: JWT_SECRET must be at least 32 characters for adequate security');
  }
  return new TextEncoder().encode(secret);
})();

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export async function createToken(payload, { expiresIn = "7d" } = {}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  // 1. Check Authorization header first (for B2B APIs, Mobile, and Test Suites)
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    if (payload) return payload;
  }

  // 2. Fall back to Cookie (for Next.js web browser clients)
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireRole(allowedRoles) {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function verifyAuth(request) {
  // 1. Check original auth header
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    if (payload) return payload;
  }
  
  // 2. Fall back to checking cookies attached to the request
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    // Basic extraction of 'token' cookie. For robust parsing consider using cookie libs, but next/headers or primitive split works for now
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (tokenMatch && tokenMatch[1]) {
      return verifyToken(tokenMatch[1]);
    }
  }
  
  // 3. Fall back to getSession (uses async next/headers)
  return getSession();
}
