-- Trigger for manual billing amounts update based on status changes
-- This will only update amounts when status is manually changed in database

DELIMITER $$

-- For return billing table - trigger on manual status change
CREATE TRIGGER manual_return_billing_amounts_on_status_change
BEFORE UPDATE ON return_billing
FOR EACH ROW
BEGIN
    -- Only trigger if status column is explicitly being changed
    IF NEW.status != OLD.status THEN
        -- If status is changed to DRAFT, reset amounts
        IF NEW.status = 'DRAFT' THEN
            SET NEW.paid_amount = 0.00;
            SET NEW.balance_amount = NEW.net_amount;
        END IF;
        
        -- If status is changed to PAID, set full payment
        IF NEW.status = 'PAID' THEN
            SET NEW.paid_amount = NEW.net_amount;
            SET NEW.balance_amount = 0.00;
        END IF;
        
        -- If status is changed to PARTIAL, set example partial payment
        IF NEW.status = 'PARTIAL' THEN
            SET NEW.paid_amount = NEW.net_amount / 2;
            SET NEW.balance_amount = NEW.net_amount - NEW.paid_amount;
        END IF;
    END IF;
END$$

-- For regular billing table - trigger on manual status change
CREATE TRIGGER manual_billing_amounts_on_status_change
BEFORE UPDATE ON billing
FOR EACH ROW
BEGIN
    -- Only trigger if status column is explicitly being changed
    IF NEW.status != OLD.status THEN
        -- If status is changed to DRAFT, reset amounts
        IF NEW.status = 'DRAFT' THEN
            SET NEW.paid_amount = 0.00;
            SET NEW.balance_amount = NEW.net_amount;
        END IF;
        
        -- If status is changed to PAID, set full payment
        IF NEW.status = 'PAID' THEN
            SET NEW.paid_amount = NEW.net_amount;
            SET NEW.balance_amount = 0.00;
        END IF;
        
        -- If status is changed to PARTIAL, set example partial payment
        IF NEW.status = 'PARTIAL' THEN
            SET NEW.paid_amount = NEW.net_amount / 2;
            SET NEW.balance_amount = NEW.net_amount - NEW.paid_amount;
        END IF;
    END IF;
END$$

DELIMITER ;