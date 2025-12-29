import mysql.connector

try:
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='arun'
    )
    cursor = conn.cursor()
    
    # Check return_billing table for billing_id 73
    cursor.execute("SELECT * FROM return_billing WHERE id = 73")
    billing = cursor.fetchone()
    
    print("Return Billing (ID 73):")
    if billing:
        print(f"  ID: {billing[0]}")
        print(f"  Return ID: {billing[1]}")
        print(f"  Gross Amount: {billing[2]}")
        print(f"  Tax Amount: {billing[3]}")
        print(f"  Net Amount: {billing[4]}")
        print(f"  Paid Amount: {billing[5]}")
        print(f"  Balance Amount: {billing[6]}")
        print(f"  Status: {billing[7]}")
    
    # Check payment history
    cursor.execute("SELECT * FROM return_billing_payments WHERE billing_id = 73 ORDER BY created_at")
    payments = cursor.fetchall()
    
    print("\nPayment History:")
    total_payments = 0
    for payment in payments:
        print(f"  Payment ID {payment[0]}: Amount {payment[2]} ({payment[3]}) - {payment[6]}")
        total_payments += float(payment[2])
    
    print(f"\nTotal Payments Made: {total_payments}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")