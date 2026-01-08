import { getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// GET /api/invoices/[id] - Get invoice details (could be extended to generate PDF)
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Get payment with booking and salon details
    const invoice = await getOne(
      `SELECT p.*, 
              b.start_datetime, b.end_datetime, b.client_id,
              s.id as salon_id, s.name as salon_name, s.address as salon_address, 
              s.city as salon_city, s.phone as salon_phone, s.email as salon_email,
              u.first_name as client_first_name, u.last_name as client_last_name,
              u.email as client_email, u.phone as client_phone
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       JOIN salons s ON s.id = b.salon_id
       JOIN users u ON u.id = b.client_id
       WHERE p.id = ?`,
      [id]
    );

    if (!invoice) {
      return notFound('Invoice not found');
    }

    // Check access
    const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [invoice.salon_id]);
    if (
      session.role !== 'admin' &&
      invoice.client_id !== session.userId &&
      salon?.owner_id !== session.userId
    ) {
      return forbidden('Not authorized to view this invoice');
    }

    // Get booking services
    const services = await require('@/lib/db').query(
      `SELECT bs.*, sv.name as service_name
       FROM booking_services bs
       JOIN services sv ON sv.id = bs.service_id
       WHERE bs.booking_id = ?`,
      [invoice.booking_id]
    );

    return success({
      invoice: {
        id: invoice.id,
        invoiceNumber: `INV-${invoice.id.toString().padStart(6, '0')}`,
        date: invoice.created_at,
        status: invoice.status,
        paymentMethod: invoice.method,
        amount: invoice.amount,
      },
      salon: {
        name: invoice.salon_name,
        address: invoice.salon_address,
        city: invoice.salon_city,
        phone: invoice.salon_phone,
        email: invoice.salon_email,
      },
      client: {
        firstName: invoice.client_first_name,
        lastName: invoice.client_last_name,
        email: invoice.client_email,
        phone: invoice.client_phone,
      },
      booking: {
        id: invoice.booking_id,
        date: invoice.start_datetime,
        services: services.map((s) => ({
          name: s.service_name,
          duration: s.duration_minutes,
          price: s.price,
        })),
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get invoice error:', err);
    return error('Failed to get invoice', 500);
  }
}
