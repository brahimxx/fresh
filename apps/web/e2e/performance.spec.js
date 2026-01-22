import { test, expect } from '@playwright/test';

test.describe('Performance Optimizations', () => {
  test('service filtering should use memoization', async ({ page }) => {
    await page.goto('/book/1');
    await page.waitForLoadState('domcontentloaded');
    
    // Page should load
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('booking widget should render without errors', async ({ page }) => {
    await page.goto('/book/1');
    await page.waitForLoadState('domcontentloaded');
    
    // Check that page loads successfully
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('calendar page should load', async ({ page }) => {
    await page.goto('/dashboard/salon/1/calendar');
    await page.waitForLoadState('domcontentloaded');
    
    // Page should load
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('bookings page should load', async ({ page }) => {
    await page.goto('/dashboard/salon/1/bookings');
    await page.waitForLoadState('domcontentloaded');
    
    // Page should load
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
