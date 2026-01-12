-- =====================================================
-- Database Integrity & Relationship Verification Script
-- =====================================================
-- Run this AFTER setting up the database to verify everything is correct
-- =====================================================

USE `fresh`;

-- Check 1: Verify all salons exist
SELECT 'Checking Salons...' AS Step;
SELECT COUNT(*) AS salon_count FROM salons;
SELECT id, name, owner_id FROM salons ORDER BY id;

-- Check 2: Verify foreign key relationships for salons
SELECT 'Checking Salon Relationships...' AS Step;

-- Check widget_settings (should have 6 rows, one per salon)
SELECT 'widget_settings' AS table_name, COUNT(*) AS count FROM widget_settings;
SELECT ws.salon_id, s.name 
FROM widget_settings ws 
JOIN salons s ON ws.salon_id = s.id;

-- Check salon_settings (should have 6 rows)
SELECT 'salon_settings' AS table_name, COUNT(*) AS count FROM salon_settings;
SELECT ss.salon_id, s.name, ss.cancellation_policy_hours, ss.deposit_required
FROM salon_settings ss 
JOIN salons s ON ss.salon_id = s.id;

-- Check business_hours (should have 42 rows: 6 salons × 7 days)
SELECT 'business_hours' AS table_name, COUNT(*) AS count FROM business_hours;
SELECT bh.salon_id, s.name, COUNT(*) AS days_configured
FROM business_hours bh
JOIN salons s ON bh.salon_id = s.id
GROUP BY bh.salon_id, s.name;

-- Check salon_amenities
SELECT 'salon_amenities' AS table_name, COUNT(*) AS count FROM salon_amenities;
SELECT sa.salon_id, s.name, COUNT(*) AS amenity_count
FROM salon_amenities sa
JOIN salons s ON sa.salon_id = s.id
GROUP BY sa.salon_id, s.name;

-- Check service_categories
SELECT 'service_categories' AS table_name, COUNT(*) AS count FROM service_categories;
SELECT sc.salon_id, s.name, COUNT(*) AS category_count
FROM service_categories sc
JOIN salons s ON sc.salon_id = s.id
GROUP BY sc.salon_id, s.name;

-- Check services (should reference both salon_id and category_id)
SELECT 'services' AS table_name, COUNT(*) AS count FROM services;
SELECT srv.salon_id, s.name, COUNT(*) AS service_count, SUM(srv.is_popular) AS popular_count
FROM services srv
JOIN salons s ON srv.salon_id = s.id
GROUP BY srv.salon_id, s.name;

-- Verify services have valid category references
SELECT 'Checking service->category relationships...' AS Step;
SELECT srv.id, srv.name, srv.salon_id, srv.category_id, sc.name AS category_name
FROM services srv
LEFT JOIN service_categories sc ON srv.category_id = sc.id
WHERE srv.category_id IS NOT NULL
LIMIT 10;

-- Check reviews
SELECT 'reviews' AS table_name, COUNT(*) AS count FROM reviews;
SELECT r.salon_id, s.name, COUNT(*) AS review_count, AVG(r.rating) AS avg_rating
FROM reviews r
JOIN salons s ON r.salon_id = s.id
GROUP BY r.salon_id, s.name;

-- Check salon_gallery
SELECT 'salon_gallery' AS table_name, COUNT(*) AS count FROM salon_gallery;
SELECT sg.salon_id, s.name, COUNT(*) AS image_count
FROM salon_gallery sg
JOIN salons s ON sg.salon_id = s.id
GROUP BY sg.salon_id, s.name;

-- Check salon_photos (cover photos)
SELECT 'salon_photos' AS table_name, COUNT(*) AS count FROM salon_photos;
SELECT sp.salon_id, s.name, sp.is_cover
FROM salon_photos sp
JOIN salons s ON sp.salon_id = s.id
WHERE sp.is_cover = 1;

-- Check 3: Verify owner relationship
SELECT 'Checking Owner Relationships...' AS Step;
SELECT s.id, s.name, u.email, u.first_name, u.last_name, u.role
FROM salons s
JOIN users u ON s.owner_id = u.id;

-- Check 4: Look for orphaned records (data without valid foreign keys)
SELECT 'Checking for Orphaned Records...' AS Step;

-- Orphaned widget_settings
SELECT 'Orphaned widget_settings' AS issue, COUNT(*) AS count
FROM widget_settings ws
LEFT JOIN salons s ON ws.salon_id = s.id
WHERE s.id IS NULL;

-- Orphaned salon_settings
SELECT 'Orphaned salon_settings' AS issue, COUNT(*) AS count
FROM salon_settings ss
LEFT JOIN salons s ON ss.salon_id = s.id
WHERE s.id IS NULL;

-- Orphaned business_hours
SELECT 'Orphaned business_hours' AS issue, COUNT(*) AS count
FROM business_hours bh
LEFT JOIN salons s ON bh.salon_id = s.id
WHERE s.id IS NULL;

-- Orphaned services
SELECT 'Orphaned services (no salon)' AS issue, COUNT(*) AS count
FROM services srv
LEFT JOIN salons s ON srv.salon_id = s.id
WHERE s.id IS NULL;

-- Orphaned services (no category)
SELECT 'Orphaned services (no category)' AS issue, COUNT(*) AS count
FROM services srv
LEFT JOIN service_categories sc ON srv.category_id = sc.id
WHERE srv.category_id IS NOT NULL AND sc.id IS NULL;

-- Check 5: Verify data integrity
SELECT 'Checking Data Integrity...' AS Step;

-- Salons without widget_settings
SELECT 'Salons missing widget_settings' AS issue, s.id, s.name
FROM salons s
LEFT JOIN widget_settings ws ON s.id = ws.salon_id
WHERE ws.salon_id IS NULL;

-- Salons without salon_settings
SELECT 'Salons missing salon_settings' AS issue, s.id, s.name
FROM salons s
LEFT JOIN salon_settings ss ON s.id = ss.salon_id
WHERE ss.salon_id IS NULL;

-- Salons without business_hours
SELECT 'Salons missing business_hours' AS issue, s.id, s.name
FROM salons s
LEFT JOIN business_hours bh ON s.id = bh.salon_id
WHERE bh.salon_id IS NULL;

-- Salons without services
SELECT 'Salons without services' AS issue, s.id, s.name
FROM salons s
LEFT JOIN services srv ON s.id = srv.salon_id
WHERE srv.salon_id IS NULL;

-- Check 6: Summary Report
SELECT '==================== SUMMARY ====================' AS Report;
SELECT 
  (SELECT COUNT(*) FROM salons) AS total_salons,
  (SELECT COUNT(*) FROM services) AS total_services,
  (SELECT COUNT(*) FROM reviews) AS total_reviews,
  (SELECT COUNT(*) FROM business_hours) AS total_business_hours,
  (SELECT COUNT(*) FROM salon_amenities) AS total_amenities,
  (SELECT COUNT(*) FROM salon_gallery) AS total_gallery_images,
  (SELECT COUNT(*) FROM widget_settings) AS total_widget_configs,
  (SELECT COUNT(*) FROM salon_settings) AS total_salon_settings;

-- Final check: Are all foreign keys valid?
SELECT 'All Foreign Key Checks Complete!' AS Status,
  CASE 
    WHEN (SELECT COUNT(*) FROM widget_settings ws LEFT JOIN salons s ON ws.salon_id = s.id WHERE s.id IS NULL) = 0
     AND (SELECT COUNT(*) FROM salon_settings ss LEFT JOIN salons s ON ss.salon_id = s.id WHERE s.id IS NULL) = 0
     AND (SELECT COUNT(*) FROM business_hours bh LEFT JOIN salons s ON bh.salon_id = s.id WHERE s.id IS NULL) = 0
     AND (SELECT COUNT(*) FROM services srv LEFT JOIN salons s ON srv.salon_id = s.id WHERE s.id IS NULL) = 0
    THEN '✅ ALL RELATIONSHIPS VALID'
    ELSE '❌ FOUND ORPHANED RECORDS - CHECK ABOVE'
  END AS Result;
