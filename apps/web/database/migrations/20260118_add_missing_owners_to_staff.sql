-- Migration: Add existing salon owners to staff table if they're not already listed
-- Date: 2026-01-18

-- Insert salon owners as staff members where they don't already exist
INSERT INTO staff (salon_id, user_id, title, role, is_visible, is_active)
SELECT 
    s.id AS salon_id,
    s.owner_id AS user_id,
    'Owner' AS title,
    'owner' AS role,
    1 AS is_visible,
    1 AS is_active
FROM salons s
WHERE NOT EXISTS (
    SELECT 1 
    FROM staff st 
    WHERE st.salon_id = s.id 
    AND st.user_id = s.owner_id
)
AND s.is_active = 1;

-- Update statistics
SELECT 
    COUNT(*) as total_salons,
    COUNT(DISTINCT st.salon_id) as salons_with_owner_in_staff,
    COUNT(*) - COUNT(DISTINCT st.salon_id) as owners_added
FROM salons s
LEFT JOIN staff st ON st.salon_id = s.id AND st.user_id = s.owner_id
WHERE s.is_active = 1;
