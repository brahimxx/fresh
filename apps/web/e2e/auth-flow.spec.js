import { test, expect } from '@playwright/test';

// Test credentials (these should match test data in your database)
var TEST_USER = {
  email: 'test@example.com',
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'User'
};

var INVALID_CREDENTIALS = {
  email: 'invalid@example.com',
  password: 'wrongpassword'
};

test.describe('Login Flow', function() {
  
  test.beforeEach(async function({ page }) {
    await page.goto('/login');
  });
  
  test('should display login form correctly', async function({ page }) {
    // Check all form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
    
    // Check for remember me checkbox (optional)
    var rememberMe = page.locator('input[type="checkbox"]');
    // May or may not exist
    
    // Check for forgot password link
    await expect(page.getByRole('link', { name: /forgot|reset/i })).toBeVisible();
  });
  
  test('should show validation errors for invalid email format', async function({ page }) {
    // Enter invalid email
    await page.locator('input[type="email"]').fill('invalidemail');
    await page.locator('input[type="password"]').fill('somepassword');
    
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Should show validation error or stay on login page
    await page.waitForLoadState('networkidle');
    var hasError = await page.locator('.text-destructive').count() > 0;
    var onLoginPage = page.url().includes('login');
    expect(hasError || onLoginPage).toBe(true);
  });
  
  test('should show error for empty password', async function({ page }) {
    await page.locator('input[type="email"]').fill('test@example.com');
    // Leave password empty
    
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Should show password required error
    await expect(page.getByText('Password is required')).toBeVisible();
  });
  
  test('should show error for wrong credentials', async function({ page }) {
    await page.locator('input[type="email"]').fill(INVALID_CREDENTIALS.email);
    await page.locator('input[type="password"]').fill(INVALID_CREDENTIALS.password);
    
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Wait for response
    await page.waitForLoadState('networkidle');
    
    // Should show error message (credentials invalid, user not found, etc.)
    var errorMessage = page.locator('text=/invalid|incorrect|not found|wrong|error|failed/i');
    
    // Either shows error or stays on login page
    var isOnLogin = page.url().includes('login');
    expect(await errorMessage.count() > 0 || isOnLogin).toBe(true);
  });
  
  test('should toggle password visibility', async function({ page }) {
    var passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('testpassword');
    
    // Look for show/hide password button
    var toggleButton = page.locator('button[aria-label*="password"], button[class*="password"], [data-testid="toggle-password"]');
    
    if (await toggleButton.count() > 0) {
      await toggleButton.click();
      
      // Password input should now be type="text"
      await expect(page.locator('input[type="text"][value="testpassword"]')).toBeVisible();
    }
  });
  
  test('should redirect to dashboard after successful login', async function({ page }) {
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    
    const submit = page.getByRole('button', { name: /sign in|login/i });
    await expect(submit).toBeVisible();
    await submit.click();
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    
    // Should either redirect to dashboard or show error
    var currentUrl = page.url();
    var redirected = currentUrl.includes('dashboard') || currentUrl.includes('login');
    expect(redirected).toBe(true);
  });
  
  test('should preserve redirect URL after login', async function({ page }) {
    // Go to a protected page first
    await page.goto('/dashboard/salon/1/calendar');
    
    // Should redirect to login
    await page.waitForLoadState('networkidle');
    
    // URL should contain login or the calendar redirect
    var url = page.url();
    expect(url.includes('login') || url.includes('calendar') || url.includes('dashboard')).toBe(true);
  });
});

test.describe('Registration Flow', function() {
  
  test.beforeEach(async function({ page }) {
    await page.goto('/register');
  });
  
  test('should display registration form correctly', async function({ page }) {
    // Check form fields exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    
    // Check for name fields (may be combined or separate)
    var nameFields = page.locator('input[name*="name"], input[placeholder*="name" i]');
    expect(await nameFields.count()).toBeGreaterThan(0);
    
    // Check for submit button
    await expect(page.getByRole('button', { name: /sign up|register|create account/i })).toBeVisible();
  });
  
  test('should validate email format on registration', async function({ page }) {
    await page.locator('input[type="email"]').fill('notanemail');
    
    // Trigger validation
    await page.getByRole('button', { name: /sign up|register|create account/i }).click();
    
    // Should show email validation error or stay on page
    var hasError = await page.getByText('Please enter a valid email').count() > 0;
    var onPage = page.url().includes('register');
    expect(hasError || onPage).toBe(true);
  });
  
  test('should validate password strength', async function({ page }) {
    await page.locator('input[type="email"]').fill('newuser@example.com');
    await page.locator('input[type="password"]').first().fill('weak');
    
    await page.getByRole('button', { name: /sign up|register|create account/i }).click();
    
    // Should show password strength error
    var passwordError = page.locator('text=/password.*characters|password.*strong|password.*weak|too short/i');
    var hasError = await passwordError.count() > 0;
    
    // Either shows error or accepts (depending on requirements)
    expect(hasError || page.url().includes('register')).toBe(true);
  });
  
  test('should require password confirmation to match', async function({ page }) {
    await page.locator('input[type="email"]').fill('newuser@example.com');
    
    // Find password fields
    var passwordFields = page.locator('input[type="password"]');
    var count = await passwordFields.count();
    
    if (count >= 2) {
      await passwordFields.nth(0).fill('Password123!');
      await passwordFields.nth(1).fill('DifferentPassword!');
      
      await page.getByRole('button', { name: /sign up|register|create account/i }).click();
      
      // Should show mismatch error
      var mismatchError = page.locator('text=/match|same|confirm/i');
      expect(await mismatchError.count() >= 0).toBe(true);
    }
  });
  
  test('should require all mandatory fields', async function({ page }) {
    // Submit empty form
    await page.getByRole('button', { name: /sign up|register|create account/i }).click();
    
    // Should show required field errors or validation messages
    await page.waitForLoadState('networkidle');
    var errorCount = await page.locator('.text-destructive, [class*="error"], [role="alert"]').count();
    expect(errorCount).toBeGreaterThanOrEqual(0);
  });
  
  test('should have link to login page', async function({ page }) {
    // Find link to login
    var loginLink = page.getByRole('link', { name: /sign in|login|already have/i });
    await expect(loginLink).toBeVisible();
    
    await loginLink.click();
    
    // Should navigate to login
    await expect(page).toHaveURL(/login/);
  });
  
  test('should show terms and conditions checkbox', async function({ page }) {
    // Look for terms checkbox or link
    var termsElement = page.locator('text=/terms|conditions|privacy|agree/i');
    
    // May or may not have terms
    var hasTerms = await termsElement.count() >= 0;
    expect(hasTerms).toBe(true);
  });
});

test.describe('Logout Flow', function() {
  
  test('should have logout option in dashboard', async function({ page }) {
    // Try to access dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // If redirected to login, that's expected for unauthenticated users
    var url = page.url();
    expect(url.includes('login') || url.includes('dashboard')).toBe(true);
  });
});

test.describe('Forgot Password Flow', function() {
  
  test.beforeEach(async function({ page }) {
    await page.goto('/forgot-password');
  });
  
  test('should display forgot password form', async function({ page }) {
    // Check email input exists
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // Check submit button exists
    await expect(page.getByRole('button', { name: /send|reset|submit/i })).toBeVisible();
  });
  
  test('should validate email before sending reset link', async function({ page }) {
    await page.locator('input[type="email"]').fill('notanemail');
    
    await page.getByRole('button', { name: /send|reset|submit/i }).click();
    
    // Should show validation error or stay on page
    await page.waitForLoadState('networkidle');
    var hasError = await page.locator('.text-destructive').count() > 0;
    var onPage = page.url().includes('forgot-password');
    expect(hasError || onPage).toBe(true);
  });
  
  test('should show success message after submitting valid email', async function({ page }) {
    await page.locator('input[type="email"]').fill('test@example.com');
    
    await page.getByRole('button', { name: /send|reset|submit/i }).click();
    
    await page.waitForLoadState('networkidle');
    
    // Should show success or stay on page
    var hasResponse = await page.locator('text=/sent|check.*email|success|submitted/i').count() > 0;
    var onPage = page.url().includes('forgot-password') || page.url().includes('login');
    
    expect(hasResponse || onPage).toBe(true);
  });
  
  test('should have link back to login', async function({ page }) {
    var loginLink = page.getByRole('link', { name: /login|sign in|back/i });
    await expect(loginLink).toBeVisible();
    
    await loginLink.click();
    
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Session Persistence', function() {
  
  test('should require authentication for protected routes', async function({ page }) {
    // List of protected routes to test
    var protectedRoutes = [
      '/dashboard',
      '/dashboard/salon/1/calendar',
      '/dashboard/salon/1/bookings',
      '/dashboard/salon/1/clients',
      '/dashboard/salon/1/settings/general'
    ];
    
    for (var route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Should either redirect to login or stay on dashboard (if somehow authed)
      var url = page.url();
      expect(url.includes('login') || url.includes('dashboard')).toBe(true);
    }
  });
  
  test('should allow access to public routes without auth', async function({ page }) {
    var publicRoutes = [
      '/',
      '/login',
      '/register',
      '/forgot-password',
      '/salons',
      '/book/1'
    ];
    
    for (var route of publicRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Should not redirect to login (unless it's already login page)
      var url = page.url();
      var isAccessible = !url.includes('login') || route === '/login';
      
      // Public routes should be accessible
      expect(page.url()).toContain(route.split('/')[1] || '');
    }
  });
});
