import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, created } from '@/lib/response';

// GET /api/user/addresses
// Fetch all active addresses for the logged-in user
export async function GET(request) {
  try {
    const session = await requireAuth();

    const addresses = await query(
      `SELECT id, label, icon_name, full_address, lat, lng, is_default, created_at
       FROM user_addresses 
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY is_default DESC, created_at DESC`,
      [session.userId]
    );

    return success({
      addresses: addresses.map((a) => ({
        id: a.id,
        label: a.label,
        iconName: a.icon_name,
        fullAddress: a.full_address,
        lat: parseFloat(a.lat),
        lng: parseFloat(a.lng),
        isDefault: !!a.is_default,
        createdAt: a.created_at,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Failed to get user addresses:', err);
    return error('Failed to get user addresses', 500);
  }
}

// POST /api/user/addresses
// Add a new address
export async function POST(request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    
    const { label, icon_name, full_address, lat, lng, is_default } = body;

    // Validation
    if (!label || !full_address || !lat || !lng) {
      return error('Missing required fields: label, full_address, lat, lng', 400);
    }

    const iconName = icon_name || 'MapPin';
    const isDefaultValue = is_default ? 1 : 0;

    // If making this default, unset previous defaults
    if (isDefaultValue) {
      await query(
        `UPDATE user_addresses SET is_default = 0 WHERE user_id = ? AND deleted_at IS NULL`,
        [session.userId]
      );
    }

    // Insert new address
    const result = await query(
      `INSERT INTO user_addresses (user_id, label, icon_name, full_address, lat, lng, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [session.userId, label, iconName, full_address, lat, lng, isDefaultValue]
    );

    return created({
      id: result.insertId,
      label,
      iconName,
      fullAddress: full_address,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      isDefault: !!isDefaultValue
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Failed to create address:', err);
    return error('Failed to create address', 500);
  }
}
