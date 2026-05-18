-- Gift card transaction ledger for full audit trail of balance changes.
-- Every debit/credit is recorded here, making dispute resolution trivial.
CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  gift_card_id BIGINT UNSIGNED NOT NULL,
  type ENUM('purchase', 'redemption', 'refund', 'manual_adjustment', 'expiry') NOT NULL,
  amount DECIMAL(10,2) NOT NULL COMMENT 'Positive = credit, Negative = debit',
  balance_after DECIMAL(10,2) NOT NULL COMMENT 'Gift card balance after this transaction',
  reference_type VARCHAR(50) NULL COMMENT 'e.g. booking, checkout, cancellation, webhook',
  reference_id BIGINT UNSIGNED NULL COMMENT 'ID of the related entity (booking_id, etc.)',
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL COMMENT 'User who triggered this (NULL for system/webhook)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_gift_card_id (gift_card_id),
  INDEX idx_reference (reference_type, reference_id),
  INDEX idx_created_at (created_at),
  
  CONSTRAINT fk_gct_gift_card FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill existing redemptions from booking_gift_cards
INSERT INTO gift_card_transactions (gift_card_id, type, amount, balance_after, reference_type, reference_id, notes, created_at)
SELECT 
  bgc.gift_card_id,
  'redemption',
  -bgc.amount_used,
  gc.remaining_balance,
  'booking',
  bgc.booking_id,
  CONCAT('Backfilled from booking #', bgc.booking_id),
  bgc.created_at
FROM booking_gift_cards bgc
JOIN gift_cards gc ON gc.id = bgc.gift_card_id;

-- Backfill initial purchase credits for all active/used cards
INSERT INTO gift_card_transactions (gift_card_id, type, amount, balance_after, reference_type, reference_id, notes, created_at)
SELECT 
  id,
  'purchase',
  initial_balance,
  initial_balance,
  'activation',
  id,
  'Backfilled: initial purchase/creation',
  created_at
FROM gift_cards
WHERE status IN ('active', 'used', 'expired');
