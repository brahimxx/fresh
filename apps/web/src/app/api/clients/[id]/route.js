import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// GET /api/clients/[id] - Get client details
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salon_id') || searchParams.get('salonId');

    const client = await getOne(
      'SELECT id, first_name, last_name, email, phone, created_at FROM users WHERE id = ?',
      [id]
    );

    if (!client) {
      return notFound('Client not found');
    }

    let salonData = null;
    if (salonId) {
      salonData = await getOne(
        'SELECT * FROM salon_clients WHERE salon_id = ? AND client_id = ?',
        [salonId, id]
      );
    }

    return success({
      id: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      phone: client.phone,
      createdAt: client.created_at,
      salonStats: salonData
        ? {
            firstVisitDate: salonData.first_visit_date,
            lastVisitDate: salonData.last_visit_date,
            totalVisits: salonData.total_visits,
          }
        : null,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get client error:', err);
    return error('Failed to get client', 500);
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Only admin or the client themselves can update
    if (session.userId !== parseInt(id) && session.role !== 'admin') {
      // Check if owner/manager updating their salon client
      const body = await request.json();
      const { salonId, firstName, lastName, phone } = body;

      if (salonId) {
        const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
        if (!salon || (salon.owner_id !== session.userId && session.role !== 'admin')) {
          return forbidden('Not authorized to update this client');
        }
      } else {
        return forbidden('Not authorized to update this client');
      }
    }

    const body = await request.json();
    const { firstName, lastName, phone } = body;

    await query(
      'UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), phone = COALESCE(?, phone), updated_at = NOW() WHERE id = ?',
      [firstName, lastName, phone, id]
    );

    const client = await getOne('SELECT id, first_name, last_name, email, phone FROM users WHERE id = ?', [id]);

    return success({
      id: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      phone: client.phone,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update client error:', err);
    return error('Failed to update client', 500);
  }
}
