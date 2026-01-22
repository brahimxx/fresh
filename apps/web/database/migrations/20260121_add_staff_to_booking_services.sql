-- Migration: Add staff_id to booking_services table
-- This allows each service in a booking to be assigned to a different staff member
-- Date: 2026-01-21

ALTER TABLE booking_services 
ADD COLUMN staff_id BIGINT UNSIGNED NULL AFTER service_id,
ADD KEY idx_staff_id (staff_id),
ADD CONSTRAINT fk_booking_services_staff 
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL;

-- Update existing booking_services with staff from bookings table
UPDATE booking_services bs
JOIN bookings b ON b.id = bs.booking_id
SET bs.staff_id = b.staff_id
WHERE b.staff_id IS NOT NULL;
