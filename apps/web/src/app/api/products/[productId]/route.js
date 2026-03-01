import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// GET /api/products/[productId] - Get product details
export async function GET(request, { params }) {
  try {
    const { productId } = await params;

    const product = await getOne('SELECT * FROM products WHERE id = ?', [productId]);

    if (!product) {
      return notFound('Product not found');
    }

    return success({
      id: product.id,
      salonId: product.salon_id,
      name: product.name,
      description: product.description,
      price: parseFloat(product.price),
      sku: product.sku,
      stockQuantity: product.stock_quantity,
      categoryId: product.category_id,
      isActive: product.is_active,
    });
  } catch (err) {
    console.error('Get product error:', err);
    return error('Failed to get product', 500);
  }
}

// PUT /api/products/[productId] - Update product
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { productId } = await params;

    const product = await getOne(
      'SELECT p.*, s.owner_id FROM products p JOIN salons s ON s.id = p.salon_id WHERE p.id = ?',
      [productId]
    );

    if (!product) {
      return notFound('Product not found');
    }

    if (session.role !== 'admin' && product.owner_id !== session.userId) {
      return forbidden('Not authorized to update this product');
    }

    const body = await request.json();
    const { name, description, price, sku, stockQuantity, categoryId, isActive } = body;

    await query(
      `UPDATE products SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        sku = COALESCE(?, sku),
        stock_quantity = COALESCE(?, stock_quantity),
        category_id = COALESCE(?, category_id),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, description, price, sku, stockQuantity, categoryId, isActive, productId]
    );

    const updated = await getOne('SELECT * FROM products WHERE id = ?', [productId]);

    return success({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      price: parseFloat(updated.price),
      sku: updated.sku,
      stockQuantity: updated.stock_quantity,
      categoryId: updated.category_id,
      isActive: updated.is_active,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update product error:', err);
    return error('Failed to update product', 500);
  }
}

// DELETE /api/products/[productId] - Delete product
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { productId } = await params;

    const product = await getOne(
      'SELECT p.*, s.owner_id FROM products p JOIN salons s ON s.id = p.salon_id WHERE p.id = ?',
      [productId]
    );

    if (!product) {
      return notFound('Product not found');
    }

    if (session.role !== 'admin' && product.owner_id !== session.userId) {
      return forbidden('Not authorized to delete this product');
    }

    await query('UPDATE products SET deleted_at = NOW(), is_active = 0 WHERE id = ? AND deleted_at IS NULL', [productId]);

    return success({ message: 'Product deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete product error:', err);
    return error('Failed to delete product', 500);
  }
}
