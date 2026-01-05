"""Test script to directly update return staff details"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_tenant_db
from sqlalchemy import text

def test_update_return_staff(transfer_id):
    """Test direct database update of return staff details"""
    try:
        db = next(get_tenant_db())
        
        # Update return staff details directly
        db.execute(text("""
            UPDATE external_transfers 
            SET return_staff_name = 'kural',
                return_staff_phone = '8596545225',
                return_staff_email = 'arun.eng27@gmail.com',
                staff_change_reason = 'staff busy in their work'
            WHERE id = :transfer_id
        """), {"transfer_id": transfer_id})
        
        db.commit()
        
        # Verify the update
        result = db.execute(text("""
            SELECT staff_name, return_staff_name, return_staff_phone, return_staff_email, staff_change_reason
            FROM external_transfers 
            WHERE id = :transfer_id
        """), {"transfer_id": transfer_id}).fetchone()
        
        if result:
            print(f"Original staff: {result[0]}")
            print(f"Return staff name: {result[1]}")
            print(f"Return staff phone: {result[2]}")
            print(f"Return staff email: {result[3]}")
            print(f"Staff change reason: {result[4]}")
        else:
            print("Transfer not found")
        
        db.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    transfer_id = input("Enter transfer ID: ")
    test_update_return_staff(int(transfer_id))