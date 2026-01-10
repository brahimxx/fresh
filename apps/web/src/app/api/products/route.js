import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error, created, forbidden } from "@/lib/response";

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === "admin") return true;
  const salon = await getOne("SELECT owner_id FROM salons WHERE id = ?", [
    salonId,
  ]);
  if (!salon) return false;
  if (salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role IN ('manager') AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// GET /api/products - Get all products
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get("salon_id");
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search");
    const inStock = searchParams.get("in_stock");

    let sql = `
      SELECT p.*, pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE p.deleted_at IS NULL
    `;
    const params = [];

    if (salonId) {
      sql += " AND p.salon_id = ?";
      params.push(salonId);
    }

    if (categoryId) {
      sql += " AND p.category_id = ?";
      params.push(categoryId);
    }

    if (search) {
      sql += " AND (p.name LIKE ? OR p.sku LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (inStock === "true") {
      sql += " AND p.stock_quantity > 0";
    } else if (inStock === "false") {
      sql += " AND p.stock_quantity = 0";
    }

    sql += " ORDER BY p.name ASC";

    const products = await query(sql, params);

    return success({
      data: products.map((p) => ({
        id: p.id,
        salonId: p.salon_id,
        categoryId: p.category_id,
        categoryName: p.category_name,
        name: p.name,
        description: p.description,
        price: p.price,
        costPrice: p.cost_price,
        sku: p.sku,
        barcode: p.barcode,
        stockQuantity: p.stock_quantity,
        lowStockThreshold: p.low_stock_threshold,
        isActive: p.is_active,
        imageUrl: p.image_url,
      })),
    });
  } catch (err) {
    console.error("Get products error:", err);
    return error("Failed to get products", 500);
  }
}

// POST /api/products - Create a new product
export async function POST(request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const {
      salon_id,
      category_id,
      name,
      description,
      price,
      cost_price,
      sku,
      barcode,
      stock_quantity,
      low_stock_threshold,
      image_url,
    } = body;

    if (!salon_id) {
      return error("salon_id is required", 400);
    }

    if (!name) {
      return error("Product name is required", 400);
    }

    // Check salon access
    const hasAccess = await checkSalonAccess(
      salon_id,
      session.userId,
      session.role
    );
    if (!hasAccess) {
      return forbidden("Not authorized to add products to this salon");
    }

    const result = await query(
      `INSERT INTO products (salon_id, category_id, name, description, price, cost_price, sku, barcode, stock_quantity, low_stock_threshold, image_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        salon_id,
        category_id || null,
        name,
        description || null,
        price || 0,
        cost_price || null,
        sku || null,
        barcode || null,
        stock_quantity || 0,
        low_stock_threshold || 5,
        image_url || null,
      ]
    );

    const newProduct = await getOne(
      `SELECT p.*, pc.name as category_name
       FROM products p
       LEFT JOIN product_categories pc ON pc.id = p.category_id
       WHERE p.id = ?`,
      [result.insertId]
    );

    return created({
      id: newProduct.id,
      salonId: newProduct.salon_id,
      categoryId: newProduct.category_id,
      categoryName: newProduct.category_name,
      name: newProduct.name,
      description: newProduct.description,
      price: newProduct.price,
      costPrice: newProduct.cost_price,
      sku: newProduct.sku,
      stockQuantity: newProduct.stock_quantity,
      isActive: newProduct.is_active,
    });
  } catch (err) {
    console.error("Create product error:", err);
    return error("Failed to create product", 500);
  }
}
