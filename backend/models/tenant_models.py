# ------------------ Department Model ------------------

from sqlalchemy import Column, Integer, String, Boolean, DateTime,Table, ForeignKey,Text,Float,Date,Enum
import enum
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



# =========================================================
# GLOBAL INVENTORY RULES
# =========================================================
class InventoryGlobalRule(TenantBase):
    __tablename__ = "inventory_global_rules"

    id = Column(Integer, primary_key=True)
    min_stock_percent = Column(Float, nullable=False)
    max_stock_percent = Column(Float, nullable=False)
    safety_stock_formula = Column(String(255), nullable=False)
    reorder_method = Column(String(50), nullable=False)
    allow_negative_stock = Column(Boolean, default=False)
    issue_method = Column(String(20), default="FIFO")

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


# =========================================================
# ITEM LEVEL REORDER RULES
# =========================================================
class ItemReorderRule(TenantBase):
    __tablename__ = "item_reorder_rules"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, nullable=False)

    min_level = Column(Float, nullable=False)
    max_level = Column(Float, nullable=False)
    reorder_level = Column(Float, nullable=False)
    safety_stock = Column(Float, nullable=False)

    auto_po = Column(Boolean, default=False)
    remarks = Column(Text)

    created_at = Column(DateTime, server_default=func.now())


# =========================================================
# LEAD TIME SETTINGS
# =========================================================
class ItemVendorLeadTime(TenantBase):
    __tablename__ = "item_vendor_lead_times"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, nullable=False)
    vendor_id = Column(Integer, nullable=False)

    avg_lead_time = Column(Integer, nullable=False)
    min_lead_time = Column(Integer, nullable=False)
    max_lead_time = Column(Integer, nullable=False)

    created_at = Column(DateTime, server_default=func.now())


# =========================================================
# ALERT & NOTIFICATION RULES
# =========================================================
class InventoryAlertRule(TenantBase):
    __tablename__ = "inventory_alert_rules"

    id = Column(Integer, primary_key=True)

    alert_method = Column(String(50), nullable=False)
    alert_trigger_percent = Column(Float, nullable=False)
    dashboard_priority = Column(String(20), nullable=False)

    notify_store_keeper = Column(Boolean, default=False)
    notify_purchase_manager = Column(Boolean, default=False)
    notify_department_head = Column(Boolean, default=False)
    notify_admin = Column(Boolean, default=False)

    auto_pr = Column(Boolean, default=False)
    auto_po = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())

class Item(TenantBase):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)

    # 1. Item Basic Information
    name = Column(String(150), nullable=False)
    item_code = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))

    # 2. Classification & Properties
    category = Column(String(100))
    sub_category = Column(String(100))
    brand = Column(String(100))
    manufacturer = Column(String(150))

    # 3. UOM & Inventory Settings
    uom = Column(String(50))
    min_stock = Column(Integer, default=0)
    max_stock = Column(Integer, default=0)
    reorder_level = Column(Integer, default=0)

    # 4. Batch & Expiry Management
    is_batch_managed = Column(Boolean, default=False)
    has_expiry = Column(Boolean, default=False)
    expiry_date = Column(Date, nullable=True)

    # 5. Barcode / QR
    barcode = Column(String(100), unique=True, nullable=True)
    qr_code = Column(String(100), unique=True, nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ================= ENUMS =================
class VendorVerificationStatus(str, enum.Enum):
    pending = "Pending"
    verified = "Verified"
    rejected = "Rejected"

class VendorApprovalStatus(str, enum.Enum):
    approved = "Approved"
    pending = "Pending"
    rejected = "Rejected"

class VendorRiskCategory(str, enum.Enum):
    low = "Low"
    medium = "Medium"
    high = "High"

# ================= VENDOR =================
class Vendor(TenantBase):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True)
    vendor_name = Column(String(150), nullable=False)
    vendor_code = Column(String(50), unique=True, index=True)

    contact_person = Column(String(100))
    phone = Column(String(20), nullable=False)
    email = Column(String(100), nullable=False)

    address = Column(Text)
    country = Column(String(50))
    state = Column(String(50))
    city = Column(String(50))

    pan_number = Column(String(20))
    gst_number = Column(String(20))

    verification_status = Column(
        Enum(VendorVerificationStatus),
        default=VendorVerificationStatus.pending
    )

# ================= QUALIFICATION / AVL =================
class VendorQualification(TenantBase):
    __tablename__ = "vendor_qualifications"

    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))

    approval_status = Column(
        Enum(VendorApprovalStatus),
        default=VendorApprovalStatus.pending
    )

    category = Column(String(100))
    risk_category = Column(Enum(VendorRiskCategory))
    audit_status = Column(String(50))
    notes = Column(Text)

# ================= CONTRACT =================
class VendorContract(TenantBase):
    __tablename__ = "vendor_contracts"

    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))

    contract_type = Column(String(50))
    start_date = Column(Date)
    end_date = Column(Date)

# ================= CONTRACT ITEMS =================
class VendorContractItem(TenantBase):
    __tablename__ = "vendor_contract_items"

    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("vendor_contracts.id"))

    item_name = Column(String(100))
    contract_price = Column(Float)
    currency = Column(String(10))
    moq = Column(Integer)

# ================= PERFORMANCE =================
class VendorPerformance(TenantBase):
    __tablename__ = "vendor_performance"

    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))

    delivery_quality = Column(Float)
    delivery_timeliness = Column(Float)
    response_time = Column(Float)
    pricing_competitiveness = Column(Float)
    compliance = Column(Float)
    overall_rating = Column(Float)

    comments = Column(Text)

# ================= LEAD TIME =================
class VendorLeadTime(TenantBase):
    __tablename__ = "vendor_lead_time"

    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))

    item_name = Column(String(100))
    avg_days = Column(Integer)
    min_days = Column(Integer)
    max_days = Column(Integer)
