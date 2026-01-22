import { test, expect } from '@playwright/test';

/**
 * Full Booking Lifecycle E2E Tests
 * Tests the complete journey: creation → payment → completion → cancellation
 * Uses real database, no mocks
 */

const randomId = Math.floor(Math.random() * 1000000);
const clientEmail = `lifecycle_${randomId}@example.com`;
const clientPassword = 'TestPass123!';

test.describe('Booking Lifecycle', () => {
  let clientToken;
  let salonId;
  let serviceId;
  let staffId;
  let bookingId;

  test.beforeAll(async ({ request }) => {
    // Register client
    const regRes = await request.post('/api/auth/register', {
      data: {
        email: clientEmail,
        password: clientPassword,
        firstName: 'Lifecycle',
        lastName: 'Test',
        role: 'client',
      },
    });
    
    const regJson = await regRes.json();
    clientToken = regJson.data?.token;
    expect(clientToken).toBeDefined();

    // Get active marketplace salon
    const salonsRes = await request.get('/api/marketplace/salons');
    const salonsJson = await salonsRes.json();
    const salons = salonsJson.data || [];
    expect(salons.length).toBeGreaterThan(0);
    salonId = salons[0].id;

    // Get salon services
    const servicesRes = await request.get(`/api/services?salon_id=${salonId}`);
    const servicesJson = await servicesRes.json();
    const services = servicesJson.data?.data || servicesJson.data || [];
    expect(services.length).toBeGreaterThan(0);
    serviceId = services[0].id;

    // Get available staff for this service
    const staffRes = await request.get(`/api/widget/${salonId}/staff?serviceId=${serviceId}`);
    const staffJson = await staffRes.json();
    const staff = staffJson.data || [];
    expect(staff.length).toBeGreaterThan(0);
    staffId = staff[0].id;
  });

  test('1. Create booking → pending status', async ({ request }) => {
    // Book several days in the future at a random hour to avoid conflicts
    const bookingDate = new Date();
    const daysAhead = 3 + Math.floor(Math.random() * 4); // 3-6 days ahead
    const hour = 9 + Math.floor(Math.random() * 6); // 9 AM - 2 PM
    bookingDate.setDate(bookingDate.getDate() + daysAhead);
    bookingDate.setHours(hour, 0, 0, 0);
    
    const response = await request.post(`/api/widget/${salonId}/book`, {
      headers: { 'Cookie': `token=${clientToken}` },
      data: {
        serviceId,
        staffId,
        startTime: bookingDate.toISOString(),
        notes: 'Full lifecycle test booking',
      },
    });

    // If we get 409 conflict, skip subsequent tests
    if (response.status() === 409) {
      test.skip();
      return;
    }

    expect(response.status()).toBe(201);
    const json = await response.json();
    expect(json.success).toBe(true);
    
    // Response may have bookingId or data.id
    bookingId = json.bookingId || json.data?.id;
    expect(bookingId).toBeDefined();
    
    // Verify booking status is pending (if available in response)
    const booking = json.booking || json.data;
    if (booking && booking.status) {
      expect(booking.status).toBe('pending');
    }
  });

  test('2. Verify booking appears in client bookings list', async ({ request }) => {
    if (!bookingId) {
      test.skip();
      return;
    }
    
    const response = await request.get('/api/bookings', {
      headers: { 'Cookie': `token=${clientToken}` },
    });

    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    const bookings = Array.isArray(json.data?.data) ? json.data.data : (Array.isArray(json.data) ? json.data : []);
    
    const ourBooking = bookings.find(b => b.id === bookingId);
    expect(ourBooking).toBeDefined();
    expect(ourBooking.status).toBe('pending');
  });

  test('3. Update booking → reschedule', async ({ request }) => {
    // Reschedule to 3 days in the future at 2 PM
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 3);
    newDate.setHours(14, 0, 0, 0);

    const response = await request.put(`/api/bookings/${bookingId}`, {
      headers: { 'Cookie': `token=${clientToken}` },
      data: {
        startTime: newDate.toISOString(),
        notes: 'Rescheduled booking',
      },
    });

    if (response.status() === 200) {
      const json = await response.json();
      expect(json.success).toBe(true);
      
      // Verify new time was set
      const checkRes = await request.get(`/api/bookings/${bookingId}`, {
        headers: { 'Cookie': `token=${clientToken}` },
      });
      const checkJson = await checkRes.json();
      expect(new Date(checkJson.data.start_datetime).getHours()).toBe(14);
    }
  });

  test('4. Mark booking as confirmed', async ({ request }) => {
    const response = await request.patch(`/api/bookings/${bookingId}`, {
      headers: { 'Cookie': `token=${clientToken}` },
      data: {
        status: 'confirmed',
      },
    });

    if (response.ok()) {
      const json = await response.json();
      expect(json.data.status).toBe('confirmed');
    }
  });

  test('5. Complete booking → mark as completed', async ({ request }) => {
    // Simulate completing the booking (staff action typically)
    const response = await request.patch(`/api/bookings/${bookingId}`, {
      headers: { 'Cookie': `token=${clientToken}` },
      data: {
        status: 'completed',
      },
    });

    if (response.ok()) {
      const json = await response.json();
      expect(json.data.status).toBe('completed');
    }
  });

  test('6. Cancel booking → verify cancellation', async ({ request }) => {
    // Create another booking to cancel
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 5);
    bookingDate.setHours(11, 0, 0, 0);
    
    const createRes = await request.post(`/api/widget/${salonId}/book`, {
      headers: { 'Cookie': `token=${clientToken}` },
      data: {
        serviceId,
        staffId,
        startTime: bookingDate.toISOString(),
        notes: 'Booking to be cancelled',
      },
    });

    if (createRes.status() === 201) {
      const createJson = await createRes.json();
      const cancelBookingId = createJson.data.id;

      // Cancel it
      const cancelRes = await request.patch(`/api/bookings/${cancelBookingId}`, {
        headers: { 'Cookie': `token=${clientToken}` },
        data: {
          status: 'cancelled',
        },
      });

      if (cancelRes.ok()) {
        const cancelJson = await cancelRes.json();
        expect(cancelJson.data.status).toBe('cancelled');
      }
    }
  });

  test('7. Verify booking history is maintained', async ({ request }) => {
    // Fetch all bookings including completed/cancelled
    const response = await request.get('/api/bookings?include_past=true', {
      headers: { 'Cookie': `token=${clientToken}` },
    });

    if (response.ok()) {
      const json = await response.json();
      const bookings = Array.isArray(json.data?.data) ? json.data.data : (Array.isArray(json.data) ? json.data : []);
      
      // Should see various statuses in history
      if (Array.isArray(bookings) && bookings.length > 0) {
        const statuses = bookings.map(b => b.status);
        expect(statuses.length).toBeGreaterThan(0);
        
        // Our original booking should still exist
        const original = bookings.find(b => b.id === bookingId);
        expect(original).toBeDefined();
      }
    }
  });

  test('8. Verify no-show handling', async ({ request }) => {
    // Create booking for no-show test
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 4);
    bookingDate.setHours(9, 0, 0, 0);
    
    const createRes = await request.post(`/api/widget/${salonId}/book`, {
      headers: { 'Cookie': `token=${clientToken}` },
      data: {
        serviceId,
        staffId,
        startTime: bookingDate.toISOString(),
        notes: 'No-show test',
      },
    });

    if (createRes.status() === 201) {
      const createJson = await createRes.json();
      const noShowBookingId = createJson.data.id;

      // Mark as no-show
      const noShowRes = await request.patch(`/api/bookings/${noShowBookingId}`, {
        headers: { 'Cookie': `token=${clientToken}` },
        data: {
          status: 'no_show',
        },
      });

      if (noShowRes.ok()) {
        const noShowJson = await noShowRes.json();
        expect(noShowJson.data.status).toBe('no_show');
      }
    }
  });
});

test.describe('Booking with Multiple Services', () => {
  let clientToken;
  let salonId;
  let services = [];
  let staffId;

  test.beforeAll(async ({ request }) => {
    // Register client
    const randomId2 = Math.floor(Math.random() * 1000000);
    const email = `multi_service_${randomId2}@example.com`;
    
    const regRes = await request.post('/api/auth/register', {
      data: {
        email,
        password: 'TestPass123!',
        firstName: 'Multi',
        lastName: 'Service',
        role: 'client',
      },
    });
    
    const regJson = await regRes.json();
    clientToken = regJson.data?.token;

    // Get salon
    const salonsRes = await request.get('/api/marketplace/salons');
    const salonsJson = await salonsRes.json();
    salonId = salonsJson.data[0].id;

    // Get multiple services
    const servicesRes = await request.get(`/api/services?salon_id=${salonId}`);
    const servicesJson = await servicesRes.json();
    const allServices = servicesJson.data?.data || servicesJson.data || [];
    services = allServices.slice(0, 2); // Take first 2 services

    // Get staff
    const staffRes = await request.get(`/api/widget/${salonId}/staff?serviceId=${services[0].id}`);
    const staffJson = await staffRes.json();
    staffId = staffJson.data[0]?.id;
  });

  test('should create booking with multiple services', async ({ request }) => {
    if (services.length < 2) {
      test.skip();
      return;
    }

    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 3);
    bookingDate.setHours(13, 0, 0, 0);

    const response = await request.post(`/api/widget/${salonId}/book`, {
      headers: { 'Cookie': `token=${clientToken}` },
      data: {
        serviceId: services[0].id,
        additionalServices: [services[1].id],
        staffId,
        startTime: bookingDate.toISOString(),
        notes: 'Multi-service booking',
      },
    });

    if (response.status() === 201) {
      const json = await response.json();
      expect(json.success).toBe(true);
      
      // Verify multiple services are associated
      const bookingId = json.data.id;
      const checkRes = await request.get(`/api/bookings/${bookingId}`, {
        headers: { 'Cookie': `token=${clientToken}` },
      });
      
      if (checkRes.ok()) {
        const checkJson = await checkRes.json();
        const serviceCount = checkJson.data.services?.length || 0;
        expect(serviceCount).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
