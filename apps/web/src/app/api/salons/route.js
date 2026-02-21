import { query, getOne } from "@/lib/db";
import { getSession, requireAuth } from "@/lib/auth";
import {
  success,
  error,
  created,
  unauthorized,
  forbidden,
} from "@/lib/response";

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
      // Simple query for user salons (embed LIMIT/OFFSET; MySQL doesn't allow binding them)
      const userSql = `SELECT * FROM salons WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
      const userSalons = await query(userSql, [Number(session.userId)]);

      // Get stats and cover images separately
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
      isMarketplaceEnabled = true,
    } = body;

    if (!name || !city || !country) {
      return error("Name, city, and country are required");
    }

    const result = await query(
      `INSERT INTO salons (owner_id, name, description, phone, email, address, city, country, latitude, longitude, is_marketplace_enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        session.userId,
        name,
        description || null,
        phone || null,
        email || null,
        address || null,
        city,
        country,
        latitude || null,
        longitude || null,
        isMarketplaceEnabled,
      ],
    );

    // Promote user to owner if they are currently a client
    await query(
      "UPDATE users SET role = 'owner' WHERE id = ? AND role = 'client'",
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
      `INSERT INTO salon_settings (salon_id, cancellation_policy_hours, no_show_fee, deposit_required, deposit_percentage)
       VALUES (?, 24, 0.00, 0, 0)`,
      [result.insertId],
    );

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
