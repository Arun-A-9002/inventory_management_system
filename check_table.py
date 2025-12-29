import mysql.connector

try:
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='arun'
    )
    cursor = conn.cursor()
    
    cursor.execute("DESCRIBE return_billing_payments")
    columns = cursor.fetchall()
    
    print("return_billing_payments table structure:")
    for column in columns:
        print(f"  {column[0]} - {column[1]}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")