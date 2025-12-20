# ------------------ Department Schemas ------------------

from pydantic import BaseModel, ConfigDict
from typing import Optional,List
from datetime import datetime,date
from enum import Enum



class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: Optional[bool] = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):
    id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

# ------------------ Role & Permission Schemas ------------------
from pydantic import BaseModel

class PermissionBase(BaseModel):
    name: str
    label: str
    group: str | None = None

class PermissionCreate(PermissionBase):
    pass

class PermissionResponse(PermissionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class RoleBase(BaseModel):
    name: str
    description: str | None = None
    is_active: bool | None = True

class RoleCreate(RoleBase):
    permission_ids: list[int] | None = []

class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    permission_ids: list[int] | None = None

class RoleResponse(RoleBase):
    id: int
    permissions: list[PermissionResponse] = []

    model_config = ConfigDict(from_attributes=True)

# ------------------ User Schemas ------------------
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    is_active: bool | None = True
    is_doctor: bool | None = False
    department_id: int | None = None

class UserCreate(UserBase):
    password: str
    role_ids: list[int] | None = []

class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    is_active: bool | None = None
    is_doctor: bool | None = None
    department_id: int | None = None
    role_ids: list[int] | None = None

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    is_active: bool = True
    is_doctor: bool = False
    department_id: int | None = None
    department: DepartmentResponse | None = None
    roles: list[RoleResponse] = []

    model_config = ConfigDict(from_attributes=True)
# ============================================================
#                     COMPANY SCHEMAS
# ============================================================
class CompanyBase(BaseModel):
    name: str
    code: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    logo: Optional[str] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    logo: Optional[str] = None
    is_active: Optional[bool] = None


class CompanyResponse(CompanyBase):
    id: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True


# ============================================================
#                     BRANCH SCHEMAS
# ============================================================
class BranchBase(BaseModel):
    company_id: int
    name: str
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    is_active: Optional[bool] = None


class BranchResponse(BranchBase):
    id: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True





# ============================================================
#                     STORE SCHEMAS
# ============================================================
class StoreBase(BaseModel):
    branch_id: int
    name: str
    code: Optional[str] = None
    store_type: str
    is_central: Optional[bool] = False
    description: Optional[str] = None


class StoreCreate(StoreBase):
    pass


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    store_type: Optional[str] = None
    is_central: Optional[bool] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class BranchBasic(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    city: Optional[str] = None

    class Config:
        orm_mode = True

class StoreResponse(StoreBase):
    id: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    branch: Optional[BranchBasic] = None

    class Config:
        orm_mode = True


# ============================================================
#                     CATEGORY SCHEMAS
# ============================================================
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    id: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True


# ============================================================
#                   SUBCATEGORY SCHEMAS
# ============================================================
class SubCategoryBase(BaseModel):
    category_id: int
    name: str
    description: Optional[str] = None


class SubCategoryCreate(SubCategoryBase):
    pass


class SubCategoryUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class SubCategoryResponse(SubCategoryBase):
    id: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    category: Optional[CategoryResponse] = None

    class Config:
        orm_mode = True


# ============================================================
#                     BRAND SCHEMAS
# ============================================================
class BrandBase(BaseModel):
    brand_name: str
    manufacturer_name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    brand_name: Optional[str] = None
    manufacturer_name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None


class BrandResponse(BrandBase):
    id: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True


# ============================================================
#                     UOM SCHEMAS
# ============================================================
class UOMBase(BaseModel):
    name: str
    code: Optional[str] = None
    conversion_factor: Optional[float] = 1.0


class UOMCreate(UOMBase):
    pass


class UOMUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    conversion_factor: Optional[float] = None
    is_active: Optional[bool] = None


class UOMResponse(UOMBase):
    id: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True


# ============================================================
#                     TAX CODE SCHEMAS
# ============================================================
class TaxCodeBase(BaseModel):
    hsn_code: str
    description: Optional[str] = None
    gst_percentage: float
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    igst: Optional[float] = None


class TaxCodeCreate(TaxCodeBase):
    pass


class TaxCodeUpdate(BaseModel):
    hsn_code: Optional[str] = None
    description: Optional[str] = None
    gst_percentage: Optional[float] = None
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    igst: Optional[float] = None
    is_active: Optional[bool] = None


class TaxCodeResponse(TaxCodeBase):
    id: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        orm_mode = True



# =========================================================
# GLOBAL RULE SCHEMAS
# =========================================================
class InventoryGlobalRuleCreate(BaseModel):
    min_stock_percent: float
    max_stock_percent: float
    safety_stock_formula: str
    reorder_method: str
    allow_negative_stock: bool
    issue_method: str


class InventoryGlobalRuleResponse(InventoryGlobalRuleCreate):
    id: int

    class Config:
        from_attributes = True


# =========================================================
# ITEM REORDER RULE SCHEMAS
# =========================================================
class ItemReorderRuleCreate(BaseModel):
    item_id: int
    min_level: float
    max_level: float
    reorder_level: float
    safety_stock: float
    auto_po: bool = False
    remarks: Optional[str]


class ItemReorderRuleResponse(ItemReorderRuleCreate):
    id: int

    class Config:
        from_attributes = True


# =========================================================
# LEAD TIME SCHEMAS
# =========================================================
class LeadTimeCreate(BaseModel):
    item_id: int
    vendor_id: int
    avg_lead_time: int
    min_lead_time: int
    max_lead_time: int


class LeadTimeResponse(LeadTimeCreate):
    id: int

    class Config:
        from_attributes = True


# =========================================================
# ALERT RULE SCHEMAS
# =========================================================
class InventoryAlertRuleCreate(BaseModel):
    alert_method: str
    alert_trigger_percent: float
    dashboard_priority: str

    notify_store_keeper: bool
    notify_purchase_manager: bool
    notify_department_head: bool
    notify_admin: bool

    auto_pr: bool
    auto_po: bool


class InventoryAlertRuleResponse(InventoryAlertRuleCreate):
    id: int

    class Config:
        from_attributes = True



# ---------------- ITEM MASTER ----------------

class ItemBase(BaseModel):
    name: str
    item_code: str
    description: Optional[str] = None

    category: Optional[str] = None
    sub_category: Optional[str] = None
    brand: Optional[str] = None
    manufacturer: Optional[str] = None

    uom: Optional[str] = None
    min_stock: Optional[int] = 0
    max_stock: Optional[int] = 0
    
    fixing_price: Optional[float] = 0.0
    mrp: Optional[float] = 0.0
    tax: Optional[float] = 0.0

    is_batch_managed: Optional[bool] = False
    has_expiry: Optional[bool] = False
    expiry_date: Optional[date] = None
    
    has_warranty: Optional[bool] = False
    warranty_start_date: Optional[date] = None
    warranty_end_date: Optional[date] = None

    barcode: Optional[str] = None
    qr_code: Optional[str] = None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str]

    category: Optional[str]
    sub_category: Optional[str]
    brand: Optional[str]
    manufacturer: Optional[str]

    uom: Optional[str]
    min_stock: Optional[int]
    max_stock: Optional[int]
    
    fixing_price: Optional[float]
    mrp: Optional[float]
    tax: Optional[float]

    is_batch_managed: Optional[bool]
    has_expiry: Optional[bool]
    expiry_date: Optional[date]
    
    has_warranty: Optional[bool]
    warranty_start_date: Optional[date]
    warranty_end_date: Optional[date]

    barcode: Optional[str]
    qr_code: Optional[str]
    is_active: Optional[bool]


class ItemResponse(ItemBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True



# ================= VENDOR =================
class VendorCreate(BaseModel):
    vendor_name: str
    contact_person: Optional[str]
    phone: str
    email: str
    address: Optional[str]
    country: str
    state: Optional[str]
    city: Optional[str]
    pan_number: Optional[str]
    gst_number: Optional[str]

class VendorResponse(VendorCreate):
    id: int
    vendor_code: str
    verification_status: str

    class Config:
        orm_mode = True

# ================= QUALIFICATION =================
class VendorQualificationCreate(BaseModel):
    vendor_id: int
    approval_status: str
    category: str
    risk_category: str
    audit_status: str
    notes: Optional[str]

# ================= CONTRACT =================
class VendorContractCreate(BaseModel):
    vendor_id: int
    contract_type: str
    start_date: date
    end_date: date

class VendorContractItemCreate(BaseModel):
    contract_id: int
    item_name: str
    contract_price: float
    currency: str
    moq: int

# ================= PERFORMANCE =================
class VendorPerformanceCreate(BaseModel):
    vendor_id: int
    delivery_quality: float
    delivery_timeliness: float
    response_time: float
    pricing_competitiveness: float
    compliance: float
    overall_rating: float
    comments: Optional[str]

# ================= LEAD TIME =================
class VendorLeadTimeCreate(BaseModel):
    vendor_id: int
    item_name: str
    avg_days: int
    min_days: int
    max_days: int



#--------------- PURCHASE ORDER SCHEMAS ----------------

# -------- PR --------
class PRItemCreate(BaseModel):
    item_name: str
    quantity: float
    uom: str
    priority: str
    remarks: Optional[str]


class PRCreate(BaseModel):
    requested_by: str
    items: List[PRItemCreate]


# -------- PO --------
class POItemCreate(BaseModel):
    item_name: str
    quantity: float
    rate: float
    tax: float
    discount: float


class POCreate(BaseModel):
    pr_number: str
    vendor: str
    items: List[POItemCreate]


# -------- QUOTATION --------
class QuotationCreate(BaseModel):
    pr_number: str
    vendor: str
    item_name: str
    rate: float
    tax: float
    discount: float


# -------- RATE CONTRACT --------
class RateContractCreate(BaseModel):
    vendor: str
    item_name: str
    contract_rate: float
    currency: str
    moq: int


# -------- PO TRACKING --------
class POTrackingCreate(BaseModel):
    po_number: str
    dispatch_date: date
    transporter: str
    tracking_number: str
    expected_delivery: date
    status: str
    remarks: Optional[str]


#grn schemas


# -------- ENUMS --------
class GRNStatus(str, Enum):
    Pending = "Pending"
    Approved = "Approved"
    Rejected = "Rejected"

class QCStatus(str, Enum):
    Accepted = "Accepted"
    Rejected = "Rejected"
    Conditional = "Conditional"

# -------- BATCH --------
class BatchCreate(BaseModel):
    batch_no: str
    mfg_date: Optional[date]
    expiry_date: Optional[date]
    qty: float

# -------- GRN ITEM --------
class GRNItemCreate(BaseModel):
    item_name: str
    po_qty: float
    received_qty: float
    uom: str
    rate: float
    batches: List[BatchCreate]

# -------- GRN --------
class GRNCreate(BaseModel):
    grn_date: date
    po_number: str
    vendor_name: str
    store: str
    items: List[GRNItemCreate]

# -------- QC --------
class QCCreate(BaseModel):
    qc_required: bool
    qc_status: QCStatus
    qc_by: str
    qc_date: date
    remarks: Optional[str]
    rejected_qty: float = 0
