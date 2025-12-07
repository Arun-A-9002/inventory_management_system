from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

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
    created_at = Column(String(100))




