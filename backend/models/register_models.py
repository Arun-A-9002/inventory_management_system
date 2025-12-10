from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base

# ⬇️ IMPORT LOGGERS
from utils.logger import log_api, log_audit, log_error

Base = declarative_base()

class Tenant(Base):
    __tablename__ = "master_tenant"

    id = Column(Integer, primary_key=True, autoincrement=True)

    organization_name = Column(String(255), nullable=False)
    organization_type = Column(String(100))
    organization_license_number = Column(String(100))
    organization_address = Column(String(255))
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(20))
    contact_phone = Column(String(50))
    contact_email = Column(String(191))

    admin_name = Column(String(255))
    admin_email = Column(String(100), unique=True, index=True, nullable=False)
    admin_phone = Column(String(50))
    admin_secondary_phone = Column(String(50))
    designation = Column(String(100))

    status = Column(String(50))
    password_hash = Column(String(255))
    database_name = Column(String(255))

    # NEW FIELDS for refresh token rotation
    refresh_token_hash = Column(String(255), nullable=True)
    refresh_token_expires_at = Column(DateTime, nullable=True)

    # ---------------------------
    # LOG WHEN MODEL IS CREATED
    # ---------------------------
    def __init__(self, **kwargs):
        try:
            super().__init__(**kwargs)

            log_audit(
                f"[Tenant Model Instantiated] Org={kwargs.get('organization_name')} | "
                f"Admin={kwargs.get('admin_email')}"
            )

        except Exception as e:
            log_error(e, location="Tenant Model __init__")

    # ---------------------------
    # LOG WHEN PRINTING MODEL
    # ---------------------------
    def __repr__(self):
        try:
            return f"<Tenant id={self.id} org={self.organization_name} admin={self.admin_email}>"
        except Exception as e:
            log_error(e, location="Tenant Model __repr__")
            return "<Tenant Error>"
