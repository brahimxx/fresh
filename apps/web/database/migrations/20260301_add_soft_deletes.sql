-- Add deleted_at soft delete column to standard entities missing it

ALTER TABLE users ADD COLUMN deleted_at datetime DEFAULT NULL AFTER last_login_at;
ALTER TABLE reviews ADD COLUMN deleted_at datetime DEFAULT NULL AFTER service_id;
