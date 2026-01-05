from database import get_tenant_db
from models.tenant_models import Vendor
from sqlalchemy import text

def check_and_add_bank_columns():
    try:
        db = next(get_tenant_db('arun'))
        
        # Check if vendors table exists and get columns (MySQL syntax)
        result = db.execute(text("SHOW COLUMNS FROM vendors"))
        columns = [row[0] for row in result.fetchall()]
        print(f"Existing columns: {columns}")
        
        # Add bank detail columns if they don't exist
        bank_columns = {
            'ifsc_code': 'VARCHAR(20)',
            'account_number': 'VARCHAR(30)', 
            'account_holder_name': 'VARCHAR(150)',
            'branch_name': 'VARCHAR(150)'
        }
        
        for column, datatype in bank_columns.items():
            if column not in columns:
                db.execute(text(f"ALTER TABLE vendors ADD COLUMN {column} {datatype}"))
                print(f"Added column: {column}")
            else:
                print(f"Column {column} already exists")
        
        db.commit()
        print("Bank details columns added successfully")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_and_add_bank_columns()