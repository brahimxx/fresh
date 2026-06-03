import { NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(request, context) {
  try {
    const { id } = await context.params;
    const session = await verifyAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const pos = await query(
      `SELECT po.*, v.name as vendor_name, u.first_name, u.last_name
       FROM purchase_orders po
       JOIN product_vendors v ON v.id = po.vendor_id
       JOIN users u ON u.id = po.created_by
       WHERE po.salon_id = ? 
       ORDER BY po.created_at DESC`,
      [id]
    );

    // Fetch items
    if (pos.length > 0) {
      const poIds = pos.map(p => p.id);
      const items = await query(
        `SELECT poi.*, p.name as product_name, p.sku 
         FROM purchase_order_items poi
         JOIN products p ON p.id = poi.product_id
         WHERE poi.po_id IN (?)`,
        [poIds]
      );
      
      const itemsByPo = items.reduce((acc, item) => {
        if (!acc[item.po_id]) acc[item.po_id] = [];
        acc[item.po_id].push(item);
        return acc;
      }, {});

      pos.forEach(po => {
        po.items = itemsByPo[po.id] || [];
      });
    }

    return NextResponse.json({ data: pos });
  } catch (error) {
    console.error('Fetch PO error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const { id } = await context.params;
    const session = await verifyAuth(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { vendor_id, expected_date, notes, items } = body;

    if (!vendor_id || !items || !items.length) {
      return NextResponse.json({ error: 'Vendor and items are required' }, { status: 400 });
    }

    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.unit_cost) * parseInt(item.quantity, 10)), 0);
    const poNumber = 'PO-' + Date.now().toString().slice(-6);

    const result = await transaction(async (connection) => {
      const [poRes] = await connection.query(
        `INSERT INTO purchase_orders 
         (salon_id, vendor_id, po_number, status, total_amount, expected_date, notes, created_by) 
         VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)`,
        [id, vendor_id, poNumber, totalAmount, expected_date || null, notes, session.userId]
      );
      
      const poId = poRes.insertId;

      for (const item of items) {
        const qty = parseInt(item.quantity, 10);
        const cost = parseFloat(item.unit_cost);
        const total = qty * cost;
        await connection.query(
          `INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost, total_cost) 
           VALUES (?, ?, ?, ?, ?)`,
          [poId, item.product_id, qty, cost, total]
        );
      }

      return poId;
    });

    const [newPo] = await query(`SELECT * FROM purchase_orders WHERE id = ?`, [result]);

    return NextResponse.json({ data: newPo });
  } catch (error) {
    console.error('Create PO error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
