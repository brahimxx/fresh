CREATE DATABASE IF NOT EXISTS fresh
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE fresh;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NULL,
  role ENUM('client','owner','staff','admin') NOT NULL DEFAULT 'client',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE salons (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(255) NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,
  country VARCHAR(100) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  is_marketplace_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_salons_owner_id (owner_id),
  CONSTRAINT fk_salons_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE salon_settings (
  salon_id BIGINT UNSIGNED NOT NULL,
  cancellation_policy_hours INT NOT NULL DEFAULT 0,
  no_show_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  deposit_required BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_percentage INT NOT NULL DEFAULT 0,
  PRIMARY KEY (salon_id),
  CONSTRAINT fk_salon_settings_salon
    FOREIGN KEY (salon_id) REFERENCES salons(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE staff (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('staff','manager') NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_salon_user (salon_id, user_id),
  KEY idx_staff_salon_id (salon_id),
  KEY idx_staff_user_id (user_id),
  CONSTRAINT fk_staff_salon
    FOREIGN KEY (salon_id) REFERENCES salons(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_staff_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE staff_working_hours (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  day_of_week TINYINT NOT NULL, -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_hours (staff_id, day_of_week, start_time, end_time),
  KEY idx_staff_working_hours_staff_id (staff_id),
  CONSTRAINT fk_staff_working_hours_staff
    FOREIGN KEY (staff_id) REFERENCES staff(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE staff_time_off (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  reason VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_staff_time_off_staff_id (staff_id),
  CONSTRAINT fk_staff_time_off_staff
    FOREIGN KEY (staff_id) REFERENCES staff(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE service_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_categories (salon_id, name),
  KEY idx_service_categories_salon_id (salon_id),
  CONSTRAINT fk_service_categories_salon
    FOREIGN KEY (salon_id) REFERENCES salons(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  duration_minutes INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  KEY idx_services_salon_id (salon_id),
  KEY idx_services_category_id (category_id),
  CONSTRAINT fk_services_salon
    FOREIGN KEY (salon_id) REFERENCES salons(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_services_category
    FOREIGN KEY (category_id) REFERENCES service_categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE service_staff (
  service_id BIGINT UNSIGNED NOT NULL,
  staff_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (service_id, staff_id),
  KEY idx_service_staff_staff_id (staff_id),
  CONSTRAINT fk_service_staff_service
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_service_staff_staff
    FOREIGN KEY (staff_id) REFERENCES staff(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED NOT NULL,
  staff_id BIGINT UNSIGNED NOT NULL,
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  status ENUM('pending','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'pending',
  source ENUM('marketplace','direct') NOT NULL DEFAULT 'direct',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bookings_salon_id (salon_id),
  KEY idx_bookings_client_id (client_id),
  KEY idx_bookings_staff_id (staff_id),
  KEY idx_bookings_start (start_datetime),
  CONSTRAINT fk_bookings_salon
    FOREIGN KEY (salon_id) REFERENCES salons(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bookings_client
    FOREIGN KEY (client_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_bookings_staff
    FOREIGN KEY (staff_id) REFERENCES staff(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE booking_services (
  booking_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INT NOT NULL,
  PRIMARY KEY (booking_id, service_id),
  KEY idx_booking_services_service_id (service_id),
  CONSTRAINT fk_booking_services_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_booking_services_service
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('card','cash') NOT NULL,
  status ENUM('pending','paid','refunded') NOT NULL DEFAULT 'pending',
  stripe_payment_id VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_booking (booking_id),
  KEY idx_payments_stripe_payment_id (stripe_payment_id),
  CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE platform_fees (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  salon_id BIGINT UNSIGNED NOT NULL,
  type ENUM('new_client','payment_processing') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  KEY idx_platform_fees_booking_id (booking_id),
  KEY idx_platform_fees_salon_id (salon_id),
  CONSTRAINT fk_platform_fees_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_platform_fees_salon
    FOREIGN KEY (salon_id) REFERENCES salons(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE salon_clients (
  salon_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED NOT NULL,
  first_visit_date DATETIME NULL,
  last_visit_date DATETIME NULL,
  total_visits INT NOT NULL DEFAULT 0,
  PRIMARY KEY (salon_id, client_id),
  KEY idx_salon_clients_client_id (client_id),
  CONSTRAINT fk_salon_clients_salon
    FOREIGN KEY (salon_id) REFERENCES salons(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_salon_clients_client
    FOREIGN KEY (client_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE salon_photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  KEY idx_salon_photos_salon_id (salon_id),
  CONSTRAINT fk_salon_photos_salon
    FOREIGN KEY (salon_id) REFERENCES salons(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED NOT NULL,
  rating INT NOT NULL,
  comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reviews_salon_id (salon_id),
  KEY idx_reviews_client_id (client_id),
  CONSTRAINT fk_reviews_salon
    FOREIGN KEY (salon_id) REFERENCES salons(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_client
    FOREIGN KEY (client_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('email','sms','push') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  sent_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_notifications_user_id (user_id),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
