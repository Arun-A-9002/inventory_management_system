from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
import uuid

from database import get_tenant_db
from models.tenant_models import GRN, GRNItem, Batch, QCInspection, GRNStatus
from schemas.tenant_schemas import GRNCreate, QCCreate

router = APIRouter(prefix="/grn", tags=["Goods Receipt & Inspection"])

# ---------------- CREATE GRN ----------------
@router.post("/create")
def create_grn(data: GRNCreate, db: Session = Depends(get_tenant_db)):
    grn = GRN(
        grn_number=f"GRN-{uuid.uuid4().hex[:8]}",
        grn_date=data.grn_date,
        po_number=data.po_number,
        vendor_name=data.vendor_name,
        store=data.store
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

    db.commit()
    return {"message": "GRN Created", "grn_number": grn.grn_number}

# ---------------- QC ----------------
@router.post("/{grn_id}/qc")
def qc_inspection(grn_id: int, data: QCCreate, db: Session = Depends(get_tenant_db)):
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
def approve_grn(grn_id: int, db: Session = Depends(get_tenant_db)):
    grn = db.query(GRN).filter(GRN.id == grn_id).first()
    if not grn:
        raise HTTPException(404, "GRN not found")

    grn.status = GRNStatus.approved
    db.commit()
    return {"message": "GRN Approved & Stock Updated"}
