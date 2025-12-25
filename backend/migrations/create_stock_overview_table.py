"""
Migration script to create stock_overview table and populate with initial data
"""

import pymysql
from datetime import datetime

def create_stock_overview_table():
    """Create stock_overview table and populate with initial data"""
    
    # Database configuration
    DB_HOST = "localhost"
    DB_USER = "root"
    DB_PASSWORD = ""
    DB_NAME = "arun"  # Your tenant database name
    DB_PORT = 3306
    
    # Connect to the database
    conn = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=DB_PORT
    )
    cursor = conn.cursor()
    
    # Create the table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stock_overview (
            id INT AUTO_INCREMENT PRIMARY KEY,
            item_name VARCHAR(150) NOT NULL,
            item_code VARCHAR(50) NOT NULL,
            location VARCHAR(100) NOT NULL,
            available_qty INT DEFAULT 0,
            min_stock INT DEFAULT 0,
            warranty VARCHAR(50) DEFAULT '—',
            expiry_date VARCHAR(50) DEFAULT '—',
            batch_no VARCHAR(100),
            status VARCHAR(50) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ''')
    
    # Clear existing data
    cursor.execute("DELETE FROM stock_overview")
    
    # Initial data
    stock_data = [
        ("Paracetamol 500mg", "PARA500", "Not Assigned", 0, 100, "—", "—", "", "Low Stock"),
        ("Dolo", "10002", "Main Store", 200, 200, "—", "8/1/2026", "6789", "Low Stock"),
        ("bandage", "ITM-1100", "Main Store", 0, 200, "—", "31/12/2025", "58", "Low Stock"),
        ("Injection", "ITM-1111", "Main Store", 20, 100, "—", "26/12/2025", "25", "Low Stock"),
        ("Sethescope", "ITM-1210", "Main Store", 50, 20, "—", "31/12/2025", "123234", "Good"),
        ("laptop", "ITM-1000", "Not Assigned", 0, 5, "—", "—", "", "Low Stock"),
        ("phone", "ITM-1300", "Main Store", 55, 300, "—", "—", "", "Low Stock"),
        ("phone", "321", "Main Store", 55, 300, "—", "—", "", "Low Stock"),
        ("iphn", "123213", "Main Store", 450, 200, "—", "31/12/2025", "36", "Good"),
        ("dryer", "ITM-1119", "main", 50, 200, "—", "2/1/2026", "789", "Low Stock"),
        ("water bottle", "ITM-1220", "Not Assigned", 0, 200, "—", "—", "", "Low Stock")
    ]
    
    # Insert data
    cursor.executemany('''
        INSERT INTO stock_overview 
        (item_name, item_code, location, available_qty, min_stock, warranty, expiry_date, batch_no, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    ''', stock_data)
    
    conn.commit()
    conn.close()
    print("Stock overview table created and populated successfully!")

if __name__ == "__main__":
    create_stock_overview_table()