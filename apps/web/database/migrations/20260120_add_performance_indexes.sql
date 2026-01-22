-- ============================================================================
-- FRESH SALON - DATABASE INDEX AUDIT & RECOMMENDATIONS
-- Generated: 2026-01-20
-- ============================================================================
-- This migration adds critical indexes identified through query pattern analysis
-- Focus: Marketplace search, booking lookups, client management, review queries
-- ============================================================================

-- ----------------------------------------------------------------------------
-- REVIEWS TABLE - Critical for marketplace performance
-- ----------------------------------------------------------------------------

-- Note: Both review indexes already exist - skipping
-- idx_reviews_salon_status_rating (salon_id, status, rating) ALREADY EXISTS
-- idx_reviews_staff_status (staff_id, status) ALREADY EXISTS
-- Query patterns covered:
-- - SELECT AVG(r.rating), COUNT(r.id) FROM reviews WHERE salon_id = ? AND status = 'approved'
-- - SELECT * FROM reviews WHERE staff_id = ? AND status = 'approved'

-- ----------------------------------------------------------------------------
-- SERVICES TABLE - Essential for service lookups and search
-- ----------------------------------------------------------------------------

-- Note: Service indexes already exist - skipping
-- idx_services_salon_active (salon_id, is_active) ALREADY EXISTS
-- idx_services_salon_active_name (salon_id, is_active, name) ALREADY EXISTS
-- Query patterns covered:
-- - SELECT 1 FROM services WHERE salon_id = ? AND name LIKE ?
-- - SELECT * FROM services WHERE salon_id = ? AND is_active = 1

-- ----------------------------------------------------------------------------
-- SALON_CLIENTS TABLE - Client relationship management
-- ----------------------------------------------------------------------------

-- Note: idx_salon_clients_first_visit (salon_id, first_visit_date) ALREADY EXISTS
-- Note: idx_salon_clients_salon_visits (salon_id, total_visits) ALREADY EXISTS
-- Query patterns covered:
-- - SELECT * FROM salon_clients WHERE salon_id = ? ORDER BY first_visit_date DESC
-- - SELECT * FROM salon_clients WHERE salon_id = ? AND total_visits > ?

-- ----------------------------------------------------------------------------
-- USERS TABLE - Authentication and client lookups
-- ----------------------------------------------------------------------------

-- Note: All user indexes already exist - skipping
-- idx_users_role (role) ALREADY EXISTS
-- idx_users_country (country) ALREADY EXISTS
-- idx_users_last_login_role (last_login_at, role) ALREADY EXISTS
-- Query patterns covered:
-- - SELECT * FROM users WHERE role = ?
-- - SELECT * FROM users WHERE country = ?
-- - SELECT * FROM users WHERE last_login_at < ? AND role = 'client'

-- ----------------------------------------------------------------------------
-- STAFF TABLE - Staff management and availability
-- ----------------------------------------------------------------------------

-- Note: Staff indexes already exist - skipping
-- idx_staff_salon_role_active (salon_id, role, is_active) ALREADY EXISTS
-- idx_staff_user_active (user_id, is_active) ALREADY EXISTS
-- Query patterns covered:
-- - SELECT * FROM staff WHERE salon_id = ? AND role = 'manager' AND is_active = 1
-- - SELECT * FROM staff WHERE user_id = ? AND is_active = 1

-- ----------------------------------------------------------------------------
-- STAFF_WORKING_HOURS TABLE - Availability checks
-- ----------------------------------------------------------------------------

-- Note: idx_staff_hours_lookup (staff_id, day_of_week, start_time, end_time) ALREADY EXISTS
-- Query pattern: SELECT * FROM staff_working_hours WHERE staff_id = ? AND day_of_week = ? 
--                AND start_time <= ? AND end_time >= ?

-- ----------------------------------------------------------------------------
-- STAFF_TIME_OFF TABLE - Staff availability blocking
-- ----------------------------------------------------------------------------

-- Note: idx_staff_timeoff_range (staff_id, start_datetime, end_datetime) ALREADY EXISTS
-- Query pattern: SELECT * FROM staff_time_off WHERE staff_id = ? 
--                AND start_datetime <= ? AND end_datetime >= ?

-- Note: status column does not exist in staff_time_off table - skipping idx_staff_timeoff_status

-- ----------------------------------------------------------------------------
-- BOOKING_SERVICES TABLE - Booking service details
-- ----------------------------------------------------------------------------

-- Note: idx_booking_services_service_id (service_id) ALREADY EXISTS
-- Creating composite index for service analytics

-- Index for booking service lookups (already has composite PRIMARY KEY)
-- Current: PRIMARY KEY (booking_id, service_id)
-- Add: Composite index for service-based analytics
-- Query pattern: SELECT * FROM booking_services WHERE service_id = ?
CREATE INDEX idx_booking_services_service ON booking_services(service_id, booking_id);

-- ----------------------------------------------------------------------------
-- PAYMENTS TABLE - Payment tracking and reporting
-- ----------------------------------------------------------------------------

-- Note: idx_payments_stripe_payment_id (stripe_payment_id) ALREADY EXISTS
-- Note: idx_payments_status_created (status, created_at) ALREADY EXISTS

-- Index for booking payment lookups
-- Query pattern: SELECT * FROM payments WHERE booking_id = ? AND status = 'paid'
CREATE INDEX idx_payments_booking_status ON payments(booking_id, status);

-- Note: payments table does not have salon_id column - revenue reports must join through bookings
-- Query pattern: SELECT SUM(p.amount) FROM payments p JOIN bookings b ON b.id = p.booking_id 
--                WHERE b.salon_id = ? AND p.status = 'paid'

-- ----------------------------------------------------------------------------
-- SERVICE_STAFF TABLE - Staff service assignments
-- ----------------------------------------------------------------------------

-- Note: idx_service_staff_staff_id (staff_id) ALREADY EXISTS

-- Index for service provider lookups
-- Query pattern: SELECT service_id FROM service_staff WHERE staff_id = ? AND service_id IN (...)
-- Current: idx_service_staff_staff_id (staff_id)
-- Add: Reverse index for finding all staff for a service
CREATE INDEX idx_service_staff_service ON service_staff(service_id, staff_id);

-- ----------------------------------------------------------------------------
-- WAITLIST TABLE - Waitlist management
-- ----------------------------------------------------------------------------

-- Note: Basic indexes exist: idx_waitlist_salon, idx_waitlist_client, idx_waitlist_date
-- Creating composite indexes for common query patterns

-- Index for date-based waitlist queries
-- Current: idx_waitlist_date (preferred_date only)
-- Add: Composite for salon + date + status filtering
-- Query pattern: SELECT * FROM waitlist WHERE salon_id = ? AND preferred_date >= ? AND status = 'pending'
CREATE INDEX idx_waitlist_salon_date_status ON waitlist(salon_id, preferred_date, status);

-- Index for service-based waitlist
-- Query pattern: SELECT * FROM waitlist WHERE service_id = ? AND status = 'pending'
CREATE INDEX idx_waitlist_service_status ON waitlist(service_id, status);

-- ----------------------------------------------------------------------------
-- BUSINESS_HOURS TABLE - Salon operating hours
-- ----------------------------------------------------------------------------

-- Index for daily hours lookup
-- Query pattern: SELECT * FROM business_hours WHERE salon_id = ? AND day_of_week = ?
-- Current: UNIQUE (salon_id, day_of_week) - adequate coverage
-- No additional index needed

-- ----------------------------------------------------------------------------
-- AUDIT_LOGS TABLE - Audit trail queries
-- ----------------------------------------------------------------------------

-- Note: Basic indexes exist: idx_audit_logs_user, idx_audit_logs_entity, idx_audit_logs_created
-- Creating composite indexes for time-based queries

-- Index for entity audit history
-- Current: Index on (entity_type, entity_id), created_at, user_id
-- Add: Composite for time-range queries on specific entities
-- Query pattern: SELECT * FROM audit_logs WHERE entity_type = ? AND entity_id = ? 
--                AND created_at BETWEEN ? AND ?
CREATE INDEX idx_audit_logs_entity_date ON audit_logs(entity_type, entity_id, created_at);

-- Index for user activity tracking
-- Query pattern: SELECT * FROM audit_logs WHERE user_id = ? AND created_at >= ?
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, created_at);

-- ============================================================================
-- SUMMARY OF EXISTING INDEXES (ALREADY OPTIMIZED)
-- ============================================================================

-- BOOKINGS TABLE - Well indexed for common queries:
--   ✓ PRIMARY KEY (id)
--   ✓ idx_bookings_salon_id
--   ✓ idx_bookings_client_id
--   ✓ idx_bookings_staff_id
--   ✓ idx_bookings_start (start_datetime)
--   ✓ idx_bookings_staff_datetime_status (staff_id, start_datetime, status)
--   ✓ idx_bookings_salon_datetime (salon_id, start_datetime)
--   ✓ idx_bookings_client_status (client_id, status)
--   Result: Booking queries are already well-optimized

-- SALONS TABLE - Marketplace search optimized:
--   ✓ idx_salons_marketplace (status, is_marketplace_enabled)
--   ✓ idx_salons_marketplace_city (is_marketplace_enabled, city)
--   ✓ idx_salons_geo (latitude, longitude)
--   ✓ idx_salons_category
--   ✓ idx_salons_city
--   Result: Marketplace search is well-indexed

-- SALON_CLIENTS TABLE:
--   ✓ PRIMARY KEY (salon_id, client_id)
--   ✓ idx_salon_clients_client_id
--   ✓ idx_salon_clients_last_visit (salon_id, last_visit_date)
--   Result: Good coverage, added first_visit and total_visits indexes

-- ============================================================================
-- PERFORMANCE IMPACT ASSESSMENT
-- ============================================================================

-- HIGH IMPACT (Critical for performance):
-- (All critical indexes already exist)

-- MEDIUM IMPACT (Improves specific queries):
-- 1. idx_waitlist_salon_date_status - Waitlist management
-- 2. idx_booking_services_service - Service analytics
-- 3. idx_service_staff_service - Staff-service lookups
-- 4. idx_payments_booking_status - Payment lookups
-- 5. idx_waitlist_service_status - Service waitlist
-- 6. idx_audit_logs_entity_date - Audit history queries
-- 7. idx_audit_logs_user_date - User activity tracking

-- LOW IMPACT (Nice to have):
-- (None - idx_payments_stripe_id already exists as idx_payments_stripe_payment_id)

-- ============================================================================
-- SUMMARY: 7 NEW INDEXES CREATED BY THIS MIGRATION
-- ============================================================================
-- 1. idx_booking_services_service (booking_services) - Service analytics
-- 2. idx_payments_booking_status (payments) - Payment lookups
-- 3. idx_service_staff_service (service_staff) - Staff-service reverse lookup
-- 4. idx_waitlist_salon_date_status (waitlist) - Waitlist dashboard
-- 5. idx_waitlist_service_status (waitlist) - Service waitlist
-- 6. idx_audit_logs_entity_date (audit_logs) - Entity audit history
-- 7. idx_audit_logs_user_date (audit_logs) - User activity tracking
-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

-- 1. Run during low-traffic period (indexes built with ALGORITHM=INPLACE)
-- 2. Monitor slow query log before/after deployment
-- 3. Analyze query execution plans for critical endpoints:
--    - GET /api/marketplace/salons (marketplace search)
--    - GET /api/bookings (booking list with filters)
--    - GET /api/clients (client list)
--    - POST /api/bookings (availability check)
-- 4. Watch for index bloat - MySQL 9.3.0 handles this well with InnoDB
-- 5. Consider index statistics update after deployment:
--    ANALYZE TABLE reviews, services, salon_clients, staff, payments;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- Note: The following indexes already existed and were NOT created by this migration:
-- - idx_reviews_salon_status_rating (reviews)
-- - idx_reviews_staff_status (reviews)
-- - idx_services_salon_active (services)
-- - idx_services_salon_active_name (services)
-- - idx_salon_clients_first_visit (salon_clients)
-- - idx_salon_clients_salon_visits (salon_clients)
-- - idx_users_role (users)
-- - idx_users_country (users)
-- - idx_users_last_login_role (users)
-- - idx_staff_salon_role_active (staff)
-- - idx_staff_user_active (staff)
-- - idx_staff_hours_lookup (staff_working_hours)
-- - idx_staff_timeoff_range (staff_time_off)
-- - idx_payments_stripe_payment_id (payments)
-- - idx_payments_status_created (payments)
-- - idx_waitlist_salon (waitlist)
-- - idx_waitlist_client (waitlist)
-- - idx_waitlist_date (waitlist)
-- - idx_audit_logs_user (audit_logs)
-- - idx_audit_logs_entity (audit_logs)
-- - idx_audit_logs_created (audit_logs)
-- - idx_service_staff_staff_id (service_staff)
-- - idx_booking_services_service_id (booking_services)

-- To rollback the NEW indexes created by this migration:
DROP INDEX idx_booking_services_service ON booking_services;
DROP INDEX idx_payments_booking_status ON payments;
DROP INDEX idx_service_staff_service ON service_staff;
DROP INDEX idx_waitlist_salon_date_status ON waitlist;
DROP INDEX idx_waitlist_service_status ON waitlist;
DROP INDEX idx_audit_logs_entity_date ON audit_logs;
DROP INDEX idx_audit_logs_user_date ON audit_logs;

-- DROP INDEX idx_booking_services_service ON booking_services;
-- DROP INDEX idx_payments_booking_status ON payments;
-- DROP INDEX idx_payments_stripe_id ON payments;
-- DROP INDEX idx_service_staff_service ON service_staff;
-- DROP INDEX idx_waitlist_salon_date_status ON waitlist;
-- DROP INDEX idx_waitlist_service_status ON waitlist;
-- DROP INDEX idx_audit_logs_entity_date ON audit_logs;
-- DROP INDEX idx_audit_logs_user_date ON audit_logs;
