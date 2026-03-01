import { POST } from './src/app/api/payments/intent/route.js';

async function test() {
    const req = {
        json: () => Promise.resolve({ amount: 50.00 })
    };

    try {
        const res = await POST(req);
        console.log("STATUS:", res.status);
        console.log("DATA:", await res.json());
    } catch (err) {
        console.error("FATAL:", err);
    }
}

test();
