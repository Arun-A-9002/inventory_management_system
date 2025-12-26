from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_tenant_db
from models.tenant_models import Customer
from schemas.tenant_schemas import CustomerCreate, CustomerResponse

router = APIRouter(prefix="/customers", tags=["Customer Management"])
DEFAULT_DB = "arun"

def get_db():
    yield from get_tenant_db(DEFAULT_DB)

@router.post("/", response_model=CustomerResponse)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer"""
    customer = Customer(**data.dict())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.get("/", response_model=list[CustomerResponse])
def list_customers(db: Session = Depends(get_db)):
    """Get all customers"""
    customers = db.query(Customer).filter(Customer.is_active == True).all()
    return customers

@router.get("/approved")
def get_approved_customers(db: Session = Depends(get_db)):
    """Get only approved customers for returns and disposal"""
    customers = db.query(Customer).filter(
        Customer.is_active == True,
        Customer.status == "approved"
    ).all()
    return customers

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """Get customer by ID"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, data: CustomerCreate, db: Session = Depends(get_db)):
    """Update customer"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    for field, value in data.dict(exclude_unset=True).items():
        setattr(customer, field, value)
    
    db.commit()
    db.refresh(customer)
    return customer

@router.put("/{customer_id}/status", response_model=CustomerResponse)
def update_customer_status(customer_id: int, status_data: dict, db: Session = Depends(get_db)):
    """Update customer status"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    status = status_data.get('status')
    customer.status = status
    db.commit()
    db.refresh(customer)
    
    # Send approval email asynchronously if status is approved
    if status == 'approved':
        try:
            from utils.email import send_email_async
            
            customer_email = customer.email
            customer_name = customer.org_name if customer.customer_type == 'organization' else customer.name
            
            if customer_email:
                email_body = f"""
                <html>
                <body>
                    <h2>Customer Registration Approved</h2>
                    <p>Dear {customer_name},</p>
                    <p>Your customer registration has been approved. You can now access our services.</p>
                    <p>Thank you!</p>
                </body>
                </html>
                """
                
                send_email_async(
                    to_email=customer_email,
                    subject="Customer Registration Approved",
                    body=email_body,
                    is_html=True
                )
        except Exception as e:
            print(f"Email error: {e}")
    
    return customer

@router.put("/{customer_id}/approve", response_model=CustomerResponse)
def approve_customer(customer_id: int, db: Session = Depends(get_db)):
    """Approve customer and send email notification"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    # Update customer status to approved
    customer.status = "approved"
    db.commit()
    db.refresh(customer)
    
    # Send approval email asynchronously
    try:
        from utils.email import send_email_async
        
        customer_email = customer.email
        customer_name = customer.org_name if customer.customer_type == 'organization' else customer.name
        
        if customer_email:
            email_body = f"""
            <html>
            <body>
                <h2>Customer Registration Approved</h2>
                <p>Dear {customer_name},</p>
                <p>Your customer registration has been approved. You can now access our services and make returns/exchanges.</p>
                <p>Thank you for choosing our services!</p>
                <p>Best regards,<br>Inventory Management Team</p>
            </body>
            </html>
            """
            
            send_email_async(
                to_email=customer_email,
                subject="Customer Registration Approved",
                body=email_body,
                is_html=True
            )
            
    except Exception as e:
        print(f"Email error: {e}")
    
    return customer

@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    """Delete customer (soft delete)"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    customer.is_active = False
    db.commit()
    return {"message": "Customer deleted successfully"}