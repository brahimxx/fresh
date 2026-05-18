import { decodeId } from '@/lib/id';
import { query, getOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { success, error, created, forbidden } from "@/lib/response";
import { sendEmail } from "@/lib/email";
import { recordGiftCardTransaction } from "@/lib/gift-card-ledger";
import { formatCurrency } from '@/lib/format';

// Helper to check salon access
async function checkSalonAccess(salonId, userId, role) {
  if (role === "admin") return true;
  const salon = await getOne("SELECT owner_id FROM salons WHERE id = ?", [
    salonId,
  ]);
  if (!salon) return false;
  if (salon.owner_id === userId) return true;
  const staff = await getOne(
    "SELECT id FROM staff WHERE salon_id = ? AND user_id = ? AND role IN ('manager') AND is_active = 1",
    [salonId, userId]
  );
  return !!staff;
}

// GET /api/gift-cards - Get all gift cards
export async function GET(request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const rawSalonId = searchParams.get("salon_id");
    const salonId = rawSalonId ? decodeId(rawSalonId) : null;
    const status = searchParams.get("status");

    let sql = `SELECT * FROM gift_cards WHERE 1=1`;
    const params = [];

    if (salonId) {
      sql += " AND salon_id = ?";
      params.push(salonId);
    }

    // Allow filtering by purchaser (for client profile)
    const purchasedBy = searchParams.get("purchased_by");
    if (purchasedBy) {
      sql += " AND purchased_by = ?";
      params.push(parseInt(purchasedBy));
    }

    if (status === "active") {
      sql += " AND status = 'active' AND remaining_balance > 0";
    } else if (status === "used") {
      sql += " AND remaining_balance = 0";
    } else if (status === "expired") {
      sql += " AND status = 'expired'";
    } else if (status === "cancelled") {
      sql += " AND status = 'cancelled'";
    } else if (status === "pending") {
      sql += " AND status = 'pending'";
    }

    sql += " ORDER BY created_at DESC";

    const giftCards = await query(sql, params);

    return success({
      data: giftCards.map((g) => ({
        id: g.id,
        salonId: g.salon_id,
        code: g.code,
        initialBalance: g.initial_balance,
        remainingBalance: g.remaining_balance,
        purchasedBy: g.purchased_by,
        recipientEmail: g.recipient_email,
        recipientName: g.recipient_name,
        recipientMessage: g.recipient_message,
        status: g.status,
        expiresAt: g.expires_at,
        createdAt: g.created_at,
      })),
    });
  } catch (err) {
    console.error("Get gift cards error:", err);
    return error("Failed to get gift cards", 500);
  }
}

// POST /api/gift-cards - Create a new gift card
export async function POST(request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const {
      salon_id,
      code,
      initial_balance,
      recipient_email,
      recipient_name,
      recipient_message,
      expires_at,
    } = body;

    if (!salon_id) {
      return error("salon_id is required", 400);
    }

    // Decode the salon_id (may be encoded from the URL)
    const decodedSalonId = typeof salon_id === 'string' ? decodeId(salon_id) : salon_id;

    if (!initial_balance || initial_balance <= 0) {
      return error("Initial balance must be greater than 0", 400);
    }

    // Check salon access
    const hasAccess = await checkSalonAccess(
      decodedSalonId,
      session.userId,
      session.role
    );
    if (!hasAccess) {
      return forbidden("Not authorized to create gift cards for this salon");
    }

    // Generate code if not provided
    const giftCardCode = code || generateCode();

    // Check for duplicate code
    const existing = await getOne("SELECT id FROM gift_cards WHERE code = ?", [
      giftCardCode,
    ]);
    if (existing) {
      return error("A gift card with this code already exists", 400);
    }

    const result = await query(
      `INSERT INTO gift_cards (
        salon_id, code, initial_balance, remaining_balance,
        purchased_by, purchaser_email, recipient_email, recipient_name, recipient_message,
        status, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        decodedSalonId,
        giftCardCode,
        initial_balance,
        initial_balance,
        session.userId,
        session.email || null,
        recipient_email || null,
        recipient_name || null,
        recipient_message || null,
        expires_at || null,
      ]
    );

    const newGiftCard = await getOne("SELECT * FROM gift_cards WHERE id = ?", [
      result.insertId,
    ]);

    // Record purchase credit in audit ledger
    await recordGiftCardTransaction({
      giftCardId: result.insertId,
      type: 'purchase',
      amount: parseFloat(initial_balance),
      balanceAfter: parseFloat(initial_balance),
      referenceType: 'dashboard',
      referenceId: result.insertId,
      notes: 'Created from dashboard',
      createdBy: session.userId,
    });

    // Send gift card email to recipient if email is provided and send_email flag is set
    if (recipient_email && body.send_email) {
      const salonRow = await getOne("SELECT name FROM salons WHERE id = ?", [decodedSalonId]);
      const salonName = salonRow?.name || 'Our Salon';
      const formattedAmount = Number(initial_balance).toFixed(2);
      const expiryText = expires_at
        ? `This card expires on ${new Date(expires_at).toLocaleDateString()}.`
        : 'This card has no expiration date.';

      try {
        await sendEmail({
          to: recipient_email,
          subject: `You received a gift card from ${salonName}!`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h1 style="color: #6366f1; margin-bottom: 8px;">🎁 Gift Card</h1>
              <p>You've received a <strong>${formatCurrency(Number(initial_balance))}</strong> gift card${recipient_name ? ` for ${recipient_name}` : ''}!</p>
              ${recipient_message ? `<p style="font-style: italic; color: #6b7280; border-left: 3px solid #e5e7eb; padding-left: 12px;">"${recipient_message}"</p>` : ''}
              <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Your gift card code</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 2px; color: #111827;">${giftCardCode}</p>
              </div>
              <p style="color: #6b7280; font-size: 14px;">${expiryText}</p>
              <p style="color: #6b7280; font-size: 14px;">Present this code at checkout to redeem your balance at <strong>${salonName}</strong>.</p>
            </div>
          `,
          text: `You received a ${formatCurrency(Number(initial_balance))} gift card! Code: ${giftCardCode}. ${expiryText} Present this code at checkout at ${salonName}.`,
        });
      } catch (emailErr) {
        // Email failure is non-blocking — the gift card is already created
        console.error('Gift card email delivery failed:', emailErr);
      }
    }

    return created({
      id: newGiftCard.id,
      code: newGiftCard.code,
      initialBalance: newGiftCard.initial_balance,
      remainingBalance: newGiftCard.remaining_balance,
    });
  } catch (err) {
    console.error("Create gift card error:", err);
    return error("Failed to create gift card", 500);
  }
}

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = [];
  for (let s = 0; s < 4; s++) {
    let segment = "";
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join("-");
}
