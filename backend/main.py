# backend/main.py

from fastapi import FastAPI, Request
from dotenv import load_dotenv
import uuid

# ----------------------------------------------------------
# ENV & CORE
# ----------------------------------------------------------
load_dotenv()

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ----------------------------------------------------------
# EXISTING ROUTERS
# ----------------------------------------------------------
from routers import register, auth
from routers.department import router as department_router
from routers.roles import router as roles_router
from routers.users import router as users_router

# ----------------------------------------------------------
# ORGANIZATION SETUP ROUTERS
# ----------------------------------------------------------
from routers.organization.company import router as company_router
from routers.organization.branch import router as branch_router
from routers.organization.store import router as store_router
from routers.organization.category import router as category_router
from routers.organization.subcategory import router as subcategory_router
from routers.organization.brand import router as brand_router
from routers.organization.uom import router as uom_router
from routers.organization.tax import router as tax_router
from routers.organization.inventory_rules import router as inventory_rules_router

# ----------------------------------------------------------
# ITEMS, VENDOR, PURCHASE
# ----------------------------------------------------------
from routers.items.item import router as item_router
from routers.vendor.vendor import router as vendor_router
from routers.purchase_order.purchase import router as purchase_order_router

# ----------------------------------------------------------
# ✅ GOODS RECEIPT & INSPECTION (NEW MODULE)
# ----------------------------------------------------------
from routers.GRN.grn import router as grn_router

#----------------------------------------------------------
# STOCKS
#----------------------------------------------------------
from routers.stocks.stock import router as stock_router
from routers.stocks.stock_overview import router as stock_overview_router

#----------------------------------------------------------
# INVENTORY LOCATIONS
#----------------------------------------------------------
from routers.inventory.location import router as location_router

#----------------------------------------------------------
# CONSUMPTION & ISSUE
#----------------------------------------------------------
from routers.consumption.issue import router as consumption_router

#----------------------------------------------------------
#  RETURN & DISPOSAL
#----------------------------------------------------------
from routers.returns.return_disposal import router as return_router

#----------------------------------------------------------
#  CUSTOMERS
#----------------------------------------------------------
from routers.customers.customer import router as customer_router


# ----------------------------------------------------------
# SUPPLIERS
# ----------------------------------------------------------
from routers.suppliers.payments import router as payments_router


#----------------------------------------------------------
#billing system
#----------------------------------------------------------

# from routers.billingSystem.billing import router as billing_router
# ----------------------------------------------------------
# LOGGER
# ----------------------------------------------------------
from utils.logger import log_error, log_audit, log_api

# ----------------------------------------------------------
# FASTAPI APP
# ----------------------------------------------------------
app = FastAPI(title="NUTRYAH IMS API")

# ----------------------------------------------------------
# CORS
# ----------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 🔴 Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------
# ROUTER REGISTRATION
# ----------------------------------------------------------

# Auth & Core
app.include_router(register.router, prefix="/api")
app.include_router(auth.router)

# User Management
app.include_router(department_router)
app.include_router(roles_router)
app.include_router(users_router)

# Organization Setup
app.include_router(company_router)
app.include_router(branch_router)
app.include_router(store_router)
app.include_router(category_router)
app.include_router(subcategory_router)
app.include_router(brand_router)
app.include_router(uom_router)
app.include_router(tax_router)
app.include_router(inventory_rules_router)

# Inventory Core
app.include_router(item_router)
app.include_router(vendor_router)
app.include_router(purchase_order_router)

# ✅ Goods Receipt & Inspection
app.include_router(grn_router)

# Stocks
app.include_router(stock_router)
app.include_router(stock_overview_router)

# Inventory Locations
app.include_router(location_router)

# Consumption & Issue
app.include_router(consumption_router)

# Return & Disposal
app.include_router(return_router)

# Customer Management
app.include_router(customer_router)

# Suppliers
app.include_router(payments_router)

#billing system
# app.include_router(billing_router)  
# ----------------------------------------------------------
# GLOBAL MIDDLEWARE: REQUEST LOGGING + ERROR HANDLING
# ----------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    try:
        log_api(
            f"[REQ:{request_id}] {request.method} {request.url} "
            f"FROM {request.client.host}"
        )

        response = await call_next(request)

        log_api(
            f"[REQ:{request_id}] Completed with status {response.status_code}"
        )

        return response

    except Exception as e:
        log_error(
            e,
            location=f"{request.method} {request.url} | REQ:{request_id}",
        )

        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "request_id": request_id,
            },
        )

# ----------------------------------------------------------
# HEALTH CHECKS
# ----------------------------------------------------------
@app.get("/")
def health():
    log_audit("Health check OK")
    return {"status": "running"}

@app.get("/health/db")
def health_db():
    try:
        from database import get_tenant_db
        db_gen = get_tenant_db("tenant_demo")
        db = next(db_gen)
        db.execute("SELECT 1")
        return {"status": "db_ok"}
    except Exception as e:
        return {"status": "db_error", "error": str(e)}
