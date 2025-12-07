from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from schemas.register_schema import RegisterModel
from models.register_models import Tenant
from database import get_master_db, create_tenant_database
import hashlib
import re

router = APIRouter()  

# ---------- Generate Safe Database Name ----------
def to_db_name(name: str):
    clean = re.sub(r"[^a-zA-Z0-9_]", "_", name.lower())
    return clean if clean[0].isalpha() else f"org_{clean}"

# ------------------ REGISTER ----------------------
@router.post("/register")
def register(data: RegisterModel, db: Session = Depends(get_master_db)):

    # check existing admin email
    if db.query(Tenant).filter(Tenant.admin_email == data.admin_email).first():
        raise HTTPException(400, "Admin email already exists")

    db_name = to_db_name(data.organization_name)

    # hash password
    hashed_password = hashlib.sha256(data.password.encode()).hexdigest()

    # create tenant record
    tenant = Tenant(
        organization_name=data.organization_name,
        organization_type=data.organization_type,
        organization_license_number=data.organization_license_number,
        organization_address=data.organization_address,
        city=data.city,
        state=data.state,
        pincode=data.pincode,
        contact_phone=data.contact_phone,
        contact_email=data.contact_email,

        admin_name=data.admin_name,
        admin_email=data.admin_email,
        admin_phone=data.admin_phone,
        admin_secondary_phone=data.admin_secondary_phone,
        designation=data.designation,

        status=data.status,
        password_hash=hashed_password,
        database_name=db_name,
    )

    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    # create tenant database
    create_tenant_database(db_name)

    return {"message": "Organization registered successfully", "id": tenant.id}
