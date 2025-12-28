from sqlalchemy import create_engine, text
from database import get_tenant_engine
import os

def migrate_billing_table():
    """Add all missing columns to billing table"""
    
    # Get database engine for the tenant
    tenant_name = "arun"  # Replace with your tenant name
    engine = get_tenant_engine(tenant_name)
    
    try:
        with engine.connect() as conn:
            # List of columns to add
            columns_to_add = [
                ("gross_amount", "DECIMAL(10, 2) NOT NULL DEFAULT 0.00"),
                ("tax_amount", "DECIMAL(10, 2) DEFAULT 0.00"),
                ("net_amount", "DECIMAL(10, 2) NOT NULL DEFAULT 0.00"),
                ("paid_amount", "DECIMAL(10, 2) DEFAULT 0.00"),
                ("balance_amount", "DECIMAL(10, 2) NOT NULL DEFAULT 0.00"),
                ("status", "ENUM('DRAFT', 'PARTIAL', 'PAID') DEFAULT 'DRAFT'"),
                ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP")
            ]
            
            for column_name, column_def in columns_to_add:
                # Check if column exists
                result = conn.execute(text(f"""
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'billing' 
                    AND COLUMN_NAME = '{column_name}'
                    AND TABLE_SCHEMA = DATABASE()
                """))
                
                if not result.fetchone():
                    print(f"Adding {column_name} column to billing table...")
                    conn.execute(text(f"ALTER TABLE billing ADD COLUMN {column_name} {column_def}"))
                else:
                    print(f"{column_name} column already exists")
                    
            conn.commit()
            print("Migration completed successfully!")
                
    except Exception as e:
        print(f"Migration failed: {e}")

def create_billing_triggers():
    """Create triggers for automatic amount calculation"""
    
    tenant_name = "arun"
    engine = get_tenant_engine(tenant_name)
    
    try:
        with engine.connect() as conn:
            # Add customer fields to return_headers if they don't exist
            customer_fields = [
                ("customer_id", "INT NULL"),
                ("customer_name", "VARCHAR(191) NULL"),
                ("customer_phone", "VARCHAR(20) NULL"),
                ("customer_email", "VARCHAR(191) NULL")
            ]
            
            for field_name, field_def in customer_fields:
                result = conn.execute(text(f"""
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'return_headers' 
                    AND COLUMN_NAME = '{field_name}'
                    AND TABLE_SCHEMA = DATABASE()
                """))
                
                if not result.fetchone():
                    print(f"Adding {field_name} column to return_headers table...")
                    conn.execute(text(f"ALTER TABLE return_headers ADD COLUMN {field_name} {field_def}"))
            
            # Drop existing triggers
            conn.execute(text("DROP TRIGGER IF EXISTS billing_status_trigger"))
            conn.execute(text("DROP TRIGGER IF EXISTS return_billing_status_trigger"))
            conn.execute(text("DROP TRIGGER IF EXISTS billing_balance_trigger"))
            conn.execute(text("DROP TRIGGER IF EXISTS return_billing_balance_trigger"))
            
            # Create trigger for return_billing - status changes
            trigger_sql = """
            CREATE TRIGGER return_billing_status_trigger
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
                    END IF;
                END IF;
            END
            """
            conn.execute(text(trigger_sql))
            
            # Create trigger for return_billing - balance changes (for PARTIAL)
            trigger_sql2 = """
            CREATE TRIGGER return_billing_balance_trigger
            BEFORE UPDATE ON return_billing
            FOR EACH ROW
            BEGIN
                IF NEW.balance_amount != OLD.balance_amount AND NEW.status = OLD.status THEN
                    SET NEW.paid_amount = NEW.net_amount - NEW.balance_amount;
                END IF;
            END
            """
            conn.execute(text(trigger_sql2))
            
            # Create trigger for billing - status changes
            trigger_sql3 = """
            CREATE TRIGGER billing_status_trigger
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
                    END IF;
                END IF;
            END
            """
            conn.execute(text(trigger_sql3))
            
            # Create trigger for billing - balance changes (for PARTIAL)
            trigger_sql4 = """
            CREATE TRIGGER billing_balance_trigger
            BEFORE UPDATE ON billing
            FOR EACH ROW
            BEGIN
                IF NEW.balance_amount != OLD.balance_amount AND NEW.status = OLD.status THEN
                    SET NEW.paid_amount = NEW.net_amount - NEW.balance_amount;
                END IF;
            END
            """
            conn.execute(text(trigger_sql4))
            
            conn.commit()
            print("Billing triggers created successfully!")
            
    except Exception as e:
        print(f"Failed to create triggers: {e}")

if __name__ == "__main__":
    migrate_billing_table()
    create_billing_triggers()