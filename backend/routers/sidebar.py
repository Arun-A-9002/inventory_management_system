# backend/routers/sidebar.py
"""
Sidebar filtering based on subscription tier and permissions.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_master_db, get_current_tenant_db_name
from models.register_models import Tenant
from utils.auth import get_current_user
from utils.subscription_permissions import get_permissions_for_tier

router = APIRouter(prefix="/sidebar", tags=["Sidebar"])

@router.get("/items")
def get_sidebar_items(
    current_user: dict = Depends(get_current_user),
    tenant_db_name: str = Depends(get_current_tenant_db_name()),
    master_db: Session = Depends(get_master_db)
):
    """Get sidebar items filtered by subscription tier and user permissions."""
    try:
        # Get tenant's subscription tier
        tenant = master_db.query(Tenant).filter(Tenant.database_name == tenant_db_name).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Get permissions available for this subscription tier
        tier_permissions = get_permissions_for_tier(tenant.subscription_tier)
        tier_permission_names = [perm[0] for perm in tier_permissions]
        
        # Get user permissions from JWT token
        user_permissions = current_user.get("permissions", [])
        print(f"DEBUG: User permissions: {user_permissions}")
        
        # Only show modules where user has at least one permission
        # Filter to only permissions available for this subscription tier
        available_permissions = [perm for perm in user_permissions if perm in tier_permission_names]
        print(f"DEBUG: Available permissions: {available_permissions}")
        
        # Define sidebar items with their required permissions
        sidebar_items = {
            "dashboard": {
                "visible": True,
                "permissions": []
            },
            "userManagement": {
                "visible": any(perm in available_permissions for perm in [
                    'departments.view', 'departments.create', 'departments.update', 'departments.delete',
                    'roles.view', 'roles.create', 'roles.update', 'roles.delete',
                    'users.view', 'users.create', 'users.update', 'users.delete'
                ]),
                "permissions": ['departments.view', 'roles.view', 'users.view']
            },
            "organizationSetup": {
                "visible": any(perm in available_permissions for perm in [
                    'company.view', 'company.create', 'company.edit', 'company.delete',
                    'branch.view', 'branch.create', 'branch.edit', 'branch.delete',
                    'store.view', 'store.create', 'store.edit', 'store.delete',
                    'department.view'
                ]),
                "permissions": ['company.view', 'branch.view', 'store.view', 'department.view']
            },
            "itemMaster": {
                "visible": any(perm in available_permissions for perm in [
                    'items.view', 'items.create', 'items.edit', 'items.delete',
                    'category.view', 'category.create', 'category.edit', 'category.delete',
                    'subcategory.view', 'subcategory.create', 'subcategory.edit', 'subcategory.delete',
                    'brand.view', 'brand.create', 'brand.edit', 'brand.delete',
                    'masterdata.setup'
                ]),
                "permissions": ['items.view', 'category.view', 'subcategory.view', 'brand.view']
            },
            "vendorMaster": {
                "visible": any(perm in available_permissions for perm in [
                    'vendors.view', 'vendors.create', 'vendors.edit', 'vendors.delete', 'vendors.status'
                ]),
                "permissions": ['vendors.view']
            },
            "customerManagement": {
                "visible": any(perm in available_permissions for perm in [
                    'customers.view', 'customers.create', 'customers.edit', 'customers.delete', 'customers.status'
                ]),
                "permissions": ['customers.view']
            },
            "locationsManagement": {
                "visible": any(perm in available_permissions for perm in [
                    'locations.view', 'locations.create_internal', 'locations.create_external',
                    'locations.edit', 'locations.delete'
                ]),
                "permissions": ['locations.view']
            },
            "purchaseManagement": {
                "visible": any(perm in available_permissions for perm in [
                    'purchase_request.view', 'purchase_request.create', 'purchase_request.edit',
                    'purchase_request.delete', 'purchase_request.status', 'purchase_request.send_po',
                    'purchase_order.view', 'purchase_order.print', 'purchase_order.download'
                ]),
                "permissions": ['purchase_request.view', 'purchase_order.view']
            },
            "grn": {
                "visible": any(perm in available_permissions for perm in [
                    'grn.view', 'grn.create', 'grn.edit', 'grn.delete', 'grn.print',
                    'grn.status_qc', 'grn.status_approve'
                ]),
                "permissions": ['grn.view']
            },
            "returnDisposal": {
                "visible": any(perm in available_permissions for perm in [
                    'return_disposal.view', 'return_disposal.create', 'return_disposal.edit',
                    'return_disposal.delete', 'return_disposal.status_approve'
                ]),
                "permissions": ['return_disposal.view']
            },
            "vendorLedger": {
                "visible": any(perm in available_permissions for perm in [
                    'vendor_ledger.view', 'vendor_ledger.pay', 'vendor_ledger.print', 'vendor_ledger.invoice_view'
                ]),
                "permissions": ['vendor_ledger.view']
            },
            "stockLedger": {
                "visible": any(perm in available_permissions for perm in [
                    'stock_ledger.view', 'stock_ledger.dispense', 'stock_ledger.available_qty'
                ]),
                "permissions": ['stock_ledger.view']
            },
            "externalTransfer": {
                "visible": any(perm in available_permissions for perm in [
                    'external_transfer.create', 'external_transfer.view', 'external_transfer.print',
                    'external_transfer.download', 'external_transfer.return',
                    'damaged_returns.view', 'damaged_returns.print'
                ]),
                "permissions": ['external_transfer.view', 'damaged_returns.view']
            }
        }
        
        return {
            "subscription_tier": tenant.subscription_tier.value,
            "user_permissions": available_permissions,
            "sidebar_items": sidebar_items,
            "visible_items": [key for key, item in sidebar_items.items() if item["visible"]]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")