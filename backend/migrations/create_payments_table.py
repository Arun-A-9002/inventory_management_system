import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def get_mysql_connection():
    return mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='arun'
    )

def create_payments_table():
    try:
        conn = get_mysql_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                grn_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_grn_id (grn_id)
            )
        ''')
        
        conn.commit()
        cursor.close()
        conn.close()
        print("Payments table created successfully")
        
    except Exception as e:
        print(f"Error creating payments table: {e}")

if __name__ == "__main__":
    create_payments_table()