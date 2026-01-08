// playwright/onboarding-flow.spec.js
import { test, expect } from '@playwright/test';

// Replace with valid credentials for test user
const TEST_EMAIL = 'testuser@example.com';
const TEST_PASSWORD = 'TestPassword123!';

// Helper selectors
const loginEmailSelector = 'input[name="email"], input[type="email"]';
const loginPasswordSelector = 'input[name="password"], input[type="password"]';
const loginButtonSelector = 'button[type="submit"], button:has-text("Log In")';
const setupSalonHeaderSelector = 'h1:has-text("Set Up Your Salon")';
const setupSalonFormSelector = 'form';
const dashboardSelector = 'h1:has-text("Dashboard"), h2:has-text("Welcome")';

// Fill these with realistic onboarding values
const SALON_NAME = 'Test Salon';
const SALON_PHONE = '555-123-4567';
const SALON_ADDRESS = '123 Main St, Testville';

// Main onboarding flow test
// 1. Go to home page, redirected to login
// 2. Log in
// 3. See "Set Up Your Salon" onboarding
// 4. Complete onboarding form
// 5. See dashboard

test('Home → Login → Set Up Your Salon → Dashboard', async ({ page }) => {
  // Go to home page
  await page.goto('/');

  // Should redirect to login
  await expect(page).toHaveURL(/login/);
  await expect(page.locator(loginEmailSelector)).toBeVisible();
  await expect(page.locator(loginPasswordSelector)).toBeVisible();

  // Log in
  await page.fill(loginEmailSelector, TEST_EMAIL);
  await page.fill(loginPasswordSelector, TEST_PASSWORD);
  await page.click(loginButtonSelector);

  // Should redirect to onboarding
  await expect(page.locator(setupSalonHeaderSelector)).toBeVisible();
  await expect(page).toHaveURL(/setup|onboarding/);

  // Fill onboarding form
  await page.fill('input[name="name"]', SALON_NAME);
  await page.fill('input[name="phone"]', SALON_PHONE);
  await page.fill('input[name="address"]', SALON_ADDRESS);
  await page.click('button[type="submit"], button:has-text("Continue"), button:has-text("Finish")');

  // Should redirect to dashboard
  await expect(page.locator(dashboardSelector)).toBeVisible();
  await expect(page).toHaveURL(/dashboard|home/);
});
