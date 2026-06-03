const mysql = require('mysql2/promise');

async function testDiscountPolicy() {
  console.log("=== Testing Discount Policy Engine ===");
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'fresh',
  });

  try {
    const salonId = 163;
    const staffId = 9;

    // 1. Ensure salon settings deduct_discounts is true
    await pool.query(
      `UPDATE salon_settings SET deduct_discounts_before_commission = TRUE WHERE salon_id = ?`,
      [salonId]
    );
    console.log(`✅ Set deduct_discounts_before_commission = TRUE for Salon #${salonId}`);

    const [users] = await pool.query('SELECT id FROM users LIMIT 1');
    const clientId = users[0].id;

    // 2. Create a test booking
    const [bookRes] = await pool.query(
      `INSERT INTO bookings (salon_id, client_id, staff_id, start_datetime, end_datetime, status, travel_fee_amount) 
       VALUES (?, ?, ?, '2023-11-01 10:00:00', '2023-11-01 11:00:00', 'completed', 0)`,
      [salonId, clientId, staffId]
    );
    const bookingId = bookRes.insertId;

    // 3. Add a service for $100 (COGS $10)
    await pool.query(
      `INSERT INTO booking_services (booking_id, service_id, price, start_datetime, end_datetime, duration_minutes) 
       VALUES (?, 71, 100.00, '2023-11-01 10:00:00', '2023-11-01 11:00:00', 60)`,
      [bookingId]
    );

    // 4. Add a discount for $20
    await pool.query(
      `INSERT INTO booking_discounts (booking_id, discount_id, discount_code, discount_type, discount_value, amount_saved) 
       VALUES (?, 1, 'SAVE20', 'fixed', 20.00, 20.00)`,
      [bookingId]
    );

    console.log(`✅ Created Booking #${bookingId} with $100 Service and $20 Discount`);

    // 5. Simulate the Pay-Run Math
    const [salonSettings] = await pool.query(
      `SELECT deduct_discounts_before_commission FROM salon_settings WHERE salon_id = ?`,
      [salonId]
    );
    const deductDiscounts = salonSettings[0]?.deduct_discounts_before_commission === 1;

    const [serviceItems] = await pool.query(`
      SELECT 
        bs.price as service_price,
        s.cost_price as service_cost,
        sc.service_commission as default_rate,
        (SELECT SUM(amount_saved) FROM booking_discounts WHERE booking_id = b.id) as booking_discount_total,
        (SELECT SUM(price) FROM booking_services WHERE booking_id = b.id) as booking_gross_total
      FROM bookings b
      JOIN booking_services bs ON bs.booking_id = b.id
      JOIN services s ON s.id = bs.service_id
      LEFT JOIN staff_commissions sc ON sc.staff_id = b.staff_id
      WHERE b.id = ?
    `, [bookingId]);

    let servicesCommission = 0;

    serviceItems.forEach((item) => {
      const price = parseFloat(item.service_price || 0); // 100
      const cost = parseFloat(item.service_cost || 0);   // 10
      const discountTotal = parseFloat(item.booking_discount_total || 0); // 20
      const grossTotal = parseFloat(item.booking_gross_total || 1); // 100
      
      let apportionedDiscount = 0;
      if (deductDiscounts && discountTotal > 0) {
        apportionedDiscount = discountTotal * (price / grossTotal); // 20 * (100/100) = 20
      }

      const rate = 50.00; // Mock 50% commission for test
      
      // Net is Price (100) - COGS (10) - Apportioned Discount (20) = 70
      const net = Math.max(0, price - cost - apportionedDiscount); 
      
      console.log(`   -> Service Price: $${price}`);
      console.log(`   -> Product COGS: -$${cost}`);
      if (deductDiscounts) console.log(`   -> Promo Deduction: -$${apportionedDiscount}`);
      console.log(`   -> Net Commissionable: $${net}`);
      
      servicesCommission += net * (rate / 100); // 70 * 0.5 = 35
      console.log(`   -> Final Commission Earned (at ${rate}%): $${net * (rate / 100)}`);
    });

    console.log(`\n✅ Discount Policy Engine Test Complete!`);

  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    await pool.end();
  }
}

testDiscountPolicy();
