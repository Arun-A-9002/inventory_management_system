-- Migration to add return staff details columns to return_headers table
-- This allows storing different staff information when processing returns

ALTER TABLE return_headers 
ADD COLUMN return_staff_name VARCHAR(255) NULL COMMENT 'Name of staff processing the return',
ADD COLUMN return_staff_phone VARCHAR(20) NULL COMMENT 'Phone number of return processing staff',
ADD COLUMN return_staff_email VARCHAR(191) NULL COMMENT 'Email of return processing staff',
ADD COLUMN staff_change_reason TEXT NULL COMMENT 'Reason for different staff processing the return';