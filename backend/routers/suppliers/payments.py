from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_tenant_db
from models.tenant_models import VendorPayment, GRN
from datetime import date
from decimal import Decimal

router = APIRouter()
DEFAULT_DB = "arun"

def get_db():
    yield from get_tenant_db(DEFAULT_DB)

@router.post("/payments")
async def create_payment(grn_id: int, amount: float, db: Session = Depends(get_db)):
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
        return {"message": "Payment saved"}
    except Exception as e:
        print(f"Payment save error: {e}")
        return {"error": str(e)}

@router.get("/payments/{grn_number}")
async def get_payments(grn_number: str, db: Session = Depends(get_db)):
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