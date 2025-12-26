# ------------------ Department Model ------------------

from sqlalchemy import Column, Integer, String, Boolean, DateTime,Table, ForeignKey,Text,Float,Date,Enum,DECIMAL
import enum
from datetime import date
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
    
    # 4. Pricing Information
    fixing_price = Column(DECIMAL(10, 2), default=0.00)
    mrp = Column(DECIMAL(10, 2), default=0.00)
    tax = Column(Float, default=0.0)

    # 5. Batch & Expiry Management
    is_batch_managed = Column(Boolean, default=False)
    has_expiry = Column(Boolean, default=False)
    expiry_date = Column(Date, nullable=True)
    
    # 6. Warranty Management
    has_warranty = Column(Boolean, default=False)
    warranty_start_date = Column(Date, nullable=True)
    warranty_end_date = Column(Date, nullable=True)

    # 7. Barcode / QR
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



#---------------porchse order models ---------------


# ---------------- ENUMS ----------------
class PRStatus(str, enum.Enum):
    draft = "Draft"
    submitted = "Submitted"
    approved = "Approved"
    rejected = "Rejected"


class POStatus(str, enum.Enum):
    draft = "Draft"
    pending = "Pending Approval"
    approved = "Approved"


class DeliveryStatus(str, enum.Enum):
    dispatched = "Dispatched"
    in_transit = "In Transit"
    delivered = "Delivered"


# ---------------- PURCHASE REQUEST ----------------
class PurchaseRequest(TenantBase):
    __tablename__ = "purchase_requests"

    id = Column(Integer, primary_key=True)
    pr_number = Column(String(50), unique=True)
    requested_by = Column(String(100))
    request_date = Column(Date, default=date.today)
    status = Column(Enum(PRStatus), default=PRStatus.draft)

    items = relationship("PurchaseRequestItem", back_populates="pr")


class PurchaseRequestItem(TenantBase):
    __tablename__ = "purchase_request_items"

    id = Column(Integer, primary_key=True)
    pr_id = Column(Integer, ForeignKey("purchase_requests.id"))
    item_name = Column(String(100))
    quantity = Column(Float)
    uom = Column(String(20))
    priority = Column(String(20))
    remarks = Column(String(255))

    pr = relationship("PurchaseRequest", back_populates="items")


# ---------------- PURCHASE ORDER ----------------
class PurchaseOrder(TenantBase):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True)
    po_number = Column(String(50), unique=True)
    pr_number = Column(String(50))
    vendor = Column(String(100))
    po_date = Column(Date, default=date.today)
    status = Column(Enum(POStatus), default=POStatus.draft)

    items = relationship("PurchaseOrderItem", back_populates="po")


class PurchaseOrderItem(TenantBase):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"))
    item_name = Column(String(100))
    quantity = Column(Float)
    rate = Column(Float)
    tax = Column(Float)
    discount = Column(Float)

    po = relationship("PurchaseOrder", back_populates="items")


# ---------------- QUOTATION ----------------
class VendorQuotation(TenantBase):
    __tablename__ = "vendor_quotations"

    id = Column(Integer, primary_key=True)
    pr_number = Column(String(50))
    vendor = Column(String(100))
    item_name = Column(String(100))
    rate = Column(Float)
    tax = Column(Float)
    discount = Column(Float)


# ---------------- RATE CONTRACT ----------------
class RateContract(TenantBase):
    __tablename__ = "rate_contracts"

    id = Column(Integer, primary_key=True)
    vendor = Column(String(100))
    item_name = Column(String(100))
    contract_rate = Column(Float)
    currency = Column(String(10))
    moq = Column(Integer)


# ---------------- PO TRACKING ----------------
class POTracking(TenantBase):
    __tablename__ = "po_tracking"

    id = Column(Integer, primary_key=True)
    po_number = Column(String(50))
    dispatch_date = Column(Date)
    transporter = Column(String(100))
    tracking_number = Column(String(100))
    expected_delivery = Column(Date)
    status = Column(Enum(DeliveryStatus))
    remarks = Column(String(255))



#gnr model


# ---------------- ENUMS ----------------
class GRNStatus(str, enum.Enum):
    pending = "Pending"
    approved = "Approved"
    rejected = "Rejected"

class QCStatus(str, enum.Enum):
    accepted = "Accepted"
    rejected = "Rejected"
    conditional = "Conditional"

# ---------------- GRN MASTER ----------------
class GRN(TenantBase):
    __tablename__ = "grns"

    id = Column(Integer, primary_key=True)
    grn_number = Column(String(50), unique=True, index=True)
    grn_date = Column(Date)
    po_number = Column(String(50))
    vendor_name = Column(String(100))
    store = Column(String(100))
    invoice_number = Column(String(50), nullable=True)
    invoice_date = Column(Date, nullable=True)
    status = Column(Enum(GRNStatus), default=GRNStatus.pending)
    
    # Total amount field
    total_amount = Column(DECIMAL(10, 2), default=0.00)

    items = relationship("GRNItem", back_populates="grn")
    qc = relationship("QCInspection", back_populates="grn", uselist=False)

# ---------------- GRN ITEMS ----------------
class GRNItem(TenantBase):
    __tablename__ = "grn_items"

    id = Column(Integer, primary_key=True)
    grn_id = Column(Integer, ForeignKey("grns.id"))
    item_name = Column(String(100))
    po_qty = Column(Float)
    received_qty = Column(Float)
    uom = Column(String(20))
    rate = Column(Float)

    grn = relationship("GRN", back_populates="items")
    batches = relationship("Batch", back_populates="item")

# ---------------- BATCH & EXPIRY ----------------
class Batch(TenantBase):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True)
    grn_item_id = Column(Integer, ForeignKey("grn_items.id"))
    batch_no = Column(String(50))
    mfg_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    warranty_start_date = Column(Date, nullable=True)
    warranty_end_date = Column(Date, nullable=True)
    qty = Column(Float)

    item = relationship("GRNItem", back_populates="batches")

# ---------------- QC INSPECTION ----------------
class QCInspection(TenantBase):
    __tablename__ = "qc_inspections"

    id = Column(Integer, primary_key=True)
    grn_id = Column(Integer, ForeignKey("grns.id"))
    qc_required = Column(Boolean, default=True)
    qc_status = Column(Enum(QCStatus))
    qc_by = Column(String(100))
    qc_date = Column(Date)
    remarks = Column(String(255))
    rejected_qty = Column(Float, default=0)

    grn = relationship("GRN", back_populates="qc")


#stock


# ---------------- ENUMS ----------------
class StockTxnType(str, enum.Enum):
    OPENING = "OPENING"
    ADJUST_IN = "ADJUST_IN"
    ADJUST_OUT = "ADJUST_OUT"
    TRANSFER = "TRANSFER"
    ISSUE = "ISSUE"

# ---------------- STOCK MASTER ----------------
class Stock(TenantBase):
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True)
    item_name = Column(String(150), nullable=False)
    sku = Column(String(50), unique=True)
    category = Column(String(100))
    uom = Column(String(50))

    total_qty = Column(Float, default=0)
    available_qty = Column(Float, default=0)
    reserved_qty = Column(Float, default=0)

    reorder_level = Column(Float, default=0)

    created_at = Column(DateTime, server_default=func.now())


# ---------------- BATCH ----------------
class StockBatch(TenantBase):
    __tablename__ = "stock_batches"

    id = Column(Integer, primary_key=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"))
    batch_no = Column(String(100))
    expiry_date = Column(Date)
    qty = Column(Float, default=0)
    store = Column(String(100))


# ---------------- LEDGER ----------------
class StockLedger(TenantBase):
    __tablename__ = "stock_ledger"

    id = Column(Integer, primary_key=True)
    stock_id = Column(Integer)
    batch_no = Column(String(100), nullable=True)

    txn_type = Column(Enum(StockTxnType))
    qty_in = Column(Float, default=0)
    qty_out = Column(Float, default=0)
    balance = Column(Float)

    ref_no = Column(String(100))
    remarks = Column(String(255))

    created_at = Column(DateTime, server_default=func.now())


# ---------------- TRANSFER ----------------
class StockTransfer(TenantBase):
    __tablename__ = "stock_transfers"

    id = Column(Integer, primary_key=True)
    stock_id = Column(Integer)

    from_store = Column(String(100))
    to_store = Column(String(100))

    qty = Column(Float)
    batch_no = Column(String(100), nullable=True)

    status = Column(String(50), default="PENDING")
    transport_mode = Column(String(50))
    remarks = Column(String(255))

    created_at = Column(DateTime, server_default=func.now())


# ---------------- ISSUE ----------------
class StockIssue(TenantBase):
    __tablename__ = "stock_issues"

    id = Column(Integer, primary_key=True)
    issue_no = Column(String(100), unique=True)

    stock_id = Column(Integer)
    department = Column(String(100))
    requested_by = Column(String(100))

    qty = Column(Float)
    batch_no = Column(String(100), nullable=True)

    reason = Column(String(255))
    status = Column(String(50), default="ISSUED")

    created_at = Column(DateTime, server_default=func.now())

# ============================================================
#                   INVENTORY LOCATIONS
# ============================================================
class InventoryLocation(TenantBase):
    __tablename__ = "inventory_locations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(191), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

# ============================================================
#                   INVENTORY ISSUES    


# ---------------- ENUMS ----------------
class IssueTypeEnum(str, enum.Enum):
    DEPARTMENT = "DEPARTMENT"
    PROJECT = "PROJECT"
    EXTERNAL = "EXTERNAL"

class ItemTypeEnum(str, enum.Enum):
    CONSUMABLE = "CONSUMABLE"
    NON_CONSUMABLE = "NON_CONSUMABLE"

# ---------------- ISSUE HEADER ----------------
class IssueHeader(TenantBase):
    __tablename__ = "issue_headers"

    id = Column(Integer, primary_key=True)
    issue_no = Column(String(50), unique=True, nullable=False)
    issue_type = Column(Enum(IssueTypeEnum), nullable=False)

    department = Column(String(100), nullable=True)
    project_code = Column(String(50), nullable=True)
    external_ref = Column(String(150), nullable=True)

    issue_date = Column(Date, nullable=False)
    requested_by = Column(String(100), nullable=True)
    remarks = Column(String(255), nullable=True)

    status = Column(String(50), default="DRAFT")
    created_at = Column(DateTime, server_default=func.now())


# ---------------- ISSUE ITEMS ----------------
class IssueItem(TenantBase):
    __tablename__ = "issue_items"

    id = Column(Integer, primary_key=True)
    issue_id = Column(Integer, ForeignKey("issue_headers.id"))

    item_name = Column(String(150))
    qty = Column(Float)
    uom = Column(String(50))
    batch_no = Column(String(100), nullable=True)

    item_type = Column(Enum(ItemTypeEnum))
    remarks = Column(String(255))


#============================================================
#                  RETURN & DISPOSAL
#===========================================================

# ---------------- ENUMS ----------------
class ReturnTypeEnum(str, enum.Enum):
    TO_VENDOR = "TO_VENDOR"
    FROM_DEPARTMENT = "FROM_DEPARTMENT"
    TO_CUSTOMER = "TO_CUSTOMER"

class ItemConditionEnum(str, enum.Enum):
    GOOD = "GOOD"
    DAMAGED = "DAMAGED"
    EXPIRED = "EXPIRED"

class DisposalMethodEnum(str, enum.Enum):
    INCINERATION = "INCINERATION"
    VENDOR_RETURN = "VENDOR_RETURN"
    SCRAP = "SCRAP"

class DepreciationMethodEnum(str, enum.Enum):
    SLM = "SLM"
    WDV = "WDV"

# ---------------- RETURN HEADER ----------------
class ReturnHeader(TenantBase):
    __tablename__ = "return_headers"

    id = Column(Integer, primary_key=True)
    return_no = Column(String(50), unique=True, nullable=False)
    return_type = Column(Enum(ReturnTypeEnum), nullable=False)

    vendor = Column(String(150), nullable=True)
    department = Column(String(150), nullable=True)
    reference_no = Column(String(100), nullable=True)

    reason = Column(String(255))
    return_date = Column(Date)

    status = Column(String(50), default="DRAFT")
    created_at = Column(DateTime, server_default=func.now())


# ---------------- RETURN ITEMS ----------------
class ReturnItem(TenantBase):
    __tablename__ = "return_items"

    id = Column(Integer, primary_key=True)
    return_id = Column(Integer, ForeignKey("return_headers.id"))

    item_name = Column(String(150))
    batch_no = Column(String(100), nullable=True)
    qty = Column(Float)
    uom = Column(String(50))

    condition = Column(Enum(ItemConditionEnum))
    remarks = Column(String(255))


# ---------------- DISPOSAL ----------------
class DisposalTransaction(TenantBase):
    __tablename__ = "disposal_transactions"

    id = Column(Integer, primary_key=True)
    transaction_no = Column(String(50), unique=True)

    item_name = Column(String(150))
    batch_no = Column(String(100))
    qty = Column(Float)

    condition = Column(Enum(ItemConditionEnum))
    disposal_method = Column(Enum(DisposalMethodEnum))
    approval_required = Column(Boolean, default=False)

    reason = Column(String(255))
    transaction_date = Column(Date)

    created_at = Column(DateTime, server_default=func.now())


# ---------------- SALVAGE VALUATION ----------------
class SalvageValuation(TenantBase):
    __tablename__ = "salvage_valuations"

    id = Column(Integer, primary_key=True)
    salvage_no = Column(String(50), unique=True)

    item_name = Column(String(150))
    condition = Column(String(50))

    original_cost = Column(Float)
    useful_life = Column(Float)
    age_of_item = Column(Float)

    depreciation_method = Column(Enum(DepreciationMethodEnum))
    current_book_value = Column(Float)
    scrap_value = Column(Float)
    financial_loss = Column(Float)

    remarks = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())


# ============================================================
#                   STOCK OVERVIEW
# ============================================================
class StockOverview(TenantBase):
    __tablename__ = "stock_overview"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String(150), nullable=False)
    item_code = Column(String(50), nullable=False)
    location = Column(String(100), nullable=False)
    available_qty = Column(Integer, default=0)
    min_stock = Column(Integer, default=0)
    warranty = Column(String(50), default="—")
    expiry_date = Column(String(50), default="—")
    batch_no = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

# ============================================================
#                   CUSTOMERS
# ============================================================
class Customer(TenantBase):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_type = Column(String(50), nullable=False)  # organization, self, optional
    
    # Organization fields
    org_name = Column(String(191), nullable=True)
    org_address = Column(Text, nullable=True)
    org_pan = Column(String(20), nullable=True)
    org_gst = Column(String(20), nullable=True)
    org_mobile = Column(String(20), nullable=True)
    org_type = Column(String(50), nullable=True)
    
    # Self fields
    name = Column(String(191), nullable=True)
    address = Column(Text, nullable=True)
    pan = Column(String(20), nullable=True)
    gst = Column(String(20), nullable=True)
    mobile = Column(String(20), nullable=True)
    type = Column(String(50), nullable=True)
    
    # Common fields
    email = Column(String(191), nullable=True)
    reference_source = Column(String(100), nullable=True)
    reference_details = Column(Text, nullable=True)
    status = Column(String(50), default="pending")
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

# ============================================================
#                   VENDOR PAYMENTS
# ============================================================
class VendorPayment(TenantBase):
    __tablename__ = "vendor_payments"

    id = Column(Integer, primary_key=True, index=True)
    grn_number = Column(String(50), nullable=False)
    vendor_name = Column(String(150), nullable=False)
    invoice_number = Column(String(50), nullable=True)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    paid_amount = Column(DECIMAL(10, 2), default=0.00)
    outstanding_amount = Column(DECIMAL(10, 2), nullable=False)
    payment_status = Column(String(20), default="unpaid")  # unpaid, partial, paid
    payment_date = Column(Date, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())



# ============================================================
#                   billing SETTINGS
# ============================================================

