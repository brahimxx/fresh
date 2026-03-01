import { query, getOne } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/response';

// GET /api/auth/me - Get current user (expanded for profile page)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorized();
    }

    const user = await getOne(
      `SELECT id, email, phone, first_name, last_name, role, country,
              gender, date_of_birth, address, city, postal_code, avatar_url,
              created_at
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [session.userId]
    );

    if (!user) {
      return unauthorized();
    }

    return success({
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      country: user.country,
      gender: user.gender,
      dateOfBirth: user.date_of_birth,
      address: user.address,
      city: user.city,
      postalCode: user.postal_code,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      impersonatorAdminId: session.impersonatorAdminId || null,
    });
  } catch (err) {
    console.error('Get current user error:', err);
    return unauthorized();
  }
}

// PATCH /api/auth/me - Update current user profile
export async function PATCH(request) {
  try {
    const session = await getSession();
    if (!session) {
      return unauthorized();
    }

    const body = await request.json();
    const allowedFields = [
      'first_name', 'last_name', 'phone', 'email',
      'gender', 'date_of_birth', 'address', 'city',
      'postal_code', 'country', 'avatar_url'
    ];

    // Map camelCase body keys to snake_case DB columns
    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      phone: 'phone',
      email: 'email',
      gender: 'gender',
      dateOfBirth: 'date_of_birth',
      address: 'address',
      city: 'city',
      postalCode: 'postal_code',
      country: 'country',
      avatarUrl: 'avatar_url',
    };

    const updates = [];
    const values = [];

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (body[camelKey] !== undefined) {
        if (!allowedFields.includes(snakeKey)) continue;
        updates.push(`${snakeKey} = ?`);
        values.push(body[camelKey]);
      }
    }

    if (updates.length === 0) {
      return error('No valid fields to update', 400);
    }

    values.push(session.userId);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Re-fetch the updated user
    const updatedUser = await getOne(
      `SELECT id, email, phone, first_name, last_name, role, country,
              gender, date_of_birth, address, city, postal_code, avatar_url,
              created_at
       FROM users WHERE id = ?`,
      [session.userId]
    );

    return success({
      id: updatedUser.id,
      email: updatedUser.email,
      phone: updatedUser.phone,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      role: updatedUser.role,
      country: updatedUser.country,
      gender: updatedUser.gender,
      dateOfBirth: updatedUser.date_of_birth,
      address: updatedUser.address,
      city: updatedUser.city,
      postalCode: updatedUser.postal_code,
      avatarUrl: updatedUser.avatar_url,
      createdAt: updatedUser.created_at,
    });
  } catch (err) {
    // Handle duplicate email
    if (err.code === 'ER_DUP_ENTRY' && err.message.includes('email')) {
      return error('This email address is already in use by another account', 409);
    }
    console.error('Update user profile error:', err);
    return error('Failed to update profile', 500);
  }
}
