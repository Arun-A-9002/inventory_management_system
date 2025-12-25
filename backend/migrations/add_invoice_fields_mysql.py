import pymysql

def add_invoice_fields_to_grn_mysql():
    try:
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='',
            database='arun',
            charset='utf8mb4'
        )
        
        cursor = connection.cursor()
        
        # Check if columns exist
        cursor.execute("SHOW COLUMNS FROM grns LIKE 'invoice_number'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE grns ADD COLUMN invoice_number VARCHAR(50)")
            print("Added invoice_number column")
        
        cursor.execute("SHOW COLUMNS FROM grns LIKE 'invoice_date'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE grns ADD COLUMN invoice_date DATE")
            print("Added invoice_date column")
        
        connection.commit()
        print("MySQL migration completed successfully!")
        
    except Exception as e:
        print(f"MySQL migration failed: {str(e)}")
        if 'connection' in locals():
            connection.rollback()
    
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    add_invoice_fields_to_grn_mysql()