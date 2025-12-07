from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from schemas.register_schema import RegisterModel
from database import get_master_db, create_tenant_database, get_tenant_engine
from models.register_models import Tenant
fr

router = APIRouter()

# ------------------ REGISTER ORGANIZATION ------------------
@router.post("/register")
def register(data: RegisterModel):

    def get_db_name_from_organization(name):
        db = re.sub(r"[^a-zA-Z0-9_]", "_", name.lower())
        return db if db[0].isalpha() else f"org_{db}"

    tenant_db = get_db_name_from_organization(data.organization_name)

    try:
        with connect() as conn:
            cursor = conn.cursor()

            cursor.execute(f"USE {MASTER_DB}")
            cursor.execute(
                "SELECT admin_email FROM tenants WHERE admin_email=%s",
                (data.admin_email,)
            )

            if cursor.fetchone():
                raise HTTPException(400, "Admin email already exists")

            cursor.execute(f"CREATE DATABASE {tenant_db}")

            cursor.execute(f"USE {MASTER_DB}")
            cursor.execute("""
                INSERT INTO tenants (
                    organization_name, organization_type, organization_license_number,
                    organization_address, city, state, pincode,
                    contact_phone, contact_email,
                    admin_name, admin_email, admin_phone,
                    admin_secondary_phone, designation,
                    status, password_hash, database_name, created_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    SHA2(%s,256), %s, NOW()
                )
            """, (
                data.organization_name, data.organization_type, data.organization_license_number,
                data.organization_address, data.city, data.state, data.pincode,
                data.contact_phone, data.contact_email,
                data.admin_name, data.admin_email, data.admin_phone,
                data.admin_secondary_phone, data.designation,
                data.status, data.password, tenant_db
            ))

            # create_tenant_tables(tenant_db)  # TODO: implement this


            conn.commit()

        return {"message": "Organization registered successfully"}

    except Exception as e:
        raise HTTPException(500, str(e))
    