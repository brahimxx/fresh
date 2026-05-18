import { query } from '@/lib/db';

/**
 * Records a gift card transaction in the ledger.
 * Call this after every balance change to maintain a full audit trail.
 *
 * @param {Object} params
 * @param {number} params.giftCardId - The gift card ID
 * @param {'purchase'|'redemption'|'refund'|'manual_adjustment'|'expiry'} params.type - Transaction type
 * @param {number} params.amount - Positive for credits, negative for debits
 * @param {number} params.balanceAfter - The gift card balance after this transaction
 * @param {string|null} [params.referenceType] - e.g. 'booking', 'checkout', 'cancellation', 'webhook'
 * @param {number|null} [params.referenceId] - ID of the related entity
 * @param {string|null} [params.notes] - Optional description
 * @param {number|null} [params.createdBy] - User ID who triggered this (null for system)
 * @param {Object|null} [params.conn] - Optional DB connection for use within transactions
 */
export async function recordGiftCardTransaction({
  giftCardId,
  type,
  amount,
  balanceAfter,
  referenceType = null,
  referenceId = null,
  notes = null,
  createdBy = null,
  conn = null,
}) {
  const sql = `
    INSERT INTO gift_card_transactions
      (gift_card_id, type, amount, balance_after, reference_type, reference_id, notes, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;
  const params = [giftCardId, type, amount, balanceAfter, referenceType, referenceId, notes, createdBy];

  if (conn) {
    await conn.execute(sql, params);
  } else {
    await query(sql, params);
  }
}
