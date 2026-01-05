import pymysql
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def add_quality_check_column_mysql():
    """Add quality_check column to grns table in MySQL"""
    
    try:
        # Connect to MySQL database
        connection = pymysql.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database='arun',  # tenant database
            charset='utf8mb4'
        )
        
        cursor = connection.cursor()
        
        # Check if column already exists
        cursor.execute("SHOW COLUMNS FROM grns LIKE 'quality_check'")
        result = cursor.fetchone()
        
        if not result:
            # Add quality_check column
            cursor.execute("ALTER TABLE grns ADD COLUMN quality_check BOOLEAN DEFAULT FALSE")
            connection.commit()
            print("Added quality_check column to grns table in MySQL")
        else:
            print("quality_check column already exists in grns table")
        
        cursor.close()
        connection.close()
        print("MySQL migration completed successfully")
        
    except Exception as e:
        print(f"MySQL migration failed: {e}")

if __name__ == "__main__":
    add_quality_check_column_mysql()