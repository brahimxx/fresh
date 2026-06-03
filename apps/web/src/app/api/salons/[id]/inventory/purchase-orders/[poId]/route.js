import { NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function PUT(request, context) {
  try {
    const { id, poId } = await context.params;
    const session = await verifyAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const [po] = await query(`SELECT * FROM purchase_orders WHERE id = ? AND salon_id = ?`, [poId, id]);
    if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    
    if (po.status === 'received') {
      return NextResponse.json({ error: 'PO is already received' }, { status: 400 });
    }

    await transaction(async (connection) => {
      // 1. Update PO Status
      const updatePoQ = `UPDATE purchase_orders SET status = ?, received_date = IF(? = 'received', NOW(), received_date) WHERE id = ?`;
      await connection.query(updatePoQ, [status, status, poId]);

      // 2. If status is received, update stock and create movements
      if (status === 'received') {
        const [items] = await connection.query(`SELECT * FROM purchase_order_items WHERE po_id = ?`, [poId]);
        
        for (const item of items) {
          // Lock product row for safety
          const [[product]] = await connection.query(`SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE`, [item.product_id]);
          const currentQty = product.stock_quantity || 0;
          const newQty = currentQty + item.quantity;
          
          // Update product stock
          await connection.query(`UPDATE products SET stock_quantity = ? WHERE id = ?`, [newQty, item.product_id]);
          
          // Log movement
          await connection.query(
            `INSERT INTO product_stock_movements 
             (product_id, salon_id, change_type, quantity_before, quantity_after, delta, reason_code, reason_note, performed_by, purchase_order_id)
             VALUES (?, ?, 'add', ?, ?, ?, 'purchase_order_received', ?, ?, ?)`,
            [
              item.product_id, 
              id, 
              currentQty, 
              newQty, 
              item.quantity, 
              `Received from PO ${po.po_number}`, 
              session.userId, 
              poId
            ]
          );
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update PO error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
