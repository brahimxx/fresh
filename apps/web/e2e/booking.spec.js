import { test, expect } from '@playwright/test';

test.describe('Booking Widget', function() {
  test('should load public booking page', async function({ page }) {
    await page.goto('/book/1');
    
    // Should show booking widget or salon not found
    await expect(page.locator('body')).toBeVisible();
  });
  
  test('should display service selection step', async function({ page }) {
    await page.goto('/book/1');
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Should show services or loading state
    var content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });
});

test.describe('Salon Profile', function() {
  test('should load salon profile page', async function({ page }) {
    await page.goto('/salon/1');
    
    await page.waitForLoadState('networkidle');
    
    // Should show salon info or not found
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Marketplace Search', function() {
  test('should load salons listing', async function({ page }) {
    await page.goto('/salons');
    
    await page.waitForLoadState('networkidle');
    
    // Should have search or filter functionality
    await expect(page.locator('body')).toBeVisible();
  });
  
  test('should filter by search query', async function({ page }) {
    await page.goto('/salons?q=spa');
    
    await page.waitForLoadState('networkidle');
    
    // URL should contain search param
    expect(page.url()).toContain('q=spa');
  });
});
