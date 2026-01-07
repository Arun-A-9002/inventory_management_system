from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
import json
from database import get_tenant_db
from models.tenant_models import VendorPayment, GRN, AuditLog
from utils.permissions import require_vendor_ledger_view, require_vendor_ledger_pay, require_vendor_ledger_print, require_vendor_ledger_invoice_view
from datetime import date
from decimal import Decimal

router = APIRouter()
DEFAULT_DB = "arun"

def get_db():
    yield from get_tenant_db(DEFAULT_DB)

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
        module="VENDOR_LEDGER",
        description=description
    )
    db.add(audit_log)
    db.commit()

@router.post("/payments")
async def create_payment(grn_id: int, amount: float, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_vendor_ledger_pay())):
    try:
        # Get GRN details
        grn = db.query(GRN).filter(GRN.id == grn_id).first()
        if not grn:
            return {"error": "GRN not found"}
        
        # Convert amounts to Decimal for proper calculation
        amount_decimal = Decimal(str(amount))
        total_amount = Decimal(str(grn.total_amount)) if grn.total_amount else Decimal('0')
        
        # Check if payment record exists
        payment = db.query(VendorPayment).filter(VendorPayment.grn_number == grn.grn_number).first()
        
        if not payment:
            # Create new payment record
            payment = VendorPayment(
                grn_number=grn.grn_number,
                vendor_name=grn.vendor_name,
                invoice_number=grn.invoice_number,
                total_amount=total_amount,
                paid_amount=amount_decimal,
                outstanding_amount=total_amount - amount_decimal,
                payment_status="paid" if amount_decimal >= total_amount else "partial",
                payment_date=date.today()
            )
            db.add(payment)
        else:
            # Update existing payment
            current_paid = Decimal(str(payment.paid_amount)) if payment.paid_amount else Decimal('0')
            payment.paid_amount = current_paid + amount_decimal
            payment.outstanding_amount = total_amount - payment.paid_amount
            payment.payment_status = "paid" if payment.paid_amount >= total_amount else "partial"
            payment.payment_date = date.today()
        
        db.commit()
        
        # Determine if this is a full or partial payment
        is_full_payment = payment.payment_status == "paid"
        action_type = "FULL_PAYMENT" if is_full_payment else "PARTIAL_PAYMENT"
        
        # Audit log
        log_audit(
            db=db,
            current_user=current_user,
            action=action_type,
            table_name="vendor_payments",
            record_id=payment.id,
            new_values={
                "grn_number": grn.grn_number,
                "vendor_name": grn.vendor_name,
                "payment_amount": float(amount_decimal),
                "total_paid": float(payment.paid_amount),
                "outstanding": float(payment.outstanding_amount),
                "payment_status": payment.payment_status
            },
            description=f"Payment of ₹{amount} made for GRN {grn.grn_number} to vendor {grn.vendor_name}. Status: {payment.payment_status}",
            request=request
        )
        
        return {"message": "Payment saved"}
    except Exception as e:
        print(f"Payment save error: {e}")
        return {"error": str(e)}

@router.get("/payments/{grn_number}")
async def get_payments(grn_number: str, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_vendor_ledger_view())):
    try:
        payment = db.query(VendorPayment).filter(VendorPayment.grn_number == grn_number).first()
        
        if payment:
            return {
                "total_paid": float(payment.paid_amount),
                "outstanding": float(payment.outstanding_amount),
                "status": payment.payment_status
            }
        return {"total_paid": 0.0, "outstanding": 0.0, "status": "unpaid"}
    except Exception as e:
        print(f"Payment fetch error: {e}")
        return {"total_paid": 0.0, "outstanding": 0.0, "status": "unpaid"}

# Get all vendor payments for ledger view
@router.get("/ledger")
async def get_vendor_ledger(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_vendor_ledger_view())):
    try:
        payments = db.query(VendorPayment).order_by(VendorPayment.payment_date.desc()).all()
        return payments
    except Exception as e:
        print(f"Ledger fetch error: {e}")
        return []

# Print vendor ledger
@router.post("/ledger/print")
async def print_vendor_ledger(vendor_name: str, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_vendor_ledger_print())):
    try:
        payments = db.query(VendorPayment).filter(VendorPayment.vendor_name == vendor_name).all()
        
        # Audit log for printing vendor ledger
        log_audit(
            db=db,
            current_user=current_user,
            action="PRINT_LEDGER",
            table_name="vendor_payments",
            new_values={"vendor_name": vendor_name, "records_count": len(payments)},
            description=f"Printed vendor ledger for {vendor_name}",
            request=request
        )
        
        return {"message": "Ledger printed", "payments": payments}
    except Exception as e:
        print(f"Print ledger error: {e}")
        return {"error": str(e)}

# View invoice details
@router.get("/invoice/{invoice_number}")
async def view_invoice(invoice_number: str, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_vendor_ledger_invoice_view())):
    try:
        payment = db.query(VendorPayment).filter(VendorPayment.invoice_number == invoice_number).first()
        
        # Audit log for viewing invoice
        log_audit(
            db=db,
            current_user=current_user,
            action="VIEW_INVOICE",
            table_name="vendor_payments",
            record_id=payment.id if payment else None,
            new_values={"invoice_number": invoice_number, "found": payment is not None},
            description=f"Viewed invoice {invoice_number}",
            request=request
        )
        
        if payment:
            return payment
        return {"error": "Invoice not found"}
    except Exception as e:
        print(f"Invoice view error: {e}")
        # Log the error in audit as well
        log_audit(
            db=db,
            current_user=current_user,
            action="VIEW_INVOICE_ERROR",
            table_name="vendor_payments",
            new_values={"invoice_number": invoice_number, "error": str(e)},
            description=f"Error viewing invoice {invoice_number}: {str(e)}",
            request=request
        )
        return {"error": str(e)}