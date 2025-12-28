from sqlalchemy import create_engine, text
from database import get_tenant_engine

def populate_customer_details_in_returns():
    """Populate customer details in return_headers table from customers table"""
    
    tenant_name = "arun"
    engine = get_tenant_engine(tenant_name)
    
    try:
        with engine.connect() as conn:
            # Get all return_headers with vendor info
            returns = conn.execute(text("""
                SELECT id, vendor, return_type 
                FROM return_headers 
                WHERE vendor IS NOT NULL 
                AND return_type = 'TO_CUSTOMER'
            """)).fetchall()
            
            print(f"Found {len(returns)} return records to update")
            
            for return_record in returns:
                return_id = return_record[0]
                vendor = return_record[1]
                
                if not vendor:
                    continue
                
                # Extract customer name from vendor field (handle "Customer: Name" format)
                if vendor.startswith("Customer: "):
                    customer_name = vendor.replace("Customer: ", "").strip()
                elif " - " in vendor:
                    customer_name = vendor.split(" - ")[0].strip()
                else:
                    customer_name = vendor.strip()
                
                # Find customer in customers table
                customer = conn.execute(text("""
                    SELECT id, name, org_name, mobile, org_mobile, email 
                    FROM customers 
                    WHERE name = :name OR org_name = :name
                """), {"name": customer_name}).fetchone()
                
                if customer:
                    customer_id = customer[0]
                    name = customer[1] or customer[2]
                    phone = customer[3] or customer[4]
                    email = customer[5]
                    
                    # Update return_headers with customer details
                    conn.execute(text("""
                        UPDATE return_headers 
                        SET customer_id = :customer_id,
                            customer_name = :customer_name,
                            customer_phone = :customer_phone,
                            customer_email = :customer_email
                        WHERE id = :return_id
                    """), {
                        "customer_id": customer_id,
                        "customer_name": name,
                        "customer_phone": phone,
                        "customer_email": email,
                        "return_id": return_id
                    })
                    
                    print(f"Updated return {return_id} with customer: {name}")
                else:
                    print(f"Customer not found for return {return_id}: {customer_name}")
            
            conn.commit()
            print("Customer details populated successfully!")
            
    except Exception as e:
        print(f"Failed to populate customer details: {e}")

if __name__ == "__main__":
    populate_customer_details_in_returns()