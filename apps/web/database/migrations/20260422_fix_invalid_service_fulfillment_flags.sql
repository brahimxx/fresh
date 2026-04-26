-- =========================================================================
-- Fix invalid service fulfillment flag rows (all flags false)
-- =========================================================================
-- Why:
--   Legacy data or transitional writes may have produced rows where
--   can_physical=0, can_mobile=0, can_virtual=0. Those rows cannot be booked
--   and trigger confusing UI validation states in service editing.
--
-- Strategy:
--   1) For physical-only salons: set can_physical=1
--   2) For mobile/virtual capable salons: backfill from legacy offering_type
--      where available; fallback to enabling all available salon modes
-- =========================================================================

SET SQL_SAFE_UPDATES = 0;

-- Physical-only salons: enforce physical capability.
UPDATE services s
JOIN salons sa ON sa.id = s.salon_id
SET s.can_physical = 1
WHERE s.deleted_at IS NULL
  AND COALESCE(s.can_physical, 0) = 0
  AND COALESCE(s.can_mobile, 0) = 0
  AND COALESCE(s.can_virtual, 0) = 0
  AND COALESCE(sa.is_mobile, 0) = 0
  AND COALESCE(sa.is_virtual, 0) = 0;

-- Multi-mode salons: recover flags from legacy offering_type when possible.
UPDATE services s
JOIN salons sa ON sa.id = s.salon_id
SET
  s.can_physical = CASE
    WHEN s.offering_type = 'physical' THEN 1
    WHEN s.offering_type = 'mobile' THEN 0
    WHEN s.offering_type = 'virtual' THEN 0
    WHEN COALESCE(sa.is_physical, 0) = 1 THEN 1
    ELSE 0
  END,
  s.can_mobile = CASE
    WHEN s.offering_type = 'mobile' THEN 1
    WHEN s.offering_type = 'physical' THEN 0
    WHEN s.offering_type = 'virtual' THEN 0
    WHEN COALESCE(sa.is_mobile, 0) = 1 THEN 1
    ELSE 0
  END,
  s.can_virtual = CASE
    WHEN s.offering_type = 'virtual' THEN 1
    WHEN s.offering_type = 'physical' THEN 0
    WHEN s.offering_type = 'mobile' THEN 0
    WHEN COALESCE(sa.is_virtual, 0) = 1 THEN 1
    ELSE 0
  END
WHERE s.deleted_at IS NULL
  AND COALESCE(s.can_physical, 0) = 0
  AND COALESCE(s.can_mobile, 0) = 0
  AND COALESCE(s.can_virtual, 0) = 0
  AND (COALESCE(sa.is_mobile, 0) = 1 OR COALESCE(sa.is_virtual, 0) = 1);

-- Final guard: if any rows are still all-false, enable physical as a safe default.
UPDATE services
SET can_physical = 1
WHERE deleted_at IS NULL
  AND COALESCE(can_physical, 0) = 0
  AND COALESCE(can_mobile, 0) = 0
  AND COALESCE(can_virtual, 0) = 0;

SET SQL_SAFE_UPDATES = 1;
