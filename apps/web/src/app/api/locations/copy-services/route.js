import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, forbidden } from '@/lib/response';

// POST /api/locations/copy-services - Copy services from one location to another
export async function POST(request) {
  try {
    const session = await requireAuth();

    if (session.role !== 'admin' && session.role !== 'owner') {
      return forbidden('Only owners can copy services');
    }

    const body = await request.json();
    const { fromSalonId, toSalonId, categoryIds, serviceIds } = body;

    if (!fromSalonId || !toSalonId) {
      return error('Source and destination salon are required');
    }

    // Verify ownership of both salons
    const fromSalon = await getOne('SELECT id FROM salons WHERE id = ? AND owner_id = ?', [fromSalonId, session.userId]);
    const toSalon = await getOne('SELECT id FROM salons WHERE id = ? AND owner_id = ?', [toSalonId, session.userId]);

    if (!fromSalon || !toSalon) {
      return forbidden('You must own both salons to copy services');
    }

    const result = await transaction(async (conn) => {
      let categoriesCopied = 0;
      let servicesCopied = 0;
      const categoryMapping = {};

      // Copy categories first
      if (categoryIds && categoryIds.length > 0) {
        const [categories] = await conn.execute(
          `SELECT * FROM service_categories WHERE salon_id = ? AND id IN (?)`,
          [fromSalonId, categoryIds]
        );

        for (const cat of categories) {
          // Check if category with same name exists
          const [existing] = await conn.execute(
            'SELECT id FROM service_categories WHERE salon_id = ? AND name = ?',
            [toSalonId, cat.name]
          );

          if (existing.length > 0) {
            categoryMapping[cat.id] = existing[0].id;
          } else {
            const [newCat] = await conn.execute(
              'INSERT INTO service_categories (salon_id, name, description, display_order) VALUES (?, ?, ?, ?)',
              [toSalonId, cat.name, cat.description, cat.display_order]
            );
            categoryMapping[cat.id] = newCat.insertId;
            categoriesCopied++;
          }
        }
      }

      // Copy services
      let servicesQuery = 'SELECT * FROM services WHERE salon_id = ?';
      const servicesParams = [fromSalonId];

      if (serviceIds && serviceIds.length > 0) {
        servicesQuery += ' AND id IN (?)';
        servicesParams.push(serviceIds);
      } else if (categoryIds && categoryIds.length > 0) {
        servicesQuery += ' AND category_id IN (?)';
        servicesParams.push(categoryIds);
      }

      const [services] = await conn.execute(servicesQuery, servicesParams);

      for (const svc of services) {
        // Check if service with same name exists
        const [existing] = await conn.execute('SELECT id FROM services WHERE salon_id = ? AND name = ?', [
          toSalonId,
          svc.name,
        ]);

        if (existing.length === 0) {
          const newCategoryId = svc.category_id ? categoryMapping[svc.category_id] || null : null;

          await conn.execute(
            `INSERT INTO services (
              salon_id, category_id, name, description, duration_minutes, price, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [toSalonId, newCategoryId, svc.name, svc.description, svc.duration_minutes, svc.price, svc.is_active]
          );
          servicesCopied++;
        }
      }

      return { categoriesCopied, servicesCopied };
    });

    return success({
      message: 'Services copied successfully',
      categoriesCopied: result.categoriesCopied,
      servicesCopied: result.servicesCopied,
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Copy services error:', err);
    return error('Failed to copy services', 500);
  }
}
