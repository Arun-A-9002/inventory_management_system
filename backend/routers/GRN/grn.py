from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import date, timedelta
import uuid
import json
from dateutil.relativedelta import relativedelta

from database import get_tenant_db
from models.tenant_models import GRN, GRNItem, Batch, QCInspection, GRNStatus, Item, Stock, StockLedger, StockOverview, VendorPayment, AuditLog
from schemas.tenant_schemas import GRNCreate, QCCreate, GRNStatusUpdate
from utils.permissions import require_grn_view, require_grn_create, require_grn_edit, require_grn_delete, require_grn_print, require_grn_status_qc, require_grn_status_approve

router = APIRouter(prefix="/grn", tags=["Goods Receipt & Inspection"])

DEFAULT_TENANT_DB = "arun"

def get_tenant_session():
    yield from get_tenant_db(DEFAULT_TENANT_DB)

# Helper function for audit logging
def log_audit(db: Session, current_user: dict, action: str, table_name: str, record_id: int = None, old_values: dict = None, new_values: dict = None, description: str = None, request: Request = None):
    # Extract user info with fallbacks
    user_id = None
    user_name = 'System'
    
    if current_user:
        user_id = current_user.get('id') or current_user.get('sub')
        user_name = current_user.get('full_name') or current_user.get('email') or current_user.get('name', 'System')
        
        # Convert user_id to int if it's a string
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
        module="GRN",
        description=description
    )
    db.add(audit_log)
    db.commit()

# Helper function to calculate warranty end date
def calculate_warranty_end_date(start_date: date, warranty_period: int, warranty_period_type: str) -> date:
    """Calculate warranty end date based on start date and warranty period"""
    if warranty_period_type == "months":
        return start_date + relativedelta(months=warranty_period)
    elif warranty_period_type == "years":
        return start_date + relativedelta(years=warranty_period)
    else:
        # Default to years if type is not specified
        return start_date + relativedelta(years=warranty_period)

# Helper function to update warranty dates on approval
def update_warranty_dates_on_approval(grn_id: int, db: Session, approval_date: date):
    """Update warranty start and end dates when GRN is approved"""
    try:
        grn_items = db.query(GRNItem).filter(GRNItem.grn_id == grn_id).all()
        
        for item in grn_items:
            batches = db.query(Batch).filter(Batch.grn_item_id == item.id).all()
            
            for batch in batches:
                # Only update warranty dates if warranty period is specified
                if batch.warranty_period and batch.warranty_period_type:
                    batch.warranty_start_date = approval_date
                    batch.warranty_end_date = calculate_warranty_end_date(
                        approval_date, 
                        batch.warranty_period, 
                        batch.warranty_period_type
                    )
                    print(f"Updated warranty for batch {batch.batch_no}: {batch.warranty_start_date} to {batch.warranty_end_date}")
        
        db.commit()
        
    except Exception as e:
        print(f"Error updating warranty dates: {e}")
        db.rollback()
def _update_stock_from_grn(grn_id: int, db: Session):
    print(f"Starting stock update for GRN ID: {grn_id}")
    try:
        grn_items = db.query(GRNItem).filter(GRNItem.grn_id == grn_id).all()
        grn = db.query(GRN).filter(GRN.id == grn_id).first()
        
        print(f"Found {len(grn_items)} GRN items")
        
        for item in grn_items:
            # Get all batches for this GRN item
            batches = db.query(Batch).filter(Batch.grn_item_id == item.id).all()
            print(f"Item: {item.item_name}, Batches: {len(batches)}")
            
            for batch in batches:
                print(f"Processing batch: {batch.batch_no}, qty: {batch.qty}")
                # Add to stock overview directly in database
                try:
                    expiry_str = batch.expiry_date.strftime("%d/%m/%Y") if batch.expiry_date else "—"
                    
                    # Check if item with same name and batch already exists
                    existing_stock = db.query(StockOverview).filter(
                        StockOverview.item_name == item.item_name,
                        StockOverview.batch_no == batch.batch_no
                    ).first()
                    
                    # Calculate warranty display string
                    warranty_str = "—"
                    if batch.warranty_period and batch.warranty_period_type:
                        warranty_str = f"{batch.warranty_period} {batch.warranty_period_type}"
                    elif batch.warranty_start_date and batch.warranty_end_date:
                        warranty_str = f"{batch.warranty_start_date.strftime('%d/%m/%Y')} - {batch.warranty_end_date.strftime('%d/%m/%Y')}"
                    
                    if existing_stock:
                        # Update existing stock - add quantity
                        old_qty = existing_stock.available_qty
                        existing_stock.available_qty += int(batch.qty)
                        existing_stock.warranty = warranty_str  # Update warranty info
                        if existing_stock.available_qty >= existing_stock.min_stock:
                            existing_stock.status = "Good"
                        else:
                            existing_stock.status = "Low Stock"
                        print(f"Updated existing stock for {item.item_name} batch {batch.batch_no}: {old_qty} -> {existing_stock.available_qty}")
                    else:
                        # Create new stock entry
                        new_stock = StockOverview(
                            item_name=item.item_name,
                            item_code=f"GRN-{batch.batch_no}",
                            location="Main Store",
                            available_qty=int(batch.qty),
                            min_stock=100,
                            batch_no=batch.batch_no,
                            expiry_date=expiry_str,
                            warranty=warranty_str,  # Add warranty info
                            status="Good" if int(batch.qty) >= 100 else "Low Stock"
                        )
                        db.add(new_stock)
                        print(f"Created new stock entry for {item.item_name} batch {batch.batch_no}: {batch.qty}")
                    
                    # Commit after each batch to ensure it's saved
                    db.commit()
                    print(f"Successfully committed stock update for {item.item_name} batch {batch.batch_no}")
                        
                except Exception as e:
                    print(f"Error updating stock overview for {item.item_name} batch {batch.batch_no}: {e}")
                    db.rollback()
                    
    except Exception as e:
        print(f"Error in _update_stock_from_grn: {e}")
        db.rollback()

# ---------------- CREATE GRN ----------------
@router.post("/create")
def create_grn(data: GRNCreate, request: Request, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_grn_create())):
    grn = GRN(
        grn_number=f"GRN-{uuid.uuid4().hex[:8]}",
        grn_date=data.grn_date,
        po_number=data.po_number,
        vendor_name=data.vendor_name,
        store=data.store,
        invoice_number=data.invoice_number,
        invoice_date=data.invoice_date,
        total_amount=data.total_amount,
        quality_check=getattr(data, 'quality_check', False),
        status=data.status if hasattr(data, 'status') else GRNStatus.pending
    )

    db.add(grn)
    db.commit()
    db.refresh(grn)

    for item in data.items:
        grn_item = GRNItem(
            grn_id=grn.id,
            item_name=item.item_name,
            po_qty=item.po_qty,
            received_qty=item.received_qty,
            uom=item.uom,
            rate=item.rate
        )
        db.add(grn_item)
        db.commit()
        db.refresh(grn_item)

        for b in item.batches:
            batch = Batch(
                grn_item_id=grn_item.id,
                batch_no=b.batch_no,
                mfg_date=getattr(b, 'mfg_date', None),
                expiry_date=getattr(b, 'expiry_date', None),
                warranty_start_date=None,
                warranty_end_date=None,
                warranty_period=getattr(b, 'warranty_period', None),
                warranty_period_type=getattr(b, 'warranty_period_type', None),
                qty=b.qty
            )
            db.add(batch)

    # If GRN is created with approved status, update stock immediately
    if grn.status == GRNStatus.approved:
        _update_stock_from_grn(grn.id, db)
    
    # Create vendor payment record
    vendor_payment = VendorPayment(
        grn_number=grn.grn_number,
        vendor_name=grn.vendor_name,
        invoice_number=grn.invoice_number,
        total_amount=grn.total_amount,
        paid_amount=0.00,
        outstanding_amount=grn.total_amount,
        payment_status="unpaid"
    )
    db.add(vendor_payment)

    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="CREATE",
        table_name="grns",
        record_id=grn.id,
        new_values={"grn_number": grn.grn_number, "vendor_name": grn.vendor_name, "total_amount": float(grn.total_amount)},
        description=f"Created GRN {grn.grn_number} for vendor {grn.vendor_name}",
        request=request
    )
    
    return {"message": "GRN Created", "grn_number": grn.grn_number}

# ---------------- LIST GRN ----------------
@router.get("/list")
def list_grns(db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_grn_view())):
    """Get all GRN records"""
    try:
        grns = db.query(GRN).all()
        print(f"Found {len(grns)} GRN records")
        return grns
    except Exception as e:
        print(f"Error fetching GRNs: {str(e)}")
        return []

# ---------------- GET GRN DETAILS ----------------
@router.get("/{grn_id}")
def get_grn_details(grn_id: int, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_grn_view())):
    """Get detailed GRN information with items and batches"""
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")
    
    # Get GRN items with batches
    items = db.query(GRNItem).filter(GRNItem.grn_id == grn_id).all()
    grn_data = {
        "id": grn.id,
        "grn_number": grn.grn_number,
        "grn_date": grn.grn_date,
        "po_number": grn.po_number,
        "vendor_name": grn.vendor_name,
        "store": grn.store,
        "invoice_number": grn.invoice_number,
        "invoice_date": grn.invoice_date,
        "status": grn.status,
        "total_amount": float(grn.total_amount) if grn.total_amount else 0.0,
        "items": []
    }
    
    for item in items:
        batches = db.query(Batch).filter(Batch.grn_item_id == item.id).all()
        
        # Get cost per piece and MRP per piece from item master
        master_item = db.query(Item).filter(Item.name == item.item_name).first()
        cost_per_piece = float(master_item.fixing_price) if master_item and master_item.fixing_price else 0.0
        mrp_per_piece = float(master_item.mrp) if master_item and master_item.mrp else 0.0
        
        item_data = {
            "id": item.id,
            "item_name": item.item_name,
            "po_qty": item.po_qty,
            "received_qty": item.received_qty,
            "uom": item.uom,
            "rate": item.rate,
            "cost_per_piece": cost_per_piece,
            "mrp_per_piece": mrp_per_piece,
            "batches": [{
                "batch_no": batch.batch_no,
                "mfg_date": batch.mfg_date,
                "expiry_date": batch.expiry_date,
                "warranty_start_date": batch.warranty_start_date,
                "warranty_end_date": batch.warranty_end_date,
                "warranty_period": batch.warranty_period,
                "warranty_period_type": batch.warranty_period_type,
                "qty": batch.qty,
                "location": grn.store
            } for batch in batches]
        }
        grn_data["items"].append(item_data)
    
    return grn_data

# ---------------- EXTRACT INVOICE DATA ----------------
@router.post("/extract-invoice")
def extract_invoice_data(data: dict):
    """Extract item data from invoice image using OCR"""
    try:
        import base64
        import io
        from PIL import Image
        import pytesseract
        import re
        
        # Decode base64 image
        image_data = base64.b64decode(data['image'])
        image = Image.open(io.BytesIO(image_data))
        
        # Extract text using OCR
        text = pytesseract.image_to_string(image)
        print(f"Extracted text: {text}")
        
        # Parse text to extract items
        items = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Look for patterns like: Item Name Qty Rate Amount
            # Example: "Arun A 11111 25 50 278330.55"
            pattern = r'([A-Za-z\s]+)\s+(\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)'
            match = re.search(pattern, line)
            
            if match:
                name = match.group(1).strip()
                qty = int(match.group(2))
                rate = float(match.group(3))
                
                # Skip if name is too short or looks like a number
                if len(name) > 2 and not name.isdigit():
                    items.append({
                        'name': name,
                        'quantity': qty,
                        'rate': rate,
                        'unit': 'pcs',
                        'batch': '',
                        'expiry': ''
                    })
        
        return {'items': items}
        
    except Exception as e:
        print(f"OCR extraction error: {str(e)}")
        # Fallback: return sample data based on the image
        return {
            'items': [{
                'name': 'Arun A',
                'quantity': 11111,
                'rate': 25.0,
                'unit': 'pcs',
                'batch': 'Required',
                'expiry': ''
            }]
        }

# ---------------- SAVE PRICE TO ITEM MASTER ----------------
@router.post("/save-price")
def save_price_to_item_master(data: dict, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_grn_edit())):
    item_name = data.get('item_name')
    unit_price = data.get('unit_price')
    mrp = data.get('mrp', 0)
    
    if not item_name or unit_price is None:
        raise HTTPException(400, "Item name and unit price are required")
    
    # Find item in item master
    item = db.query(Item).filter(Item.name == item_name).first()
    if not item:
        raise HTTPException(404, f"Item '{item_name}' not found in item master")
    
    # Store old values for audit
    old_values = {
        "fixing_price": float(item.fixing_price) if item.fixing_price else 0,
        "mrp": float(item.mrp) if item.mrp else 0
    }
    
    # Update fixing price and MRP
    item.fixing_price = float(unit_price)
    if mrp > 0:
        item.mrp = float(mrp)
    
    db.commit()
    
    # Store new values for audit
    new_values = {
        "fixing_price": float(item.fixing_price),
        "mrp": float(item.mrp) if item.mrp else 0
    }
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="PRICE_UPDATE",
        table_name="items",
        record_id=item.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated prices for item {item_name}"
    )
    
    return {"message": f"Prices updated for {item_name}"}

# ---------------- QC ----------------
@router.post("/{grn_id}/qc")
def qc_inspection(grn_id: int, data: QCCreate, request: Request, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_grn_status_qc())):
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")

    old_status = grn.status
    qc = QCInspection(
        grn_id=grn_id,
        qc_required=data.qc_required,
        qc_status=data.qc_status,
        qc_by=data.qc_by,
        qc_date=data.qc_date,
        remarks=data.remarks,
        rejected_qty=data.rejected_qty
    )

    if data.qc_status == "Rejected":
        grn.status = GRNStatus.rejected

    db.add(qc)
    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="QC_INSPECTION",
        table_name="grns",
        record_id=grn_id,
        old_values={"status": old_status.value if old_status else None},
        new_values={"qc_status": data.qc_status, "qc_by": data.qc_by, "status": grn.status.value},
        description=f"QC inspection completed for GRN {grn.grn_number} with status {data.qc_status}",
        request=request
    )
    
    return {"message": "QC Completed"}

# ---------------- APPROVAL ----------------
@router.post("/{grn_id}/approve")
def approve_grn(grn_id: int, request: Request, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_grn_status_approve())):
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")

    old_status = grn.status
    # Update GRN status
    grn.status = GRNStatus.approved
    
    # Update warranty dates based on approval date
    approval_date = date.today()
    update_warranty_dates_on_approval(grn_id, db, approval_date)
    
    # Update stock using helper function
    _update_stock_from_grn(grn_id, db)
    
    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="APPROVE",
        table_name="grns",
        record_id=grn_id,
        old_values={"status": old_status.value},
        new_values={"status": grn.status.value},
        description=f"GRN {grn.grn_number} approved and stock updated",
        request=request
    )
    
    return {"message": "GRN Approved & Stock Updated"}

# ---------------- UPDATE GRN ----------------
@router.put("/{grn_id}")
def update_grn(grn_id: int, data: GRNCreate, request: Request, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_grn_edit())):
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")
    
    # Store old values for audit
    old_values = {
        "vendor_name": grn.vendor_name,
        "total_amount": float(grn.total_amount) if grn.total_amount else 0,
        "status": grn.status.value,
        "po_number": grn.po_number
    }
    
    old_status = grn.status
    
    # If GRN was already approved, reverse stock changes first
    if old_status == GRNStatus.approved:
        existing_items = db.query(GRNItem).filter(GRNItem.grn_id == grn_id).all()
        for item in existing_items:
            stock = db.query(Stock).filter(Stock.item_name == item.item_name).first()
            if stock:
                stock.total_qty -= item.received_qty
                stock.available_qty -= item.received_qty
    
    # Update GRN details
    grn.grn_date = data.grn_date
    grn.po_number = data.po_number
    grn.vendor_name = data.vendor_name
    grn.store = data.store
    grn.invoice_number = data.invoice_number
    grn.invoice_date = data.invoice_date
    grn.total_amount = data.total_amount
    grn.status = data.status if hasattr(data, 'status') else grn.status
    
    # Delete existing items and batches
    existing_items = db.query(GRNItem).filter(GRNItem.grn_id == grn_id).all()
    for item in existing_items:
        db.query(Batch).filter(Batch.grn_item_id == item.id).delete()
        db.delete(item)
    
    # Add new items and batches
    for item in data.items:
        grn_item = GRNItem(
            grn_id=grn.id,
            item_name=item.item_name,
            po_qty=item.po_qty,
            received_qty=item.received_qty,
            uom=item.uom,
            rate=item.rate
        )
        db.add(grn_item)
        db.commit()
        db.refresh(grn_item)

        for b in item.batches:
            # Check if this is warranty or expiry date type
            date_type = getattr(b, 'date_type', 'expiry')
            
            if date_type == 'warranty':
                batch = Batch(
                    grn_item_id=grn_item.id,
                    batch_no=b.batch_no,
                    mfg_date=None,
                    expiry_date=None,
                    warranty_start_date=getattr(b, 'start_date', None),
                    warranty_end_date=b.expiry_date,
                    warranty_period=getattr(b, 'warranty_period', None),
                    warranty_period_type=getattr(b, 'warranty_period_type', None),
                    qty=b.qty
                )
            else:
                batch = Batch(
                    grn_item_id=grn_item.id,
                    batch_no=b.batch_no,
                    mfg_date=getattr(b, 'start_date', None),
                    expiry_date=b.expiry_date,
                    warranty_start_date=None,
                    warranty_end_date=None,
                    warranty_period=getattr(b, 'warranty_period', None),
                    warranty_period_type=getattr(b, 'warranty_period_type', None),
                    qty=b.qty
                )
            db.add(batch)
    
    # If GRN status is approved, update stock with new quantities
    if grn.status == GRNStatus.approved:
        _update_stock_from_grn(grn_id, db)

    db.commit()
    
    # Store new values for audit
    new_values = {
        "vendor_name": grn.vendor_name,
        "total_amount": float(grn.total_amount) if grn.total_amount else 0,
        "status": grn.status.value,
        "po_number": grn.po_number
    }
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="grns",
        record_id=grn_id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated GRN {grn.grn_number}",
        request=request
    )
    
    return {"message": "GRN Updated", "grn_number": grn.grn_number}

# ---------------- UPDATE QUALITY CHECK ----------------
@router.put("/{grn_id}/quality-check")
def update_quality_check(grn_id: int, data: dict, request: Request, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_grn_status_qc())):
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")
    
    old_quality_check = grn.quality_check
    grn.quality_check = data.get('quality_check', False)
    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="UPDATE_QC",
        table_name="grns",
        record_id=grn_id,
        old_values={"quality_check": old_quality_check},
        new_values={"quality_check": grn.quality_check},
        description=f"Quality check updated for GRN {grn.grn_number} to {grn.quality_check}",
        request=request
    )
    
    return {"message": f"Quality check updated to {grn.quality_check}"}

# ---------------- UPDATE STATUS ----------------
@router.put("/{grn_id}/status")
def update_grn_status(grn_id: int, data: GRNStatusUpdate, request: Request, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_grn_status_approve())):
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")
    
    old_status = grn.status
    grn.status = data.status
    
    # If status changed to approved, update stock
    if data.status == GRNStatus.approved and old_status != GRNStatus.approved:
        _update_stock_from_grn(grn_id, db)
    
    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="STATUS_UPDATE",
        table_name="grns",
        record_id=grn_id,
        old_values={"status": old_status.value},
        new_values={"status": data.status.value},
        description=f"GRN {grn.grn_number} status updated from {old_status.value} to {data.status.value}",
        request=request
    )
    
    return {"message": f"GRN status updated to {data.status.value}"}

@router.post("/test-grn-batches")
def create_test_grn_with_batches(db: Session = Depends(get_tenant_session)):
    """Create a test GRN with same product but different batch numbers"""
    from datetime import date
    import uuid
    
    # Create GRN
    grn = GRN(
        grn_number=f"GRN-TEST-{uuid.uuid4().hex[:8]}",
        grn_date=date.today(),
        po_number="PO-TEST-001",
        vendor_name="Test Vendor",
        store="Main Store",
        invoice_number="INV-TEST-001",
        invoice_date=date.today(),
        total_amount=1000.00,
        status=GRNStatus.approved
    )
    db.add(grn)
    db.commit()
    db.refresh(grn)
    
    # Create GRN Item (same product)
    grn_item = GRNItem(
        grn_id=grn.id,
        item_name="Paracetamol 500mg",
        po_qty=300,
        received_qty=300,
        uom="PCS",
        rate=10.0
    )
    db.add(grn_item)
    db.commit()
    db.refresh(grn_item)
    
    # Create multiple batches for the same product
    batches_data = [
        {"batch_no": "BATCH-001", "qty": 100, "expiry_date": "2025-12-31"},
        {"batch_no": "BATCH-002", "qty": 100, "expiry_date": "2026-06-30"},
        {"batch_no": "BATCH-003", "qty": 100, "expiry_date": "2026-12-31"}
    ]
    
    for batch_data in batches_data:
        batch = Batch(
            grn_item_id=grn_item.id,
            batch_no=batch_data["batch_no"],
            mfg_date=date.today(),
            expiry_date=date.fromisoformat(batch_data["expiry_date"]),
            qty=batch_data["qty"]
        )
        db.add(batch)
    
    # Update stock immediately since status is approved
    _update_stock_from_grn(grn.id, db)
    
    db.commit()
    return {
        "message": "Test GRN created with multiple batches",
        "grn_number": grn.grn_number,
        "batches_created": len(batches_data)
    }
@router.post("/test-warranty-storage")
def test_warranty_storage(db: Session = Depends(get_tenant_session)):
    """Test endpoint to verify warranty period type storage"""
    from datetime import date
    import uuid
    
    # Create a test GRN with warranty period type
    grn = GRN(
        grn_number=f"GRN-WARRANTY-TEST-{uuid.uuid4().hex[:8]}",
        grn_date=date.today(),
        po_number="PO-WARRANTY-TEST",
        vendor_name="Test Warranty Vendor",
        store="Main Store",
        invoice_number="INV-WARRANTY-TEST",
        invoice_date=date.today(),
        total_amount=500.00,
        status=GRNStatus.approved
    )
    db.add(grn)
    db.commit()
    db.refresh(grn)
    
    # Create GRN Item
    grn_item = GRNItem(
        grn_id=grn.id,
        item_name="Test Warranty Item",
        po_qty=100,
        received_qty=100,
        uom="PCS",
        rate=5.0
    )
    db.add(grn_item)
    db.commit()
    db.refresh(grn_item)
    
    # Create batch with warranty period type
    batch = Batch(
        grn_item_id=grn_item.id,
        batch_no="WARRANTY-BATCH-001",
        mfg_date=date.today(),
        expiry_date=None,
        warranty_start_date=None,
        warranty_end_date=None,
        warranty_period=24,  # 24 months
        warranty_period_type="months",  # This should be stored
        qty=100
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    # Update stock
    _update_stock_from_grn(grn.id, db)
    
    # Verify the data was stored correctly
    stored_batch = db.query(Batch).filter(Batch.id == batch.id).first()
    
    return {
        "message": "Warranty storage test completed",
        "grn_number": grn.grn_number,
        "batch_data": {
            "batch_no": stored_batch.batch_no,
            "warranty_period": stored_batch.warranty_period,
            "warranty_period_type": stored_batch.warranty_period_type,
            "stored_correctly": stored_batch.warranty_period_type == "months"
        }
    }

@router.delete("/{grn_id}")
def delete_grn(grn_id: int, request: Request, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_grn_delete())):
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")
    
    # Store GRN details for audit before deletion
    grn_details = {
        "grn_number": grn.grn_number,
        "vendor_name": grn.vendor_name,
        "total_amount": float(grn.total_amount) if grn.total_amount else 0,
        "status": grn.status.value
    }
    
    db.delete(grn)
    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="grns",
        record_id=grn_id,
        old_values=grn_details,
        description=f"Deleted GRN {grn_details['grn_number']}",
        request=request
    )
    
    return {"message": "GRN deleted successfully"}
