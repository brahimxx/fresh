import { test, expect } from '@playwright/test';

function uniqueEmail() {
  const ts = Date.now();
  return `owner_${ts}@example.com`;
}

test('Calendar page loads without staff array errors', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  const email = uniqueEmail();
  const password = 'TestPassword123!';
  const registerRes = await page.request.post('/api/auth/register', {
    data: {
      email,
      password,
      firstName: 'Test',
      lastName: 'Owner',
      role: 'owner',
    },
  });
  expect(registerRes.ok()).toBeTruthy();
  const regJson = await registerRes.json();
  const token = regJson?.data?.token;
  expect(token).toBeTruthy();

  // Set token in localStorage and cookie
  await page.goto('/');
  await page.evaluate((t) => localStorage.setItem('fresh_token', t), token);
  await context.addCookies([
    {
      name: 'token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      sameSite: 'Lax',
    },
  ]);

  // Verify auth is working via direct API call
  const meRes = await page.request.get('/api/auth/me');
  expect(meRes.ok()).toBeTruthy();

  const salonName = `E2E Calendar Test ${Date.now()}`;
  const salonRes = await page.request.post('/api/salons', {
    data: {
      name: salonName,
      city: 'Testville',
      country: 'US',
      phone: '+1 555 123 4567',
      email: 'contact@example.com',
      address: '123 Main St',
    },
  });
  expect(salonRes.ok()).toBeTruthy();
  const salonJson = await salonRes.json();
  const salonId = salonJson?.data?.id || salonJson?.id;
  expect(salonId).toBeTruthy();

  // Navigate to calendar after auth is confirmed
  await page.goto(`/dashboard/salon/${salonId}/calendar`);
  // Wait for auth provider to pick up token from localStorage
  await page.waitForFunction(() => {
    const token = localStorage.getItem('fresh_token');
    return token !== null;
  });
  // Wait for network idle to allow data requests
  await page.waitForLoadState('networkidle');

  // Log captured errors for debugging
  console.log('Captured errors:', errors);
  // No runtime errors about staff array methods
  expect(errors.filter(e => /staff\.(map|forEach)|map is not a function|forEach is not a function/i.test(e)).length).toBe(0);
});
