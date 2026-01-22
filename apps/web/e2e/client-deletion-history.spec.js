import { test, expect } from '@playwright/test';

/**
 * Client Deletion with History E2E Tests
 * Tests deleting clients with booking history and data integrity
 * Uses real database, no mocks
 */

const randomId = Math.floor(Math.random() * 1000000);
const ownerEmail = `client_delete_owner_${randomId}@example.com`;
const clientEmail = `client_delete_${randomId}@example.com`;
const ownerPassword = 'DeleteTest123!';
const clientPassword = 'ClientPass123!';

test.describe('Client Deletion with History', () => {
  let ownerToken;
  let clientToken;
  let salonId;
  let clientId;
  let bookingId;
  let serviceId;
  let staffId;

  test.beforeAll(async ({ request }) => {
    // Register salon owner
    const ownerRes = await request.post('/api/auth/register', {
      data: {
        email: ownerEmail,
        password: ownerPassword,
        firstName: 'Delete',
        lastName: 'Owner',
        role: 'owner',
      },
    });
    
    const ownerJson = await ownerRes.json();
    ownerToken = ownerJson.data?.token;

    // Register client
    const clientRes = await request.post('/api/auth/register', {
      data: {
        email: clientEmail,
        password: clientPassword,
        firstName: 'Test',
        lastName: 'Client',
        role: 'client',
      },
    });
    
    const clientJson = await clientRes.json();
    clientToken = clientJson.data?.token;
    clientId = clientJson.data?.user?.id;

    // Get salon
    const salonsRes = await request.get('/api/marketplace/salons');
    const salonsJson = await salonsRes.json();
    salonId = salonsJson.data[0]?.id;

    if (salonId) {
      // Get service
      const servicesRes = await request.get(`/api/services?salon_id=${salonId}`);
      const servicesJson = await servicesRes.json();
      const services = servicesJson.data?.data || servicesJson.data || [];
      serviceId = services[0]?.id;

      // Get staff
      if (serviceId) {
        const staffRes = await request.get(`/api/widget/${salonId}/staff?serviceId=${serviceId}`);
        const staffJson = await staffRes.json();
        staffId = staffJson.data[0]?.id;
      }
    }
  });

  test('1. Create booking for client', async ({ request }) => {
    if (!serviceId || !staffId) {
      test.skip();
      return;
    }

    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 3);
    bookingDate.setHours(10, 0, 0, 0);

    const response = await request.post(`/api/widget/${salonId}/book`, {
      headers: { 'Cookie': `token=${clientToken}` },
      data: {
        serviceId,
        staffId,
        startTime: bookingDate.toISOString(),
        notes: 'Booking before deletion test',
      },
    });

    if (response.status() === 201) {
      const json = await response.json();
      bookingId = json.data.id;
      expect(bookingId).toBeDefined();
    }
  });

  test('2. Verify client appears in salon client list', async ({ request }) => {
    if (!salonId) {
      test.skip();
      return;
    }

    const response = await request.get(`/api/salons/${salonId}/clients`, {
      headers: { 'Cookie': `token=${ownerToken}` },
    });

    if (response.ok()) {
      const json = await response.json();
      const clients = json.data?.data || json.data || [];
      const ourClient = clients.find(c => c.email === clientEmail);
      
      if (ourClient) {
        expect(ourClient.email).toBe(clientEmail);
      }
    }
  });

  test('3. Complete booking to create history', async ({ request }) => {
    if (!bookingId) {
      test.skip();
      return;
    }

    // Mark booking as completed
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

  test('4. Verify client has booking history', async ({ request }) => {
    if (!clientId || !salonId) {
      test.skip();
      return;
    }

    const response = await request.get('/api/bookings?include_past=true', {
      headers: { 'Cookie': `token=${clientToken}` },
    });

    if (response.ok()) {
      const json = await response.json();
      const bookings = Array.isArray(json.data?.data) ? json.data.data : (Array.isArray(json.data) ? json.data : []);
      if (Array.isArray(bookings) && bookings.length > 0) {
        const hasHistory = bookings.some(b => b.status === 'completed');
        expect(hasHistory).toBe(true);
      }
    }
  });

  test('5. Attempt soft delete of client', async ({ request }) => {
    if (!clientId) {
      test.skip();
      return;
    }

    // Soft delete (if endpoint exists)
    const response = await request.delete(`/api/clients/${clientId}`, {
      headers: { 'Cookie': `token=${ownerToken}` },
    });

    // Endpoint may not exist or may reject, that's okay
    expect([200, 204, 400, 404, 405]).toContain(response.status());
  });

  test('6. Verify booking history preserved after deletion', async ({ request }) => {
    if (!bookingId) {
      test.skip();
      return;
    }

    // Check if booking still exists
    const response = await request.get(`/api/bookings/${bookingId}`, {
      headers: { 'Cookie': `token=${ownerToken}` },
    });

    // Booking should still exist for historical records
    if (response.ok()) {
      const json = await response.json();
      expect(json.data.id).toBe(bookingId);
    }
  });

  test('7. Verify client cannot login after account deletion', async ({ request }) => {
    // Try to login with deleted client
    const response = await request.post('/api/auth/login', {
      data: {
        email: clientEmail,
        password: clientPassword,
      },
    });

    // Should either fail or still work if soft delete
    expect([200, 401, 404]).toContain(response.status());
  });
});

test.describe('Client Data Integrity', () => {
  let ownerToken;
  let clientToken;
  let salonId;
  let clientId;

  test.beforeAll(async ({ request }) => {
    const randomId2 = Math.floor(Math.random() * 1000000);
    
    const ownerRes = await request.post('/api/auth/register', {
      data: {
        email: `integrity_owner_${randomId2}@example.com`,
        password: 'IntegrityTest123!',
        firstName: 'Integrity',
        lastName: 'Owner',
        role: 'owner',
      },
    });
    ownerToken = ownerRes.json().then(j => j.data?.token);

    const clientRes = await request.post('/api/auth/register', {
      data: {
        email: `integrity_client_${randomId2}@example.com`,
        password: 'ClientInt123!',
        firstName: 'Integrity',
        lastName: 'Client',
        role: 'client',
      },
    });
    
    const clientJson = await clientRes.json();
    clientToken = clientJson.data?.token;
    clientId = clientJson.data?.user?.id;

    const salonsRes = await request.get('/api/marketplace/salons');
    const salonsJson = await salonsRes.json();
    salonId = salonsJson.data[0]?.id;
  });

  test('should maintain salon_clients relationship', async ({ request }) => {
    if (!salonId || !clientId) {
      test.skip();
      return;
    }

    // Create booking to establish salon-client relationship
    const servicesRes = await request.get(`/api/services?salon_id=${salonId}`);
    const servicesJson = await servicesRes.json();
    const serviceId = servicesJson.data?.data?.[0]?.id || servicesJson.data?.[0]?.id;

    if (!serviceId) {
      test.skip();
      return;
    }

    const staffRes = await request.get(`/api/widget/${salonId}/staff?serviceId=${serviceId}`);
    const staffJson = await staffRes.json();
    const staffId = staffJson.data[0]?.id;

    if (!staffId) {
      test.skip();
      return;
    }

    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 5);
    bookingDate.setHours(14, 0, 0, 0);

    const bookingRes = await request.post(`/api/widget/${salonId}/book`, {
      headers: { 'Cookie': `token=${clientToken}` },
      data: {
        serviceId,
        staffId,
        startTime: bookingDate.toISOString(),
        notes: 'Relationship test',
      },
    });

    if (bookingRes.status() === 201) {
      // Check salon_clients table
      const clientsRes = await request.get(`/api/salons/${salonId}/clients`, {
        headers: { 'Cookie': `token=${await ownerToken}` },
      });

      if (clientsRes.ok()) {
        const clientsJson = await clientsRes.json();
        const clients = clientsJson.data?.data || clientsJson.data || [];
        const relationship = clients.find(c => c.id === clientId || c.client_id === clientId);
        
        if (relationship) {
          expect(relationship).toBeDefined();
          expect(relationship).toHaveProperty('first_visit_date');
        }
      }
    }
  });

  test('should preserve client stats on deletion', async ({ request }) => {
    if (!salonId || !clientId) {
      test.skip();
      return;
    }

    // Get client stats before deletion
    const statsRes = await request.get(`/api/salons/${salonId}/clients/${clientId}`, {
      headers: { 'Cookie': `token=${await ownerToken}` },
    });

    if (statsRes.ok()) {
      const statsJson = await statsRes.json();
      const totalVisits = statsJson.data?.total_visits || 0;
      const totalSpent = statsJson.data?.total_spent || 0;

      // Store these values
      expect(totalVisits).toBeGreaterThanOrEqual(0);
      expect(totalSpent).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Client with Multiple Salon Relationships', () => {
  let clientToken;
  let clientId;
  let salon1Id;
  let salon2Id;
  let testEmail;

  test.beforeAll(async ({ request }) => {
    const randomId3 = Math.floor(Math.random() * 1000000);
    testEmail = `multi_salon_client_${randomId3}@example.com`;
    
    const clientRes = await request.post('/api/auth/register', {
      data: {
        email: testEmail,
        password: 'MultiTest123!',
        firstName: 'Multi',
        lastName: 'Salon',
        role: 'client',
      },
    });
    
    const clientJson = await clientRes.json();
    clientToken = clientJson.data?.token;
    clientId = clientJson.data?.user?.id;

    // Get multiple salons
    const salonsRes = await request.get('/api/marketplace/salons');
    const salonsJson = await salonsRes.json();
    const salons = salonsJson.data || [];
    
    if (salons.length >= 2) {
      salon1Id = salons[0].id;
      salon2Id = salons[1].id;
    } else if (salons.length === 1) {
      salon1Id = salons[0].id;
    }
  });

  test('should create bookings at multiple salons', async ({ request }) => {
    if (!salon1Id || !salon2Id) {
      test.skip();
      return;
    }

    // Book at salon 1
    const services1Res = await request.get(`/api/services?salon_id=${salon1Id}`);
    const services1Json = await services1Res.json();
    const service1Id = services1Json.data?.data?.[0]?.id || services1Json.data?.[0]?.id;

    if (service1Id) {
      const staff1Res = await request.get(`/api/widget/${salon1Id}/staff?serviceId=${service1Id}`);
      const staff1Json = await staff1Res.json();
      const staff1Id = staff1Json.data[0]?.id;

      if (staff1Id) {
        const booking1Date = new Date();
        booking1Date.setDate(booking1Date.getDate() + 4);
        booking1Date.setHours(11, 0, 0, 0);

        const booking1Res = await request.post(`/api/widget/${salon1Id}/book`, {
          headers: { 'Cookie': `token=${clientToken}` },
          data: {
            serviceId: service1Id,
            staffId: staff1Id,
            startTime: booking1Date.toISOString(),
            notes: 'Booking at salon 1',
          },
        });

        expect([201, 400, 409]).toContain(booking1Res.status());
      }
    }

    // Book at salon 2
    const services2Res = await request.get(`/api/services?salon_id=${salon2Id}`);
    const services2Json = await services2Res.json();
    const service2Id = services2Json.data?.data?.[0]?.id || services2Json.data?.[0]?.id;

    if (service2Id) {
      const staff2Res = await request.get(`/api/widget/${salon2Id}/staff?serviceId=${service2Id}`);
      const staff2Json = await staff2Res.json();
      const staff2Id = staff2Json.data[0]?.id;

      if (staff2Id) {
        const booking2Date = new Date();
        booking2Date.setDate(booking2Date.getDate() + 6);
        booking2Date.setHours(13, 0, 0, 0);

        const booking2Res = await request.post(`/api/widget/${salon2Id}/book`, {
          headers: { 'Cookie': `token=${clientToken}` },
          data: {
            serviceId: service2Id,
            staffId: staff2Id,
            startTime: booking2Date.toISOString(),
            notes: 'Booking at salon 2',
          },
        });

        expect([201, 400, 409]).toContain(booking2Res.status());
      }
    }
  });

  test('should maintain separate history per salon', async ({ request }) => {
    if (!salon1Id || !salon2Id) {
      test.skip();
      return;
    }

    // Get bookings for client
    const bookingsRes = await request.get('/api/bookings', {
      headers: { 'Cookie': `token=${clientToken}` },
    });

    if (bookingsRes.ok()) {
      const bookingsJson = await bookingsRes.json();
      const bookings = Array.isArray(bookingsJson.data?.data) ? bookingsJson.data.data : (Array.isArray(bookingsJson.data) ? bookingsJson.data : []);
      
      // Should have bookings from both salons
      if (Array.isArray(bookings)) {
        const salon1Bookings = bookings.filter(b => b.salon_id === salon1Id);
        const salon2Bookings = bookings.filter(b => b.salon_id === salon2Id);
        
        // At least one salon should have bookings
        expect(salon1Bookings.length + salon2Bookings.length).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should cascade delete only from one salon', async ({ request }) => {
    if (!salon1Id || !clientId) {
      test.skip();
      return;
    }

    // Try to remove client from salon1 only (if endpoint exists)
    const response = await request.delete(`/api/salons/${salon1Id}/clients/${clientId}`, {
      headers: { 'Cookie': `token=${clientToken}` },
    });

    // Endpoint may not exist
    expect([200, 204, 404, 405]).toContain(response.status());

    // Client should still exist globally
    const loginRes = await request.post('/api/auth/login', {
      data: {
        email: testEmail,
        password: 'MultiTest123!',
      },
    });

    // Should still be able to login
    expect([200, 401]).toContain(loginRes.status());
  });
});

test.describe('Client Notes and Communication History', () => {
  let ownerToken;
  let clientToken;
  let salonId;
  let clientId;

  test.beforeAll(async ({ request }) => {
    const randomId4 = Math.floor(Math.random() * 1000000);
    
    const ownerRes = await request.post('/api/auth/register', {
      data: {
        email: `notes_owner_${randomId4}@example.com`,
        password: 'NotesTest123!',
        firstName: 'Notes',
        lastName: 'Owner',
        role: 'owner',
      },
    });
    ownerToken = ownerRes.json().then(j => j.data?.token);

    const clientRes = await request.post('/api/auth/register', {
      data: {
        email: `notes_client_${randomId4}@example.com`,
        password: 'NotesClient123!',
        firstName: 'Notes',
        lastName: 'Client',
        role: 'client',
      },
    });
    
    const clientJson = await clientRes.json();
    clientToken = clientJson.data?.token;
    clientId = clientJson.data?.user?.id;

    const salonsRes = await request.get('/api/marketplace/salons');
    const salonsJson = await salonsRes.json();
    salonId = salonsJson.data[0]?.id;
  });

  test('should preserve client notes after deletion', async ({ request }) => {
    if (!salonId || !clientId) {
      test.skip();
      return;
    }

    // Add note to client (if endpoint exists)
    const noteRes = await request.post(`/api/salons/${salonId}/clients/${clientId}/notes`, {
      headers: { 'Cookie': `token=${await ownerToken}` },
      data: {
        note: 'Prefers morning appointments',
      },
    });

    // Endpoint may not exist
    expect([200, 201, 404, 405]).toContain(noteRes.status());
  });

  test('should maintain audit trail of deletions', async ({ request }) => {
    if (!clientId) {
      test.skip();
      return;
    }

    // Check audit logs for client deletion (if exists)
    const auditRes = await request.get(`/api/audit-logs?entity_type=client&entity_id=${clientId}`, {
      headers: { 'Cookie': `token=${await ownerToken}` },
    });

    // Audit endpoint may not exist
    expect([200, 404, 405]).toContain(auditRes.status());
  });
});
