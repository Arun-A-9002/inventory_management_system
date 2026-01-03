-- Add return tracking fields to external_transfers table
ALTER TABLE external_transfers 
ADD COLUMN staff_phone VARCHAR(20) DEFAULT NULL AFTER staff_location,
ADD COLUMN staff_email VARCHAR(100) DEFAULT NULL AFTER staff_phone,
ADD COLUMN return_deadline DATE DEFAULT NULL AFTER returned_at;