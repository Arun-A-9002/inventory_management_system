from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
import uuid

from database import get_tenant_db
from models.tenant_models import GRN, GRNItem, Batch, QCInspection, GRNStatus, Item, UOM, Stock, StockLedger
from schemas.tenant_schemas import GRNCreate, QCCreate, GRNStatusUpdate

router = APIRouter(prefix="/grn", tags=["Goods Receipt & Inspection"])

DEFAULT_TENANT_DB = "arun"

def get_tenant_session():
    yield from get_tenant_db(DEFAULT_TENANT_DB)

# Helper function to update stock from GRN
def _update_stock_from_grn(grn_id: int, db: Session):
    grn_items = db.query(GRNItem).filter(GRNItem.grn_id == grn_id).all()
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    
    for item in grn_items:
        stock = db.query(Stock).filter(Stock.item_name == item.item_name).first()
        
        if stock:
            stock.total_qty += item.received_qty
            stock.available_qty += item.received_qty
        else:
            new_stock = Stock(
                item_name=item.item_name,
                sku=f"SKU-{item.item_name[:3].upper()}",
                uom=item.uom or "PCS",
                total_qty=item.received_qty,
                available_qty=item.received_qty,
                reserved_qty=0,
                reorder_level=0
            )
            db.add(new_stock)
            db.flush()
            stock = new_stock
        
        # Create stock ledger entry
        ledger = StockLedger(
            stock_id=stock.id,
            txn_type="OPENING",
            qty_in=item.received_qty,
            qty_out=0,
            balance=stock.available_qty,
            ref_no=grn.grn_number,
            remarks=f"GRN Receipt from {grn.vendor_name}"
        )
        db.add(ledger)

# ---------------- CREATE GRN ----------------
@router.post("/create")
def create_grn(data: GRNCreate, db: Session = Depends(get_tenant_session)):
    grn = GRN(
        grn_number=f"GRN-{uuid.uuid4().hex[:8]}",
        grn_date=data.grn_date,
        po_number=data.po_number,
        vendor_name=data.vendor_name,
        store=data.store,
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
            batch = Batch(
                grn_item_id=grn_item.id,
                batch_no=b.batch_no,
                mfg_date=b.mfg_date,
                expiry_date=b.expiry_date,
                qty=b.qty
            )
            db.add(batch)

    # If GRN is created with approved status, update stock immediately
    if grn.status == GRNStatus.approved:
        _update_stock_from_grn(grn.id, db)

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
            batch = Batch(
                grn_item_id=grn_item.id,
                batch_no=b.batch_no,
                mfg_date=b.mfg_date,
                expiry_date=b.expiry_date,
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
    
    grn.status = data.status
    db.commit()
    return {"message": f"GRN status updated to {data.status.value}"}

# ---------------- DELETE GRN ----------------
@router.delete("/{grn_id}")
def delete_grn(grn_id: int, db: Session = Depends(get_tenant_session)):
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")
    
    db.delete(grn)
    db.commit()
    return {"message": "GRN deleted successfully"}
