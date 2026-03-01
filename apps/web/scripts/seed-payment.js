import { query } from './src/lib/db.js';

async function seed() {
    try {
        console.log("Seeding test payment data...");

        // 1. Get a salon
        const salons = await query("SELECT id FROM salons LIMIT 1");
        const salon = salons[0];
        if (!salon) throw new Error("No salons found");

        // 2. Get a client
        const clients = await query("SELECT id FROM users WHERE role = 'client' LIMIT 1");
        const client = clients[0];
        if (!client) throw new Error("No clients found");

        // 3. Get staff
        const staffs = await query("SELECT id FROM staff WHERE salon_id = ? LIMIT 1", [salon.id]);
        const staff = staffs[0];
        if (!staff) throw new Error("No staff found for salon");

        // 4. Create Booking
        const bookingRes = await query(
            `INSERT INTO bookings (salon_id, client_id, staff_id, start_datetime, end_datetime, status, source) 
             VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR), 'completed', 'marketplace')`,
            [salon.id, client.id, staff.id]
        );
        const bookingId = bookingRes.insertId;

        // 5. Create Payment
        const amount = 100.00;
        const paymentRes = await query(
            `INSERT INTO payments (booking_id, amount, method, status, stripe_payment_id)
             VALUES (?, ?, 'card', 'paid', 'test_pi_123')`,
            [bookingId, amount]
        );

        // 6. Create Platform Fee
        await query(
            `INSERT INTO platform_fees (booking_id, salon_id, type, amount, is_paid)
             VALUES (?, ?, 'payment_processing', ?, 1)`,
            [bookingId, salon.id, amount * 0.05]
        );

        console.log(`✅ Seeded successfully! Booking ID: ${bookingId}, Payment ID: ${paymentRes.insertId}`);
    } catch (e) {
        console.error("Seed error:", e.message);
    }
    process.exit(0);
}

seed();
