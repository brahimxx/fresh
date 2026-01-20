import { test, expect } from '@playwright/test';

function uniqueEmail() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  return `owner_${ts}_${rand}@example.com`;
}

test.describe('Staff Creation Wizard', () => {
  test.skip('multi-step wizard creates staff with comprehensive data', async ({ page, context }) => {
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

    // Create a test salon
    const salonName = `Wizard Test ${Date.now()}`;
    const salonRes = await page.request.post('/api/salons', {
      data: { name: salonName, city: 'Testville', country: 'US', phone: '+1 555 123 4567', email: 'contact@example.com', address: '123 Main St' },
    });
    expect(salonRes.ok()).toBeTruthy();
    const salonJson = await salonRes.json();
    const salonId = salonJson?.data?.id || salonJson?.id;
    expect(salonId).toBeTruthy();
    
    // Navigate to team page
    await page.goto(`/dashboard/salon/${salonId}/team`);
    
    // Click "Add Team Member" button (force:true to bypass dev overlay)
    await page.click('button:has-text("Add Team Member"), button:has-text("Add First Team Member")', { force: true });
    
    // Verify wizard dialog opens
    await expect(page.locator('text=Step 1 of 5')).toBeVisible();
    await expect(page.locator('text=Basic Info')).toBeVisible();
    
    // Step 1: Basic Info
    await page.fill('input[name="name"]', 'Emily Watson');
    await page.fill('input[name="email"]', `emily.wizard.${Date.now()}@test.com`);
    await page.fill('input[name="phone"]', '+1 555 222 3333');
    await page.click('button[type="button"]:has-text("Next")');
    
    // Step 2: Personal Details
    await expect(page.locator('text=Step 2 of 5')).toBeVisible();
    
    await page.fill('input[name="phoneSecondary"]', '+1 555 444 5555');
    await page.fill('input[name="country"]', 'United States');
    await page.fill('textarea[name="bio"]', 'Experienced stylist specializing in color');
    
    // Click Next
    await page.click('button[type="button"]:has-text("Next")');
    
    // Step 3: Employment
    await expect(page.locator('text=Step 3 of 5')).toBeVisible();
    
    // Skip this step
    await page.click('button:has-text("Skip")');
    
    // Step 4: Emergency Contact
    await expect(page.locator('text=Step 4 of 5')).toBeVisible();
    
    await page.fill('input[name="emergencyName"]', 'Michael Watson');
    await page.fill('input[name="emergencyRelationship"]', 'Spouse');
    await page.fill('input[name="emergencyPhone"]', '+1 555 777 8888');
    await page.fill('input[name="emergencyEmail"]', 'michael@example.com');
    
    await page.click('button[type="button"]:has-text("Next")');
    
    // Step 5: Services & Settings
    await expect(page.locator('text=Step 5 of 5')).toBeVisible();
    
    // Submit the form - wait for button to be enabled first
    const submitButton = page.locator('button[type="submit"]:has-text("Create Team Member")');
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });
    // Wait a bit for form validation to complete
    await page.waitForTimeout(1000);
    await submitButton.click({ force: true });
    
    // Wait for success toast and dialog to close
    await expect(page.locator('text=Team member added successfully')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Step 1 of 5')).not.toBeVisible();
    
    // Verify staff appears in list
    await expect(page.locator('text=Emily Watson')).toBeVisible();
    
    // Check for runtime errors
    expect(errors).toEqual([]);
  });
  
  test.skip('can navigate back and forth between steps', async ({ page, context }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    
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
    
    // Create a test salon
    const salonName = `Nav Test ${Date.now()}`;
    const salonRes = await page.request.post('/api/salons', {
      data: { name: salonName, city: 'Testville', country: 'US', phone: '+1 555 123 4567', email: 'contact@example.com', address: '123 Main St' },
    });
    expect(salonRes.ok()).toBeTruthy();
    const salonJson = await salonRes.json();
    const salonId = salonJson?.data?.id || salonJson?.id;
    expect(salonId).toBeTruthy();
    
    await page.goto(`/dashboard/salon/${salonId}/team`);
    await page.click('button:has-text("Add Team Member"), button:has-text("Add First Team Member")', { force: true });
    
    // Step 1
    await expect(page.locator('text=Step 1 of 5')).toBeVisible();
    await page.fill('input[name="name"]', 'Test User');
    await page.click('button[type="button"]:has-text("Next")');
    
    // Step 2
    await expect(page.locator('text=Step 2 of 5')).toBeVisible();
    await page.click('button:has-text("Back")');
    
    // Should be back to Step 1
    await expect(page.locator('text=Step 1 of 5')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toHaveValue('Test User');
    
    // Go forward again
    await page.click('button[type="button"]:has-text("Next")');
    await expect(page.locator('text=Step 2 of 5')).toBeVisible();
    
    // Skip to Step 3
    await page.click('button:has-text("Skip")');
    await expect(page.locator('text=Step 3 of 5')).toBeVisible();
    
    // Check for runtime errors
    expect(errors).toEqual([]);
  });
});
