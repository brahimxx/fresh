import { NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(request, context) {
  try {
    const { id } = await context.params;
    const session = await verifyAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { product_id, quantity, notes } = body;

    if (!product_id || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Valid product and quantity are required' }, { status: 400 });
    }

    await transaction(async (connection) => {
      // Lock product row for safety
      const [[product]] = await connection.query(`SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE`, [product_id]);
      if (!product) throw new Error('Product not found');
      
      const currentQty = product.stock_quantity || 0;
      const newQty = currentQty - quantity;
      
      // We allow stock to go negative for internal use as they might use it before restocking digitally.
      
      // Update product stock
      await connection.query(`UPDATE products SET stock_quantity = ? WHERE id = ?`, [newQty, product_id]);
      
      // Log movement
      await connection.query(
        `INSERT INTO product_stock_movements 
         (product_id, salon_id, change_type, quantity_before, quantity_after, delta, reason_code, reason_note, performed_by)
         VALUES (?, ?, 'subtract', ?, ?, ?, 'internal_use', ?, ?)`,
        [product_id, id, currentQty, newQty, -quantity, notes || 'Used at backbar', session.userId]
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Internal use logging error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
