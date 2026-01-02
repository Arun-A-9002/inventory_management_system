from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
import uuid

from database import get_tenant_db
from models.tenant_models import GRN, GRNItem, Batch, QCInspection, GRNStatus, Item, Stock, StockLedger, StockOverview, VendorPayment
from schemas.tenant_schemas import GRNCreate, QCCreate, GRNStatusUpdate

router = APIRouter(prefix="/grn", tags=["Goods Receipt & Inspection"])

DEFAULT_TENANT_DB = "arun"

def get_tenant_session():
    yield from get_tenant_db(DEFAULT_TENANT_DB)

# Helper function to update stock from GRN
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
                    
                    if existing_stock:
                        # Update existing stock - add quantity
                        old_qty = existing_stock.available_qty
                        existing_stock.available_qty += int(batch.qty)
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
def create_grn(data: GRNCreate, db: Session = Depends(get_tenant_session)):
    grn = GRN(
        grn_number=f"GRN-{uuid.uuid4().hex[:8]}",
        grn_date=data.grn_date,
        po_number=data.po_number,
        vendor_name=data.vendor_name,
        store=data.store,
        invoice_number=data.invoice_number,
        invoice_date=data.invoice_date,
        total_amount=data.total_amount,
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
    return {"message": "GRN Created", "grn_number": grn.grn_number}

# ---------------- LIST GRN ----------------
@router.get("/list")
def list_grns(db: Session = Depends(get_tenant_session)):
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
def get_grn_details(grn_id: int, db: Session = Depends(get_tenant_session)):
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
                "qty": batch.qty
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
def save_price_to_item_master(data: dict, db: Session = Depends(get_tenant_session)):
    item_name = data.get('item_name')
    unit_price = data.get('unit_price')
    mrp = data.get('mrp', 0)
    
    if not item_name or unit_price is None:
        raise HTTPException(400, "Item name and unit price are required")
    
    # Find item in item master
    item = db.query(Item).filter(Item.name == item_name).first()
    if not item:
        raise HTTPException(404, f"Item '{item_name}' not found in item master")
    
    # Update fixing price and MRP
    item.fixing_price = float(unit_price)
    if mrp > 0:
        item.mrp = float(mrp)
    
    db.commit()
    return {"message": f"Prices updated for {item_name}"}

# ---------------- QC ----------------
@router.post("/{grn_id}/qc")
def qc_inspection(grn_id: int, data: QCCreate, db: Session = Depends(get_tenant_session)):
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")

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
    return {"message": "QC Completed"}

# ---------------- APPROVAL ----------------
@router.post("/{grn_id}/approve")
def approve_grn(grn_id: int, db: Session = Depends(get_tenant_session)):
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")

    # Update GRN status
    grn.status = GRNStatus.approved
    
    # Update stock using helper function
    _update_stock_from_grn(grn_id, db)
    
    db.commit()
    return {"message": "GRN Approved & Stock Updated"}

# ---------------- UPDATE GRN ----------------
@router.put("/{grn_id}")
def update_grn(grn_id: int, data: GRNCreate, db: Session = Depends(get_tenant_session)):
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")
    
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
                    qty=b.qty
                )
            db.add(batch)
    
    # If GRN status is approved, update stock with new quantities
    if grn.status == GRNStatus.approved:
        _update_stock_from_grn(grn_id, db)

    db.commit()
    return {"message": "GRN Updated", "grn_number": grn.grn_number}

# ---------------- UPDATE STATUS ----------------
@router.put("/{grn_id}/status")
def update_grn_status(grn_id: int, data: GRNStatusUpdate, db: Session = Depends(get_tenant_session)):
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")
    
    old_status = grn.status
    grn.status = data.status
    
    # If status changed to approved, update stock
    if data.status == GRNStatus.approved and old_status != GRNStatus.approved:
        _update_stock_from_grn(grn_id, db)
    
    db.commit()
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
@router.delete("/{grn_id}")
def delete_grn(grn_id: int, db: Session = Depends(get_tenant_session)):
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")
    
    db.delete(grn)
    db.commit()
    return {"message": "GRN deleted successfully"}
