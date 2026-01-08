import { query, getOne, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { success, error, created, unauthorized, forbidden } from '@/lib/response';

// POST /api/packages/[packageId]/purchase - Purchase a package
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { packageId } = await params;

    const pkg = await getOne('SELECT * FROM packages WHERE id = ? AND is_active = 1', [packageId]);

    if (!pkg) {
      return error('Package not found or inactive', 404);
    }

    const body = await request.json();
    const { paymentMethod, stripePaymentId } = body;

    const result = await transaction(async (conn) => {
      // Calculate expiry date
      let expiresAt = null;
      if (pkg.validity_days) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + pkg.validity_days);
      }

      // Create client package purchase
      const [purchaseResult] = await conn.execute(
        `INSERT INTO client_packages (
          client_id, package_id, salon_id, purchase_price, remaining_uses,
          expires_at, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [session.userId, packageId, pkg.salon_id, pkg.discounted_price, pkg.max_uses || null, expiresAt]
      );

      const clientPackageId = purchaseResult.insertId;

      // Create payment record
      await conn.execute(
        `INSERT INTO payments (
          client_package_id, amount, method, status, stripe_payment_id, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          clientPackageId,
          pkg.discounted_price,
          paymentMethod || 'card',
          stripePaymentId ? 'paid' : 'pending',
          stripePaymentId || null,
        ]
      );

      return {
        clientPackageId,
        expiresAt,
      };
    });

    return created({
      id: result.clientPackageId,
      packageId,
      packageName: pkg.name,
      pricePaid: parseFloat(pkg.discounted_price),
      remainingUses: pkg.max_uses,
      expiresAt: result.expiresAt,
      message: 'Package purchased successfully',
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return unauthorized();
    console.error('Purchase package error:', err);
    return error('Failed to purchase package', 500);
  }
}
