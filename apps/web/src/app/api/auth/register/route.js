import { query, getOne } from '@/lib/db';
import { hashPassword, verifyPassword, createToken } from '@/lib/auth';
import { success, error, created } from '@/lib/response';
import { cookies } from 'next/headers';

// POST /api/auth/register - Register a new user
export async function POST(request) {
  try {
    const body = await request.json();
    // Accept both camelCase and snake_case from client
    const email = body.email;
    const phone = body.phone ?? null;
    const password = body.password;
    const firstName = body.firstName ?? body.first_name;
    const lastName = body.lastName ?? body.last_name;
    const country = body.country ?? null;
    const role = body.role ?? 'client';

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return error('Missing required fields: email, password, first name, and last name are required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return error('Invalid email format. Please provide a valid email address.', 400);
    }

    // Validate password strength
    if (password.length < 8) {
      return error('Password must be at least 8 characters long', 400);
    }
    if (!/[A-Z]/.test(password)) {
      return error('Password must contain at least one uppercase letter', 400);
    }
    if (!/[a-z]/.test(password)) {
      return error('Password must contain at least one lowercase letter', 400);
    }
    if (!/[0-9]/.test(password)) {
      return error('Password must contain at least one number', 400);
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return error('Password must contain at least one special character (!@#$%^&*)', 400);
    }

    // Check if email already exists
    const existingUser = await getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return error('This email is already registered. Please use a different email or try logging in.', 409);
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const result = await query(
      `INSERT INTO users (email, phone, country, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [email, phone || null, country, passwordHash, firstName, lastName, role]
    );

    // Create token
    const token = await createToken({
      userId: result.insertId,
      email,
      role,
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return created({
      user: {
        id: result.insertId,
        email,
        firstName,
        lastName,
        role,
        country,
      },
      token,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return error('An unexpected error occurred during registration. Please try again.', 500);
  }
}
