import { test, expect } from '@playwright/test';

function randomEmail() {
  const n = Math.random().toString(36).slice(2, 10);
  return `api.tester+${n}@example.com`;
}

async function registerAndLogin(request) {
  const email = randomEmail();
  const password = 'Str0ng!Passw0rd';
  const res = await request.post('/api/auth/register', {
    data: {
      email,
      password,
      confirmPassword: password,
      firstName: 'API',
      lastName: 'Tester',
      role: 'owner'
    }
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body?.data?.user?.id).toBeTruthy();
  return { user: body.data.user, token: body.data.token };
}

test.describe('API /api/salons', () => {
  test('should return marketplace salons (public)', async ({ request }) => {
    const res = await request.get('/api/salons');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('success', true);
    expect(json).toHaveProperty('data.salons');
    expect(Array.isArray(json.data.salons)).toBe(true);
    expect(json).toHaveProperty('data.pagination');
  });

  test('should return user salons when authenticated', async ({ request }) => {
    const { user } = await registerAndLogin(request);

    // Create a salon for this user
    const create = await request.post('/api/salons', {
      data: {
        name: 'My Test Salon',
        address: '123 Test St',
        city: 'Testville',
        country: 'USA'
      }
    });
    expect(create.ok()).toBeTruthy();
    const created = await create.json();
    expect(created?.data?.id).toBeTruthy();

    // Fetch salons (should include the one we just created)
    const res = await request.get('/api/salons');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    const salons = json.data.salons;
    expect(Array.isArray(salons)).toBe(true);
    expect(salons.length).toBeGreaterThan(0);
    const ids = salons.map(s => s.id);
    expect(ids).toContain(created.data.id);
  });
});
