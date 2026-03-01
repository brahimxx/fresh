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

    console.log('--- Checking Ready-to-Pay Balances ---');
    const payoutsRes = await fetch(`${BASE_URL}/admin/payouts`, {
        headers: {
            'Cookie': `token=${adminToken}`,
            'Authorization': `Bearer ${adminToken}`,
        }
    });

    const payoutsData = await payoutsRes.json();
    console.log(`Status: ${payoutsRes.status}`);
    console.log(JSON.stringify(payoutsData, null, 2));

    if (payoutsData?.data?.balances?.length > 0) {
        console.log('\n--- Bulk Approving First Payout ---');
        const payload = [{
            salonId: payoutsData.data.balances[0].salonId,
            amount: payoutsData.data.balances[0].netPayable
        }];

        const approveRes = await fetch(`${BASE_URL}/admin/payouts`, {
            method: 'POST',
            headers: {
                'Cookie': `token=${adminToken}`,
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ payouts: payload })
        });

        console.log(`Approve Status: ${approveRes.status}`);
        console.log(JSON.stringify(await approveRes.json(), null, 2));
    }
};

runTest().catch(console.error);
