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

@router.get("/")
def list_returns(db: Session = Depends(get_tenant_db)):
    """Get all returns with proper location data"""
    returns = db.query(ReturnHeader).order_by(ReturnHeader.created_at.desc()).all()
    
    # Convert to dict to ensure location field is included
    return_list = []
    for return_item in returns:
        return_dict = {
            "id": return_item.id,
            "return_no": return_item.return_no,
            "return_type": return_item.return_type,
            "vendor": return_item.vendor,
            "location": return_item.location,  # Ensure location is included
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
def create_return(return_data: dict, db: Session = Depends(get_tenant_db)):
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
        location=return_data.get('location'),
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
def get_return_details(return_id: int, db: Session = Depends(get_tenant_db)):
    """Get return details with items"""
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        raise HTTPException(404, "Return not found")
    
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == return_id).all()
    
    return {
        "header": return_header,
        "items": return_items
    }

@router.get("/{return_id}/items")
def get_return_items(return_id: int, db: Session = Depends(get_tenant_db)):
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

# ---------------- UPDATE RETURN STATUS ----------------
@router.patch("/{return_id}/status")
def update_return_status(return_id: int, status: str, db: Session = Depends(get_tenant_db)):
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
    
    
    db.commit()
    print(f"DEBUG: Changes committed")
    
    return {"message": "Return status updated successfully"}

# ---------------- DISPOSAL ----------------
@router.post("/disposal")
def process_disposal(disposal_data: dict, db: Session = Depends(get_tenant_db)):
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
def list_disposals(db: Session = Depends(get_tenant_db)):
    """Get all disposal transactions"""
    disposals = db.query(DisposalTransaction).order_by(DisposalTransaction.created_at.desc()).all()
    return disposals

# ---------------- SALVAGE VALUATION ----------------
@router.post("/salvage")
def create_salvage_valuation(salvage_data: dict, db: Session = Depends(get_tenant_db)):
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
def list_salvage_valuations(db: Session = Depends(get_tenant_db)):
    """Get all salvage valuations"""
    salvages = db.query(SalvageValuation).order_by(SalvageValuation.created_at.desc()).all()
    return salvages

# ---------------- GENERATE INVOICE & SEND EMAIL ----------------
@router.post("/generate-invoice")
def generate_invoice_and_send_email(data: dict, db: Session = Depends(get_tenant_db)):
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
    
    db.close()  # Close database connection
    return html_content
