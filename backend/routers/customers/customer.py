from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import json
from database import get_current_tenant_db_name, get_tenant_db
from models.tenant_models import Customer, AuditLog
from schemas.tenant_schemas import CustomerCreate, CustomerResponse
from utils.permissions import (
    require_customers_view, require_customers_create, require_customers_edit, 
    require_customers_delete, require_customers_status
)
from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/customers", tags=["Customer Management"])


def get_db(tenant_db_name: str = Depends(get_current_tenant_db_name())):
    yield from get_tenant_db(tenant_db_name)

# Helper function for audit logging
def log_audit_trail(db: Session, current_user: dict, action: str, table_name: str, record_id: int = None, old_values: dict = None, new_values: dict = None, description: str = None, request: Request = None):
    user_id = None
    user_name = 'System'
    
    if current_user:
        user_id = current_user.get('id') or current_user.get('sub')
        user_name = current_user.get('full_name') or current_user.get('email') or current_user.get('name', 'System')
        
        if user_id and isinstance(user_id, str):
            try:
                user_id = int(user_id)
            except ValueError:
                user_id = None
    
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent')
    
    audit_log = AuditLog(
        user_id=user_id,
        user_name=user_name,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        ip_address=ip_address,
        user_agent=user_agent,
        module="CUSTOMER_MANAGEMENT",
        description=description
    )
    db.add(audit_log)
    db.commit()

@router.post("/", response_model=CustomerResponse)
def create_customer(data: CustomerCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_customers_create())):
    """Create a new customer"""
    log_api("CREATE CUSTOMER")
    
    try:
        customer = Customer(**data.dict())
        db.add(customer)
        db.commit()
        db.refresh(customer)
        
        customer_name = customer.org_name if customer.customer_type == 'organization' else customer.name
        
        log_audit_trail(
            db=db,
            current_user=current_user,
            action="CREATE",
            table_name="customers",
            record_id=customer.id,
            new_values={
                "customer_type": customer.customer_type,
                "name": customer_name,
                "email": customer.email,
                "mobile": customer.mobile or customer.org_mobile,
                "status": customer.status
            },
            description=f"Created customer {customer_name}",
            request=request
        )
        
        log_audit(f"Customer created → {customer_name}")
        return customer
        
    except Exception as e:
        log_error(e, "create_customer")
        raise HTTPException(500, "Failed to create customer")

@router.get("/", response_model=list[CustomerResponse])
def list_customers(db: Session = Depends(get_db), _: dict = Depends(require_customers_view())):
    """Get all customers"""
    customers = db.query(Customer).filter(Customer.is_active == True).all()
    return customers

@router.get("/approved")
def get_approved_customers(db: Session = Depends(get_db), _: dict = Depends(require_customers_view())):
    """Get only approved customers for returns and disposal"""
    customers = db.query(Customer).filter(
        Customer.is_active == True,
        Customer.status == "approved"
    ).all()
    return customers

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db), _: dict = Depends(require_customers_view())):
    """Get customer by ID"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, data: CustomerCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_customers_edit())):
    """Update customer"""
    log_api("UPDATE CUSTOMER")
    
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    old_customer_name = customer.org_name if customer.customer_type == 'organization' else customer.name
    old_values = {
        "customer_type": customer.customer_type,
        "name": old_customer_name,
        "email": customer.email,
        "mobile": customer.mobile or customer.org_mobile,
        "status": customer.status
    }
    
    for field, value in data.dict(exclude_unset=True).items():
        setattr(customer, field, value)
    
    db.commit()
    db.refresh(customer)
    
    new_customer_name = customer.org_name if customer.customer_type == 'organization' else customer.name
    new_values = {
        "customer_type": customer.customer_type,
        "name": new_customer_name,
        "email": customer.email,
        "mobile": customer.mobile or customer.org_mobile,
        "status": customer.status
    }
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="customers",
        record_id=customer.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated customer {new_customer_name}",
        request=request
    )
    
    log_audit(f"Customer updated → {new_customer_name}")
    return customer

@router.put("/{customer_id}/status", response_model=CustomerResponse)
def update_customer_status(customer_id: int, status_data: dict, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_customers_status())):
    """Update customer status"""
    log_api("UPDATE CUSTOMER STATUS")
    
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    old_status = customer.status
    status = status_data.get('status')
    customer.status = status
    db.commit()
    db.refresh(customer)
    
    customer_name = customer.org_name if customer.customer_type == 'organization' else customer.name
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="customers",
        record_id=customer.id,
        old_values={"status": old_status},
        new_values={"status": customer.status},
        description=f"Updated customer {customer_name} status from {old_status} to {status}",
        request=request
    )
    
    log_audit(f"Customer status updated → {customer_name}: {status}")
    
    # Send approval email asynchronously if status is approved
    if status == 'approved':
        try:
            from utils.email_service_old import send_email_async
            
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
def approve_customer(customer_id: int, db: Session = Depends(get_db), _: dict = Depends(require_customers_status())):
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
        from utils.email_service_old import send_email_async
        
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
def delete_customer(customer_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_customers_delete())):
    """Delete customer (soft delete)"""
    log_api("DELETE CUSTOMER")
    
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    customer_name = customer.org_name if customer.customer_type == 'organization' else customer.name
    customer_details = {
        "customer_type": customer.customer_type,
        "name": customer_name,
        "email": customer.email,
        "mobile": customer.mobile or customer.org_mobile,
        "status": customer.status,
        "is_active": customer.is_active
    }
    
    customer.is_active = False
    db.commit()
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="customers",
        record_id=customer_id,
        old_values=customer_details,
        description=f"Deleted customer {customer_name}",
        request=request
    )
    
    log_audit(f"Customer deleted → {customer_id}")
    return {"message": "Customer deleted successfully"}