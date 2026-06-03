const mysql = require('mysql2/promise');

async function testInventoryLifecycle() {
  console.log("=== Testing Full Inventory Lifecycle ===");
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'fresh',
  });

  try {
    const salonId = 163;

    // Fetch an admin/owner user to act as creator
    const [users] = await pool.query('SELECT id FROM users LIMIT 1');
    const userId = users[0].id;

    // Fetch a product
    const [products] = await pool.query('SELECT id, name, stock_quantity FROM products WHERE salon_id = ? LIMIT 1', [salonId]);
    if (products.length === 0) {
      console.log("No products found for this salon. Cannot run test.");
      return;
    }
    const product = products[0];
    const initialStock = product.stock_quantity;
    console.log(`Product: ${product.name} | Initial Stock: ${initialStock}`);

    // 1. Create a Vendor
    const [vendorRes] = await pool.query(
      `INSERT INTO product_vendors (salon_id, name, contact_email) VALUES (?, 'L''Oreal Professional', 'orders@loreal.com')`,
      [salonId]
    );
    const vendorId = vendorRes.insertId;
    console.log(`✅ Created Vendor #${vendorId} (L'Oreal Professional)`);

    // 2. Create a Purchase Order (Draft -> Ordered)
    const poNumber = 'PO-' + Date.now().toString().slice(-6);
    const [poRes] = await pool.query(
      `INSERT INTO purchase_orders (salon_id, vendor_id, po_number, status, total_amount, expected_date, created_by)
       VALUES (?, ?, ?, 'ordered', 120.00, '2023-12-01', ?)`,
      [salonId, vendorId, poNumber, userId]
    );
    const poId = poRes.insertId;
    
    // 3. Add item to PO
    const orderQty = 10;
    await pool.query(
      `INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost, total_cost)
       VALUES (?, ?, ?, 12.00, 120.00)`,
      [poId, product.id, orderQty]
    );
    console.log(`✅ Created Purchase Order ${poNumber} for ${orderQty} units.`);

    // 4. Receive Purchase Order (simulate PUT /api/.../inventory/purchase-orders/:id)
    await pool.query(`UPDATE purchase_orders SET status = 'received', received_date = NOW() WHERE id = ?`, [poId]);
    
    // Update stock and log movement
    const newQtyAfterPO = initialStock + orderQty;
    await pool.query(`UPDATE products SET stock_quantity = ? WHERE id = ?`, [newQtyAfterPO, product.id]);
    await pool.query(
      `INSERT INTO product_stock_movements (product_id, salon_id, change_type, quantity_before, quantity_after, delta, reason_code, reason_note, performed_by, purchase_order_id)
       VALUES (?, ?, 'add', ?, ?, ?, 'purchase_order_received', ?, ?, ?)`,
      [product.id, salonId, initialStock, newQtyAfterPO, orderQty, `Received PO ${poNumber}`, userId, poId]
    );
    console.log(`✅ Received PO. Stock is now ${newQtyAfterPO}. Added +${orderQty}`);

    // 5. Internal Backbar Usage (simulate POST /api/.../inventory/internal-use)
    const useQty = 2;
    const newQtyAfterUse = newQtyAfterPO - useQty;
    await pool.query(`UPDATE products SET stock_quantity = ? WHERE id = ?`, [newQtyAfterUse, product.id]);
    await pool.query(
      `INSERT INTO product_stock_movements (product_id, salon_id, change_type, quantity_before, quantity_after, delta, reason_code, reason_note, performed_by)
       VALUES (?, ?, 'subtract', ?, ?, ?, 'internal_use', 'Used at backbar for VIP client', ?)`,
      [product.id, salonId, newQtyAfterPO, newQtyAfterUse, -useQty, userId]
    );
    console.log(`✅ Logged Internal Use. Stock is now ${newQtyAfterUse}. Deducted -${useQty}`);

    // 6. Verify Final State
    const [finalProduct] = await pool.query('SELECT stock_quantity FROM products WHERE id = ?', [product.id]);
    console.log(`\nVerification: DB Stock Quantity = ${finalProduct[0].stock_quantity} (Expected: ${newQtyAfterUse})`);
    
    if (finalProduct[0].stock_quantity === newQtyAfterUse) {
      console.log(`✅ Inventory Lifecycle Test Complete! Everything passed.`);
    } else {
      console.error(`❌ Mismatch detected.`);
    }

  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    await pool.end();
  }
}

testInventoryLifecycle();
