-- Migration: Add client profile fields
-- Run this SQL in your MySQL database

-- Personal profile fields go on users table (shared across all salons)
ALTER TABLE users
ADD COLUMN gender ENUM('male', 'female', 'other') DEFAULT NULL AFTER avatar_url,
ADD COLUMN date_of_birth DATE DEFAULT NULL AFTER gender,
ADD COLUMN address VARCHAR(255) DEFAULT NULL AFTER date_of_birth,
ADD COLUMN city VARCHAR(100) DEFAULT NULL AFTER address,
ADD COLUMN postal_code VARCHAR(20) DEFAULT NULL AFTER city;

-- Salon-specific notes go on salon_clients table (each salon has their own notes)
ALTER TABLE salon_clients
ADD COLUMN notes TEXT DEFAULT NULL AFTER total_visits;

-- Verify the changes
-- DESCRIBE users;
-- DESCRIBE salon_clients;
