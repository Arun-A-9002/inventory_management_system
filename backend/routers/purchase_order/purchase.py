from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_tenant_db
from datetime import date
import uuid
import os

from models.tenant_models import (
    PurchaseRequest, PurchaseRequestItem,
    PurchaseOrder, PurchaseOrderItem,
    VendorQuotation,
    RateContract,
    POTracking,
    Item
)

from schemas.tenant_schemas import *

router = APIRouter(
    prefix="/purchase",
    tags=["Purchase Management"]
)

DEFAULT_TENANT_DB = "arun"

def get_tenant_session():
    yield from get_tenant_db(DEFAULT_TENANT_DB)

# =====================================================
# PURCHASE REQUEST (PR)
# =====================================================
@router.post("/")
def create_purchase_request(data: PRCreate, db: Session = Depends(get_tenant_session)):
    pr_number = f"PR-{uuid.uuid4().hex[:6].upper()}"

    pr = PurchaseRequest(
        pr_number=pr_number,
        requested_by=data.requested_by,
        request_date=date.today()
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)

    for item in data.items:
        pr_item = PurchaseRequestItem(
            pr_id=pr.id,
            **item.dict()
        )
        db.add(pr_item)

    db.commit()
    return pr

@router.post("/pr")
def create_purchase_request_pr(data: PRCreate, db: Session = Depends(get_tenant_session)):
    pr_number = f"PR-{uuid.uuid4().hex[:6].upper()}"

    pr = PurchaseRequest(
        pr_number=pr_number,
        requested_by=data.requested_by,
        request_date=date.today()
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)

    for item in data.items:
        pr_item = PurchaseRequestItem(
            pr_id=pr.id,
            **item.dict()
        )
        db.add(pr_item)

    db.commit()
    return pr


@router.get("/")
def get_purchase_requests(db: Session = Depends(get_tenant_session)):
    prs = db.query(PurchaseRequest).all()
    return prs

@router.get("/pr")
def get_purchase_requests_pr(db: Session = Depends(get_tenant_session)):
    prs = db.query(PurchaseRequest).all()
    return prs

@router.get("/po")
def list_purchase_orders(db: Session = Depends(get_tenant_session)):
    pos = db.query(PurchaseOrder).all()
    return pos

@router.get("/{pr_id}")
def get_purchase_request_by_id(pr_id: int, db: Session = Depends(get_tenant_session)):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Request not found")
    
    # Get PR with items
    pr_data = {
        "id": pr.id,
        "pr_number": pr.pr_number,
        "requested_by": pr.requested_by,
        "request_date": pr.request_date,
        "status": pr.status.value if pr.status else "Draft",
        "items": [
            {
                "id": item.id,
                "item_name": item.item_name,
                "quantity": item.quantity,
                "uom": item.uom,
                "priority": item.priority,
                "remarks": item.remarks
            }
            for item in pr.items
        ]
    }
    return pr_data


# =====================================================
# PURCHASE ORDER (PO)
# =====================================================
@router.post("/po")
def create_purchase_order(data: POCreate, db: Session = Depends(get_tenant_session)):
    po_number = f"PO-{uuid.uuid4().hex[:6].upper()}"

    po = PurchaseOrder(
        po_number=po_number,
        pr_number=data.pr_number,
        vendor=data.vendor,
        po_date=date.today()
    )
    db.add(po)
    db.commit()
    db.refresh(po)

    for item in data.items:
        po_item = PurchaseOrderItem(
            po_id=po.id,
            **item.dict()
        )
        db.add(po_item)

    db.commit()
    return {
        "message": "Purchase Order created",
        "po_number": po_number
    }


# =====================================================
# VENDOR QUOTATION
# =====================================================
@router.post("/quotation")
def add_vendor_quotation(data: QuotationCreate, db: Session = Depends(get_tenant_session)):
    quotation = VendorQuotation(**data.dict())
    db.add(quotation)
    db.commit()
    return {"message": "Vendor quotation added"}


@router.get("/quotation")
def get_quotations(db: Session = Depends(get_tenant_session)):
    quotations = db.query(VendorQuotation).all()
    return quotations

@router.get("/quotation/{pr_number}")
def get_quotations_by_pr(pr_number: str, db: Session = Depends(get_tenant_session)):
    return db.query(VendorQuotation).filter(
        VendorQuotation.pr_number == pr_number
    ).all()


# =====================================================
# RATE CONTRACT
# =====================================================
@router.post("/rate-contract")
def create_rate_contract(data: RateContractCreate, db: Session = Depends(get_tenant_session)):
    contract = RateContract(**data.dict())
    db.add(contract)
    db.commit()
    return {"message": "Rate contract created"}


@router.get("/rate-contract")
def get_rate_contracts(db: Session = Depends(get_tenant_session)):
    contracts = db.query(RateContract).all()
    return contracts

@router.get("/rate-contract/{vendor}")
def get_rate_contracts_by_vendor(vendor: str, db: Session = Depends(get_tenant_session)):
    return db.query(RateContract).filter(
        RateContract.vendor == vendor
    ).all()


# =====================================================
# PO TRACKING & DELIVERY
# =====================================================
@router.post("/po-tracking")
def update_po_tracking(data: POTrackingCreate, db: Session = Depends(get_tenant_session)):
    # Generate tracking number if not provided
    tracking_number = data.tracking_number or f"TRK-{uuid.uuid4().hex[:8].upper()}"
    
    # Get PO details for email
    po = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == data.po_number).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    
    # Check if tracking already exists for this PO
    existing_tracking = db.query(POTracking).filter(POTracking.po_number == data.po_number).first()
    
    if existing_tracking:
        # Update existing tracking
        existing_tracking.dispatch_date = data.dispatch_date
        existing_tracking.transporter = data.transporter
        existing_tracking.expected_delivery = data.expected_delivery
        existing_tracking.status = data.status
        existing_tracking.remarks = data.remarks
        tracking = existing_tracking
    else:
        # Create new tracking
        tracking = POTracking(
            po_number=data.po_number,
            dispatch_date=data.dispatch_date,
            transporter=data.transporter,
            tracking_number=tracking_number,
            expected_delivery=data.expected_delivery,
            status=data.status,
            remarks=data.remarks
        )
        db.add(tracking)
    
    db.commit()
    db.refresh(tracking)
    
    # Send email only if status is not Pending
    email_sent = False
    if data.status and data.status != "Pending":
        try:
            send_tracking_email(po, tracking, data.status)
            email_sent = True
        except Exception as e:
            print(f"Email sending failed: {str(e)}")
    
    return {
        "message": "PO tracking updated",
        "tracking_number": tracking.tracking_number,
        "email_sent": email_sent
    }

def send_tracking_email(po, tracking, status):
    """Send professional tracking email based on status"""
    import os
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # Email templates based on status
    email_templates = {
        "Dispatched": {
            "subject": f"Order Dispatched - PO {po.po_number} | Tracking: {tracking.tracking_number}",
            "body": f"""
Dear {po.vendor},

We are pleased to inform you that your order has been dispatched.

Order Details:
• PO Number: {po.po_number}
• Dispatch Date: {tracking.dispatch_date}
• Transporter: {tracking.transporter}
• Tracking Number: {tracking.tracking_number}
• Expected Delivery: {tracking.expected_delivery}

You can track your shipment using the tracking number provided above.

Remarks: {tracking.remarks or 'N/A'}

Thank you for your business.

Best regards,
NUTRYAH Supply Chain Team
            """
        },
        "In Transit": {
            "subject": f"Order In Transit - PO {po.po_number} | Tracking: {tracking.tracking_number}",
            "body": f"""
Dear {po.vendor},

Your order is currently in transit and on its way to the destination.

Order Details:
• PO Number: {po.po_number}
• Transporter: {tracking.transporter}
• Tracking Number: {tracking.tracking_number}
• Expected Delivery: {tracking.expected_delivery}
• Current Status: In Transit

Please ensure someone is available to receive the shipment.

Remarks: {tracking.remarks or 'N/A'}

Best regards,
NUTRYAH Supply Chain Team
            """
        },
        "Out for Delivery": {
            "subject": f"Out for Delivery - PO {po.po_number} | Tracking: {tracking.tracking_number}",
            "body": f"""
Dear {po.vendor},

Your order is out for delivery and will be delivered today.

Order Details:
• PO Number: {po.po_number}
• Transporter: {tracking.transporter}
• Tracking Number: {tracking.tracking_number}
• Expected Delivery: Today

Please ensure someone is available to receive the shipment.

Remarks: {tracking.remarks or 'N/A'}

Best regards,
NUTRYAH Supply Chain Team
            """
        },
        "Delivered": {
            "subject": f"Order Delivered - PO {po.po_number} | Tracking: {tracking.tracking_number}",
            "body": f"""
Dear {po.vendor},

Your order has been successfully delivered.

Order Details:
• PO Number: {po.po_number}
• Delivered Date: {tracking.dispatch_date}
• Transporter: {tracking.transporter}
• Tracking Number: {tracking.tracking_number}

Thank you for choosing NUTRYAH. We look forward to serving you again.

Remarks: {tracking.remarks or 'N/A'}

Best regards,
NUTRYAH Supply Chain Team
            """
        },
        "Delayed": {
            "subject": f"Order Delayed - PO {po.po_number} | Tracking: {tracking.tracking_number}",
            "body": f"""
Dear {po.vendor},

We regret to inform you that your order has been delayed.

Order Details:
• PO Number: {po.po_number}
• Transporter: {tracking.transporter}
• Tracking Number: {tracking.tracking_number}
• Revised Expected Delivery: {tracking.expected_delivery}

We apologize for any inconvenience caused and are working to resolve this issue.

Remarks: {tracking.remarks or 'N/A'}

For any queries, please contact our support team.

Best regards,
NUTRYAH Supply Chain Team
            """
        }
    }
    
    template = email_templates.get(status)
    if not template:
        return
    
    # SMTP Configuration
    smtp_host = os.getenv('SMTP_HOST', 'smtp.office365.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_user = os.getenv('SMTP_USER', 'no-reply@nutryah.com')
    smtp_password = os.getenv('SMTP_PASSWORD', 'Nutryah@123')
    smtp_from = os.getenv('SMTP_FROM', 'NUTRYAH Supply Chain <no-reply@nutryah.com>')
    
    # Create email message
    msg = MIMEMultipart()
    msg['From'] = smtp_from
    msg['To'] = 'vendor@example.com'  # Replace with actual vendor email
    msg['Subject'] = template['subject']
    msg.attach(MIMEText(template['body'], 'plain'))
    
    # Send email via SMTP
    server = smtplib.SMTP(smtp_host, smtp_port)
    server.starttls()
    server.login(smtp_user, smtp_password)
    server.send_message(msg)
    server.quit()


@router.get("/po-tracking")
def get_po_tracking_list(db: Session = Depends(get_tenant_session)):
    try:
        tracking = db.query(POTracking).all()
        print(f"Found {len(tracking)} tracking records")
        for t in tracking:
            print(f"Tracking: {t.po_number} - {t.tracking_number} - {t.status}")
        return tracking
    except Exception as e:
        print(f"Error fetching tracking: {str(e)}")
        return []

@router.get("/po-tracking/{po_number}")
def get_po_tracking_by_number(po_number: str, db: Session = Depends(get_tenant_session)):
    return db.query(POTracking).filter(
        POTracking.po_number == po_number
    ).all()


# =====================================================
# ITEMS FOR PURCHASE MANAGEMENT
# =====================================================
@router.get("/items")
def get_items_for_purchase(db: Session = Depends(get_tenant_session)):
    """Get all active item names for purchase forms"""
    items = db.query(Item.name).filter(Item.is_active == True).all()
    return [item.name for item in items]


# ---------------- UPDATE PURCHASE REQUEST ----------------
@router.put("/{pr_id}")
def update_purchase_request(pr_id: int, data: PRCreate, db: Session = Depends(get_tenant_session)):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Request not found")
    
    # Update PR details
    pr.requested_by = data.requested_by
    
    # Delete existing items
    db.query(PurchaseRequestItem).filter(PurchaseRequestItem.pr_id == pr_id).delete()
    
    # Add new items
    for item in data.items:
        pr_item = PurchaseRequestItem(
            pr_id=pr.id,
            **item.dict()
        )
        db.add(pr_item)
    
    db.commit()
    db.refresh(pr)
    return pr

# ---------------- UPDATE PR STATUS ----------------
@router.patch("/{pr_id}/status")
def update_pr_status(pr_id: int, status: str, db: Session = Depends(get_tenant_session)):
    from models.tenant_models import PRStatus
    
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Request not found")
    
    # Validate status
    valid_statuses = ["draft", "submitted", "approved", "rejected"]
    if status.lower() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Update status
    if status.lower() == "draft":
        pr.status = PRStatus.draft
    elif status.lower() == "submitted":
        pr.status = PRStatus.submitted
    elif status.lower() == "approved":
        pr.status = PRStatus.approved
    elif status.lower() == "rejected":
        pr.status = PRStatus.rejected
    
    db.commit()
    return {"message": f"PR status updated to {status}"}

# ---------------- DELETE PURCHASE REQUEST ----------------
@router.delete("/{pr_id}")
def delete_purchase_request(pr_id: int, db: Session = Depends(get_tenant_session)):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase Request not found")
    
    db.delete(pr)
    db.commit()
    return {"message": "Purchase Request deleted successfully"}

# ---------------- TEST ENDPOINT ----------------
@router.get("/test")
def test_api():
    """Test if purchase API is working"""
    return {
        "message": "Purchase API is working!",
        "endpoints": {
            "list": "GET /purchase-requests/",
            "create": "POST /purchase-requests/",
            "update": "PUT /purchase-requests/{id}",
            "delete": "DELETE /purchase-requests/{id}"
        }
    }

# ---------------- SEND EMAIL TO VENDOR ----------------
@router.post("/send-email")
def send_email_to_vendor(data: dict, db: Session = Depends(get_tenant_session)):
    """Send email to vendor for approved PR"""
    try:
        import os
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        # Get PR details with items
        pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == data.get("pr_id")).first()
        if not pr:
            raise HTTPException(status_code=404, detail="Purchase Request not found")
        
        # Create email content with items
        items_list = "\n".join([
            f"- {item.item_name} (Qty: {item.quantity} {item.uom}) - Priority: {item.priority}"
            for item in pr.items
        ])
        
        email_body = f"""
Dear Vendor,

We would like to request a quotation for the following items in Purchase Request {data.get('pr_number')}:

{items_list}

Location: {data.get('location')}

Please provide your best rates and delivery timeline.

Thank you.

Best regards,
NUTRYAH Team
        """
        
        # SMTP Configuration from .env
        smtp_host = os.getenv('SMTP_HOST', 'smtp.office365.com')
        smtp_port = int(os.getenv('SMTP_PORT', 587))
        smtp_user = os.getenv('SMTP_USER', 'no-reply@nutryah.com')
        smtp_password = os.getenv('SMTP_PASSWORD', 'Nutryah@123')
        smtp_from = os.getenv('SMTP_FROM', 'NUTRYAH <no-reply@nutryah.com>')
        
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = smtp_from
        msg['To'] = data.get('vendor_email')
        msg['Subject'] = data.get('subject')
        msg.attach(MIMEText(email_body, 'plain'))
        
        # Send email via SMTP
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        
        return {
            "message": f"Email sent successfully to {data.get('vendor_email')}",
            "items_count": len(pr.items)
        }
    except Exception as e:
        print(f"Email error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

# ---------------- CREATE SAMPLE DATA ----------------
@router.post("/create-sample")
def create_sample_data(db: Session = Depends(get_tenant_session)):
    """Create sample purchase requests for testing"""
    # Clear existing data first
    db.query(PurchaseRequestItem).delete()
    db.query(PurchaseRequest).delete()
    db.commit()
    
    sample_prs = [
        {
            "requested_by": "John Doe",
            "items": [
                {
                    "item_name": "Paracetamol 500mg",
                    "quantity": 100,
                    "uom": "Tablet",
                    "priority": "High",
                    "remarks": "Urgent requirement"
                }
            ]
        },
        {
            "requested_by": "Jane Smith",
            "items": [
                {
                    "item_name": "Bandage Roll",
                    "quantity": 50,
                    "uom": "Pieces",
                    "priority": "Medium",
                    "remarks": "Regular stock"
                }
            ]
        },
        {
            "requested_by": "Mike Johnson",
            "items": [
                {
                    "item_name": "Syringe 5ml",
                    "quantity": 200,
                    "uom": "Pieces",
                    "priority": "Low",
                    "remarks": "Monthly stock"
                }
            ]
        }
    ]
    
    created_prs = []
    for pr_data in sample_prs:
        pr_number = f"PR-{uuid.uuid4().hex[:6].upper()}"
        pr = PurchaseRequest(
            pr_number=pr_number,
            requested_by=pr_data["requested_by"],
            request_date=date.today()
        )
        db.add(pr)
        db.commit()
        db.refresh(pr)
        
        for item_data in pr_data["items"]:
            pr_item = PurchaseRequestItem(
                pr_id=pr.id,
                **item_data
            )
            db.add(pr_item)
        
        created_prs.append({
            "id": pr.id,
            "pr_number": pr.pr_number,
            "requested_by": pr.requested_by
        })
    
    db.commit()
    return {
        "message": "Sample data created successfully",
        "created_prs": created_prs,
        "count": len(created_prs)
    }
