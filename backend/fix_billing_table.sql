-- Fix billing table by adding missing grn_id column
ALTER TABLE billing ADD COLUMN grn_id INT NOT NULL AFTER id;

-- Add foreign key constraint
ALTER TABLE billing ADD CONSTRAINT fk_billing_grn FOREIGN KEY (grn_id) REFERENCES grns(id);