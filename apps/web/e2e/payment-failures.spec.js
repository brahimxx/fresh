import { test, expect } from '@playwright/test';

/**
 * E2E tests for payment failure scenarios
 * Tests that failed/declined payments don't mark bookings as paid
 */

const randomId = Math.floor(Math.random() * 1000000);
const userEmail = `payment_test_${randomId}@example.com`;
const userPassword = 'Password123!';

test.describe('Payment Failure Handling', () => {
  let token;
  let salonId;
  let bookingId;

  test.beforeAll(async ({ request }) => {
    // Register a user
    const regRes = await request.post('/api/auth/register', {
      data: {
        email: userEmail,
        password: userPassword,
        firstName: 'Payment',
        lastName: 'Tester',
        role: 'client',
      },
    });
    
    const regJson = await regRes.json();
    token = regJson.data?.token;
    expect(token).toBeDefined();

    // Get a salon
    const salonsRes = await request.get('/api/marketplace/salons');
    const salonsJson = await salonsRes.json();
    const salons = salonsJson.data || [];
    expect(salons.length).toBeGreaterThan(0);
    salonId = salons[0].id;

    // Create a booking (simplified - would normally go through booking flow)
    // For this test, we'll use the checkout flow directly
  });

  test('should reject checkout with invalid Stripe payment ID', async ({ request }) => {
    // First create a booking
    const servicesRes = await request.get(`/api/services?salon_id=${salonId}`);
    const servicesJson = await servicesRes.json();
    const services = servicesJson.data?.data || servicesJson.data || [];
    expect(services.length).toBeGreaterThan(0);
    
    const serviceId = services[0].id;
    
    // Get staff
    const staffRes = await request.get(`/api/widget/${salonId}/staff?serviceId=${serviceId}`);
    const staffJson = await staffRes.json();
    const staff = staffJson.data || [];
    expect(staff.length).toBeGreaterThan(0);
    const staffId = staff[0].id;

    // Create booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const bookingRes = await request.post(`/api/widget/${salonId}/book`, {
      headers: { 'Cookie': `token=${token}` },
      data: {
        serviceId,
        staffId,
        startTime: tomorrow.toISOString(),
        notes: 'Payment failure test',
      },
    });
    
    const bookingJson = await bookingRes.json();
    if (bookingRes.status() !== 201) {
      console.log('Booking creation failed:', bookingJson);
      // Skip if booking failed due to availability
      test.skip();
    }
    
    bookingId = bookingJson.data?.id;
    expect(bookingId).toBeDefined();

    // Attempt checkout with fake/invalid Stripe payment ID
    const checkoutRes = await request.post(`/api/checkout/${bookingId}`, {
      headers: { 'Cookie': `token=${token}` },
      data: {
        paymentMethod: 'card',
        stripePaymentId: 'pi_fake_invalid_12345', // Invalid ID
        tipAmount: 0,
      },
    });

    // Should fail because Stripe can't verify this payment
    expect(checkoutRes.status()).toBeGreaterThanOrEqual(400);
    
    const errorJson = await checkoutRes.json();
    console.log('Expected error:', errorJson);
    
    // Verify booking is NOT marked as paid
    const bookingCheckRes = await request.get(`/api/checkout/${bookingId}`, {
      headers: { 'Cookie': `token=${token}` },
    });
    const bookingCheck = await bookingCheckRes.json();
    
    expect(bookingCheck.data.payment).toBeNull();
    expect(bookingCheck.data.booking.status).not.toBe('completed');
  });

  test.skip('should prevent duplicate payment for same booking', async ({ request }) => {
    // Get services and create a new booking
    const servicesRes = await request.get(`/api/services?salon_id=${salonId}`);
    const servicesJson = await servicesRes.json();
    const services = servicesJson.data?.data || servicesJson.data || [];
    const serviceId = services[0].id;
    
    const staffRes = await request.get(`/api/widget/${salonId}/staff?serviceId=${serviceId}`);
    const staffJson = await staffRes.json();
    const staff = staffJson.data || [];
    const staffId = staff[0].id;

    // Get an available slot
    const daysAhead = 2 + Math.floor(Math.random() * 5);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const dateStr = futureDate.toISOString().split('T')[0];
    
    const availabilityRes = await request.get(
      `/api/widget/${salonId}/availability?date=${dateStr}&serviceId=${serviceId}&staffId=${staffId}`
    );
    
    if (!availabilityRes.ok()) {
      console.log('Availability check failed, skipping test');
      test.skip();
    }
    
    const availabilityJson = await availabilityRes.json();
    const slots = availabilityJson.data?.slots || availabilityJson.slots || [];
    
    if (slots.length === 0) {
      console.log('No available slots, skipping test');
      test.skip();
    }
    
    const startTime = slots[0].start || slots[0].startTime || slots[0];
    
    const bookingRes = await request.post(`/api/widget/${salonId}/book`, {
      headers: { 'Cookie': `token=${token}` },
      data: {
        serviceId,
        staffId,
        startTime,
        notes: 'Duplicate payment test',
      },
    });
    
    if (bookingRes.status() !== 201) {
      console.log('Booking failed:', await bookingRes.json());
      test.skip();
    }
    
    const newBookingId = (await bookingRes.json()).data?.id;
    expect(newBookingId).toBeDefined();

    // Complete checkout with cash (simpler than mocking Stripe)
    const firstCheckout = await request.post(`/api/checkout/${newBookingId}`, {
      headers: { 'Cookie': `token=${token}` },
      data: {
        paymentMethod: 'cash',
        tipAmount: 5,
      },
    });

    if (firstCheckout.status() !== 201) {
      console.log('First checkout failed:', await firstCheckout.json());
    }
    expect(firstCheckout.status()).toBe(201);

    // Attempt second checkout for same booking
    const secondCheckout = await request.post(`/api/checkout/${newBookingId}`, {
      headers: { 'Cookie': `token=${token}` },
      data: {
        paymentMethod: 'cash',
        tipAmount: 0,
      },
    });

    // Should be rejected with PAYMENT_EXISTS error
    expect(secondCheckout.status()).toBe(400);
    const errorJson = await secondCheckout.json();
    expect(errorJson.error.code).toBe('PAYMENT_EXISTS');
  });

  test.skip('should not allow refund exceeding remaining amount', async ({ request }) => {
    // This test requires owner/admin access
    // Skip for now or create a separate test suite with owner credentials
    test.skip();
  });
});
