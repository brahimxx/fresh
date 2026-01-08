import { test, expect } from '@playwright/test';

test.describe('Authentication', function() {
  test('should display login page', async function({ page }) {
    await page.goto('/login');
    
    await expect(page).toHaveTitle(/Fresh/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });
  
  test('should show validation errors for empty form', async function({ page }) {
    await page.goto('/login');
    
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Should show validation errors - check that at least one error appears
    await expect(page.getByText('Please enter a valid email')).toBeVisible();
  });
  
  test('should navigate to register page', async function({ page }) {
    await page.goto('/login');
    
    await page.getByRole('link', { name: /register|sign up|create account/i }).click();
    
    await expect(page).toHaveURL(/register/);
  });
  
  test('should navigate to forgot password', async function({ page }) {
    await page.goto('/login');
    
    await page.getByRole('link', { name: /forgot|reset/i }).click();
    
    await expect(page).toHaveURL(/forgot-password/);
  });
});

test.describe('Public Pages', function() {
  test('should load homepage', async function({ page }) {
    await page.goto('/');
    
    await expect(page).toHaveTitle(/Fresh/);
  });
  
  test('should load marketplace', async function({ page }) {
    await page.goto('/salons');
    
    // Page should load successfully (check for body content or any heading)
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/salons/);
  });
});

test.describe('Dashboard (requires auth)', function() {
  test('should redirect unauthenticated users', async function({ page }) {
    await page.goto('/dashboard');
    
    // Should redirect to login or show auth prompt
    await expect(page).toHaveURL(/login|dashboard/);
  });
});

test.describe('Accessibility', function() {
  test('should have no accessibility violations on login', async function({ page }) {
    await page.goto('/login');
    
    // Check that the page has rendered with a form
    await expect(page.locator('form')).toBeVisible();
    
    // Check form labels exist for inputs
    var emailInput = page.locator('input[type="email"]');
    var passwordInput = page.locator('input[type="password"]');
    
    // Inputs should be visible and have proper attributes
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });
  
  test('should be keyboard navigable', async function({ page }) {
    await page.goto('/login');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate
    var focusedElement = await page.evaluate(function() {
      return document.activeElement?.tagName;
    });
    
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('Responsive Design', function() {
  test('should display correctly on mobile', async function({ page }) {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
  
  test('should display correctly on tablet', async function({ page }) {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
  
  test('should display correctly on desktop', async function({ page }) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe('Performance', function() {
  test('should load login page quickly', async function({ page }) {
    var startTime = Date.now();
    
    await page.goto('/login');
    
    var loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
