-- Add return date to external_transfer_items table
ALTER TABLE external_transfer_items 
ADD COLUMN returned_at TIMESTAMP DEFAULT NULL AFTER damage_reason;