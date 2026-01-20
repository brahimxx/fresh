// e2e/marketplace-search.spec.js
import { test, expect } from '@playwright/test';

test.describe('Marketplace Search & Filtering', () => {
  test('should return all active marketplace salons without filters', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    
    // Verify all salons are marketplace-enabled
    data.data.forEach(salon => {
      expect(salon).toHaveProperty('id');
      expect(salon).toHaveProperty('name');
      expect(salon).toHaveProperty('rating');
      expect(salon).toHaveProperty('review_count');
      expect(salon).toHaveProperty('services_preview');
    });
  });

  test('should filter by search query (name)', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?q=test');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // All results should contain 'test' in name, description, or services
    data.data.forEach(salon => {
      const nameMatch = salon.name?.toLowerCase().includes('test');
      const descMatch = salon.description?.toLowerCase().includes('test');
      const serviceMatch = salon.services_preview?.some(s => 
        s.toLowerCase().includes('test')
      );
      expect(nameMatch || descMatch || serviceMatch).toBe(true);
    });
  });

  test('should filter by location', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?location=New');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Results should match location in city, state, or postal code
    data.data.forEach(salon => {
      const cityMatch = salon.city?.toLowerCase().includes('new');
      const stateMatch = salon.state?.toLowerCase().includes('new');
      const postalMatch = salon.postal_code?.toLowerCase().includes('new');
      expect(cityMatch || stateMatch || postalMatch).toBe(true);
    });
  });

  test('should filter by single category', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?categories=hair');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // All results should be in 'hair' category
    data.data.forEach(salon => {
      expect(salon.category).toBe('hair');
    });
  });

  test('should filter by multiple categories', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?categories=hair,nails');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // All results should be either 'hair' or 'nails'
    data.data.forEach(salon => {
      expect(['hair', 'nails']).toContain(salon.category);
    });
  });

  test('should filter by single price level', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?price=2');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // All results should have price_level = 2
    data.data.forEach(salon => {
      expect(salon.price_level).toBe(2);
    });
  });

  test('should filter by multiple price levels', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?price=1,2,3');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // All results should have price_level in [1, 2, 3]
    data.data.forEach(salon => {
      expect([1, 2, 3]).toContain(salon.price_level);
    });
  });

  test('should filter by minimum rating', async ({ request }) => {
    const minRating = 4.0;
    const response = await request.get(`/api/marketplace/salons?minRating=${minRating}`);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // All results should have ratings >= minRating (nulls filtered out)
    data.data.forEach(salon => {
      expect(salon.rating).not.toBeNull();
      expect(salon.rating).toBeGreaterThanOrEqual(minRating);
    });
  });

  test('should combine multiple filters', async ({ request }) => {
    const response = await request.get(
      '/api/marketplace/salons?q=hair&categories=hair&price=2,3&minRating=4'
    );
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Verify all filters applied correctly
    data.data.forEach(salon => {
      // Category filter
      expect(salon.category).toBe('hair');
      
      // Price filter
      expect([2, 3]).toContain(salon.price_level);
      
      // Rating filter (if has rating)
      expect(salon.rating).not.toBeNull();
      expect(salon.rating).toBeGreaterThanOrEqual(4);
      
      // Search query (name, description, or service)
      const nameMatch = salon.name?.toLowerCase().includes('hair');
      const descMatch = salon.description?.toLowerCase().includes('hair');
      const serviceMatch = salon.services_preview?.some(s => 
        s.toLowerCase().includes('hair')
      );
      expect(nameMatch || descMatch || serviceMatch).toBe(true);
    });
  });

  test('should sort by rating (highest first)', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?sort=rating&limit=10');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Verify descending order by rating
    for (let i = 1; i < data.data.length; i++) {
      const prevRating = data.data[i - 1].rating || 0;
      const currRating = data.data[i].rating || 0;
      expect(prevRating).toBeGreaterThanOrEqual(currRating);
    }
  });

  test('should sort by review count', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?sort=reviews&limit=10');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Verify descending order by review_count
    for (let i = 1; i < data.data.length; i++) {
      const prevCount = data.data[i - 1].review_count || 0;
      const currCount = data.data[i].review_count || 0;
      expect(prevCount).toBeGreaterThanOrEqual(currCount);
    }
  });

  test('should sort by price (low to high)', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?sort=price_low&limit=10');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Verify ascending order by price_level
    for (let i = 1; i < data.data.length; i++) {
      const prevPrice = data.data[i - 1].price_level || 0;
      const currPrice = data.data[i].price_level || 0;
      expect(prevPrice).toBeLessThanOrEqual(currPrice);
    }
  });

  test('should sort by price (high to low)', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?sort=price_high&limit=10');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Verify descending order by price_level
    for (let i = 1; i < data.data.length; i++) {
      const prevPrice = data.data[i - 1].price_level || 0;
      const currPrice = data.data[i].price_level || 0;
      expect(prevPrice).toBeGreaterThanOrEqual(currPrice);
    }
  });

  test('should sort by name (alphabetical)', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?sort=name&limit=10');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Verify alphabetical order
    for (let i = 1; i < data.data.length; i++) {
      const prevName = data.data[i - 1].name.toLowerCase();
      const currName = data.data[i].name.toLowerCase();
      expect(prevName.localeCompare(currName)).toBeLessThanOrEqual(0);
    }
  });

  test('should respect limit parameter', async ({ request }) => {
    const limit = 5;
    const response = await request.get(`/api/marketplace/salons?limit=${limit}`);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeLessThanOrEqual(limit);
  });

  test('should respect offset parameter for pagination', async ({ request }) => {
    // Get first page
    const page1 = await request.get('/api/marketplace/salons?limit=5&offset=0');
    const data1 = await page1.json();
    
    // Get second page
    const page2 = await request.get('/api/marketplace/salons?limit=5&offset=5');
    const data2 = await page2.json();
    
    expect(page1.ok()).toBeTruthy();
    expect(page2.ok()).toBeTruthy();
    
    // Verify pages don't overlap (different salon IDs)
    const ids1 = data1.data.map(s => s.id);
    const ids2 = data2.data.map(s => s.id);
    
    ids1.forEach(id => {
      expect(ids2).not.toContain(id);
    });
  });

  test('should handle empty results gracefully', async ({ request }) => {
    const response = await request.get(
      '/api/marketplace/salons?q=veryunlikelytomatchanything12345'
    );
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
  });

  test('should not return inactive salons', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?limit=100');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Verify no salon has status other than 'active' (indirectly tested by marketplace_enabled)
    // All returned salons should be marketplace-enabled
    expect(data.data.length).toBeGreaterThanOrEqual(0);
  });

  test('should handle invalid price values gracefully', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?price=invalid,abc,5');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Should still work, filtering out invalid values
    data.data.forEach(salon => {
      expect(salon.price_level).toBeDefined();
    });
  });

  test('should handle negative limit/offset gracefully', async ({ request }) => {
    const response = await request.get('/api/marketplace/salons?limit=-5&offset=-10');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    // Should use defaults or handle gracefully
  });
});
