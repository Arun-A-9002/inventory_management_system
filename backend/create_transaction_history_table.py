import pymysql
from database import DB_HOST, DB_USER, DB_PASSWORD, DB_PORT

def create_transaction_history_table():
    try:
        conn = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database="arun",
            port=int(DB_PORT)
        )
        
        cursor = conn.cursor()
        
        # Create external_transfer_transactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS external_transfer_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                transfer_id INT NOT NULL,
                item_id INT NOT NULL,
                transaction_type ENUM('RETURN', 'DAMAGE') NOT NULL,
                quantity INT NOT NULL,
                transaction_date DATETIME NOT NULL,
                remarks TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (transfer_id) REFERENCES external_transfers(id),
                FOREIGN KEY (item_id) REFERENCES external_transfer_items(id)
            )
        """)
        
        conn.commit()
        print("Created external_transfer_transactions table successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_transaction_history_table()