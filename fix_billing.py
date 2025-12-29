import mysql.connector

try:
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='arun'
    )
    cursor = conn.cursor()
    
    # Update return_billing table with correct values
    cursor.execute("""
        UPDATE return_billing 
        SET paid_amount = 720.00, 
            balance_amount = 1000.00,
            status = 'PARTIAL'
        WHERE id = 73
    """)
    
    conn.commit()
    print("Updated billing record successfully")
    
    # Verify the update
    cursor.execute("SELECT paid_amount, balance_amount, status FROM return_billing WHERE id = 73")
    result = cursor.fetchone()
    print(f"New values: Paid={result[0]}, Balance={result[1]}, Status={result[2]}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")