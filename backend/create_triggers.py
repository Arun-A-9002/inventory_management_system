from sqlalchemy import create_engine, text
from database import get_tenant_engine

def create_billing_triggers():
    """Create triggers to automatically update amounts when status changes"""
    
    tenant_name = "arun"
    engine = get_tenant_engine(tenant_name)
    
    try:
        with engine.connect() as conn:
            # Drop existing triggers
            conn.execute(text("DROP TRIGGER IF EXISTS manual_return_billing_amounts_on_status_change"))
            conn.execute(text("DROP TRIGGER IF EXISTS manual_billing_amounts_on_status_change"))
            
            # Create trigger for return_billing table
            trigger_sql = """
            CREATE TRIGGER manual_return_billing_amounts_on_status_change
            BEFORE UPDATE ON return_billing
            FOR EACH ROW
            BEGIN
                IF NEW.status != OLD.status THEN
                    IF NEW.status = 'PAID' THEN
                        SET NEW.paid_amount = NEW.net_amount;
                        SET NEW.balance_amount = 0.00;
                    ELSEIF NEW.status = 'DRAFT' THEN
                        SET NEW.paid_amount = 0.00;
                        SET NEW.balance_amount = NEW.net_amount;
                    ELSEIF NEW.status = 'PARTIAL' THEN
                        SET NEW.paid_amount = NEW.net_amount / 2;
                        SET NEW.balance_amount = NEW.net_amount - NEW.paid_amount;
                    END IF;
                END IF;
            END
            """
            conn.execute(text(trigger_sql))
            
            # Create trigger for billing table
            trigger_sql2 = """
            CREATE TRIGGER manual_billing_amounts_on_status_change
            BEFORE UPDATE ON billing
            FOR EACH ROW
            BEGIN
                IF NEW.status != OLD.status THEN
                    IF NEW.status = 'PAID' THEN
                        SET NEW.paid_amount = NEW.net_amount;
                        SET NEW.balance_amount = 0.00;
                    ELSEIF NEW.status = 'DRAFT' THEN
                        SET NEW.paid_amount = 0.00;
                        SET NEW.balance_amount = NEW.net_amount;
                    ELSEIF NEW.status = 'PARTIAL' THEN
                        SET NEW.paid_amount = NEW.net_amount / 2;
                        SET NEW.balance_amount = NEW.net_amount - NEW.paid_amount;
                    END IF;
                END IF;
            END
            """
            conn.execute(text(trigger_sql2))
            
            conn.commit()
            print("Billing triggers created successfully!")
            
    except Exception as e:
        print(f"Failed to create triggers: {e}")

if __name__ == "__main__":
    create_billing_triggers()