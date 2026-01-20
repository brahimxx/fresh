import { test, expect } from '@playwright/test';

function uniqueEmail() {
  const ts = Date.now();
  return `owner_${ts}@example.com`;
}

test.skip('Staff detail page loads with all tabs', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

  // Register and authenticate
  const email = uniqueEmail();
  const password = 'TestPassword123!';
  const registerRes = await page.request.post('/api/auth/register', {
    data: { email, password, firstName: 'Test', lastName: 'Owner', role: 'owner' },
  });
  expect(registerRes.ok()).toBeTruthy();
  const regJson = await registerRes.json();
  const token = regJson?.data?.token;
  expect(token).toBeTruthy();
  
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

  // Create a salon
  const salonName = `E2E Staff Test ${Date.now()}`;
  const salonRes = await page.request.post('/api/salons', {
    data: { name: salonName, city: 'Testville', country: 'US', phone: '+1 555 123 4567', email: 'contact@example.com', address: '123 Main St' },
  });
  expect(salonRes.ok()).toBeTruthy();
  const salonJson = await salonRes.json();
  const salonId = salonJson?.data?.id || salonJson?.id;
  expect(salonId).toBeTruthy();

  // Create a staff member via API
  const staffRes = await page.request.post(`/api/staff`, {
    data: {
      salon_id: salonId,
      name: 'Jane Smith',
      email: 'jane.smith@test.com',
      phone: '+1 555 987 6543',
      role: 'staff',
      title: 'Senior Stylist',
      bio: 'Experienced hair stylist',
    },
  });
  expect(staffRes.ok()).toBeTruthy();
  const staffJson = await staffRes.json();
  const staffId = staffJson?.data?.id || staffJson?.staff?.id || staffJson?.id;
  expect(staffId).toBeTruthy();

  // Navigate to staff detail page
  console.log(`Navigating to: /dashboard/salon/${salonId}/team/${staffId}`);
  await page.goto(`/dashboard/salon/${salonId}/team/${staffId}`);
  await page.waitForFunction(() => {
    const token = localStorage.getItem('fresh_token');
    return token !== null;
  });
  await page.waitForLoadState('networkidle');

  // Debug: Log what's on the page
  const pageContent = await page.content();
  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'test-results/staff-detail-debug.png', fullPage: true });

  // Verify page loaded with staff name
  await expect(page.getByText('Jane Smith')).toBeVisible();
  
  // Verify all tabs are present
  await expect(page.getByRole('tab', { name: /Personal/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Addresses/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Emergency/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Workplace/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Pay/i })).toBeVisible();

  // Click through each tab to verify they load (force:true to bypass dev overlay)
  await page.getByRole('tab', { name: /Addresses/i }).click({ force: true });
  await page.waitForTimeout(500);
  
  await page.getByRole('tab', { name: /Emergency/i }).click({ force: true });
  await page.waitForTimeout(500);
  
  await page.getByRole('tab', { name: /Workplace/i }).click({ force: true });
  await page.waitForTimeout(500);
  
  await page.getByRole('tab', { name: /Pay/i }).click({ force: true });
  await page.waitForTimeout(500);

  // No runtime errors
  expect(errors.filter(e => /(is not a function|undefined|null)/i.test(e)).length).toBe(0);
});
