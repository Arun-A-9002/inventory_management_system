import mysql.connector

try:
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='arun'
    )
    cursor = conn.cursor()
    
    # Check return_billing table for billing_id 71
    cursor.execute("SELECT * FROM return_billing WHERE id = 71")
    billing = cursor.fetchone()
    
    print("Return Billing (ID 71):")
    if billing:
        print(f"  Net Amount: {billing[4]}")
        print(f"  Paid Amount: {billing[5]}")
        print(f"  Balance Amount: {billing[6]}")
    
    # Check payment history and calculate total
    cursor.execute("SELECT SUM(amount) FROM return_billing_payments WHERE billing_id = 71")
    total_paid = cursor.fetchone()[0] or 0
    
    print(f"\nActual Total Paid from payments: {total_paid}")
    print(f"Correct Balance: {float(billing[4]) - float(total_paid)}")
    
    # Update the billing record with correct values
    cursor.execute("""
        UPDATE return_billing 
        SET paid_amount = %s, 
            balance_amount = %s
        WHERE id = 71
    """, (total_paid, float(billing[4]) - float(total_paid)))
    
    conn.commit()
    print("Updated billing record with correct totals")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")