# backend/routers/register.py

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from schemas.register_schema import RegisterModel
from models.register_models import Tenant
from database import (
    get_master_db,
    get_tenant_engine
)
import hashlib
import re
import traceback

# Tenant model base (for creating tenant tables)
from models.tenant_models import TenantBase

# Logging
from utils.logger import log_error, log_audit, log_api

# Email utility
from utils.email_service_old import send_registration_email

# Permission seeding utility
from utils.seed_permission import seed_permissions_for_tenant

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

        # Check existing email and handle accordingly
        existing_tenant = db.query(Tenant).filter(Tenant.admin_email == data.admin_email).first()
        if existing_tenant:
            log_audit(f"Found existing registration for email: {data.admin_email}")
            
            # Option 1: Return error (current behavior)
            log_error(
                Exception("Duplicate admin email"),
                location="register() - email already exists"
            )
            raise HTTPException(400, "Admin email already exists")

        # Check existing tenant code
        existing_tenant_code = db.query(Tenant).filter(Tenant.tenant_code == data.tenant_code).first()
        if existing_tenant_code:
            log_audit(f"Found existing tenant code: {data.tenant_code}")
            log_error(
                Exception("Duplicate tenant code"),
                location="register() - tenant code already exists"
            )
            raise HTTPException(409, "Tenant code already exists")
            
            # Option 2: Update existing registration (uncomment below to enable)
            # log_audit(f"Updating existing registration for: {data.admin_email}")
            # # Delete old tenant database if it exists
            # old_db_name = existing_tenant.database_name
            # try:
            #     import pymysql
            #     conn = pymysql.connect(host="localhost", user="root", password="", port=3306)
            #     cursor = conn.cursor()
            #     cursor.execute(f"DROP DATABASE IF EXISTS `{old_db_name}`")
            #     conn.close()
            #     log_audit(f"Deleted old database: {old_db_name}")
            # except Exception as e:
            #     log_error(e, f"Failed to delete old database: {old_db_name}")
            # 
            # # Update existing tenant record
            # existing_tenant.organization_name = data.organization_name
            # existing_tenant.organization_type = data.organization_type
            # existing_tenant.organization_license_number = data.organization_license_number
            # existing_tenant.organization_address = data.organization_address
            # existing_tenant.city = data.city
            # existing_tenant.state = data.state
            # existing_tenant.pincode = data.pincode
            # existing_tenant.contact_phone = data.contact_phone
            # existing_tenant.contact_email = data.contact_email
            # existing_tenant.tenant_code = data.tenant_code
            # existing_tenant.admin_name = data.admin_name
            # existing_tenant.admin_phone = data.admin_phone
            # existing_tenant.admin_secondary_phone = data.admin_secondary_phone
            # existing_tenant.designation = data.designation
            # existing_tenant.status = data.status
            # existing_tenant.password_hash = hashlib.sha256(data.password.encode()).hexdigest()
            # existing_tenant.database_name = data.tenant_code.lower().strip()
            # 
            # tenant = existing_tenant

        # Only create new tenant if no existing one found
        # Generate DB name from tenant code
        db_name = data.tenant_code.lower().strip()
        log_audit(f"Using tenant code as DB Name: {db_name}")

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
            tenant_code=data.tenant_code,

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
        # Get the database name for further processing
        db_name = tenant.database_name

        # -----------------------------------------------------
        # STEP 1 → Create the tenant database
        # -----------------------------------------------------
        import pymysql
        conn = pymysql.connect(host="localhost", user="root", password="", port=3306)
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        conn.close()
        log_audit(f"Database created for tenant: {db_name}")

        # -----------------------------------------------------
        # STEP 2 → Create tables inside tenant DB
        # -----------------------------------------------------
        tenant_engine = get_tenant_engine(db_name)
        TenantBase.metadata.create_all(bind=tenant_engine)

        log_audit(f"Tenant tables created for database: {db_name}")

        # -----------------------------------------------------
        # STEP 3 → Seed permissions in tenant DB
        # -----------------------------------------------------
        permissions_seeded = seed_permissions_for_tenant(db_name)
        if permissions_seeded:
            log_audit(f"Permissions seeded successfully for tenant: {db_name}")
        else:
            log_error(Exception("Permission seeding failed"), f"Failed to seed permissions for tenant: {db_name}")

        # -----------------------------------------------------
        # STEP 4 → Create admin user in tenant DB
        # -----------------------------------------------------
        from models.tenant_models import User, Department
        from sqlalchemy.orm import sessionmaker
        
        TenantSession = sessionmaker(bind=tenant_engine)
        tenant_db = TenantSession()
        
        try:
            # Create default department if not exists
            default_dept = tenant_db.query(Department).filter(Department.name == "Administration").first()
            if not default_dept:
                default_dept = Department(
                    name="Administration",
                    description="Default administration department",
                    is_active=True
                )
                tenant_db.add(default_dept)
                tenant_db.commit()
                tenant_db.refresh(default_dept)
                log_audit(f"Default department created in tenant DB: {db_name}")
            
            # Create admin user with proper password hashing
            from utils.auth import hash_password
            
            admin_user = User(
                full_name=data.admin_name,
                email=data.admin_email,
                hashed_password=hash_password(data.password),  # Use the same hashing as tenant users
                is_active=True,
                department_id=default_dept.id
            )
            tenant_db.add(admin_user)
            tenant_db.commit()
            tenant_db.refresh(admin_user)
            log_audit(f"Admin user created in tenant DB: {db_name} with ID: {admin_user.id}")
            
        except Exception as e:
            tenant_db.rollback()
            log_error(e, f"Failed to create admin user in tenant DB: {db_name}")
            raise e
        finally:
            tenant_db.close()

        # Send registration confirmation email
        email_sent = send_registration_email(
            admin_email=data.admin_email,
            organization_name=data.organization_name,
            admin_name=data.admin_name
        )
        
        if email_sent:
            log_audit(f"Registration email sent to {data.admin_email}")
        else:
            log_error(Exception("Email sending failed"), f"Failed to send registration email to {data.admin_email}")

        return {
            "message": "Organization registered successfully",
            "id": tenant.id,
            "database_name": db_name,
            "permissions_seeded": permissions_seeded,
            "email_sent": email_sent
        }

    except HTTPException:
        raise

    except Exception as e:
        log_error(e, location="register() unexpected error")
        traceback.print_exc()
        raise HTTPException(500, "Internal server error")
