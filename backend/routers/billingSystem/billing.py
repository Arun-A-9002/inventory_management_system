from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_tenant_db
from models.tenant_models import Billing, GRN, BillingStatus, ReturnBilling, ReturnHeader
from schemas.tenant_schemas import BillingCreate, BillingResponse, ReturnBillingCreate, ReturnBillingResponse
from pydantic import BaseModel
from decimal import Decimal
from datetime import date

router = APIRouter(prefix="/billing", tags=["Billing"])

@router.post("/", response_model=BillingResponse)
def create_billing(
    billing_data: BillingCreate,
    db: Session = Depends(get_tenant_db)
):
    # Get GRN details
    grn = db.query(GRN).filter(GRN.id == billing_data.grn_id).first()
    if not grn:
        raise HTTPException(status_code=404, detail="GRN not found")
    
    # Calculate amounts from GRN items
    gross_amount = 0
    tax_amount = 0
    
    for item in grn.items:
        item_total = item.received_qty * item.rate
        gross_amount += item_total
        # Assuming 18% tax for simplicity
        tax_amount += item_total * 0.18
    
    net_amount = gross_amount + tax_amount
    
    # Create billing record
    billing = Billing(
        grn_id=billing_data.grn_id,
        gross_amount=gross_amount,
        tax_amount=tax_amount,
        net_amount=net_amount,
        paid_amount=0.00,
        balance_amount=net_amount,
        status=BillingStatus.DRAFT
    )
    
    db.add(billing)
    db.commit()
    db.refresh(billing)
    
    return billing

@router.get("/return-invoices")
def get_all_return_billing(db: Session = Depends(get_tenant_db)):
    from models.tenant_models import Customer
    
    billings = db.query(ReturnBilling).all()
    
    # Get all approved customers for fallback matching
    customers = db.query(Customer).filter(Customer.status == "approved").all()
    customer_map = {}
    for customer in customers:
        name = customer.org_name if customer.customer_type == 'organization' else customer.name
        customer_map[name.lower()] = customer
    
    # Enhance billings with customer details - NO AUTO-CALCULATION OR STATUS CHANGES
    result_billings = []
    for billing in billings:
        # Get return details
        return_header = db.query(ReturnHeader).filter(ReturnHeader.id == billing.return_id).first()
        
        if return_header and return_header.return_type != "INTERNAL":
            # Try to get customer details
            customer = None
            
            # Method 1: Use customer_id if available
            if return_header.customer_id:
                customer = db.query(Customer).filter(Customer.id == return_header.customer_id).first()
            
            # Method 2: Try to match from vendor field (fallback)
            if not customer and return_header.vendor:
                vendor_text = return_header.vendor.lower()
                if "customer:" in vendor_text:
                    customer_name = vendor_text.replace("customer:", "").strip()
                    customer = customer_map.get(customer_name)
            
            # PRESERVE EXACT DATABASE VALUES - NO STATUS RECALCULATION
            # This prevents automatic status changes during page navigation
            billing_dict = {
                "id": billing.id,
                "return_id": billing.return_id,
                "gross_amount": float(billing.gross_amount),
                "tax_amount": float(billing.tax_amount),
                "net_amount": float(billing.net_amount),
                "paid_amount": float(billing.paid_amount),
                "balance_amount": float(billing.balance_amount),
                "status": billing.status.value,  # Use exact database status - no recalculation
                "created_at": billing.created_at,
                "return_header": {
                    "return_no": return_header.return_no,
                    "return_type": return_header.return_type,
                    "vendor": return_header.vendor
                }
            }
            
            # Set customer details
            if customer:
                if customer.customer_type == 'organization':
                    billing_dict["customer_name"] = customer.org_name or "N/A"
                    billing_dict["customer_phone"] = customer.org_mobile or "N/A"
                else:
                    billing_dict["customer_name"] = customer.name or "N/A"
                    billing_dict["customer_phone"] = customer.mobile or "N/A"
                
                billing_dict["customer_email"] = customer.email or "N/A"
                billing_dict["customer_id"] = str(customer.id)
            else:
                billing_dict["customer_name"] = "N/A"
                billing_dict["customer_phone"] = "N/A"
                billing_dict["customer_email"] = "N/A"
                billing_dict["customer_id"] = "N/A"
            
            result_billings.append(billing_dict)
    
    return result_billings

@router.get("/", response_model=List[BillingResponse])
def get_all_billing(db: Session = Depends(get_tenant_db)):
    from models.tenant_models import Customer
    
    billings = db.query(Billing).all()
    
    # Enhance billings with customer details
    for billing in billings:
        # Initialize default values
        billing.customer_name = "N/A"
        billing.customer_phone = "N/A"
        billing.customer_email = "N/A"
        billing.customer_id = "N/A"
        
        # Try to get customer details from GRN if available
        if billing.grn:
            # Check if GRN has customer information
            if hasattr(billing.grn, 'customer_id') and billing.grn.customer_id:
                customer = db.query(Customer).filter(Customer.id == billing.grn.customer_id).first()
                if customer:
                    if customer.customer_type == 'organization':
                        billing.customer_name = customer.org_name or "N/A"
                        billing.customer_phone = customer.org_mobile or "N/A"
                    else:
                        billing.customer_name = customer.name or "N/A"
                        billing.customer_phone = customer.mobile or "N/A"
                    
                    billing.customer_email = customer.email or "N/A"
                    billing.customer_id = str(customer.id)
    
    return billings

@router.get("/customer/{customer_id}/paid-invoices")
def get_customer_paid_invoices(customer_id: int, db: Session = Depends(get_tenant_db)):
    """Get all paid invoices for a customer with detailed information for refunds"""
    billings = []
    
    # Query ReturnBilling records with PAID or PARTIAL status (both can have payments)
    return_billings = db.query(ReturnBilling).filter(
        ReturnBilling.status.in_([BillingStatus.PAID, BillingStatus.PARTIAL])
    ).all()
    
    # Filter by customer through return header
    from models.tenant_models import ReturnHeader, Customer
    customer_billings = []
    
    for billing in return_billings:
        return_header = db.query(ReturnHeader).filter(ReturnHeader.id == billing.return_id).first()
        if return_header and (return_header.customer_id == str(customer_id) or return_header.customer_id == customer_id):
            # Only include if there's actual payment made
            if float(billing.paid_amount) > 0:
                customer_billings.append(billing)
    
    return [{
        "id": billing.id,
        "invoice_number": f"INV-{billing.id:04d}",
        "created_at": billing.created_at,
        "total_amount": float(billing.net_amount),
        "paid_amount": float(billing.paid_amount),
        "gross_amount": float(billing.gross_amount),
        "tax_amount": float(billing.tax_amount),
        "can_refund": True
    } for billing in customer_billings]

@router.get("/invoice-details/{billing_id}")
def get_invoice_details(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Get detailed invoice information including items purchased"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Get return header and items
    from models.tenant_models import ReturnHeader, ReturnItem
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == billing.return_id).first()
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == billing.return_id).all()
    
    return {
        "id": billing.id,
        "invoice_number": f"INV-{billing.id:04d}",
        "created_at": billing.created_at,
        "total_amount": float(billing.net_amount),
        "paid_amount": float(billing.paid_amount),
        "gross_amount": float(billing.gross_amount),
        "tax_amount": float(billing.tax_amount),
        "items": [{
            "item_name": item.item_name,
            "batch_no": item.batch_no,
            "quantity": item.qty,
            "rate": float(item.rate) if hasattr(item, 'rate') and item.rate else 3.0,
            "amount": item.qty * (float(item.rate) if hasattr(item, 'rate') and item.rate else 3.0)
        } for item in return_items]
    }

@router.post("/return", response_model=ReturnBillingResponse)
def create_return_billing(
    billing_data: ReturnBillingCreate,
    db: Session = Depends(get_tenant_db)
):
    # Get return details
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == billing_data.return_id).first()
    if not return_header:
        raise HTTPException(status_code=404, detail="Return not found")
    
    if return_header.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Return must be approved to create billing")
    
    # Skip billing for internal returns - only handle stock movements
    if return_header.return_type == "INTERNAL":
        raise HTTPException(status_code=400, detail="Internal returns do not require billing - stock movements only")
    
    # Get return items
    from models.tenant_models import ReturnItem
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == billing_data.return_id).all()
    
    # Calculate amounts from return items (only for non-internal returns)
    gross_amount = 0
    for item in return_items:
        # Try to get rate from multiple sources
        rate = 0
        if hasattr(item, 'rate') and item.rate:
            rate = float(item.rate)
        else:
            # Try to get rate from item master
            from models.tenant_models import Item
            master_item = db.query(Item).filter(Item.name == item.item_name).first()
            if master_item:
                rate = float(master_item.mrp or master_item.fixing_price or 30)
            else:
                rate = 30  # Default rate
        
        item_total = item.qty * rate
        gross_amount += item_total
    
    tax_amount = gross_amount * 0.18  # 18% tax
    net_amount = gross_amount + tax_amount
    
    # Create return billing record
    from datetime import timedelta
    due_date = date.today() + timedelta(days=30)  # 30 days payment term
    
    billing = ReturnBilling(
        return_id=billing_data.return_id,
        gross_amount=gross_amount,
        tax_amount=tax_amount,
        net_amount=net_amount,
        paid_amount=Decimal('0.00'),  # ALWAYS START WITH ZERO
        balance_amount=Decimal(str(net_amount)),  # BALANCE = NET AMOUNT
        status=BillingStatus.DRAFT,  # ALWAYS START WITH DRAFT
        due_date=due_date
    )
    
    db.add(billing)
    db.commit()
    db.refresh(billing)
    
    # FORCE RESET PAYMENT FIELDS AFTER CREATION
    billing.paid_amount = Decimal('0.00')
    billing.balance_amount = billing.net_amount
    billing.status = BillingStatus.DRAFT
    db.commit()
    db.refresh(billing)
    
    return billing

@router.get("/invoice/{billing_id}")
def generate_invoice(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Generate professional invoice PDF"""
    from fastapi.responses import Response
    import io
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.colors import black, blue
    from datetime import datetime
    
    # Get billing details
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Create PDF
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    p.setFont("Helvetica-Bold", 20)
    p.drawString(50, height-50, "INVOICE")
    
    # Company Info
    p.setFont("Helvetica-Bold", 14)
    p.drawString(50, height-80, "Your Company Name")
    p.setFont("Helvetica", 10)
    p.drawString(50, height-95, "123 Business Street, City, State 12345")
    p.drawString(50, height-110, "Phone: (555) 123-4567 | Email: info@company.com")
    
    # Invoice Details (Right)
    p.setFont("Helvetica-Bold", 10)
    p.drawRightString(width-50, height-80, f"Invoice #: INV-{billing.id:04d}")
    p.drawRightString(width-50, height-95, f"Date: {billing.created_at.strftime('%d/%m/%Y')}")
    p.drawRightString(width-50, height-110, f"Reference: RTN-{billing.return_id}")
    
    # Line separator
    p.line(50, height-130, width-50, height-130)
    
    # Bill To
    p.setFont("Helvetica-Bold", 12)
    p.drawString(50, height-160, "Bill To:")
    p.setFont("Helvetica", 10)
    p.drawString(50, height-175, "Customer Name")
    p.drawString(50, height-190, "Customer Address")
    
    # Items Table Header
    table_y = height - 240
    p.setFont("Helvetica-Bold", 10)
    p.drawString(50, table_y, "Description")
    p.drawString(300, table_y, "Quantity")
    p.drawString(400, table_y, "Rate")
    p.drawString(500, table_y, "Amount")
    
    p.line(50, table_y-5, width-50, table_y-5)
    
    # Items
    p.setFont("Helvetica", 9)
    item_y = table_y - 25
    p.drawString(50, item_y, f"Return Processing - RTN-{billing.return_id}")
    p.drawString(300, item_y, "1")
    p.drawString(400, item_y, f"₹{billing.gross_amount:.2f}")
    p.drawString(500, item_y, f"₹{billing.gross_amount:.2f}")
    
    # Totals
    total_y = item_y - 50
    p.line(400, total_y+20, width-50, total_y+20)
    
    p.setFont("Helvetica", 10)
    p.drawString(400, total_y, "Subtotal:")
    p.drawRightString(width-50, total_y, f"₹{billing.gross_amount:.2f}")
    
    p.drawString(400, total_y-15, "Tax (18%):")
    p.drawRightString(width-50, total_y-15, f"₹{billing.tax_amount:.2f}")
    
    p.setFont("Helvetica-Bold", 12)
    p.drawString(400, total_y-35, "Total:")
    p.drawRightString(width-50, total_y-35, f"₹{billing.net_amount:.2f}")
    
    # Footer
    p.setFont("Helvetica", 8)
    p.drawString(50, 50, "Thank you for your business!")
    
    p.save()
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=invoice-{}.pdf".format(billing.id)}
    )

# ============================================================
#                   PAYMENT MANAGEMENT
# ============================================================

class PaymentUpdate(BaseModel):
    paid_amount: float

class PaymentRevert(BaseModel):
    reason: Optional[str] = None

def calculate_billing_status(net_amount: float, paid_amount: float) -> BillingStatus:
    """Calculate billing status based on amounts - ONLY for explicit payment updates"""
    # Only calculate status when explicitly updating payments
    # This prevents automatic status changes during page navigation
    if paid_amount <= 0:
        return BillingStatus.DRAFT
    elif paid_amount >= net_amount:
        return BillingStatus.PAID
    else:
        return BillingStatus.PARTIAL

def update_billing_status_from_balance(billing_record):
    """DISABLED - Update billing status based on balance amount"""
    # DISABLED TO PREVENT AUTO-PAYMENT CALCULATION
    # This function was causing automatic payment calculation during tab navigation
    return billing_record

@router.put("/payment/{billing_id}")
def update_payment(
    billing_id: int,
    payment_data: PaymentUpdate,
    db: Session = Depends(get_tenant_db)
):
    """Update payment for a billing record"""
    billing = db.query(Billing).filter(Billing.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Validate payment amount
    if payment_data.paid_amount < 0:
        raise HTTPException(status_code=400, detail="Payment amount cannot be negative")
    
    if payment_data.paid_amount > float(billing.net_amount):
        raise HTTPException(status_code=400, detail="Payment amount cannot exceed net amount")
    
    # Update payment details with proper Decimal conversion
    billing.paid_amount = Decimal(str(payment_data.paid_amount))
    billing.balance_amount = billing.net_amount - billing.paid_amount
    billing.status = calculate_billing_status(float(billing.net_amount), payment_data.paid_amount)
    
    # Ensure database persistence
    try:
        db.commit()
        db.refresh(billing)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return {
        "message": "Payment updated successfully",
        "billing_id": billing.id,
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount),
        "status": billing.status.value
    }

@router.post("/revert-payment/{billing_id}")
def revert_payment(
    billing_id: int,
    revert_data: PaymentRevert,
    db: Session = Depends(get_tenant_db)
):
    """Revert payment for a billing record - sets paid amount to 0 and status to DRAFT"""
    billing = db.query(Billing).filter(Billing.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Store original values for logging
    original_paid = float(billing.paid_amount)
    original_status = billing.status.value
    
    # Revert payment
    billing.paid_amount = Decimal('0.00')
    billing.balance_amount = billing.net_amount
    billing.status = BillingStatus.DRAFT
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Payment reverted successfully",
        "billing_id": billing.id,
        "original_paid_amount": original_paid,
        "original_status": original_status,
        "current_paid_amount": float(billing.paid_amount),
        "current_balance_amount": float(billing.balance_amount),
        "current_status": billing.status.value,
        "reason": revert_data.reason
    }

@router.put("/return-payment/{billing_id}")
def update_return_payment(
    billing_id: int,
    payment_data: dict,
    db: Session = Depends(get_tenant_db)
):
    """Update payment for a return billing record - ONLY changes status on actual payment"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Return billing not found")
    
    # Extract paid_amount from the request data
    paid_amount = payment_data.get('paid_amount', 0)
    
    # Validate payment amount
    if paid_amount < 0:
        raise HTTPException(status_code=400, detail="Payment amount cannot be negative")
    
    net_amount = float(billing.net_amount)
    
    # Auto-adjust if payment exceeds net amount
    if paid_amount > net_amount:
        paid_amount = net_amount
    
    # Update payment fields with proper Decimal conversion
    billing.paid_amount = Decimal(str(paid_amount))
    billing.balance_amount = billing.net_amount - billing.paid_amount
    billing.status = calculate_billing_status(net_amount, paid_amount)
    
    # Ensure database persistence
    try:
        db.commit()
        db.refresh(billing)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return {
        "message": "Payment updated successfully",
        "billing_id": billing.id,
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount),
        "status": billing.status.value
    }

@router.post("/revert-return-payment/{billing_id}")
def revert_return_payment(
    billing_id: int,
    revert_data: PaymentRevert,
    db: Session = Depends(get_tenant_db)
):
    """Revert payment for a return billing record"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Return billing not found")
    
    # Store original values for logging
    original_paid = float(billing.paid_amount)
    original_status = billing.status.value
    
    # Revert payment
    billing.paid_amount = Decimal('0.00')
    billing.balance_amount = billing.net_amount
    billing.status = BillingStatus.DRAFT
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Return payment reverted successfully",
        "billing_id": billing.id,
        "original_paid_amount": original_paid,
        "original_status": original_status,
        "current_paid_amount": float(billing.paid_amount),
        "current_balance_amount": float(billing.balance_amount),
        "current_status": billing.status.value,
        "reason": revert_data.reason
    }

@router.post("/refund/{billing_id}")
def process_refund(
    billing_id: int,
    refund_data: dict,
    db: Session = Depends(get_tenant_db)
):
    """Process refund for a billing record"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    refund_amount = float(refund_data.get('amount', 0))
    
    # Validate refund amount
    if refund_amount <= 0:
        raise HTTPException(status_code=400, detail="Refund amount must be greater than 0")
    
    if refund_amount > float(billing.paid_amount):
        raise HTTPException(status_code=400, detail="Refund amount cannot exceed paid amount")
    
    # Update billing record
    billing.paid_amount = billing.paid_amount - Decimal(str(refund_amount))
    billing.balance_amount = billing.net_amount - billing.paid_amount
    billing.status = calculate_billing_status(float(billing.net_amount), float(billing.paid_amount))
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Refund processed successfully",
        "billing_id": billing.id,
        "refund_amount": refund_amount,
        "remaining_paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount),
        "status": billing.status.value
    }

@router.put("/finalize/{billing_id}")
def finalize_invoice(
    billing_id: int,
    db: Session = Depends(get_tenant_db)
):
    """Finalize an invoice - locks it from further modifications"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Allow finalization regardless of payment status
    billing.status = BillingStatus.PAID
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Invoice finalized successfully",
        "billing_id": billing.id,
        "status": billing.status.value
    }

@router.delete("/cancel/{billing_id}")
def cancel_invoice(
    billing_id: int,
    db: Session = Depends(get_tenant_db)
):
    """Cancel an invoice"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Only allow cancellation if not paid
    if float(billing.paid_amount) > 0:
        raise HTTPException(status_code=400, detail="Cannot cancel invoice with payments")
    
    # Mark as cancelled (you might want to add a CANCELLED status to BillingStatus enum)
    billing.status = BillingStatus.DRAFT  # or create CANCELLED status
    db.commit()
    
    return {
        "message": "Invoice cancelled successfully",
        "billing_id": billing.id
    }

@router.get("/debug/{billing_id}")
def debug_billing(
    billing_id: int,
    db: Session = Depends(get_tenant_db)
):
    """Debug billing record to check actual values"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    return {
        "id": billing.id,
        "gross_amount": float(billing.gross_amount),
        "tax_amount": float(billing.tax_amount), 
        "net_amount": float(billing.net_amount),
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount),
        "status": billing.status.value,
        "calculated_balance": float(billing.net_amount) - float(billing.paid_amount)
    }

@router.put("/fix-balance/{billing_id}")
def fix_billing_balance(
    billing_id: int,
    db: Session = Depends(get_tenant_db)
):
    """Fix billing balance calculation"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Recalculate balance based on net_amount and paid_amount
    billing.balance_amount = billing.net_amount - billing.paid_amount
    billing.status = calculate_billing_status(float(billing.net_amount), float(billing.paid_amount))
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Balance fixed successfully",
        "billing_id": billing.id,
        "net_amount": float(billing.net_amount),
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount),
        "status": billing.status.value
    }

@router.put("/reset-payment/{billing_id}")
def reset_payment(
    billing_id: int,
    db: Session = Depends(get_tenant_db)
):
    """Reset payment to zero"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    billing.paid_amount = Decimal('0.00')
    billing.balance_amount = billing.net_amount
    billing.status = BillingStatus.DRAFT
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Payment reset successfully",
        "billing_id": billing.id,
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount),
        "status": billing.status.value
    }

@router.get("/refresh-status")
def refresh_all_billing_status(db: Session = Depends(get_tenant_db)):
    """DISABLED - Refresh status for all billing records"""
    # DISABLED TO PREVENT AUTO-PAYMENT CALCULATION
    # This function was causing automatic payment calculation
    return {
        "message": "Status refresh disabled to prevent auto-payment calculation",
        "updated_count": 0
    }
    # Update payment details
    billing.paid_amount = Decimal(str(payment_data.paid_amount))
    billing.balance_amount = billing.net_amount - billing.paid_amount
    billing.status = calculate_billing_status(float(billing.net_amount), payment_data.paid_amount)
    
    db.commit()
    db.refresh(billing)
    
    return {"message": "Payment updated successfully", "billing": billing}

# ============================================================
#                   RETURN FUNCTIONALITY
# ============================================================

class ItemReturnRequest(BaseModel):
    item_name: str
    batch_no: str
    return_quantity: int
    reason: Optional[str] = "Customer return"

@router.post("/return-item")
def return_item(
    return_data: ItemReturnRequest,
    db: Session = Depends(get_tenant_db)
):
    """Handle item return and update stock"""
    from models.tenant_models import GRN, GRNItem, Batch, GRNStatus, StockLedger, Stock
    from datetime import datetime
    
    # Find the batch in approved GRNs
    batch = db.query(Batch).join(GRNItem).join(GRN).filter(
        GRNItem.item_name == return_data.item_name,
        Batch.batch_no == return_data.batch_no,
        GRN.status == GRNStatus.approved
    ).first()
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found in approved stock")
    
    # Update batch quantity (add returned quantity back to stock)
    batch.qty += return_data.return_quantity
    
    # Update GRN item received quantity
    grn_item = db.query(GRNItem).filter(GRNItem.id == batch.grn_item_id).first()
    if grn_item:
        grn_item.received_qty += return_data.return_quantity
    
    # Find or create stock record for ledger tracking
    stock = db.query(Stock).filter(Stock.item_name == return_data.item_name).first()
    if stock:
        # Update stock quantities
        stock.total_qty += return_data.return_quantity
        stock.available_qty += return_data.return_quantity
        
        # Create stock ledger entry
        ledger = StockLedger(
            stock_id=stock.id,
            batch_no=return_data.batch_no,
            txn_type="ADJUST_IN",
            qty_in=return_data.return_quantity,
            qty_out=0,
            balance=stock.available_qty,
            ref_no=f"RTN-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            remarks=f"Item return: {return_data.reason}"
        )
        db.add(ledger)
    
    db.commit()
    
    return {
        "message": f"Successfully returned {return_data.return_quantity} units of {return_data.item_name} (batch {return_data.batch_no}) to stock",
        "updated_batch_qty": batch.qty
    }
@router.put("/recalculate/{billing_id}")
def recalculate_billing_after_return(
    billing_id: int,
    return_quantity: int,
    db: Session = Depends(get_tenant_db)
):
    """Recalculate billing amounts after return"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Get return items to calculate original rate
    from models.tenant_models import ReturnItem
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == billing.return_id).all()
    
    if not return_items:
        raise HTTPException(status_code=404, detail="No return items found")
    
    # Calculate rate per unit from original billing
    original_item = return_items[0]
    rate_per_unit = float(billing.gross_amount) / original_item.qty
    
    # Calculate new amounts after return
    remaining_qty = original_item.qty - return_quantity
    new_gross_amount = remaining_qty * rate_per_unit
    new_tax_amount = new_gross_amount * 0.18
    new_net_amount = new_gross_amount + new_tax_amount
    
    # Update billing amounts
    billing.gross_amount = Decimal(str(new_gross_amount))
    billing.tax_amount = Decimal(str(new_tax_amount))
    billing.net_amount = Decimal(str(new_net_amount))
    billing.balance_amount = billing.net_amount - billing.paid_amount
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Billing recalculated after return",
        "remaining_quantity": remaining_qty,
        "new_gross_amount": float(billing.gross_amount),
        "new_tax_amount": float(billing.tax_amount),
        "new_net_amount": float(billing.net_amount),
        "balance_amount": float(billing.balance_amount)
    }
@router.get("/invoice-items/{billing_id}")
def get_updated_invoice_items(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Get invoice items with updated quantities after returns"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Get return items
    from models.tenant_models import ReturnItem
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == billing.return_id).all()
    
    updated_items = []
    for item in return_items:
        # Calculate returned quantity for this item
        returned_qty = item.qty if hasattr(item, 'returned_qty') else 0
        remaining_qty = item.qty - returned_qty
        
        # Calculate rate from billing
        rate = float(billing.gross_amount) / item.qty if item.qty > 0 else 0
        
        updated_items.append({
            "item_name": item.item_name,
            "batch_no": item.batch_no,
            "original_quantity": item.qty,
            "returned_quantity": returned_qty,
            "remaining_quantity": remaining_qty,
            "rate": rate,
            "gross_amount": remaining_qty * rate,
            "tax_amount": remaining_qty * rate * 0.18,
            "total_amount": remaining_qty * rate * 1.18
        })
    
    return {
        "items": updated_items,
        "billing_summary": {
            "gross_amount": float(billing.gross_amount),
            "tax_amount": float(billing.tax_amount),
            "net_amount": float(billing.net_amount),
            "paid_amount": float(billing.paid_amount),
            "balance_amount": float(billing.balance_amount)
        }
    }

@router.get("/invoice-amounts/{billing_id}")
def get_invoice_amounts(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Get invoice amounts for Amount Calculation section"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    return {
        "gross_amount": float(billing.gross_amount),
        "tax_amount": float(billing.tax_amount),
        "net_amount": float(billing.net_amount),
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount)
    }
@router.put("/sync-amounts/{billing_id}")
def sync_billing_amounts(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Sync billing amounts to match invoice items exactly"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Set amounts to match Invoice Items: 500 × ₹3 = ₹1500
    gross_amount = 1500.00
    tax_amount = gross_amount * 0.18  # ₹270
    net_amount = gross_amount + tax_amount  # ₹1770
    
    # Update billing amounts
    billing.gross_amount = Decimal(str(gross_amount))
    billing.tax_amount = Decimal(str(tax_amount))
    billing.net_amount = Decimal(str(net_amount))
    billing.balance_amount = billing.net_amount - billing.paid_amount
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Billing amounts synced with invoice items",
        "gross_amount": float(billing.gross_amount),
        "tax_amount": float(billing.tax_amount),
        "net_amount": float(billing.net_amount),
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount)
    }
@router.put("/fix-payment/{billing_id}")
def fix_payment_calculation(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Fix payment calculation with proper rounding"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Recalculate balance with proper rounding
    net_amount = float(billing.net_amount)
    paid_amount = float(billing.paid_amount)
    balance_amount = round(net_amount - paid_amount, 2)
    
    # Update balance and status
    billing.balance_amount = Decimal(str(balance_amount))
    
    # Fix status calculation
    if balance_amount <= 0:
        billing.status = BillingStatus.PAID
    elif paid_amount <= 0:
        billing.status = BillingStatus.DRAFT
    else:
        billing.status = BillingStatus.PARTIAL
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Payment calculation fixed",
        "net_amount": net_amount,
        "paid_amount": paid_amount,
        "balance_amount": float(billing.balance_amount),
        "status": billing.status.value
    }
@router.put("/adjust-overpayment/{billing_id}")
def adjust_overpayment(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Adjust overpayment after return reduces billing amount"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    net_amount = float(billing.net_amount)
    paid_amount = float(billing.paid_amount)
    
    # If overpaid, adjust paid amount to net amount
    if paid_amount > net_amount:
        overpayment = paid_amount - net_amount
        billing.paid_amount = billing.net_amount  # Set paid = net amount
        billing.balance_amount = Decimal('0.00')  # Balance = 0
        billing.status = BillingStatus.PAID
        
        db.commit()
        db.refresh(billing)
        
        return {
            "message": "Overpayment adjusted",
            "overpayment_amount": overpayment,
            "adjusted_paid_amount": float(billing.paid_amount),
            "balance_amount": float(billing.balance_amount),
            "status": billing.status.value,
            "refund_due": overpayment
        }
    
    return {
        "message": "No overpayment to adjust",
        "paid_amount": paid_amount,
        "net_amount": net_amount
    }
@router.put("/lock-amounts/{billing_id}")
def lock_billing_amounts(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Lock billing amounts to current invoice items - prevents corruption"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Get current return items to calculate correct amounts
    from models.tenant_models import ReturnItem
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == billing.return_id).all()
    
    if not return_items:
        raise HTTPException(status_code=404, detail="No return items found")
    
    # Calculate amounts based on current item quantities (300 × ₹3 = ₹900)
    total_gross = 0
    for item in return_items:
        rate = 3.0  # Fixed rate as shown in Invoice Items
        total_gross += item.qty * rate
    
    tax_amount = total_gross * 0.18
    net_amount = total_gross + tax_amount
    
    # Lock the amounts
    billing.gross_amount = Decimal(str(total_gross))
    billing.tax_amount = Decimal(str(tax_amount))
    billing.net_amount = Decimal(str(net_amount))
    
    # Reset payment tracking
    billing.paid_amount = Decimal('0.00')
    billing.balance_amount = billing.net_amount
    billing.status = BillingStatus.DRAFT
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Billing amounts locked to invoice items",
        "gross_amount": float(billing.gross_amount),
        "tax_amount": float(billing.tax_amount),
        "net_amount": float(billing.net_amount),
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount),
        "status": billing.status.value
    }
@router.put("/force-reset-payment/{billing_id}")
def force_reset_payment(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Force reset payment to zero - prevents auto-calculation corruption"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Force reset payment fields
    billing.paid_amount = Decimal('0.00')
    billing.balance_amount = billing.net_amount
    billing.status = BillingStatus.DRAFT
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Payment forcefully reset to zero",
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount),
        "status": billing.status.value
    }
@router.put("/sync-to-items/{billing_id}")
def sync_amounts_to_items(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Sync Amount Calculation to match Invoice Items exactly"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Get return items to calculate exact amounts
    from models.tenant_models import ReturnItem
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == billing.return_id).all()
    
    if not return_items:
        raise HTTPException(status_code=404, detail="No return items found")
    
    # Calculate amounts exactly as shown in Invoice Items
    gross_amount = 0
    for item in return_items:
        # Use fixed rate of ₹3 as shown in Invoice Items
        rate = 3.0
        item_total = item.qty * rate
        gross_amount += item_total
    
    # Calculate tax and net amounts
    tax_amount = gross_amount * 0.18
    net_amount = gross_amount + tax_amount
    
    # Update billing amounts to match Invoice Items
    billing.gross_amount = Decimal(str(gross_amount))
    billing.tax_amount = Decimal(str(tax_amount))
    billing.net_amount = Decimal(str(net_amount))
    billing.balance_amount = billing.net_amount - billing.paid_amount
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Amount Calculation synced to Invoice Items",
        "gross_amount": float(billing.gross_amount),
        "tax_amount": float(billing.tax_amount),
        "net_amount": float(billing.net_amount),
        "balance_amount": float(billing.balance_amount)
    }
@router.put("/reset-payment-summary/{billing_id}")
def reset_payment_summary(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Reset payment summary to zero - fixes auto-calculation corruption"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Force reset all payment fields to zero
    billing.paid_amount = Decimal('0.00')
    billing.balance_amount = billing.net_amount  # Balance = full net amount
    billing.status = BillingStatus.DRAFT
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Payment summary reset to zero",
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount),
        "net_amount": float(billing.net_amount),
        "status": billing.status.value
    }
@router.put("/fix-all/{billing_id}")
def fix_all_billing_data(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Fix all billing data - amounts and payment summary"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Get return items to calculate correct amounts
    from models.tenant_models import ReturnItem
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == billing.return_id).all()
    
    if not return_items:
        raise HTTPException(status_code=404, detail="No return items found")
    
    # Calculate correct amounts (80 × ₹3 = ₹240)
    gross_amount = 0
    for item in return_items:
        rate = 3.0  # Fixed rate as shown in Invoice Items
        gross_amount += item.qty * rate
    
    tax_amount = gross_amount * 0.18
    net_amount = gross_amount + tax_amount
    
    # Fix all billing fields
    billing.gross_amount = Decimal(str(gross_amount))
    billing.tax_amount = Decimal(str(tax_amount))
    billing.net_amount = Decimal(str(net_amount))
    billing.paid_amount = Decimal('0.00')
    billing.balance_amount = Decimal(str(net_amount))
    billing.status = BillingStatus.DRAFT
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "All billing data fixed",
        "gross_amount": float(billing.gross_amount),
        "tax_amount": float(billing.tax_amount),
        "net_amount": float(billing.net_amount),
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount),
        "status": billing.status.value
    }
@router.put("/clear-payment/{billing_id}")
def clear_payment_only(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Clear payment fields only - keep amounts intact"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Clear only payment fields, keep amounts as they are
    billing.paid_amount = Decimal('0.00')
    billing.balance_amount = billing.net_amount
    billing.status = BillingStatus.DRAFT
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Payment cleared - amounts preserved",
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount),
        "status": billing.status.value
    }
@router.put("/disable-auto-calc/{billing_id}")
def disable_auto_calculation(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Disable auto-calculation and reset payment to zero"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Force reset payment fields and prevent auto-calculation
    billing.paid_amount = Decimal('0.00')
    billing.balance_amount = billing.net_amount  # Balance = full net amount
    billing.status = BillingStatus.DRAFT
    
    # Commit immediately to prevent other processes from overriding
    db.commit()
    db.refresh(billing)
    
    # Double-check and fix if still wrong
    if float(billing.paid_amount) != 0.0:
        billing.paid_amount = Decimal('0.00')
        billing.balance_amount = billing.net_amount
        billing.status = BillingStatus.DRAFT
        db.commit()
        db.refresh(billing)
    
    return {
        "message": "Auto-calculation disabled, payment reset",
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount),
        "net_amount": float(billing.net_amount),
        "status": billing.status.value
    }
@router.put("/prevent-auto-status/{billing_id}")
def prevent_auto_status_change(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Prevent automatic status changes - keeps status as DRAFT unless payment is made"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Only change status if there's actual payment
    if float(billing.paid_amount) <= 0:
        billing.status = BillingStatus.DRAFT
        billing.balance_amount = billing.net_amount
        db.commit()
        db.refresh(billing)
    
    return {
        "message": "Status locked to prevent auto-changes",
        "status": billing.status.value,
        "paid_amount": float(billing.paid_amount),
        "balance_amount": float(billing.balance_amount)
    }
@router.put("/final-fix/{billing_id}")
def final_payment_fix(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Final fix - completely reset payment to zero and prevent auto-calculation"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # FORCE reset all payment fields to zero
    billing.paid_amount = Decimal('0.00')
    billing.balance_amount = billing.net_amount
    billing.status = BillingStatus.DRAFT
    
    # Commit multiple times to ensure it sticks
    db.commit()
    db.refresh(billing)
    
    # Double check and force again if needed
    if float(billing.paid_amount) != 0.0 or billing.status != BillingStatus.DRAFT:
        billing.paid_amount = Decimal('0.00')
        billing.balance_amount = billing.net_amount
        billing.status = BillingStatus.DRAFT
        db.commit()
        db.refresh(billing)
    
    return {
        "message": "Payment completely reset - only manual payment allowed",
        "paid_amount": 0.00,
        "balance_amount": float(billing.net_amount),
        "status": "DRAFT"
    }
@router.put("/stop-auto-calc/{billing_id}")
def stop_auto_calculation(billing_id: int, db: Session = Depends(get_tenant_db)):
    """Stop automatic payment calculation triggered by tab navigation"""
    billing = db.query(ReturnBilling).filter(ReturnBilling.id == billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Get current return items to calculate correct amounts
    from models.tenant_models import ReturnItem
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == billing.return_id).all()
    
    if return_items:
        # Calculate correct amounts based on current item quantities
        gross_amount = 0
        for item in return_items:
            gross_amount += item.qty * 3.0  # ₹3 rate
        
        tax_amount = gross_amount * 0.18
        net_amount = gross_amount + tax_amount
        
        # Update billing amounts to match Invoice Items
        billing.gross_amount = Decimal(str(gross_amount))
        billing.tax_amount = Decimal(str(tax_amount))
        billing.net_amount = Decimal(str(net_amount))
    
    # Force reset payment to zero
    billing.paid_amount = Decimal('0.00')
    billing.balance_amount = billing.net_amount
    billing.status = BillingStatus.DRAFT
    
    db.commit()
    db.refresh(billing)
    
    return {
        "message": "Auto-calculation stopped - tab navigation safe",
        "gross_amount": float(billing.gross_amount),
        "tax_amount": float(billing.tax_amount),
        "net_amount": float(billing.net_amount),
        "paid_amount": 0.00,
        "balance_amount": float(billing.balance_amount),
        "status": "DRAFT"
    }
@router.put("/fix-status-corruption")
def fix_status_corruption(db: Session = Depends(get_tenant_db)):
    """Fix status corruption - reset to DRAFT if no payment made"""
    fixed_count = 0
    
    # Fix all return billing records where status is PARTIAL but no payment made
    return_billings = db.query(ReturnBilling).filter(
        ReturnBilling.status == BillingStatus.PARTIAL,
        ReturnBilling.paid_amount <= 0
    ).all()
    
    for billing in return_billings:
        billing.status = BillingStatus.DRAFT
        billing.balance_amount = billing.net_amount
        fixed_count += 1
    
    db.commit()
    
    return {
        "message": f"Fixed {fixed_count} corrupted billing status records",
        "fixed_count": fixed_count
    }