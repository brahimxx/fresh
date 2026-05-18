export const dynamic = "force-dynamic";
import { query, getOne } from "@/lib/db";
import { getSession, requireAuth, createToken } from "@/lib/auth";
import { cookies } from "next/headers";
import {
  success,
  error,
  created,
  unauthorized,
  forbidden,
} from "@/lib/response";
import { getCurrencyForCountry } from "@/lib/constants/currencies";

// GET /api/salons - List/Search salons (public for marketplace, or user's salons if authenticated)
export async function GET(request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "20")),
    );
    const city = searchParams.get("city");
    const search = searchParams.get("search");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = parseFloat(searchParams.get("radius")) || 10; // km
    const offset = (page - 1) * limit;

    // If authenticated, return user's salons instead of marketplace
    if (session?.userId) {
      // Simple query for user salons (owner or staff)
      const userSql = `
          SELECT s.* 
          FROM salons s
          LEFT JOIN staff st ON st.salon_id = s.id AND st.user_id = ? AND st.is_active = 1
          WHERE (s.owner_id = ? OR st.user_id = ?) 
          AND s.deleted_at IS NULL
          GROUP BY s.id
          ORDER BY s.created_at DESC 
          LIMIT ${Number(limit)} OFFSET ${Number(offset)}
        `;
      const userSalons = await query(userSql, [
        Number(session.userId),
        Number(session.userId),
        Number(session.userId),
      ]);
      for (const salon of userSalons) {
        // Get rating and review count
        const [stats] = await query(
          "SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(id) as review_count FROM reviews WHERE salon_id = ?",
          [salon.id],
        );
        salon.avg_rating = stats?.avg_rating || 0;
        salon.review_count = stats?.review_count || 0;

        // Get cover image
        const coverPhoto = await getOne(
          "SELECT image_url FROM salon_photos WHERE salon_id = ? AND is_cover = 1 LIMIT 1",
          [salon.id],
        );
        salon.cover_image = coverPhoto?.image_url || null;
      }

      const [{ total }] = await query(
        "SELECT COUNT(id) as total FROM salons WHERE owner_id = ? AND deleted_at IS NULL",
        [session.userId],
      );

      return success({
        salons: userSalons.map((salon) => ({
          id: salon.id,
          name: salon.name,
          description: salon.description,
          phone: salon.phone,
          email: salon.email,
          address: salon.address,
          city: salon.city,
          country: salon.country,
          latitude: salon.latitude,
          longitude: salon.longitude,
          currency: salon.currency,
          coverImage: salon.cover_image,
          avgRating: parseFloat(salon.avg_rating).toFixed(1),
          reviewCount: salon.review_count,
          isMarketplaceEnabled: salon.is_marketplace_enabled,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Public marketplace search
    let sql = `
      SELECT s.id, s.name, s.description, s.phone, s.email, s.address, s.city, s.country, 
             s.latitude, s.longitude, s.timezone, s.currency, s.is_marketplace_enabled, s.created_at,
             COALESCE(AVG(r.rating), 0) as avg_rating,
             COUNT(DISTINCT r.id) as review_count
      FROM salons s
      LEFT JOIN reviews r ON r.salon_id = s.id
      WHERE s.is_marketplace_enabled = 1 AND s.deleted_at IS NULL
    `;
    const params = [];

    if (city) {
      sql += " AND s.city = ?";
      params.push(city);
    }

    if (search) {
      sql += " AND (s.name LIKE ? OR s.description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Geo search with Haversine formula
    if (lat && lng) {
      sql += ` AND (
        6371 * acos(
          cos(radians(?)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(?)) +
          sin(radians(?)) * sin(radians(s.latitude))
        )
      ) <= ?`;
      params.push(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(lat),
        parseFloat(radius),
      );
    }

    sql +=
      " GROUP BY s.id, s.name, s.description, s.phone, s.email, s.address, s.city, s.country, s.latitude, s.longitude, s.timezone, s.currency, s.is_marketplace_enabled, s.created_at";
    sql += ` ORDER BY avg_rating DESC, s.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    let salons;
    try {
      salons = await query(sql, params);
    } catch (err) {
      console.error("List salons error:", err);
      console.error("Params:", params);
      console.error("Limit:", limit, "Offset:", offset);
      console.error("Page:", page, "searchParams:", searchParams.toString());
      throw err;
    }

    // Get cover images separately
    for (const salon of salons) {
      const coverPhoto = await getOne(
        "SELECT image_url FROM salon_photos WHERE salon_id = ? AND is_cover = 1 LIMIT 1",
        [salon.id],
      );
      salon.cover_image = coverPhoto?.image_url || null;
    }

    // Get total count
    let countSql =
      "SELECT COUNT(DISTINCT s.id) as total FROM salons s WHERE s.is_marketplace_enabled = 1 AND s.deleted_at IS NULL";
    const countParams = [];
    if (city) {
      countSql += " AND s.city = ?";
      countParams.push(city);
    }
    if (search) {
      countSql += " AND (s.name LIKE ? OR s.description LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
    }
    const [{ total }] = await query(countSql, countParams);

    return success({
      salons: salons.map((salon) => ({
        id: salon.id,
        name: salon.name,
        description: salon.description,
        phone: salon.phone,
        email: salon.email,
        address: salon.address,
        city: salon.city,
        country: salon.country,
        latitude: salon.latitude,
        longitude: salon.longitude,
        currency: salon.currency,
        coverImage: salon.cover_image,
        avgRating: parseFloat(salon.avg_rating).toFixed(1),
        reviewCount: salon.review_count,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("List salons error:", err);
    return error("Failed to list salons", 500);
  }
}

// POST /api/salons - Create a new salon
export async function POST(request) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const {
      name,
      description,
      phone,
      email,
      address,
      city,
      country,
      latitude,
      longitude,
      categories,
      isMarketplaceEnabled = true,
      is_physical,
      is_mobile,
      is_virtual,
    } = body;

    if (!name) {
      return error("Name is required");
    }

    // Determine hybrid flags: If client didn't supply them, try to infer from 'address' workaround
    let finalPhysical =
      is_physical !== undefined
        ? is_physical
        : address !== "Mobile or Virtual Provider";
    let finalMobile =
      is_mobile !== undefined
        ? is_mobile
        : address === "Mobile or Virtual Provider";
    let finalVirtual =
      is_virtual !== undefined
        ? is_virtual
        : address === "Mobile or Virtual Provider";

    const finalCity = city === "N/A" ? null : city;
    const finalCountry = country === "N/A" ? null : country;
    const finalAddress =
      address === "Mobile or Virtual Provider" ? null : address;

    // Derive currency from country (industry standard: one currency per salon)
    const salonCurrency = getCurrencyForCountry(finalCountry);

    const result = await query(
      `INSERT INTO salons (
        owner_id, name, description, phone, email, 
        address, city, country, latitude, longitude, 
        is_marketplace_enabled, currency, created_at,
        is_physical, is_mobile, is_virtual
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        session.userId,
        name,
        description || null,
        phone || null,
        email || null,
        finalAddress,
        finalCity,
        finalCountry,
        latitude || null,
        longitude || null,
        isMarketplaceEnabled,
        salonCurrency,
        finalPhysical ? 1 : 0,
        finalMobile ? 1 : 0,
        finalVirtual ? 1 : 0,
      ],
    );

    // Insert categories into the new relationship table
    if (categories && categories.length > 0) {
      for (let i = 0; i < categories.length; i++) {
        await query(
          `INSERT INTO salon_categories (salon_id, category_name, is_primary) VALUES (?, ?, ?)`,
          [result.insertId, categories[i], i === 0 ? 1 : 0],
        );
      }
    }

    // Promote user to owner if they are currently a client or staff
    await query(
      "UPDATE users SET role = 'owner' WHERE id = ? AND role IN ('client', 'staff')",
      [session.userId],
    );

    // Add the owner as the first staff member
    await query(
      `INSERT INTO staff (salon_id, user_id, title, role, is_visible, is_active, created_at)
       VALUES (?, ?, 'Owner', 'owner', 1, 1, NOW())`,
      [result.insertId, session.userId],
    );

    // Create default salon settings
    await query(
      `INSERT INTO salon_settings (salon_id, cancellation_policy_hours, no_show_fee, deposit_required, deposit_percentage, online_booking_enabled)
       VALUES (?, 24, 0.00, 0, 0, ?)`,
      [result.insertId, isMarketplaceEnabled ? 1 : 0],
    );

    // Create default widget settings
    await query(
      `INSERT INTO widget_settings (
        salon_id, enabled, primary_color, button_text, show_services, show_staff,
        show_prices, require_phone, require_email, success_message
      ) VALUES (?, ?, '#000000', 'Book Now', 1, 1, 1, 1, 1, 'Your booking has been confirmed!')`,
      [result.insertId, isMarketplaceEnabled ? 1 : 0]
    );

    // Reissue the JWT cookie with role:'owner' so the browser immediately
    // carries the updated role — prevents the stale 'client' JWT from
    // blocking dashboard access without requiring a logout/login cycle.
    const freshToken = await createToken({
      userId: session.userId,
      email: session.email,
      role: "owner",
    });
    const cookieStore = await cookies();
    cookieStore.set("token", freshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return created({
      id: result.insertId,
      name,
      description,
      phone,
      email,
      address,
      city,
      country,
      latitude,
      longitude,
      isMarketplaceEnabled,
    });
  } catch (err) {
    if (err.message === "Unauthorized") return unauthorized();
    console.error("Create salon error:", err);
    return error("Failed to create salon", 500);
  }
}
