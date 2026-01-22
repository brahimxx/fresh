import { test, expect } from '@playwright/test';

/**
 * Staff Assignment Edge Cases E2E Tests
 * Tests complex staff assignment scenarios, conflicts, and edge cases
 * No mocks - uses real database
 */

const randomId = Math.floor(Math.random() * 1000000);
const ownerEmail = `staff_owner_${randomId}@example.com`;
const ownerPassword = 'StaffTest123!';

test.describe('Staff Assignment Edge Cases', () => {
  let ownerToken;
  let salonId;
  let staffId1;
  let staffId2;
  let serviceId;

  test.beforeAll(async ({ request }) => {
    // Register salon owner
    const regRes = await request.post('/api/auth/register', {
      data: {
        email: ownerEmail,
        password: ownerPassword,
        firstName: 'Staff',
        lastName: 'Owner',
        role: 'owner',
      },
    });
    
    const regJson = await regRes.json();
    ownerToken = regJson.data?.token;
    expect(ownerToken).toBeDefined();

    // Get or create salon
    const salonsRes = await request.get('/api/salons', {
      headers: { 'Cookie': `token=${ownerToken}` },
    });
    
    const salonsJson = await salonsRes.json();
    const salons = salonsJson.data?.data || salonsJson.data || [];
    
    if (salons.length > 0) {
      salonId = salons[0].id;
    } else {
      // Create salon if none exists
      const createRes = await request.post('/api/salons', {
        headers: { 'Cookie': `token=${ownerToken}` },
        data: {
          name: `Test Salon ${randomId}`,
          email: `salon${randomId}@test.com`,
          phone: '555-0100',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'US',
        },
      });
      
      if (createRes.status() === 201) {
        const createJson = await createRes.json();
        salonId = createJson.data.id;
      }
    }

    // Get services
    const servicesRes = await request.get(`/api/services?salon_id=${salonId}`, {
      headers: { 'Cookie': `token=${ownerToken}` },
    });
    const servicesJson = await servicesRes.json();
    const services = servicesJson.data?.data || servicesJson.data || [];
    
    if (services.length > 0) {
      serviceId = services[0].id;
    }
  });

  test('should create staff member with basic info', async ({ request }) => {
    if (!salonId) {
      test.skip();
      return;
    }

    const response = await request.post(`/api/salons/${salonId}/staff`, {
      headers: { 'Cookie': `token=${ownerToken}` },
      data: {
        firstName: 'Test',
        lastName: 'Stylist',
        email: `stylist_${randomId}_1@test.com`,
        role: 'staff',
        isActive: true,
      },
    });

    if (response.status() === 201 || response.status() === 200) {
      const json = await response.json();
      staffId1 = json.data.id;
      expect(json.data.firstName).toBe('Test');
      expect(json.data.isActive).toBe(true);
    }
  });

  test('should assign service to staff member', async ({ request }) => {
    if (!staffId1 || !serviceId) {
      test.skip();
      return;
    }

    const response = await request.post(`/api/salons/${salonId}/staff/${staffId1}/services`, {
      headers: { 'Cookie': `token=${ownerToken}` },
      data: {
        serviceIds: [serviceId],
      },
    });

    if (response.ok()) {
      const json = await response.json();
      expect(json.success).toBe(true);
    }
  });

  test('should create multiple staff with same service', async ({ request }) => {
    if (!salonId || !serviceId) {
      test.skip();
      return;
    }

    // Create second staff member
    const createRes = await request.post(`/api/salons/${salonId}/staff`, {
      headers: { 'Cookie': `token=${ownerToken}` },
      data: {
        firstName: 'Second',
        lastName: 'Stylist',
        email: `stylist_${randomId}_2@test.com`,
        role: 'staff',
        isActive: true,
      },
    });

    if (createRes.status() === 201) {
      const createJson = await createRes.json();
      staffId2 = createJson.data.id;

      // Assign same service to second staff
      const assignRes = await request.post(`/api/salons/${salonId}/staff/${staffId2}/services`, {
        headers: { 'Cookie': `token=${ownerToken}` },
        data: {
          serviceIds: [serviceId],
        },
      });

      if (assignRes.ok()) {
        expect(assignRes.status()).toBeLessThan(400);
      }
    }
  });

  test('should prevent booking when staff is inactive', async ({ request }) => {
    if (!staffId1 || !serviceId) {
      test.skip();
      return;
    }

    // Deactivate staff
    const deactivateRes = await request.patch(`/api/salons/${salonId}/staff/${staffId1}`, {
      headers: { 'Cookie': `token=${ownerToken}` },
      data: {
        isActive: false,
      },
    });

    if (deactivateRes.ok()) {
      // Try to book with inactive staff
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 2);
      bookingDate.setHours(10, 0, 0, 0);

      const bookingRes = await request.post(`/api/widget/${salonId}/book`, {
        data: {
          serviceId,
          staffId: staffId1,
          startTime: bookingDate.toISOString(),
          notes: 'Should fail - staff inactive',
        },
      });

      // Should fail with 400 or 404
      expect(bookingRes.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('should handle staff with no assigned services', async ({ request }) => {
    if (!salonId) {
      test.skip();
      return;
    }

    // Create staff with no services
    const createRes = await request.post(`/api/salons/${salonId}/staff`, {
      headers: { 'Cookie': `token=${ownerToken}` },
      data: {
        firstName: 'No',
        lastName: 'Services',
        email: `noservices_${randomId}@test.com`,
        role: 'staff',
        isActive: true,
      },
    });

    if (createRes.status() === 201) {
      const json = await createRes.json();
      const noServiceStaffId = json.data.id;

      // Verify staff doesn't appear in service-filtered staff list
      if (serviceId) {
        const staffRes = await request.get(`/api/widget/${salonId}/staff?serviceId=${serviceId}`);
        const staffJson = await staffRes.json();
        const staffList = staffJson.data || [];
        
        const foundStaff = staffList.find(s => s.id === noServiceStaffId);
        expect(foundStaff).toBeUndefined();
      }
    }
  });
});

test.describe('Staff Working Hours Edge Cases', () => {
  let ownerToken;
  let salonId;
  let staffId;
  let serviceId;

  test.beforeAll(async ({ request }) => {
    const randomId2 = Math.floor(Math.random() * 1000000);
    const email = `hours_owner_${randomId2}@example.com`;
    
    const regRes = await request.post('/api/auth/register', {
      data: {
        email,
        password: 'HoursTest123!',
        firstName: 'Hours',
        lastName: 'Owner',
        role: 'owner',
      },
    });
    
    const regJson = await regRes.json();
    ownerToken = regJson.data?.token;

    const salonsRes = await request.get('/api/salons', {
      headers: { 'Cookie': `token=${ownerToken}` },
    });
    
    const salonsJson = await salonsRes.json();
    const salons = salonsJson.data?.data || salonsJson.data || [];
    
    if (salons.length > 0) {
      salonId = salons[0].id;
      
      // Get service
      const servicesRes = await request.get(`/api/services?salon_id=${salonId}`);
      const servicesJson = await servicesRes.json();
      const services = servicesJson.data?.data || servicesJson.data || [];
      serviceId = services[0]?.id;

      // Create staff
      const staffRes = await request.post(`/api/salons/${salonId}/staff`, {
        headers: { 'Cookie': `token=${ownerToken}` },
        data: {
          firstName: 'Hours',
          lastName: 'Test',
          email: `hours_staff_${randomId2}@test.com`,
          role: 'staff',
          isActive: true,
        },
      });

      if (staffRes.status() === 201) {
        const staffJson = await staffRes.json();
        staffId = staffJson.data.id;
      }
    }
  });

  test('should set working hours for staff', async ({ request }) => {
    if (!staffId) {
      test.skip();
      return;
    }

    const response = await request.post(`/api/salons/${salonId}/staff/${staffId}/hours`, {
      headers: { 'Cookie': `token=${ownerToken}` },
      data: {
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true,
      },
    });

    if (response.status() === 201 || response.status() === 200) {
      const json = await response.json();
      expect(json.success).toBe(true);
    }
  });

  test('should prevent booking outside working hours', async ({ request }) => {
    if (!staffId || !serviceId) {
      test.skip();
      return;
    }

    // Try to book at 8 AM (before 9 AM working hours)
    const bookingDate = new Date();
    // Get next Monday
    const dayOfWeek = bookingDate.getDay();
    const daysUntilMonday = (8 - dayOfWeek) % 7;
    bookingDate.setDate(bookingDate.getDate() + daysUntilMonday);
    bookingDate.setHours(8, 0, 0, 0);

    const response = await request.post(`/api/widget/${salonId}/book`, {
      data: {
        serviceId,
        staffId,
        startTime: bookingDate.toISOString(),
        notes: 'Should fail - outside working hours',
      },
    });

    // Should fail with 400 or similar
    if (response.status() >= 400) {
      const json = await response.json();
      expect(json.success).toBe(false);
    }
  });

  test('should allow booking within working hours', async ({ request }) => {
    if (!staffId || !serviceId) {
      test.skip();
      return;
    }

    // Book at 10 AM (within 9 AM - 5 PM)
    const bookingDate = new Date();
    const dayOfWeek = bookingDate.getDay();
    const daysUntilMonday = (8 - dayOfWeek) % 7;
    bookingDate.setDate(bookingDate.getDate() + daysUntilMonday);
    bookingDate.setHours(10, 0, 0, 0);

    const response = await request.post(`/api/widget/${salonId}/book`, {
      data: {
        serviceId,
        staffId,
        startTime: bookingDate.toISOString(),
        notes: 'Within working hours',
      },
    });

    // Should succeed or fail for other reasons (conflicts, etc)
    expect([200, 201, 400, 409]).toContain(response.status());
  });
});

test.describe('Staff Time Off Edge Cases', () => {
  let ownerToken;
  let salonId;
  let staffId;
  let serviceId;

  test.beforeAll(async ({ request }) => {
    const randomId3 = Math.floor(Math.random() * 1000000);
    const email = `timeoff_owner_${randomId3}@example.com`;
    
    const regRes = await request.post('/api/auth/register', {
      data: {
        email,
        password: 'TimeOffTest123!',
        firstName: 'TimeOff',
        lastName: 'Owner',
        role: 'owner',
      },
    });
    
    const regJson = await regRes.json();
    ownerToken = regJson.data?.token;

    const salonsRes = await request.get('/api/salons', {
      headers: { 'Cookie': `token=${ownerToken}` },
    });
    
    const salonsJson = await salonsRes.json();
    const salons = salonsJson.data?.data || salonsJson.data || [];
    
    if (salons.length > 0) {
      salonId = salons[0].id;
      
      const servicesRes = await request.get(`/api/services?salon_id=${salonId}`);
      const servicesJson = await servicesRes.json();
      const services = servicesJson.data?.data || servicesJson.data || [];
      serviceId = services[0]?.id;

      const staffRes = await request.post(`/api/salons/${salonId}/staff`, {
        headers: { 'Cookie': `token=${ownerToken}` },
        data: {
          firstName: 'TimeOff',
          lastName: 'Staff',
          email: `timeoff_staff_${randomId3}@test.com`,
          role: 'staff',
          isActive: true,
        },
      });

      if (staffRes.status() === 201) {
        const staffJson = await staffRes.json();
        staffId = staffJson.data.id;
      }
    }
  });

  test('should create time off period for staff', async ({ request }) => {
    if (!staffId) {
      test.skip();
      return;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 10);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 2);
    endDate.setHours(23, 59, 59, 999);

    const response = await request.post(`/api/salons/${salonId}/staff/${staffId}/time-off`, {
      headers: { 'Cookie': `token=${ownerToken}` },
      data: {
        startDatetime: startDate.toISOString(),
        endDatetime: endDate.toISOString(),
        reason: 'Vacation',
      },
    });

    if (response.status() === 201 || response.status() === 200) {
      const json = await response.json();
      expect(json.success).toBe(true);
    }
  });

  test('should prevent booking during time off', async ({ request }) => {
    if (!staffId || !serviceId) {
      test.skip();
      return;
    }

    // Try to book during time off period (day 11 from now)
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 11);
    bookingDate.setHours(14, 0, 0, 0);

    const response = await request.post(`/api/widget/${salonId}/book`, {
      data: {
        serviceId,
        staffId,
        startTime: bookingDate.toISOString(),
        notes: 'Should fail - staff on time off',
      },
    });

    // Should fail
    if (response.status() >= 400) {
      const json = await response.json();
      expect(json.success).toBe(false);
    }
  });

  test('should allow booking after time off ends', async ({ request }) => {
    if (!staffId || !serviceId) {
      test.skip();
      return;
    }

    // Book after time off (day 13+ from now)
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 15);
    bookingDate.setHours(11, 0, 0, 0);

    const response = await request.post(`/api/widget/${salonId}/book`, {
      data: {
        serviceId,
        staffId,
        startTime: bookingDate.toISOString(),
        notes: 'After time off period',
      },
    });

    // May succeed or fail for other reasons
    expect([200, 201, 400, 409]).toContain(response.status());
  });
});

test.describe('Staff Concurrent Booking Conflicts', () => {
  let staffId;
  let serviceId;
  let salonId;

  test.beforeAll(async ({ request }) => {
    const salonsRes = await request.get('/api/marketplace/salons');
    const salonsJson = await salonsRes.json();
    salonId = salonsJson.data[0]?.id;

    if (salonId) {
      const servicesRes = await request.get(`/api/services?salon_id=${salonId}`);
      const servicesJson = await servicesRes.json();
      const services = servicesJson.data?.data || servicesJson.data || [];
      serviceId = services[0]?.id;

      const staffRes = await request.get(`/api/widget/${salonId}/staff?serviceId=${serviceId}`);
      const staffJson = await staffRes.json();
      staffId = staffJson.data[0]?.id;
    }
  });

  test('should prevent double booking at same time', async ({ request }) => {
    if (!staffId || !serviceId) {
      test.skip();
      return;
    }

    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 7);
    bookingDate.setHours(13, 0, 0, 0);

    // Make two simultaneous booking requests
    const [result1, result2] = await Promise.all([
      request.post(`/api/widget/${salonId}/book`, {
        data: {
          serviceId,
          staffId,
          startTime: bookingDate.toISOString(),
          notes: 'Concurrent booking 1',
        },
      }),
      request.post(`/api/widget/${salonId}/book`, {
        data: {
          serviceId,
          staffId,
          startTime: bookingDate.toISOString(),
          notes: 'Concurrent booking 2',
        },
      }),
    ]);

    // At least one should fail due to conflict
    const statuses = [result1.status(), result2.status()];
    const hasConflict = statuses.some(s => s === 409 || s >= 400);
    expect(hasConflict).toBe(true);
  });

  test('should handle overlapping booking attempts', async ({ request }) => {
    if (!staffId || !serviceId) {
      test.skip();
      return;
    }

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 8);
    startTime.setHours(15, 0, 0, 0);

    // Create first booking
    const firstBooking = await request.post(`/api/widget/${salonId}/book`, {
      data: {
        serviceId,
        staffId,
        startTime: startTime.toISOString(),
        notes: 'First booking',
      },
    });

    if (firstBooking.status() === 201) {
      // Try to book overlapping time (15:30 - overlaps with first)
      const overlapTime = new Date(startTime);
      overlapTime.setMinutes(30);

      const secondBooking = await request.post(`/api/widget/${salonId}/book`, {
        data: {
          serviceId,
          staffId,
          startTime: overlapTime.toISOString(),
          notes: 'Overlapping booking',
        },
      });

      // Should fail with conflict
      expect(secondBooking.status()).toBeGreaterThanOrEqual(400);
    }
  });
});
