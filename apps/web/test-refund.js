const runTest = async () => {
    const BASE_URL = 'http://localhost:3000/api';

    // Login as admin
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@fresh.com', password: 'Test1234!' }),
    });

    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error('Login failed');

    const cookies = loginRes.headers.get('set-cookie');
    const tokenMatch = cookies?.match(/auth-token=([^;]+)/);
    const adminToken = tokenMatch ? tokenMatch[1] : loginData.data.token;

    console.log('--- Triggering Global Refund for Booking #25 ---');
    const refundRes = await fetch(`${BASE_URL}/admin/bookings/25/refund`, {
        method: 'POST',
        headers: {
            'Cookie': `token=${adminToken}`,
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Admin Test Override' })
    });

    const refundData = await refundRes.json();
    console.log(`Status: ${refundRes.status}`);
    console.log(JSON.stringify(refundData, null, 2));
};

runTest().catch(console.error);
