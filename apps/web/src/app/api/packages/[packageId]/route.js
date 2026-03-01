import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// GET /api/packages/[packageId] - Get package details
export async function GET(request, { params }) {
  try {
    const { packageId } = await params;

    const pkg = await getOne('SELECT * FROM packages WHERE id = ?', [packageId]);

    if (!pkg) {
      return notFound('Package not found');
    }

    const services = await query(
      `SELECT ps.*, s.name as service_name, s.price as original_price, s.duration_minutes
       FROM package_services ps
       JOIN services s ON s.id = ps.service_id
       WHERE ps.package_id = ?`,
      [packageId]
    );

    return success({
      id: pkg.id,
      salonId: pkg.salon_id,
      name: pkg.name,
      description: pkg.description,
      originalPrice: parseFloat(pkg.original_price),
      discountedPrice: parseFloat(pkg.discounted_price),
      discountPercent: pkg.discount_percent,
      validityDays: pkg.validity_days,
      maxUses: pkg.max_uses,
      isActive: pkg.is_active,
      services: services.map((s) => ({
        serviceId: s.service_id,
        serviceName: s.service_name,
        originalPrice: parseFloat(s.original_price),
        quantity: s.quantity,
        duration: s.duration_minutes,
      })),
    });
  } catch (err) {
    console.error('Get package error:', err);
    return error('Failed to get package', 500);
  }
}

// PUT /api/packages/[packageId] - Update package
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { packageId } = await params;

    const pkg = await getOne(
      'SELECT p.*, s.owner_id FROM packages p JOIN salons s ON s.id = p.salon_id WHERE p.id = ?',
      [packageId]
    );

    if (!pkg) {
      return notFound('Package not found');
    }

    if (session.role !== 'admin' && pkg.owner_id !== session.userId) {
      return forbidden('Not authorized to update this package');
    }

    const body = await request.json();
    const { name, description, services, discountPercent, validityDays, maxUses, isActive } = body;

    await transaction(async (conn) => {
      // If services are provided, recalculate prices
      if (services && services.length > 0) {
        let originalPrice = 0;
        for (const svc of services) {
          const [serviceData] = await conn.execute('SELECT price FROM services WHERE id = ?', [svc.serviceId]);
          if (serviceData.length > 0) {
            originalPrice += parseFloat(serviceData[0].price) * (svc.quantity || 1);
          }
        }

        const discount = discountPercent ?? pkg.discount_percent;
        const discountedPrice = originalPrice * (1 - discount / 100);

        await conn.execute(
          `UPDATE packages SET 
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            original_price = ?,
            discounted_price = ?,
            discount_percent = COALESCE(?, discount_percent),
            validity_days = COALESCE(?, validity_days),
            max_uses = COALESCE(?, max_uses),
            is_active = COALESCE(?, is_active)
           WHERE id = ?`,
          [name, description, originalPrice, discountedPrice, discountPercent, validityDays, maxUses, isActive, packageId]
        );

        // Update services
        await conn.execute('DELETE FROM package_services WHERE package_id = ?', [packageId]);
        for (const svc of services) {
          await conn.execute(
            'INSERT INTO package_services (package_id, service_id, quantity) VALUES (?, ?, ?)',
            [packageId, svc.serviceId, svc.quantity || 1]
          );
        }
      } else {
        // Just update other fields
        await conn.execute(
          `UPDATE packages SET 
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            validity_days = COALESCE(?, validity_days),
            max_uses = COALESCE(?, max_uses),
            is_active = COALESCE(?, is_active)
           WHERE id = ?`,
          [name, description, validityDays, maxUses, isActive, packageId]
        );
      }
    });

    return success({ message: 'Package updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update package error:', err);
    return error('Failed to update package', 500);
  }
}

// DELETE /api/packages/[packageId] - Delete package
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { packageId } = await params;

    const pkg = await getOne(
      'SELECT p.*, s.owner_id FROM packages p JOIN salons s ON s.id = p.salon_id WHERE p.id = ?',
      [packageId]
    );

    if (!pkg) {
      return notFound('Package not found');
    }

    if (session.role !== 'admin' && pkg.owner_id !== session.userId) {
      return forbidden('Not authorized to delete this package');
    }

    await transaction(async (conn) => {
      await conn.execute('DELETE FROM package_services WHERE package_id = ?', [packageId]);
      await conn.execute('UPDATE packages SET is_active = 0 WHERE id = ?', [packageId]);
    });

    return success({ message: 'Package deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete package error:', err);
    return error('Failed to delete package', 500);
  }
}
