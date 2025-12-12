# ------------------ Department Model ------------------

from sqlalchemy import Column, Integer, String, Boolean, DateTime,Table, ForeignKey,Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

# Base class for tenant-specific models
TenantBase = declarative_base()

class Department(TenantBase):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(191), unique=True, nullable=False)
    description = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

# Association table for Role <-> Permission (many-to-many)
role_permissions = Table(
    "role_permissions",
    TenantBase.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)



class Role(TenantBase):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(191), unique=True, nullable=False)
    description = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)

    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles", lazy="joined")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Permission(TenantBase):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(191), unique=True, nullable=False)  # e.g., departments.view
    label = Column(String(255), nullable=False)               # e.g., Departments — View
    group = Column(String(100), nullable=True)                # e.g., Departments

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions", lazy="joined")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

# User <-> Role many-to-many association table
user_roles = Table(
    "user_roles",
    TenantBase.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

class User(TenantBase):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(191), nullable=False)
    email = Column(String(191), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_doctor = Column(Boolean, default=False)

    # department: single relationship to departments table (one-to-many)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = relationship("Department", lazy="joined")

    roles = relationship("Role", secondary=user_roles, backref="users", lazy="joined")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# ============================================================
#                        COMPANY
# ============================================================
class Company(TenantBase):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(191), nullable=False)
    code = Column(String(100), nullable=True)

    gst_number = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)

    contact_person = Column(String(191), nullable=True)
    email = Column(String(191), nullable=True)
    phone = Column(String(100), nullable=True)

    logo = Column(String(500), nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relations
    branches = relationship(
        "Branch",
        back_populates="company",
        cascade="all, delete-orphan"
    )


# ============================================================
#                        BRANCH / LOCATION
# ============================================================
class Branch(TenantBase):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)

    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(191), nullable=False)
    code = Column(String(100), nullable=True)

    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relations
    company = relationship("Company", back_populates="branches")
    stores = relationship("Store", back_populates="branch", cascade="all, delete-orphan")


# ============================================================
#                        STORE
# ============================================================
class Store(TenantBase):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)

    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(191), nullable=False)
    code = Column(String(100), nullable=True)

    store_type = Column(String(100), nullable=False)   # e.g. Pharmacy, Warehouse, General
    is_central = Column(Boolean, default=False)

    description = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relation
    branch = relationship("Branch", back_populates="stores")


# ============================================================
#                        CATEGORY
# ============================================================
class Category(TenantBase):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(191), nullable=False)
    description = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relation
    subcategories = relationship(
        "SubCategory",
        back_populates="category",
        cascade="all, delete-orphan"
    )


# ============================================================
#                        SUB CATEGORY
# ============================================================
class SubCategory(TenantBase):
    __tablename__ = "subcategories"

    id = Column(Integer, primary_key=True, index=True)

    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(191), nullable=False)
    description = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relation
    category = relationship("Category", back_populates="subcategories")


# ============================================================
#                        BRAND
# ============================================================
class Brand(TenantBase):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)

    brand_name = Column(String(191), nullable=False)
    manufacturer_name = Column(String(191), nullable=True)

    contact_number = Column(String(50), nullable=True)
    email = Column(String(191), nullable=True)
    website = Column(String(255), nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


# ============================================================
#                        UOM (Unit of Measure)
# ============================================================
class UOM(TenantBase):
    __tablename__ = "uoms"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(191), nullable=False)
    code = Column(String(100), nullable=True)
    conversion_factor = Column(String(50), default="1.0")

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


# ============================================================
#                        TAX CODE
# ============================================================
class TaxCode(TenantBase):
    __tablename__ = "tax_codes"

    id = Column(Integer, primary_key=True, index=True)

    hsn_code = Column(String(191), nullable=False)
    description = Column(Text, nullable=True)
    gst_percentage = Column(String(50), nullable=False)
    cgst = Column(String(50), nullable=True)
    sgst = Column(String(50), nullable=True)
    igst = Column(String(50), nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())