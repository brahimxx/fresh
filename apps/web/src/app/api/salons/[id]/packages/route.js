import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === 'admin') return true;
  const salon = await getOne('SELECT owner_id FROM salons WHERE id = ?', [salonId]);
  if (salon && salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role = 'manager' AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// GET /api/salons/[id]/packages - Get service packages/bundles
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let sql = 'SELECT * FROM packages WHERE salon_id = ?';
    const sqlParams = [id];

    if (!includeInactive) {
      sql += ' AND is_active = 1';
    }

    sql += ' ORDER BY name';

    const packages = await query(sql, sqlParams);

    // Get services for each package
    const packagesWithServices = await Promise.all(
      packages.map(async (pkg) => {
        const services = await query(
          `SELECT ps.*, s.name as service_name, s.price as original_price, s.duration_minutes
           FROM package_services ps
           JOIN services s ON s.id = ps.service_id
           WHERE ps.package_id = ?`,
          [pkg.id]
        );

        return {
          id: pkg.id,
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
        };
      })
    );

    return success({ packages: packagesWithServices });
  } catch (err) {
    console.error('Get packages error:', err);
    return error('Failed to get packages', 500);
  }
}

// POST /api/salons/[id]/packages - Create package
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const hasAccess = await checkSalonAccess(id, session.userId, session.role);
    if (!hasAccess) {
      return forbidden('Not authorized to create packages');
    }

    const body = await request.json();
    const { name, description, services, discountPercent, validityDays, maxUses } = body;

    if (!name || !services || services.length === 0) {
      return error('Name and at least one service are required');
    }

    const result = await transaction(async (conn) => {
      // Calculate original price from services
      let originalPrice = 0;
      for (const svc of services) {
        const [serviceData] = await conn.execute('SELECT price FROM services WHERE id = ?', [svc.serviceId]);
        if (serviceData.length > 0) {
          originalPrice += parseFloat(serviceData[0].price) * (svc.quantity || 1);
        }
      }

      const discountedPrice = originalPrice * (1 - (discountPercent || 0) / 100);

      // Create package
      const [packageResult] = await conn.execute(
        `INSERT INTO packages (
          salon_id, name, description, original_price, discounted_price, 
          discount_percent, validity_days, max_uses, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [id, name, description || null, originalPrice, discountedPrice, discountPercent || 0, validityDays || null, maxUses || null]
      );

      const packageId = packageResult.insertId;

      // Add services to package
      for (const svc of services) {
        await conn.execute(
          'INSERT INTO package_services (package_id, service_id, quantity) VALUES (?, ?, ?)',
          [packageId, svc.serviceId, svc.quantity || 1]
        );
      }

      return {
        id: packageId,
        originalPrice,
        discountedPrice,
      };
    });

    return created({
      id: result.id,
      name,
      originalPrice: result.originalPrice,
      discountedPrice: result.discountedPrice,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Create package error:', err);
    return error('Failed to create package', 500);
  }
}
