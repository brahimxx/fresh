import { test, expect } from '@playwright/test';

test.describe('API /api/marketplace/salons', () => {
  test('should list marketplace salons (public)', async ({ request }) => {
    const res = await request.get('/api/marketplace/salons');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    // Endpoint returns { success, data }
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });
});
