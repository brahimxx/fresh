-- Fix staff table role column to include all roles used in the application
-- This adds 'owner' and 'receptionist' to the existing 'staff' and 'manager' values

USE fresh;

-- Modify the role enum to include all 4 roles
ALTER TABLE staff 
MODIFY COLUMN role ENUM('staff', 'manager', 'owner', 'receptionist') NOT NULL DEFAULT 'staff';

-- Verify the change
DESCRIBE staff;
