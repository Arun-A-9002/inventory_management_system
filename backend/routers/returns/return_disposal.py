from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date, datetime
import json
from database import get_current_tenant_db_name, get_tenant_db
from models.tenant_models import (
    ReturnHeader, ReturnItem, Customer,
    DisposalTransaction, SalvageValuation,
    ReturnTypeEnum, ItemConditionEnum, DisposalMethodEnum, AuditLog
)
def send_email(to_email: str, subject: str, body: str, is_html: bool = False):
    """Send email using current email service"""
    from utils.email_service import send_registration_email
    # For now, use registration email function as base
    # This is a temporary solution - ideally create a generic send_email function
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        import os
        
        SMTP_SERVER = os.getenv("SMTP_HOST", "smtp.gmail.com")
        SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
        EMAIL_USER = os.getenv("SMTP_USER", "")
        EMAIL_PASSWORD = os.getenv("SMTP_PASSWORD", "")
        FROM_EMAIL = os.getenv("SMTP_FROM", EMAIL_USER)
        
        if not EMAIL_USER or not EMAIL_PASSWORD:
            print("Email credentials not configured")
            return False
        
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html' if is_html else 'plain'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(FROM_EMAIL, to_email, text)
        server.quit()
        
        print(f"Email sent to {to_email}")
        return True
        
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False
from utils.permissions import (
    require_return_disposal_view, 
    require_return_disposal_create, 
    require_return_disposal_edit, 
    require_return_disposal_delete, 
    require_return_disposal_status_approve
)
from typing import List, Optional

router = APIRouter(prefix="/returns", tags=["Return & Disposal"])

def get_db(tenant_db_name: str = Depends(get_current_tenant_db_name())):
    yield from get_tenant_db(tenant_db_name)

# Helper function for audit logging
def log_audit(db: Session, current_user: dict, action: str, table_name: str, record_id: int = None, old_values: dict = None, new_values: dict = None, description: str = None, request: Request = None):
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
    
    # Extract IP and User Agent from request
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
        module="RETURN_DISPOSAL",
        description=description
    )
    db.add(audit_log)
    db.commit()

@router.get("/")
def list_returns(db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_view())):
    """Get all returns with proper location data"""
    returns = db.query(ReturnHeader).order_by(ReturnHeader.created_at.desc()).all()
    
    # Convert to dict to ensure location field is included
    return_list = []
    for return_item in returns:
        return_dict = {
            "id": return_item.id,
            "return_no": return_item.return_no,
            "return_type": return_item.return_type,
            "location": return_item.location,  # From location
            "to_location": return_item.department,  # To location for internal transfers
            "reason": return_item.reason,
            "return_date": return_item.return_date,
            "status": return_item.status,
            "created_at": return_item.created_at,
            "customer_id": return_item.customer_id,
            "customer_name": return_item.customer_name,
            "customer_phone": return_item.customer_phone,
            "customer_email": return_item.customer_email
        }
        return_list.append(return_dict)
    
    return return_list

# ---------------- CREATE RETURN ----------------
@router.post("/")
def create_return(return_data: dict, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_create())):
    """Create new return"""
    # Generate return number
    return_no = f"RTN{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    print(f"DEBUG: Form data received: {return_data}")
    print(f"DEBUG: Location value: {return_data.get('location')}")
    
    # Create return header
    return_type_value = return_data.get('return_type', 'TO_VENDOR')
    location_value = return_data.get('location')
    print(f"DEBUG: Creating return with type: {return_type_value}, location: {location_value}")
    
    return_header = ReturnHeader(
        return_no=return_no,
        return_type=return_type_value,
        vendor=return_data.get('supplier'),
        location=return_data.get('location'),  # From location
        department=return_data.get('to_location'),  # To location for internal transfers
        reason=return_data.get('reason'),
        return_date=date.today(),
        status="DRAFT"
    )
    
    # Add customer_id to return_header if it's a TO_CUSTOMER return
    if return_type_value == 'TO_CUSTOMER' and return_data.get('customer_id'):
        # Store customer info in vendor field for now (can be improved with proper customer field)
        customer = db.query(Customer).filter(Customer.id == return_data.get('customer_id')).first()
        if customer:
            customer_name = customer.org_name if customer.customer_type == 'organization' else customer.name
            return_header.vendor = f"Customer: {customer_name}"
    
    db.add(return_header)
    db.flush()
    
    # Create return items and update stock
    for item_data in return_data.get('items', []):
        if item_data.get('item_name') and item_data.get('quantity'):
            return_item = ReturnItem(
                return_id=return_header.id,
                item_name=item_data.get('item_name'),
                batch_no=item_data.get('batch_no'),
                qty=float(item_data.get('quantity', 0)),
                uom='PCS',
                condition='GOOD',
                remarks=item_data.get('reason', '')
            )
            db.add(return_item)
            
            # Update stock based on return type
            from models.tenant_models import Stock, StockLedger
            stock = db.query(Stock).filter(Stock.item_name == item_data.get('item_name')).first()
            
            if stock:
                qty = float(item_data.get('quantity', 0))
                
                if return_data.get('return_type') == 'TO_VENDOR':
                    # Reduce stock when returning to vendor
                    stock.available_qty -= qty
                    stock.total_qty -= qty
                    
                    # Create ledger entry
                    ledger = StockLedger(
                        stock_id=stock.id,
                        txn_type="RETURN_OUT",
                        qty_out=qty,
                        balance=stock.available_qty,
                        ref_no=return_no,
                        remarks=f"Return to vendor: {return_data.get('supplier')}"
                    )
                    db.add(ledger)
                    
                elif return_data.get('return_type') == 'FROM_CUSTOMER':
                    # Increase stock when receiving from customer
                    stock.available_qty += qty
                    stock.total_qty += qty
                    
                    # Create ledger entry
                    ledger = StockLedger(
                        stock_id=stock.id,
                        txn_type="RETURN_IN",
                        qty_in=qty,
                        balance=stock.available_qty,
                        ref_no=return_no,
                        remarks=f"Return from customer"
                    )
                    db.add(ledger)
    
    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="CREATE",
        table_name="return_headers",
        record_id=return_header.id,
        new_values={
            "return_no": return_no,
            "return_type": return_type_value,
            "location": location_value,
            "vendor": return_header.vendor,
            "reason": return_header.reason
        },
        description=f"Created return {return_no} of type {return_type_value}",
        request=request
    )
    
    return {
        "message": "Return created successfully",
        "return_number": return_no,
        "id": return_header.id
    }

# ---------------- GET RETURN DETAILS ----------------
@router.get("/{return_id}")
def get_return_details(return_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_view())):
    """Get return details with items"""
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        raise HTTPException(404, "Return not found")
    
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == return_id).all()
    
    return {
        "header": {
            "id": return_header.id,
            "return_no": return_header.return_no,
            "return_type": return_header.return_type,
            "vendor": return_header.vendor,
            "location": return_header.location,
            "to_location": return_header.department,
            "reason": return_header.reason,
            "return_date": return_header.return_date,
            "status": return_header.status,
            "customer_id": return_header.customer_id,
            "customer_name": return_header.customer_name,
            "customer_phone": return_header.customer_phone,
            "customer_email": return_header.customer_email
        },
        "items": return_items
    }

@router.get("/{return_id}/items")
def get_return_items(return_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_view())):
    """Get return items for a specific return with correct rates, warranty, and tax info"""
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == return_id).all()
    
    # Enhance items with correct rates, warranty, and tax
    enhanced_items = []
    for item in return_items:
        # Use same logic as billing calculation
        rate = 30  # Default
        if hasattr(item, 'rate') and item.rate:
            rate = float(item.rate)
        else:
            from models.tenant_models import Item
            master_item = db.query(Item).filter(Item.name == item.item_name).first()
            if master_item:
                rate = float(master_item.mrp or master_item.fixing_price or 30)
        
        # Calculate tax (18% as used in billing)
        item_total = item.qty * rate
        tax_amount = item_total * 0.18
        total_with_tax = item_total + tax_amount
        
        # Get actual batch number from return item
        batch_no = item.batch_no if item.batch_no else "N/A"
        
        # Get warranty info
        warranty_info = "N/A"
        try:
            from models.tenant_models import Item, Batch, GRNItem, GRN
            master_item = db.query(Item).filter(Item.name == item.item_name).first()
            if master_item and master_item.has_warranty:
                if master_item.warranty_start_date and master_item.warranty_end_date:
                    warranty_info = f"{master_item.warranty_start_date} to {master_item.warranty_end_date}"
                else:
                    warranty_info = "Warranty Available"
        except:
            pass
        
        enhanced_item = {
            "item_name": item.item_name,
            "batch_no": batch_no,
            "qty": item.qty,
            "uom": item.uom,
            "condition": item.condition,
            "remarks": item.remarks,
            "rate": rate,
            "price": rate,
            "warranty": warranty_info,
            "tax_rate": 18.0,
            "tax_amount": round(tax_amount, 2),
            "total_with_tax": round(total_with_tax, 2)
        }
        enhanced_items.append(enhanced_item)
    
    return enhanced_items

# ---------------- UPDATE RETURN ----------------
@router.put("/{return_id}")
def update_return(return_id: int, return_data: dict, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_edit())):
    """Update existing return"""
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        raise HTTPException(404, "Return not found")
    
    # Store old values for audit
    old_values = {
        "return_type": return_header.return_type,
        "vendor": return_header.vendor,
        "department": return_header.department,
        "location": return_header.location,
        "reference_no": return_header.reference_no,
        "reason": return_header.reason,
        "status": return_header.status,
        "customer_id": return_header.customer_id,
        "customer_name": return_header.customer_name,
        "customer_phone": return_header.customer_phone,
        "customer_email": return_header.customer_email
    }
    
    # Update return header fields
    return_header.return_type = return_data.get('return_type', return_header.return_type)
    return_header.vendor = return_data.get('supplier', return_header.vendor)
    return_header.department = return_data.get('to_location', return_header.department)  # Handle to_location
    return_header.location = return_data.get('location', return_header.location)
    return_header.reference_no = return_data.get('reference_no', return_header.reference_no)
    return_header.reason = return_data.get('reason', return_header.reason)
    
    # Handle customer info for customer-related returns
    if return_data.get('customer_id'):
        customer = db.query(Customer).filter(Customer.id == return_data.get('customer_id')).first()
        if customer:
            return_header.customer_id = customer.id
            if customer.customer_type == 'organization':
                return_header.customer_name = customer.org_name
                return_header.customer_phone = customer.org_mobile
            else:
                return_header.customer_name = customer.name
                return_header.customer_phone = customer.mobile
            return_header.customer_email = customer.email
            
            # For TO_CUSTOMER returns, also update vendor field
            if return_data.get('return_type') == 'TO_CUSTOMER':
                return_header.vendor = f"Customer: {return_header.customer_name}"
    
    # Delete existing return items
    existing_items = db.query(ReturnItem).filter(ReturnItem.return_id == return_id).all()
    for item in existing_items:
        db.delete(item)
    
    # Add new return items
    for item_data in return_data.get('items', []):
        if item_data.get('item_name') and item_data.get('quantity'):
            return_item = ReturnItem(
                return_id=return_header.id,
                item_name=item_data.get('item_name'),
                batch_no=item_data.get('batch_no'),
                qty=float(item_data.get('quantity', 0)),
                rate=float(item_data.get('rate', 0)),
                uom=item_data.get('uom', 'PCS'),
                condition=item_data.get('condition', 'GOOD'),
                remarks=item_data.get('reason', '')
            )
            db.add(return_item)
    
    db.commit()
    
    # Store new values for audit
    new_values = {
        "return_type": return_header.return_type,
        "vendor": return_header.vendor,
        "department": return_header.department,
        "location": return_header.location,
        "reference_no": return_header.reference_no,
        "reason": return_header.reason,
        "status": return_header.status,
        "customer_id": return_header.customer_id,
        "customer_name": return_header.customer_name,
        "customer_phone": return_header.customer_phone,
        "customer_email": return_header.customer_email
    }
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="return_headers",
        record_id=return_id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated return {return_header.return_no}",
        request=request
    )
    
    return {
        "message": "Return updated successfully",
        "return_number": return_header.return_no,
        "id": return_header.id
    }

# ---------------- UPDATE RETURN STATUS ----------------
@router.patch("/{return_id}/status")
def update_return_status(return_id: int, status: str, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_status_approve())):
    """Update return status and handle stock adjustments"""
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        raise HTTPException(404, "Return not found")
    
    old_status = return_header.status
    print(f"DEBUG: Updating return {return_id} from {old_status} to {status}")
    print(f"DEBUG: Return type: {return_header.return_type}")
    
    return_header.status = status
    
    # Handle stock adjustments when return is approved
    if status == "APPROVED" and old_status != "APPROVED":
        return_items = db.query(ReturnItem).filter(ReturnItem.return_id == return_id).all()
        
        for item in return_items:
            qty = float(item.qty)
            from models.tenant_models import GRN, GRNItem, Batch, GRNStatus
            
            if return_header.return_type == 'TO_CUSTOMER':
                # Reduce quantity from source location
                batch = db.query(Batch).join(GRNItem).join(GRN).filter(
                    Batch.batch_no == item.batch_no,
                    GRNItem.item_name == item.item_name,
                    GRN.status == GRNStatus.approved,
                    GRN.store == return_header.location
                ).first()
                
                if batch and batch.qty >= qty:
                    batch.qty -= qty
                    print(f"TO_CUSTOMER: Reduced {qty} from batch {item.batch_no} in {return_header.location}")
                    if batch.qty <= 0:
                        db.delete(batch)
                        
            elif return_header.return_type == 'INTERNAL':
                # Get from_location and to_location from return data
                from_location = return_header.location  # or get from return data
                to_location = return_header.department  # or get from return data
                
                # Reduce from source location
                from_batch = db.query(Batch).join(GRNItem).join(GRN).filter(
                    Batch.batch_no == item.batch_no,
                    GRNItem.item_name == item.item_name,
                    GRN.status == GRNStatus.approved,
                    GRN.store == from_location
                ).first()
                
                if from_batch and from_batch.qty >= qty:
                    from_batch.qty -= qty
                    print(f"INTERNAL: Reduced {qty} from {from_location}")
                    
                    # Add to destination location (create new batch or add to existing)
                    to_grn = db.query(GRN).filter(
                        GRN.store == to_location,
                        GRN.status == GRNStatus.approved
                    ).first()
                    
                    if to_grn:
                        to_grn_item = db.query(GRNItem).filter(
                            GRNItem.grn_id == to_grn.id,
                            GRNItem.item_name == item.item_name
                        ).first()
                        
                        if to_grn_item:
                            to_batch = db.query(Batch).filter(
                                Batch.grn_item_id == to_grn_item.id,
                                Batch.batch_no == item.batch_no
                            ).first()
                            
                            if to_batch:
                                to_batch.qty += qty
                            else:
                                # Create new batch in destination
                                new_batch = Batch(
                                    grn_item_id=to_grn_item.id,
                                    batch_no=item.batch_no,
                                    qty=qty,
                                    expiry_date=from_batch.expiry_date,
                                    mfg_date=from_batch.mfg_date
                                )
                                db.add(new_batch)
                    
                    print(f"INTERNAL: Added {qty} to {to_location}")
                    
            elif return_header.return_type == 'FROM_CUSTOMER':
                # Add quantity to location (customer returning items)
                batch = db.query(Batch).join(GRNItem).join(GRN).filter(
                    Batch.batch_no == item.batch_no,
                    GRNItem.item_name == item.item_name,
                    GRN.status == GRNStatus.approved,
                    GRN.store == return_header.location
                ).first()
                
                if batch:
                    batch.qty += qty
                    print(f"FROM_CUSTOMER: Added {qty} to batch {item.batch_no} in {return_header.location}")
                    
            elif return_header.return_type == 'EXTERNAL':
                # Reduce quantity from external location (no billing)
                batch = db.query(Batch).join(GRNItem).join(GRN).filter(
                    Batch.batch_no == item.batch_no,
                    GRNItem.item_name == item.item_name,
                    GRN.status == GRNStatus.approved,
                    GRN.store == return_header.location
                ).first()
                
                if batch and batch.qty >= qty:
                    batch.qty -= qty
                    print(f"EXTERNAL: Reduced {qty} from batch {item.batch_no} in {return_header.location}")
                    if batch.qty <= 0:
                        db.delete(batch)
                    
                    # Update StockOverview
                    from models.tenant_models import StockOverview
                    stock_overview = db.query(StockOverview).filter(
                        StockOverview.item_name == item.item_name,
                        StockOverview.batch_no == item.batch_no
                    ).first()
                    if stock_overview:
                        stock_overview.available_qty -= int(qty)
                        if stock_overview.available_qty <= 0:
                            db.delete(stock_overview)
                        print(f"EXTERNAL: Updated StockOverview for {item.item_name} batch {item.batch_no}")
    
    
    db.commit()
    print(f"DEBUG: Changes committed")
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="STATUS_UPDATE",
        table_name="return_headers",
        record_id=return_id,
        old_values={"status": old_status},
        new_values={"status": status},
        description=f"Updated return {return_header.return_no} status from {old_status} to {status}",
        request=request
    )
    
    return {"message": "Return status updated successfully"}

# ---------------- UPDATE RETURN ITEM ----------------
@router.put("/{return_id}/items/{item_id}")
def update_return_item(return_id: int, item_id: int, item_data: dict, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_edit())):
    """Update specific return item"""
    return_item = db.query(ReturnItem).filter(
        ReturnItem.return_id == return_id,
        ReturnItem.id == item_id
    ).first()
    
    if not return_item:
        raise HTTPException(404, "Return item not found")
    
    # Store old values for audit
    old_values = {
        "item_name": return_item.item_name,
        "batch_no": return_item.batch_no,
        "qty": float(return_item.qty),
        "returned_qty": float(return_item.returned_qty) if return_item.returned_qty else 0,
        "rate": float(return_item.rate) if return_item.rate else 0,
        "uom": return_item.uom,
        "condition": return_item.condition,
        "remarks": return_item.remarks
    }
    
    # Update return item
    return_item.item_name = item_data.get('item_name', return_item.item_name)
    return_item.batch_no = item_data.get('batch_no', return_item.batch_no)
    return_item.qty = float(item_data.get('qty', return_item.qty))
    if 'returned_qty' in item_data:
        return_item.returned_qty = float(item_data.get('returned_qty', 0))
    if 'rate' in item_data:
        return_item.rate = float(item_data.get('rate', 0))
    return_item.uom = item_data.get('uom', return_item.uom)
    return_item.condition = item_data.get('condition', return_item.condition)
    return_item.remarks = item_data.get('remarks', return_item.remarks)
    
    db.commit()
    
    # Store new values for audit
    new_values = {
        "item_name": return_item.item_name,
        "batch_no": return_item.batch_no,
        "qty": float(return_item.qty),
        "returned_qty": float(return_item.returned_qty) if return_item.returned_qty else 0,
        "rate": float(return_item.rate) if return_item.rate else 0,
        "uom": return_item.uom,
        "condition": return_item.condition,
        "remarks": return_item.remarks
    }
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="UPDATE_ITEM",
        table_name="return_items",
        record_id=return_item.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated return item {return_item.item_name} in return {return_id}",
        request=request
    )
    
    return {"message": "Return item updated successfully"}

# ---------------- ADD RETURN ITEM ----------------
@router.post("/{return_id}/items")
def add_return_item(return_id: int, item_data: dict, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_edit())):
    """Add new item to existing return"""
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        raise HTTPException(404, "Return not found")
    
    # Only allow adding items if status is DRAFT
    if return_header.status != "DRAFT":
        raise HTTPException(400, "Can only add items to returns with DRAFT status")
    
    # Create new return item
    return_item = ReturnItem(
        return_id=return_id,
        item_name=item_data.get('item_name'),
        batch_no=item_data.get('batch_no'),
        qty=float(item_data.get('quantity', 0)),
        rate=float(item_data.get('rate', 0)),
        uom=item_data.get('uom', 'PCS'),
        condition=item_data.get('condition', 'GOOD'),
        remarks=item_data.get('reason', '')
    )
    
    db.add(return_item)
    db.commit()
    db.refresh(return_item)
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="ADD_ITEM",
        table_name="return_items",
        record_id=return_item.id,
        new_values={
            "return_id": return_id,
            "item_name": return_item.item_name,
            "batch_no": return_item.batch_no,
            "qty": float(return_item.qty),
            "rate": float(return_item.rate) if return_item.rate else 0,
            "uom": return_item.uom,
            "condition": return_item.condition,
            "remarks": return_item.remarks
        },
        description=f"Added item {return_item.item_name} to return {return_id}",
        request=request
    )
    
    return {
        "message": "Return item added successfully",
        "item_id": return_item.id
    }

# ---------------- DELETE RETURN ITEM ----------------
@router.delete("/{return_id}/items/{item_id}")
def delete_return_item(return_id: int, item_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_delete())):
    """Delete specific return item"""
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        raise HTTPException(404, "Return not found")
    
    # Only allow deleting items if status is DRAFT
    if return_header.status != "DRAFT":
        raise HTTPException(400, "Can only delete items from returns with DRAFT status")
    
    return_item = db.query(ReturnItem).filter(
        ReturnItem.return_id == return_id,
        ReturnItem.id == item_id
    ).first()
    
    if not return_item:
        raise HTTPException(404, "Return item not found")
    
    # Store values for audit
    old_values = {
        "item_name": return_item.item_name,
        "batch_no": return_item.batch_no,
        "qty": float(return_item.qty),
        "rate": float(return_item.rate) if return_item.rate else 0,
        "uom": return_item.uom,
        "condition": return_item.condition,
        "remarks": return_item.remarks
    }
    
    db.delete(return_item)
    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="DELETE_ITEM",
        table_name="return_items",
        record_id=item_id,
        old_values=old_values,
        description=f"Deleted item {old_values['item_name']} from return {return_id}",
        request=request
    )
    
    return {"message": "Return item deleted successfully"}

# ---------------- DELETE RETURN ----------------
@router.delete("/{return_id}")
def delete_return(return_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_delete())):
    """Delete return (only if status is DRAFT)"""
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        raise HTTPException(404, "Return not found")
    
    # Only allow deletion if status is DRAFT
    if return_header.status != "DRAFT":
        raise HTTPException(400, "Can only delete returns with DRAFT status")
    
    # Store values for audit
    old_values = {
        "return_no": return_header.return_no,
        "return_type": return_header.return_type,
        "vendor": return_header.vendor,
        "location": return_header.location,
        "reason": return_header.reason,
        "status": return_header.status
    }
    
    # Delete return items first
    db.query(ReturnItem).filter(ReturnItem.return_id == return_id).delete()
    
    # Delete return header
    db.delete(return_header)
    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="return_headers",
        record_id=return_id,
        old_values=old_values,
        description=f"Deleted return {return_header.return_no}",
        request=request
    )
    
    return {"message": "Return deleted successfully"}

# ---------------- DISPOSAL ----------------
@router.post("/disposal")
def process_disposal(disposal_data: dict, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_create())):
    """Process item disposal"""
    transaction_no = f"DSP{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    disposal = DisposalTransaction(
        transaction_no=transaction_no,
        item_name=disposal_data.get('item_name'),
        batch_no=disposal_data.get('batch_no'),
        qty=float(disposal_data.get('qty', 0)),
        condition=disposal_data.get('condition', 'EXPIRED'),
        disposal_method=disposal_data.get('disposal_method', 'INCINERATION'),
        reason=disposal_data.get('reason'),
        transaction_date=date.today()
    )
    
    db.add(disposal)
    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="DISPOSAL",
        table_name="disposal_transactions",
        record_id=disposal.id,
        new_values={
            "transaction_no": transaction_no,
            "item_name": disposal.item_name,
            "batch_no": disposal.batch_no,
            "qty": disposal.qty,
            "disposal_method": disposal.disposal_method,
            "reason": disposal.reason
        },
        description=f"Processed disposal {transaction_no} for {disposal.item_name}",
        request=request
    )
    
    return {
        "message": "Disposal processed successfully",
        "transaction_no": transaction_no
    }

# ---------------- LIST DISPOSALS ----------------
@router.get("/disposals")
def list_disposals(db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_view())):
    """Get all disposal transactions"""
    disposals = db.query(DisposalTransaction).order_by(DisposalTransaction.created_at.desc()).all()
    return disposals

# ---------------- SALVAGE VALUATION ----------------
@router.post("/salvage")
def create_salvage_valuation(salvage_data: dict, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_create())):
    """Create salvage valuation"""
    salvage_no = f"SAL{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Calculate financial loss
    original_cost = float(salvage_data.get('original_cost', 0))
    scrap_value = float(salvage_data.get('scrap_value', 0))
    financial_loss = original_cost - scrap_value
    
    salvage = SalvageValuation(
        salvage_no=salvage_no,
        item_name=salvage_data.get('item_name'),
        condition=salvage_data.get('condition'),
        original_cost=original_cost,
        useful_life=float(salvage_data.get('useful_life', 0)),
        age_of_item=float(salvage_data.get('age_of_item', 0)),
        depreciation_method=salvage_data.get('depreciation_method', 'SLM'),
        current_book_value=float(salvage_data.get('current_book_value', 0)),
        scrap_value=scrap_value,
        financial_loss=financial_loss,
        remarks=salvage_data.get('remarks')
    )
    
    db.add(salvage)
    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="CREATE_SALVAGE",
        table_name="salvage_valuations",
        record_id=salvage.id,
        new_values={
            "salvage_no": salvage_no,
            "item_name": salvage.item_name,
            "original_cost": original_cost,
            "scrap_value": scrap_value,
            "financial_loss": financial_loss,
            "depreciation_method": salvage.depreciation_method
        },
        description=f"Created salvage valuation {salvage_no} for {salvage.item_name}",
        request=request
    )
    
    return {
        "message": "Salvage valuation created successfully",
        "salvage_no": salvage_no,
        "financial_loss": financial_loss
    }

# ---------------- LIST SALVAGE VALUATIONS ----------------
@router.get("/salvage")
def list_salvage_valuations(db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_view())):
    """Get all salvage valuations"""
    salvages = db.query(SalvageValuation).order_by(SalvageValuation.created_at.desc()).all()
    return salvages

# ---------------- GENERATE INVOICE & SEND EMAIL ----------------
@router.post("/generate-invoice")
def generate_invoice_and_send_email(data: dict, db: Session = Depends(get_db), current_user: dict = Depends(require_return_disposal_view())):
    """Generate invoice for customer return and send via email"""
    return_id = data.get('return_id')
    customer_id = data.get('customer_id')
    
    print(f"DEBUG: Looking for return_id: {return_id}, customer_id: {customer_id}")
    
    # Get return details
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        print(f"DEBUG: Return not found with ID: {return_id}")
        # Try to find the most recent return
        recent_return = db.query(ReturnHeader).order_by(ReturnHeader.created_at.desc()).first()
        if recent_return:
            print(f"DEBUG: Most recent return ID: {recent_return.id}")
        raise HTTPException(404, "Return not found")
    
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == return_id).all()
    
    # Get customer details
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    # Get customer email
    customer_email = customer.email
    if not customer_email:
        raise HTTPException(400, "Customer email not found")
    
    # Generate invoice content - pass the db session
    invoice_content = generate_invoice_html(return_header, return_items, customer, db)
    
    # Send email
    try:
        success = send_email(
            to_email=customer_email,
            subject=f"Return Invoice - {return_header.return_no}",
            body=invoice_content,
            is_html=True
        )
        
        if success:
            return {"message": "Invoice generated and sent successfully"}
        else:
            raise HTTPException(500, "Failed to send email")
    except Exception as e:
        raise HTTPException(500, f"Failed to send email: {str(e)}")

def generate_invoice_html(return_header, return_items, customer, db):
    """Generate HTML invoice content"""
    from models.tenant_models import Item
    from database import get_tenant_db
    
    customer_name = customer.org_name if customer.customer_type == 'organization' else customer.name
    customer_address = customer.org_address if customer.customer_type == 'organization' else customer.address
    
    items_html = ""
    total_amount = 0
    
    # Use the passed database session
    
    for item in return_items:
        # Get item details from Item table
        item_record = db.query(Item).filter(Item.name == item.item_name).first()
        mrp_price = float(item_record.mrp) if item_record and item_record.mrp else 100.0
        tax_rate = float(item_record.tax) if item_record and item_record.tax else 18.0
        
        # Get warranty info
        warranty_info = "N/A"
        if item_record and item_record.has_warranty:
            if item_record.warranty_start_date and item_record.warranty_end_date:
                warranty_info = f"{item_record.warranty_start_date} to {item_record.warranty_end_date}"
        
        item_total = item.qty * mrp_price
        tax_amount = item_total * (tax_rate / 100)
        total_amount += item_total + tax_amount
        
        items_html += f"""
        <tr>
            <td>{item.item_name}</td>
            <td>{item.batch_no or 'N/A'}</td>
            <td>{item.qty}</td>
            <td>₹{mrp_price:.2f}</td>
            <td>{warranty_info}</td>
            <td>₹{tax_amount:.2f} ({tax_rate}%)</td>
            <td>₹{item_total + tax_amount:.2f}</td>
        </tr>
        """
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif;">
        <h2>Return Invoice - {return_header.return_no}</h2>
        <p><strong>Date:</strong> {return_header.return_date}</p>
        <p><strong>Customer:</strong> {customer_name}</p>
        <p><strong>Address:</strong> {customer_address or 'N/A'}</p>
        
        <table border="1" style="border-collapse: collapse; width: 100%; margin-top: 20px;">
            <thead>
                <tr style="background-color: #f0f0f0;">
                    <th>Item</th>
                    <th>Batch No</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Warranty</th>
                    <th>Tax</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>
        
        <p style="margin-top: 20px;"><strong>Total Amount: ₹{total_amount:.2f}</strong></p>
        <p><strong>Reason:</strong> {return_header.reason}</p>
        
        <p style="margin-top: 30px;">Thank you for your business!</p>
    </body>
    </html>
    """
    
    # Database session is managed by the caller
    return html_content

# ---------------- TEST ENDPOINT ----------------
@router.get("/test-update/{return_id}")
def test_return_update(return_id: int, db: Session = Depends(get_db)):
    """Test endpoint to verify return update functionality"""
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        return {"error": "Return not found"}
    
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == return_id).all()
    
    return {
        "return_id": return_id,
        "return_no": return_header.return_no,
        "return_type": return_header.return_type,
        "location": return_header.location,
        "to_location": return_header.department,
        "vendor": return_header.vendor,
        "status": return_header.status,
        "items_count": len(return_items),
        "items": [{
            "id": item.id,
            "item_name": item.item_name,
            "batch_no": item.batch_no,
            "qty": float(item.qty),
            "rate": float(item.rate) if item.rate else 0
        } for item in return_items],
        "message": "Return found and can be updated using PUT /returns/{return_id}"
    }
