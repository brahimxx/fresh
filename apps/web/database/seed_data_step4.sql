-- Fresh Database Seed Data
-- Run this after creating the database structure to populate with sample salons

USE `fresh`;

-- First, create a test owner user if not exists
-- Correct column password_hash: password is 'password123'
-- Create owner users
INSERT IGNORE INTO `users` (`email`, `password_hash`, `first_name`, `last_name`, `phone`, `role`, `created_at`)
VALUES 
('owner@fresh.com', '$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu', 'John', 'Smith', '+1234567890', 'owner', NOW()),
('owner2@fresh.com', '$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu', 'Sarah', 'Connor', '+1234567891', 'owner', NOW()),
('owner3@fresh.com', '$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu', 'James', 'Bond', '+1234567892', 'owner', NOW()),
('owner4@fresh.com', '$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu', 'Ellen', 'Ripley', '+1234567893', 'owner', NOW()),
('owner5@fresh.com', '$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu', 'Tony', 'Stark', '+1234567894', 'owner', NOW()),
('owner6@fresh.com', '$2b$10$69IPnzwcjesjbu/fsiPHy.uAcixbosVMUwYDucDGAKLDjQ717PCgu', 'Bruce', 'Wayne', '+1234567895', 'owner', NOW());

SET @owner1 = (SELECT id FROM users WHERE email = 'owner@fresh.com' LIMIT 1);
SET @owner2 = (SELECT id FROM users WHERE email = 'owner2@fresh.com' LIMIT 1);
SET @owner3 = (SELECT id FROM users WHERE email = 'owner3@fresh.com' LIMIT 1);
SET @owner4 = (SELECT id FROM users WHERE email = 'owner4@fresh.com' LIMIT 1);
SET @owner5 = (SELECT id FROM users WHERE email = 'owner5@fresh.com' LIMIT 1);
SET @owner6 = (SELECT id FROM users WHERE email = 'owner6@fresh.com' LIMIT 1);

-- Insert Featured Salons
INSERT IGNORE INTO `salons` (`owner_id`, `name`, `description`, `phone`, `email`, `address`, `city`, `country`, `latitude`, `longitude`, `is_marketplace_enabled`, `created_at`) VALUES
(@owner1, 'Luxe Hair Studio', 'Premium hair salon specializing in modern cuts, coloring, and styling. Our expert stylists stay current with the latest trends and techniques.', '+33 1 42 86 82 00', 'contact@luxehairstudio.fr', '15 Rue de Rivoli', 'Paris', 'France', 48.8566, 2.3522, 1, NOW()),
(@owner2, 'Bella Nails & Spa', 'Full-service nail salon and spa offering manicures, pedicures, and relaxing treatments in a luxurious environment.', '+33 1 45 48 55 26', 'info@bellanails.fr', '28 Avenue des Champs-Élysées', 'Paris', 'France', 48.8698, 2.3078, 1, NOW()),
(@owner3, 'The Barber Shop', 'Traditional barbershop with a modern twist. Expert cuts, hot towel shaves, and grooming services for the modern gentleman.', '+33 1 42 77 76 17', 'hello@thebarbershop.fr', '45 Rue du Faubourg Saint-Antoine', 'Paris', 'France', 48.8534, 2.3735, 1, NOW()),
(@owner4, 'Glow Beauty Bar', 'Your destination for facials, waxing, lash extensions, and makeup services. We help you look and feel your best.', '+33 1 43 26 48 23', 'contact@glowbeauty.fr', '12 Boulevard Saint-Germain', 'Paris', 'France', 48.8529, 2.3499, 1, NOW()),
(@owner5, 'Serenity Spa', 'Escape to tranquility with our massage therapy, body treatments, and wellness services. Your urban oasis awaits.', '+33 1 42 60 34 86', 'info@serenityspa.fr', '8 Rue de la Paix', 'Paris', 'France', 48.8692, 2.3311, 1, NOW()),
(@owner6, 'Studio 54 Salon', 'Trendy salon offering cutting-edge hair services, balayage, and hair treatments. Walk-ins welcome!', '+33 1 48 87 63 42', 'booking@studio54salon.fr', '54 Rue de Charonne', 'Paris', 'France', 48.8533, 2.3816, 1, NOW());

-- Get salon IDs
SET @salon1 = (SELECT id FROM salons WHERE name = 'Luxe Hair Studio' LIMIT 1);
SET @salon2 = (SELECT id FROM salons WHERE name = 'Bella Nails & Spa' LIMIT 1);
SET @salon3 = (SELECT id FROM salons WHERE name = 'The Barber Shop' LIMIT 1);
SET @salon4 = (SELECT id FROM salons WHERE name = 'Glow Beauty Bar' LIMIT 1);
SET @salon5 = (SELECT id FROM salons WHERE name = 'Serenity Spa' LIMIT 1);
SET @salon6 = (SELECT id FROM salons WHERE name = 'Studio 54 Salon' LIMIT 1);

-- Insert Widget Settings for each salon
-- Fixed columns based on schema
INSERT IGNORE INTO `widget_settings` (`salon_id`, `primary_color`, `secondary_color`, `show_staff`, `show_prices`, `show_services`, `require_phone`, `require_email`, `allow_notes`) VALUES
(@salon1, '#8B5CF6', '#EC4899', 1, 1, 1, 1, 1, 1),
(@salon2, '#EC4899', '#8B5CF6', 1, 1, 1, 1, 1, 1),
(@salon3, '#3B82F6', '#1E40AF', 1, 1, 1, 1, 1, 1),
(@salon4, '#F59E0B', '#EF4444', 1, 1, 1, 1, 1, 1),
(@salon5, '#10B981', '#059669', 1, 1, 1, 1, 1, 1),
(@salon6, '#8B5CF6', '#6366F1', 1, 1, 1, 1, 1, 1);

-- Insert Salon Settings (ADDED - was missing)
-- Corrected: Removed created_at
INSERT IGNORE INTO `salon_settings` (`salon_id`, `cancellation_policy_hours`, `no_show_fee`, `deposit_required`, `deposit_percentage`) VALUES
(@salon1, 24, 0.00, 0, 0),
(@salon2, 24, 0.00, 0, 0),
(@salon3, 48, 25.00, 0, 0),
(@salon4, 24, 0.00, 0, 0),
(@salon5, 48, 0.00, 1, 20),
(@salon6, 24, 0.00, 0, 0);

-- Insert Business Hours (Monday to Sunday, 0-6)
INSERT IGNORE INTO `business_hours` (`salon_id`, `day_of_week`, `open_time`, `close_time`, `is_closed`) VALUES
-- Luxe Hair Studio (Closed Sunday)
(@salon1, 0, '09:00:00', '19:00:00', 0),
(@salon1, 1, '09:00:00', '19:00:00', 0),
(@salon1, 2, '09:00:00', '19:00:00', 0),
(@salon1, 3, '09:00:00', '19:00:00', 0),
(@salon1, 4, '09:00:00', '20:00:00', 0),
(@salon1, 5, '09:00:00', '20:00:00', 0),
(@salon1, 6, NULL, NULL, 1),

-- Bella Nails & Spa (Open 7 days)
(@salon2, 0, '10:00:00', '20:00:00', 0),
(@salon2, 1, '10:00:00', '20:00:00', 0),
(@salon2, 2, '10:00:00', '20:00:00', 0),
(@salon2, 3, '10:00:00', '20:00:00', 0),
(@salon2, 4, '10:00:00', '21:00:00', 0),
(@salon2, 5, '10:00:00', '21:00:00', 0),
(@salon2, 6, '11:00:00', '18:00:00', 0),

-- The Barber Shop (Closed Sunday & Monday)
(@salon3, 0, NULL, NULL, 1),
(@salon3, 1, NULL, NULL, 1),
(@salon3, 2, '10:00:00', '19:00:00', 0),
(@salon3, 3, '10:00:00', '19:00:00', 0),
(@salon3, 4, '10:00:00', '20:00:00', 0),
(@salon3, 5, '10:00:00', '20:00:00', 0),
(@salon3, 6, '09:00:00', '18:00:00', 0),

-- Glow Beauty Bar
(@salon4, 0, '09:00:00', '18:00:00', 0),
(@salon4, 1, '09:00:00', '18:00:00', 0),
(@salon4, 2, '09:00:00', '18:00:00', 0),
(@salon4, 3, '09:00:00', '18:00:00', 0),
(@salon4, 4, '09:00:00', '19:00:00', 0),
(@salon4, 5, '09:00:00', '19:00:00', 0),
(@salon4, 6, NULL, NULL, 1),

-- Serenity Spa
(@salon5, 0, '10:00:00', '20:00:00', 0),
(@salon5, 1, '10:00:00', '20:00:00', 0),
(@salon5, 2, '10:00:00', '20:00:00', 0),
(@salon5, 3, '10:00:00', '20:00:00', 0),
(@salon5, 4, '10:00:00', '21:00:00', 0),
(@salon5, 5, '10:00:00', '21:00:00', 0),
(@salon5, 6, '11:00:00', '19:00:00', 0),

-- Studio 54 Salon
(@salon6, 0, '09:00:00', '19:00:00', 0),
(@salon6, 1, '09:00:00', '19:00:00', 0),
(@salon6, 2, '09:00:00', '19:00:00', 0),
(@salon6, 3, '09:00:00', '19:00:00', 0),
(@salon6, 4, '09:00:00', '20:00:00', 0),
(@salon6, 5, '09:00:00', '20:00:00', 0),
(@salon6, 6, '10:00:00', '17:00:00', 0);

-- Insert Salon Amenities
-- Corrected: name instead of amenity_name
INSERT IGNORE INTO `salon_amenities` (`salon_id`, `name`) VALUES
(@salon1, 'WiFi'), (@salon1, 'Coffee & Tea'), (@salon1, 'Parking'),
(@salon2, 'WiFi'), (@salon2, 'Refreshments'), (@salon2, 'Wheelchair Accessible'),
(@salon3, 'WiFi'), (@salon3, 'Complimentary Drinks'), (@salon3, 'Street Parking'),
(@salon4, 'WiFi'), (@salon4, 'Refreshments'), (@salon4, 'Air Conditioning'),
(@salon5, 'WiFi'), (@salon5, 'Herbal Tea'), (@salon5, 'Relaxation Room'), (@salon5, 'Parking'),
(@salon6, 'WiFi'), (@salon6, 'Coffee Bar'), (@salon6, 'Music');

-- Insert Service Categories
-- Corrected: Removed created_at column
INSERT IGNORE INTO `service_categories` (`salon_id`, `name`, `display_order`) VALUES
(@salon1, 'Hair Cuts', 1),
(@salon1, 'Hair Color', 2),
(@salon1, 'Hair Treatments', 3),
(@salon2, 'Manicures', 1),
(@salon2, 'Pedicures', 2),
(@salon2, 'Spa Services', 3),
(@salon3, 'Haircuts', 1),
(@salon3, 'Shaving', 2),
(@salon3, 'Grooming', 3),
(@salon4, 'Facials', 1),
(@salon4, 'Waxing', 2),
(@salon4, 'Lashes & Brows', 3),
(@salon5, 'Massage', 1),
(@salon5, 'Body Treatments', 2),
(@salon5, 'Wellness', 3),
(@salon6, 'Cuts & Styling', 1),
(@salon6, 'Color Services', 2),
(@salon6, 'Treatments', 3);

-- Get category IDs for Luxe Hair Studio
SET @cat1_1 = (SELECT id FROM service_categories WHERE salon_id = @salon1 AND name = 'Hair Cuts' LIMIT 1);
SET @cat1_2 = (SELECT id FROM service_categories WHERE salon_id = @salon1 AND name = 'Hair Color' LIMIT 1);
SET @cat1_3 = (SELECT id FROM service_categories WHERE salon_id = @salon1 AND name = 'Hair Treatments' LIMIT 1);

-- Insert Services for Luxe Hair Studio
-- Fixed columns: duration -> duration_minutes, removed created_at
INSERT IGNORE INTO `services` (`salon_id`, `category_id`, `name`, `duration_minutes`, `price`, `is_popular`) VALUES
(@salon1, @cat1_1, 'Women\'s Haircut', 60, 75.00, 1),
(@salon1, @cat1_1, 'Men\'s Haircut', 45, 55.00, 1),
(@salon1, @cat1_1, 'Bang Trim', 15, 20.00, 0),
(@salon1, @cat1_2, 'Full Color', 120, 150.00, 1),
(@salon1, @cat1_2, 'Balayage', 180, 250.00, 1),
(@salon1, @cat1_2, 'Root Touch-Up', 90, 95.00, 0),
(@salon1, @cat1_3, 'Deep Conditioning', 30, 45.00, 0),
(@salon1, @cat1_3, 'Keratin Treatment', 150, 300.00, 1);

-- Get category IDs for Bella Nails & Spa
SET @cat2_1 = (SELECT id FROM service_categories WHERE salon_id = @salon2 AND name = 'Manicures' LIMIT 1);
SET @cat2_2 = (SELECT id FROM service_categories WHERE salon_id = @salon2 AND name = 'Pedicures' LIMIT 1);
SET @cat2_3 = (SELECT id FROM service_categories WHERE salon_id = @salon2 AND name = 'Spa Services' LIMIT 1);

-- Insert Services for Bella Nails & Spa
INSERT IGNORE INTO `services` (`salon_id`, `category_id`, `name`, `duration_minutes`, `price`, `is_popular`) VALUES
(@salon2, @cat2_1, 'Classic Manicure', 45, 35.00, 1),
(@salon2, @cat2_1, 'Gel Manicure', 60, 55.00, 1),
(@salon2, @cat2_1, 'Acrylic Full Set', 90, 75.00, 1),
(@salon2, @cat2_2, 'Classic Pedicure', 60, 45.00, 1),
(@salon2, @cat2_2, 'Spa Pedicure', 75, 65.00, 1),
(@salon2, @cat2_2, 'Deluxe Pedicure', 90, 85.00, 0),
(@salon2, @cat2_3, 'Paraffin Treatment', 30, 25.00, 0),
(@salon2, @cat2_3, 'Hand & Foot Massage', 30, 40.00, 0);

-- Get category IDs for The Barber Shop
SET @cat3_1 = (SELECT id FROM service_categories WHERE salon_id = @salon3 AND name = 'Haircuts' LIMIT 1);
SET @cat3_2 = (SELECT id FROM service_categories WHERE salon_id = @salon3 AND name = 'Shaving' LIMIT 1);
SET @cat3_3 = (SELECT id FROM service_categories WHERE salon_id = @salon3 AND name = 'Grooming' LIMIT 1);

-- Insert Services for The Barber Shop
INSERT IGNORE INTO `services` (`salon_id`, `category_id`, `name`, `duration_minutes`, `price`, `is_popular`) VALUES
(@salon3, @cat3_1, 'Classic Cut', 45, 45.00, 1),
(@salon3, @cat3_1, 'Fade Haircut', 60, 55.00, 1),
(@salon3, @cat3_1, 'Buzz Cut', 30, 35.00, 0),
(@salon3, @cat3_2, 'Hot Towel Shave', 45, 50.00, 1),
(@salon3, @cat3_2, 'Beard Trim', 30, 30.00, 1),
(@salon3, @cat3_3, 'Beard Shaping', 45, 40.00, 0),
(@salon3, @cat3_3, 'Hair & Beard Combo', 75, 75.00, 1);

-- Insert Sample Reviews for each salon
INSERT IGNORE INTO `reviews` (`salon_id`, `client_id`, `booking_id`, `rating`, `comment`, `created_at`) VALUES
(@salon1, @owner_id, NULL, 5, 'Amazing experience! The stylist really listened to what I wanted and delivered perfectly.', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(@salon1, @owner_id, NULL, 5, 'Best haircut I\'ve had in Paris. The balayage looks incredible!', DATE_SUB(NOW(), INTERVAL 12 DAY)),
(@salon1, @owner_id, NULL, 4, 'Great service and beautiful salon. Slightly pricey but worth it.', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(@salon1, @owner_id, NULL, 5, 'I\'ve been coming here for years. Consistently excellent!', DATE_SUB(NOW(), INTERVAL 30 DAY)),

(@salon2, @owner_id, NULL, 5, 'The spa pedicure was heavenly! So relaxing and my feet look amazing.', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(@salon2, @owner_id, NULL, 5, 'Best nail salon in the area. Clean, professional, and beautiful results.', DATE_SUB(NOW(), INTERVAL 8 DAY)),
(@salon2, @owner_id, NULL, 4, 'Love my gel manicure! Lasted over 3 weeks without chipping.', DATE_SUB(NOW(), INTERVAL 15 DAY)),

(@salon3, @owner_id, NULL, 5, 'Perfect fade every time. These guys know what they\'re doing!', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(@salon3, @owner_id, NULL, 5, 'The hot towel shave is a must-try. Old school barbering at its finest.', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(@salon3, @owner_id, NULL, 5, 'Great atmosphere and even better cuts. My go-to barber shop.', DATE_SUB(NOW(), INTERVAL 18 DAY)),

(@salon4, @owner_id, NULL, 5, 'The facial was incredible! My skin has never looked better.', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(@salon4, @owner_id, NULL, 4, 'Professional service and great results. Will definitely return.', DATE_SUB(NOW(), INTERVAL 14 DAY)),

(@salon5, @owner_id, NULL, 5, 'The massage was exactly what I needed. So relaxing!', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(@salon5, @owner_id, NULL, 5, 'Beautiful spa with amazing therapists. A true escape from the city.', DATE_SUB(NOW(), INTERVAL 16 DAY)),

(@salon6, @owner_id, NULL, 5, 'Trendy salon with talented stylists. Love my new look!', DATE_SUB(NOW(), INTERVAL 7 DAY)),
(@salon6, @owner_id, NULL, 4, 'Great cut and color. The atmosphere is very cool and modern.', DATE_SUB(NOW(), INTERVAL 22 DAY));

-- Insert Salon Gallery Images (using placeholder image URLs)
-- Corrected: Removed created_at
INSERT IGNORE INTO `salon_gallery` (`salon_id`, `image_url`, `display_order`) VALUES
(@salon1, 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800', 1),
(@salon1, 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800', 2),
(@salon1, 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800', 3),

(@salon2, 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800', 1),
(@salon2, 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=800', 2),

(@salon3, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', 1),
(@salon3, 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', 2),

(@salon4, 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800', 1),
(@salon4, 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800', 2),

(@salon5, 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800', 1),
(@salon5, 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800', 2),

(@salon6, 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800', 1),
(@salon6, 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800', 2);

-- Insert Cover Photos
-- Corrected: Removed created_at
INSERT IGNORE INTO `salon_photos` (`salon_id`, `image_url`, `is_cover`) VALUES
(@salon1, 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200', 1),
(@salon2, 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200', 1),
(@salon3, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200', 1),
(@salon4, 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200', 1),
(@salon5, 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200', 1),
(@salon6, 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200', 1);

-- Success message
SELECT 'Seed data inserted successfully! 6 salons with services, reviews, and gallery images.' AS Status;
