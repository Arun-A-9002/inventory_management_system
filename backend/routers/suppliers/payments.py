from fastapi import APIRouter
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

def get_mysql_connection():
    return mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='arun'
    )

@router.post("/payments")
async def create_payment(grn_id: int, amount: float):
    try:
        conn = get_mysql_connection()
        cursor = conn.cursor()
        
        # Get GRN total amount
        cursor.execute('SELECT total_amount, vendor_name FROM grns WHERE id = %s', (grn_id,))
        grn_result = cursor.fetchone()
        if not grn_result:
            return {"error": "GRN not found"}
        
        grn_total = float(grn_result[0])
        vendor_name = grn_result[1]
        
        # Get current paid amount
        cursor.execute('SELECT COALESCE(SUM(amount), 0) FROM payments WHERE grn_id = %s', (grn_id,))
        current_paid = float(cursor.fetchone()[0])
        
        # Calculate remaining amount for this GRN
        remaining = grn_total - current_paid
        
        if amount <= remaining:
            # Normal payment - no advance
            cursor.execute('INSERT INTO payments (grn_id, amount) VALUES (%s, %s)', (grn_id, amount))
        else:
            # Overpayment - create advance
            cursor.execute('INSERT INTO payments (grn_id, amount) VALUES (%s, %s)', (grn_id, remaining))
            advance_amount = amount - remaining
            
            # Store advance for vendor
            cursor.execute('''
                INSERT INTO vendor_advances (vendor_name, amount, created_from_grn) 
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE amount = amount + %s
            ''', (vendor_name, advance_amount, grn_id, advance_amount))
        
        conn.commit()
        cursor.close()
        conn.close()
        return {"message": "Payment saved"}
    except Exception as e:
        print(f"Payment save error: {e}")
        return {"error": str(e)}

@router.get("/payments/{grn_id}")
async def get_payments(grn_id: int):
    try:
        conn = get_mysql_connection()
        cursor = conn.cursor()
        
        # Create vendor_advances table if not exists
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vendor_advances (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendor_name VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) DEFAULT 0,
                created_from_grn INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_vendor (vendor_name)
            )
        ''')
        
        cursor.execute('SELECT COALESCE(SUM(amount), 0) FROM payments WHERE grn_id = %s', (grn_id,))
        result = cursor.fetchone()
        total_paid = float(result[0]) if result and result[0] else 0.0
        cursor.close()
        conn.close()
        print(f"GRN {grn_id} total paid: {total_paid}")
        return {"total_paid": total_paid}
    except Exception as e:
        print(f"Payment fetch error for GRN {grn_id}: {e}")
        return {"total_paid": 0.0}

@router.get("/advances/{vendor_name}")
async def get_vendor_advance(vendor_name: str):
    try:
        conn = get_mysql_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT COALESCE(amount, 0) FROM vendor_advances WHERE vendor_name = %s', (vendor_name,))
        result = cursor.fetchone()
        advance_balance = float(result[0]) if result and result[0] else 0.0
        cursor.close()
        conn.close()
        return {"advance_balance": advance_balance}
    except Exception as e:
        print(f"Advance fetch error for vendor {vendor_name}: {e}")
        return {"advance_balance": 0.0}