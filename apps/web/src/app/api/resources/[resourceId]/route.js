import { query, getOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized, notFound, forbidden } from '@/lib/response';

// GET /api/resources/[resourceId] - Get resource details
export async function GET(request, { params }) {
  try {
    const { resourceId } = await params;

    const resource = await getOne('SELECT * FROM resources WHERE id = ?', [resourceId]);

    if (!resource) {
      return notFound('Resource not found');
    }

    return success({
      id: resource.id,
      salonId: resource.salon_id,
      name: resource.name,
      type: resource.type,
      description: resource.description,
      capacity: resource.capacity,
      isActive: resource.is_active,
    });
  } catch (err) {
    console.error('Get resource error:', err);
    return error('Failed to get resource', 500);
  }
}

// PUT /api/resources/[resourceId] - Update resource
export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    const { resourceId } = await params;

    const resource = await getOne(
      'SELECT r.*, s.owner_id FROM resources r JOIN salons s ON s.id = r.salon_id WHERE r.id = ?',
      [resourceId]
    );

    if (!resource) {
      return notFound('Resource not found');
    }

    if (session.role !== 'admin' && resource.owner_id !== session.userId) {
      return forbidden('Not authorized to update this resource');
    }

    const body = await request.json();
    const { name, type, description, capacity, isActive } = body;

    await query(
      `UPDATE resources SET
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        description = COALESCE(?, description),
        capacity = COALESCE(?, capacity),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, type, description, capacity, isActive, resourceId]
    );

    return success({ message: 'Resource updated successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Update resource error:', err);
    return error('Failed to update resource', 500);
  }
}

// DELETE /api/resources/[resourceId] - Delete resource
export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    const { resourceId } = await params;

    const resource = await getOne(
      'SELECT r.*, s.owner_id FROM resources r JOIN salons s ON s.id = r.salon_id WHERE r.id = ?',
      [resourceId]
    );

    if (!resource) {
      return notFound('Resource not found');
    }

    if (session.role !== 'admin' && resource.owner_id !== session.userId) {
      return forbidden('Not authorized to delete this resource');
    }

    await query('UPDATE resources SET is_active = 0 WHERE id = ?', [resourceId]);

    return success({ message: 'Resource deleted successfully' });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Delete resource error:', err);
    return error('Failed to delete resource', 500);
  }
}
