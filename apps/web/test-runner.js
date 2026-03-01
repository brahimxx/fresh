import { createSafeBooking } from './src/lib/booking.js';

// If this fails at import, the error will just print directly.
console.log("Imports succeeded, starting test payload...");

async function run() {
    try {
        const payload = {
            salonId: 1,
            primaryStaffId: 1,
            clientId: 1,
            startDatetime: '2026-06-15 10:00:00',
            services: [{ serviceId: 1, duration: 60, price: 50 }],
        };
        await createSafeBooking(payload);
        console.log("Success");
    } catch (err) {
        require('fs').writeFileSync('debug-error.json', JSON.stringify({
            message: err.message,
            stack: err.stack
        }, null, 2));
        console.error("Wrote error to debug-error.json");
    }
}
run();
