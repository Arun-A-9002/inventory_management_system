# backend/routers/register.py

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from schemas.register_schema import RegisterModel
from models.register_models import Tenant
from database import (
    get_master_db,
    create_tenant_database,
    get_tenant_engine
)
import hashlib
import re
import traceback

# Tenant model base (for creating tenant tables)
from models.tenant_models import TenantBase

# Logging
from utils.logger import log_error, log_audit, log_api

router = APIRouter()


# ---------- Generate Safe Database Name ----------
def to_db_name(name: str):
    clean = re.sub(r"[^a-zA-Z0-9_]", "_", name.lower())
    return clean if clean[0].isalpha() else f"org_{clean}"


# ------------------ REGISTER API ----------------------
@router.post("/register")
def register(data: RegisterModel, db: Session = Depends(get_master_db)):
    log_api("POST /register → Incoming registration request")

    try:
        log_audit(f"Registration initiated for Org: {data.organization_name}")

        # Check existing email
        if db.query(Tenant).filter(Tenant.admin_email == data.admin_email).first():
            log_error(
                Exception("Duplicate admin email"),
                location="register() - email already exists"
            )
            raise HTTPException(400, "Admin email already exists")

        # Generate DB name
        db_name = to_db_name(data.organization_name)
        log_audit(f"Generated DB Name: {db_name}")

        # Hash password
        hashed_password = hashlib.sha256(data.password.encode()).hexdigest()

        # Create new Tenant entry inside master DB
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
        log_audit(f"Tenant saved in master DB with ID: {tenant.id}")

        # -----------------------------------------------------
        # STEP 1 → Create the tenant database
        # -----------------------------------------------------
        create_tenant_database(db_name)
        log_audit(f"Database created for tenant: {db_name}")

        # -----------------------------------------------------
        # STEP 2 → Create tables inside tenant DB
        # -----------------------------------------------------
        tenant_engine = get_tenant_engine(db_name)
        TenantBase.metadata.create_all(bind=tenant_engine)

        log_audit(f"Tenant tables created for database: {db_name}")

        return {
            "message": "Organization registered successfully",
            "id": tenant.id
        }

    except HTTPException:
        raise

    except Exception as e:
        log_error(e, location="register() unexpected error")
        traceback.print_exc()
        raise HTTPException(500, "Internal server error")
