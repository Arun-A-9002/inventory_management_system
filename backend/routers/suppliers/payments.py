from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
import json
from database import get_tenant_db
from models.tenant_models import VendorPayment, GRN, AuditLog, Vendor
from utils.permissions import require_vendor_ledger_view, require_vendor_ledger_pay, require_vendor_ledger_print
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

@router.post("/")
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

# Print vendor ledger details
@router.get("/ledger/print/{grn_number}")
async def print_vendor_ledger_details(grn_number: str, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_vendor_ledger_print())):
    try:
        print(f"Print endpoint called with GRN: {grn_number}")  # Debug log
        
        # Get GRN details
        grn = db.query(GRN).filter(GRN.grn_number == grn_number).first()
        if not grn:
            print(f"GRN not found: {grn_number}")  # Debug log
            return {"error": "GRN not found"}
        
        print(f"GRN found: {grn.grn_number}")  # Debug log
        
        # Get vendor details
        vendor = db.query(Vendor).filter(Vendor.email == grn.vendor_name).first()
        
        # Get payment details
        payment = db.query(VendorPayment).filter(VendorPayment.grn_number == grn_number).first()
        
        # Calculate payment details
        total_amount = float(grn.total_amount) if grn.total_amount else 0.0
        paid_amount = float(payment.paid_amount) if payment and payment.paid_amount else 0.0
        outstanding_amount = max(0.0, total_amount - paid_amount)
        
        # Get payment status
        if paid_amount == 0:
            payment_status = "Unpaid"
        elif outstanding_amount == 0:
            payment_status = "Paid"
        else:
            payment_status = "Partial"
        
        # Get company data using PDF header format
        from utils.pdf_header_format import PDFHeaderFormat
        header_formatter = PDFHeaderFormat(db)
        company_data = header_formatter._get_company_data()
        
        # Generate HTML content with proper header
        html_content = generate_vendor_ledger_html(
            grn=grn,
            vendor=vendor,
            payment_details={
                "total_amount": total_amount,
                "paid_amount": paid_amount,
                "outstanding_amount": outstanding_amount,
                "payment_status": payment_status,
                "payment_date": payment.payment_date.strftime("%d/%m/%Y") if payment and payment.payment_date else ""
            },
            company_data=company_data
        )
        
        # Audit log
        log_audit(
            db=db,
            current_user=current_user,
            action="PRINT_VENDOR_LEDGER",
            table_name="vendor_payments",
            record_id=grn.id,
            new_values={"grn_number": grn_number},
            description=f"Printed vendor ledger for GRN {grn_number}",
            request=request
        )
        
        print(f"Returning HTML content for GRN: {grn_number}")  # Debug log
        return {"html_content": html_content}
    except Exception as e:
        print(f"Print vendor ledger error: {e}")
        return {"error": str(e)}

def generate_vendor_ledger_html(grn, vendor, payment_details, company_data):
    """Generate HTML content for vendor ledger with proper header format"""
    
    # Company details with fallback
    company_name = company_data.get('name', 'NUTRYAH').lower() if company_data else 'nutryah'
    company_phone = f"+{company_data.get('phone', '91 XXXXXXXXXX')}" if company_data else '+91 XXXXXXXXXX'
    company_email = company_data.get('email', 'info@nutryah.com') if company_data else 'info@nutryah.com'
    company_gst = f"GST: {company_data.get('gst_number', 'XXXXXXXXXXXX')}" if company_data else 'GST: XXXXXXXXXXXX'
    company_address = company_data.get('address', 'Address Line 1, City, State') if company_data else 'Address Line 1, City, State'
    
    # Get logo as base64
    logo_html = get_logo_html(company_data.get('logo_path') if company_data else None)
    
    # Get items from GRN
    items_html = ""
    if hasattr(grn, 'items') and grn.items:
        items_rows = ""
        for idx, item in enumerate(grn.items, 1):
            quantity = item.received_qty if hasattr(item, 'received_qty') else (item.quantity if hasattr(item, 'quantity') else 0)
            rate = item.rate if hasattr(item, 'rate') else 0
            amount = quantity * rate
            
            items_rows += f"""
                <tr>
                    <td class="text-center">{idx}</td>
                    <td>{item.item_name}</td>
                    <td class="text-center">{quantity}</td>
                    <td class="text-right">₹{rate:.2f}</td>
                    <td class="text-right">₹{amount:.2f}</td>
                </tr>
            """
        
        items_html = f"""
        <div class="section">
            <div class="section-title">Items Details</div>
            <table>
                <thead>
                    <tr>
                        <th class="text-center">S.No</th>
                        <th>Item Name</th>
                        <th class="text-center">Quantity</th>
                        <th class="text-right">Rate</th>
                        <th class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items_rows}
                </tbody>
            </table>
        </div>
        """
    
    return f"""
<!DOCTYPE html>
<html>
<head>
    <title>Vendor Ledger - {grn.grn_number}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }}
        .logo-section {{ width: 200px; height: 80px; display: flex; align-items: center; justify-content: center; }}
        .logo-section img {{ max-width: 100%; max-height: 100%; object-fit: contain; }}
        .logo-placeholder {{ width: 200px; height: 80px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; background-color: #f5f5f5; }}
        .company-section {{ text-align: right; }}
        .company-name {{ font-size: 16px; font-weight: bold; color: #2E8B57; margin-bottom: 5px; }}
        .company-subtitle {{ font-size: 9px; color: #666; margin-bottom: 15px; }}
        .company-details {{ font-size: 8px; color: #000; line-height: 1.4; }}
        .document-title {{ text-align: center; font-size: 20px; font-weight: bold; margin: 20px 0; }}
        .section {{ margin-bottom: 25px; }}
        .section-title {{ font-size: 16px; font-weight: bold; margin-bottom: 10px; }}
        .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 25px; }}
        .info-item {{ margin-bottom: 5px; }}
        .info-label {{ font-weight: bold; }}
        .payment-summary {{ background-color: #f5f5f5; padding: 15px; border-radius: 5px; }}
        .payment-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; text-align: center; }}
        .payment-label {{ font-size: 12px; color: #666; margin-bottom: 5px; }}
        .payment-value {{ font-size: 18px; font-weight: bold; }}
        .amount-total {{ color: #2563eb; }}
        .amount-paid {{ color: #16a34a; }}
        .amount-outstanding {{ color: #dc2626; }}
        .status-paid {{ color: #16a34a; }}
        .status-partial {{ color: #ca8a04; }}
        .status-unpaid {{ color: #dc2626; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; font-weight: bold; }}
        .text-center {{ text-align: center; }}
        .text-right {{ text-align: right; }}
        .totals-section {{ margin-top: 20px; }}
        .totals-table {{ width: 300px; margin-left: auto; }}
        .totals-table td {{ padding: 5px 10px; }}
        .total-row {{ border-top: 2px solid #000; font-weight: bold; }}
        .footer {{ margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }}
        @media print {{ body {{ margin: 0; }} }}
    </style>
</head>
<body>
    <div class="header">
        {logo_html}
        <div class="company-section">
            <div class="company-name">{company_name}</div>
            <div class="company-subtitle">INVENTORY MANAGEMENT SYSTEM</div>
            <div class="company-details">
                <div>{company_phone}</div>
                <div>{company_email}</div>
                <div>{company_gst}</div>
                <div>{company_address}</div>
            </div>
        </div>
    </div>
    
    <div class="document-title">VENDOR LEDGER</div>
    
    <div class="info-grid">
        <div class="section">
            <div class="section-title">GRN Information</div>
            <div class="info-item"><span class="info-label">GRN Number:</span> {grn.grn_number}</div>
            <div class="info-item"><span class="info-label">GRN Date:</span> {grn.grn_date.strftime('%d/%m/%Y') if grn.grn_date else ''}</div>
            <div class="info-item"><span class="info-label">Invoice Number:</span> {grn.invoice_number or '—'}</div>
            <div class="info-item"><span class="info-label">Store:</span> {grn.store or '—'}</div>
        </div>
        <div class="section">
            <div class="section-title">Vendor Information</div>
            <div class="info-item"><span class="info-label">Name:</span> {vendor.vendor_name if vendor else grn.vendor_name}</div>
            <div class="info-item"><span class="info-label">Email:</span> {grn.vendor_name}</div>
            {f'<div class="info-item"><span class="info-label">Phone:</span> {vendor.phone}</div>' if vendor and vendor.phone else ''}
            {f'<div class="info-item"><span class="info-label">Address:</span> {vendor.address}</div>' if vendor and vendor.address else ''}
        </div>
    </div>
    
    {items_html}
    
    <div class="totals-section">
        <table class="totals-table">
            <tr><td>Subtotal:</td><td class="text-right">₹{payment_details['total_amount']:.2f}</td></tr>
            <tr><td>Tax (0%):</td><td class="text-right">₹0.00</td></tr>
            <tr><td>Discount:</td><td class="text-right">₹0.00</td></tr>
            <tr class="total-row"><td>Grand Total:</td><td class="text-right">₹{payment_details['total_amount']:.2f}</td></tr>
        </table>
    </div>
    
    <div class="section">
        <div class="section-title">Payment Summary</div>
        <div class="payment-summary">
            <div class="payment-grid">
                <div class="payment-item">
                    <div class="payment-label">Total Amount</div>
                    <div class="payment-value amount-total">₹{payment_details['total_amount']:.2f}</div>
                </div>
                <div class="payment-item">
                    <div class="payment-label">Paid Amount</div>
                    <div class="payment-value amount-paid">₹{payment_details['paid_amount']:.2f}</div>
                </div>
                <div class="payment-item">
                    <div class="payment-label">Outstanding</div>
                    <div class="payment-value amount-outstanding">₹{payment_details['outstanding_amount']:.2f}</div>
                </div>
                <div class="payment-item">
                    <div class="payment-label">Status</div>
                    <div class="payment-value status-{payment_details['payment_status'].lower()}">{payment_details['payment_status']}</div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p>This is a computer generated document. No signature required.</p>
        <p>Generated on: {date.today().strftime('%d/%m/%Y %H:%M:%S')}</p>
    </div>
</body>
</html>
    """

def get_logo_html(logo_path):
    """Get logo HTML with base64 encoded image or placeholder"""
    if not logo_path:
        return '<div class="logo-placeholder"><span style="color: #666; font-size: 12px;">LOGO</span></div>'
    
    try:
        from pathlib import Path
        import base64
        import os
        
        # Try multiple possible paths for the logo
        possible_paths = []
        filename = Path(logo_path).name
        
        possible_paths.extend([
            Path('uploads') / filename,
            Path('backend/uploads') / filename,
            Path(logo_path),
            Path('uploads') / logo_path,
        ])
        
        logo_file_path = None
        for path in possible_paths:
            if path.exists():
                logo_file_path = path
                break
        
        if logo_file_path and logo_file_path.exists():
            # Read logo file and convert to base64
            with open(logo_file_path, 'rb') as f:
                logo_data = f.read()
            
            if len(logo_data) > 0:
                # Get file extension for MIME type
                file_ext = logo_file_path.suffix.lower()
                mime_type = 'image/jpeg' if file_ext in ['.jpg', '.jpeg'] else 'image/png'
                
                # Convert to base64
                logo_base64 = base64.b64encode(logo_data).decode('utf-8')
                
                return f'<div class="logo-section"><img src="data:{mime_type};base64,{logo_base64}" alt="Company Logo"></div>'
    
    except Exception as e:
        print(f"Error loading logo: {e}")
    
    # Fallback to placeholder
    return '<div class="logo-placeholder"><span style="color: #666; font-size: 12px;">LOGO</span></div>'

@router.get("/test")
async def test_endpoint():
    return {"message": "Router is working"}

@router.get("/{grn_number}")
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

