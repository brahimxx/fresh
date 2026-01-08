import { test, expect } from '@playwright/test';

test.describe('Cross-Browser Compatibility', function() {
  test('should render correctly in all browsers', async function({ page, browserName }) {
    await page.goto('/');
    
    // Basic render check
    await expect(page.locator('body')).toBeVisible();
    
    // Check that CSS is loading
    var backgroundColor = await page.evaluate(function() {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(backgroundColor).toBeTruthy();
    
    console.log('Browser: ' + browserName + ' - Page loaded successfully');
  });
  
  test('should handle navigation', async function({ page, browserName }) {
    // Go directly to login first to avoid overlapping redirects
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/login/);
    
    // Navigate to salons; unauthenticated users may be redirected to login
    await page.goto('/salons', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/salons|login/);
    
    console.log('Browser: ' + browserName + ' - Navigation works');
  });
  
  test('should support modern CSS features', async function({ page }) {
    await page.goto('/login');
    
    // Check flexbox support
    var hasFlexbox = await page.evaluate(function() {
      return CSS.supports('display', 'flex');
    });
    expect(hasFlexbox).toBe(true);
    
    // Check grid support
    var hasGrid = await page.evaluate(function() {
      return CSS.supports('display', 'grid');
    });
    expect(hasGrid).toBe(true);
    
    // Check CSS custom properties
    var hasCustomProps = await page.evaluate(function() {
      return CSS.supports('color', 'var(--test)');
    });
    expect(hasCustomProps).toBe(true);
  });
  
  test('should support modern JavaScript features', async function({ page }) {
    await page.goto('/');
    
    // Check async/await support
    var hasAsync = await page.evaluate(function() {
      try {
        eval('(async () => {})');
        return true;
      } catch (e) {
        return false;
      }
    });
    expect(hasAsync).toBe(true);
    
    // Check arrow functions
    var hasArrow = await page.evaluate(function() {
      try {
        eval('(() => {})');
        return true;
      } catch (e) {
        return false;
      }
    });
    expect(hasArrow).toBe(true);
    
    // Check template literals
    var hasTemplates = await page.evaluate(function() {
      try {
        eval('`test`');
        return true;
      } catch (e) {
        return false;
      }
    });
    expect(hasTemplates).toBe(true);
  });
  
  test('should handle form inputs correctly', async function({ page }) {
    await page.goto('/login');
    
    var emailInput = page.locator('input[type="email"]');
    var passwordInput = page.locator('input[type="password"]');
    
    // Type in inputs
    await emailInput.fill('test@example.com');
    await passwordInput.fill('password123');
    
    // Check values
    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passwordInput).toHaveValue('password123');
  });
});

test.describe('Touch Support (Mobile)', function() {
  test('should handle touch events', async function({ page, isMobile }) {
    if (!isMobile) {
      test.skip();
      return;
    }
    
    await page.goto('/login');
    
    var button = page.getByRole('button', { name: /sign in|login/i });
    
    // Tap the button
    await button.tap();
    
    // Should trigger some response
    await expect(page.locator('body')).toBeVisible();
  });
});
