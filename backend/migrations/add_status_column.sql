-- Add status column to external_transfer_items table
ALTER TABLE external_transfer_items 
ADD COLUMN status VARCHAR(50) DEFAULT 'pending' AFTER damage_reason;