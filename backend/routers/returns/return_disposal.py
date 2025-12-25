from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date, datetime
from database import get_tenant_db
from models.tenant_models import (
    ReturnHeader, ReturnItem, Customer,
    DisposalTransaction, SalvageValuation,
    ReturnTypeEnum, ItemConditionEnum, DisposalMethodEnum
)
from utils.email import send_email
from typing import List, Optional

router = APIRouter(prefix="/returns", tags=["Return & Disposal"])
DEFAULT_DB = "arun"

def get_db():
    yield from get_tenant_db(DEFAULT_DB)

# ---------------- LIST RETURNS ----------------
@router.get("/")
def list_returns(db: Session = Depends(get_db)):
    """Get all returns"""
    # Add location column if it doesn't exist
    try:
        db.execute(text("ALTER TABLE return_headers ADD COLUMN location VARCHAR(150) NULL AFTER department"))
        db.commit()
    except:
        pass  # Column already exists
    
    # Ensure return_type column exists and is properly set
    try:
        db.execute(text("ALTER TABLE return_headers MODIFY COLUMN return_type ENUM('TO_VENDOR', 'FROM_DEPARTMENT', 'TO_CUSTOMER') NOT NULL DEFAULT 'TO_VENDOR'"))
        db.commit()
    except Exception as e:
        print(f"DEBUG: Failed to update enum: {e}")
        pass  # Column already exists
    
    returns = db.query(ReturnHeader).order_by(ReturnHeader.created_at.desc()).all()
    return returns

# ---------------- CREATE RETURN ----------------
@router.post("/")
def create_return(return_data: dict, db: Session = Depends(get_db)):
    """Create new return"""
    # Generate return number
    return_no = f"RTN{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    print(f"DEBUG: Form data received: {return_data}")
    print(f"DEBUG: Location value: {return_data.get('location')}")
    
    # Create return header
    return_type_value = return_data.get('return_type', 'TO_VENDOR')
    print(f"DEBUG: Creating return with type: {return_type_value}")
    
    return_header = ReturnHeader(
        return_no=return_no,
        return_type=return_type_value,
        vendor=return_data.get('supplier'),
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
    
    return {
        "message": "Return created successfully",
        "return_number": return_no,
        "id": return_header.id
    }

# ---------------- GET RETURN DETAILS ----------------
@router.get("/{return_id}")
def get_return_details(return_id: int, db: Session = Depends(get_db)):
    """Get return details with items"""
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        raise HTTPException(404, "Return not found")
    
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == return_id).all()
    
    return {
        "header": return_header,
        "items": return_items
    }

# ---------------- UPDATE RETURN STATUS ----------------
@router.patch("/{return_id}/status")
def update_return_status(return_id: int, status: str, db: Session = Depends(get_db)):
    """Update return status and handle stock adjustments"""
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        raise HTTPException(404, "Return not found")
    
    old_status = return_header.status
    print(f"DEBUG: Updating return {return_id} from {old_status} to {status}")
    print(f"DEBUG: Return type: {return_header.return_type}")
    
    return_header.status = status
    
    # Handle stock reduction when return is approved
    if status == "APPROVED" and old_status != "APPROVED":
        print(f"DEBUG: Processing stock reduction for approved return")
        return_items = db.query(ReturnItem).filter(ReturnItem.return_id == return_id).all()
        print(f"DEBUG: Found {len(return_items)} return items")
        
        for item in return_items:
            print(f"DEBUG: Processing item: {item.item_name}, qty: {item.qty}")
            # Find and update stock
            from models.tenant_models import Stock, StockLedger
            stock = db.query(Stock).filter(Stock.item_name == item.item_name).first()
            
            if stock:
                print(f"DEBUG: Found stock record, current qty: {stock.available_qty}")
                qty = float(item.qty)
                
                if return_header.return_type == 'TO_CUSTOMER':
                    print(f"DEBUG: Reducing stock for TO_CUSTOMER return")
                    # Reduce stock when returning to customer (approved)
                    stock.available_qty -= qty
                    stock.total_qty -= qty
                    print(f"DEBUG: New stock qty: {stock.available_qty}")
                    
                    # Also reduce from batch quantities
                    from models.tenant_models import GRN, GRNItem, Batch, GRNStatus
                    if item.batch_no:
                        batch = db.query(Batch).filter(
                            Batch.batch_no == item.batch_no
                        ).first()
                        if batch and batch.qty >= qty:
                            batch.qty -= qty
                            print(f"DEBUG: Reduced batch {item.batch_no} by {qty}")
                    
                    # Create ledger entry
                    ledger = StockLedger(
                        stock_id=stock.id,
                        batch_no=item.batch_no,
                        txn_type="RETURN_OUT",
                        qty_out=qty,
                        balance=stock.available_qty,
                        ref_no=return_header.return_no,
                        remarks=f"Return to customer approved: {return_header.return_no}"
                    )
                    db.add(ledger)
                    print(f"DEBUG: Added ledger entry")
                else:
                    print(f"DEBUG: Not a TO_CUSTOMER return, skipping stock reduction")
            else:
                print(f"DEBUG: No stock record found for item: {item.item_name}")
    else:
        print(f"DEBUG: Not processing stock reduction - status: {status}, old_status: {old_status}")
    
    db.commit()
    print(f"DEBUG: Changes committed")
    
    return {"message": "Return status updated successfully"}

# ---------------- DISPOSAL ----------------
@router.post("/disposal")
def process_disposal(disposal_data: dict, db: Session = Depends(get_db)):
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
    
    return {
        "message": "Disposal processed successfully",
        "transaction_no": transaction_no
    }

# ---------------- LIST DISPOSALS ----------------
@router.get("/disposals")
def list_disposals(db: Session = Depends(get_db)):
    """Get all disposal transactions"""
    disposals = db.query(DisposalTransaction).order_by(DisposalTransaction.created_at.desc()).all()
    return disposals

# ---------------- SALVAGE VALUATION ----------------
@router.post("/salvage")
def create_salvage_valuation(salvage_data: dict, db: Session = Depends(get_db)):
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
    
    return {
        "message": "Salvage valuation created successfully",
        "salvage_no": salvage_no,
        "financial_loss": financial_loss
    }

# ---------------- LIST SALVAGE VALUATIONS ----------------
@router.get("/salvage")
def list_salvage_valuations(db: Session = Depends(get_db)):
    """Get all salvage valuations"""
    salvages = db.query(SalvageValuation).order_by(SalvageValuation.created_at.desc()).all()
    return salvages

# ---------------- GENERATE INVOICE & SEND EMAIL ----------------
@router.post("/generate-invoice")
def generate_invoice_and_send_email(data: dict, db: Session = Depends(get_db)):
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
    
    # Generate invoice content
    invoice_content = generate_invoice_html(return_header, return_items, customer)
    
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

def generate_invoice_html(return_header, return_items, customer):
    """Generate HTML invoice content"""
    from models.tenant_models import Item
    from database import get_tenant_db
    
    customer_name = customer.org_name if customer.customer_type == 'organization' else customer.name
    customer_address = customer.org_address if customer.customer_type == 'organization' else customer.address
    
    items_html = ""
    total_amount = 0
    
    # Get database session to fetch item MRP
    db_gen = get_tenant_db("arun")
    db = next(db_gen)
    
    for item in return_items:
        # Get item MRP from Item table
        item_record = db.query(Item).filter(Item.name == item.item_name).first()
        mrp_price = float(item_record.mrp) if item_record and item_record.mrp else 100.0
        
        item_total = item.qty * mrp_price
        total_amount += item_total
        items_html += f"""
        <tr>
            <td>{item.item_name}</td>
            <td>{item.batch_no or 'N/A'}</td>
            <td>{item.qty}</td>
            <td>₹{mrp_price:.2f}</td>
            <td>₹{item_total:.2f}</td>
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
                    <th>Batch</th>
                    <th>Quantity</th>
                    <th>Rate</th>
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
    
    db.close()  # Close database connection
    return html_content
