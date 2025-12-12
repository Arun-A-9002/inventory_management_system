from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_tenant_db
from models.tenant_models import UOM
from schemas.tenant_schemas import (
    UOMCreate, UOMUpdate, UOMResponse
)

from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/uom", tags=["UOM"])


# --------------------------
# CREATE UOM
# --------------------------
@router.post("/", response_model=UOMResponse)
def create_uom(data: UOMCreate, db: Session = Depends(get_tenant_db)):
    log_api("CREATE UOM")

    try:
        # Optional duplicate check
        exists = db.query(UOM).filter(UOM.name == data.name).first()
        if exists:
            raise HTTPException(400, "UOM already exists")

        uom = UOM(**data.dict())
        db.add(uom)
        db.commit()
        db.refresh(uom)

        log_audit(f"UOM created → {uom.name}")
        return uom

    except Exception as e:
        log_error(e, "create_uom")
        raise HTTPException(500, "Failed to create UOM")


# --------------------------
# LIST ALL UOMs
# --------------------------
@router.get("/", response_model=list[UOMResponse])
def list_uom(db: Session = Depends(get_tenant_db)):
    return db.query(UOM).all()


# --------------------------
# GET ONE UOM
# --------------------------
@router.get("/{uom_id}", response_model=UOMResponse)
def get_uom(uom_id: int, db: Session = Depends(get_tenant_db)):
    uom = db.query(UOM).filter(UOM.id == uom_id).first()
    if not uom:
        raise HTTPException(404, "UOM not found")
    return uom


# --------------------------
# UPDATE UOM
# --------------------------
@router.put("/{uom_id}", response_model=UOMResponse)
def update_uom(uom_id: int, data: UOMUpdate, db: Session = Depends(get_tenant_db)):
    log_api("UPDATE UOM")

    uom = db.query(UOM).filter(UOM.id == uom_id).first()
    if not uom:
        raise HTTPException(404, "UOM not found")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(uom, key, value)

    db.commit()
    db.refresh(uom)

    log_audit(f"UOM updated → {uom.name}")
    return uom


# --------------------------
# DELETE UOM
# --------------------------
@router.delete("/{uom_id}")
def delete_uom(uom_id: int, db: Session = Depends(get_tenant_db)):
    log_api("DELETE UOM")

    uom = db.query(UOM).filter(UOM.id == uom_id).first()
    if not uom:
        raise HTTPException(404, "UOM not found")

    db.delete(uom)
    db.commit()

    log_audit(f"UOM deleted → {uom_id}")
    return {"message": "UOM deleted"}
