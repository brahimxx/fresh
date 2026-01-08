import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, unauthorized } from '@/lib/response';

// GET /api/users/[id]/packages - Get user's purchased packages
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Users can only view their own packages, admins can view any
    if (session.role !== 'admin' && session.userId !== parseInt(id)) {
      return error('Not authorized to view these packages', 403);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // active, expired, used

    let sql = `
      SELECT cp.*, p.name as package_name, p.description, s.name as salon_name
      FROM client_packages cp
      JOIN packages p ON p.id = cp.package_id
      JOIN salons s ON s.id = cp.salon_id
      WHERE cp.client_id = ?
    `;
    const sqlParams = [id];

    if (status === 'active') {
      sql += " AND cp.status = 'active' AND (cp.expires_at IS NULL OR cp.expires_at > NOW())";
    } else if (status === 'expired') {
      sql += " AND (cp.status = 'expired' OR cp.expires_at <= NOW())";
    } else if (status === 'used') {
      sql += " AND cp.status = 'used'";
    }

    sql += ' ORDER BY cp.created_at DESC';

    const packages = await query(sql, sqlParams);

    return success({
      packages: packages.map((p) => ({
        id: p.id,
        packageId: p.package_id,
        packageName: p.package_name,
        description: p.description,
        salonId: p.salon_id,
        salonName: p.salon_name,
        purchasePrice: parseFloat(p.purchase_price),
        remainingUses: p.remaining_uses,
        expiresAt: p.expires_at,
        status: p.status,
        purchasedAt: p.created_at,
      })),
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Get user packages error:', err);
    return error('Failed to get packages', 500);
  }
}
