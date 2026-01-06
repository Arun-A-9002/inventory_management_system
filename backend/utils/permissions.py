# backend/utils/permissions.py
"""
Simple permission checking utility.
"""

from fastapi import HTTPException, Depends
from utils.auth import get_current_user

def has_permission(user_data: dict, permission_name: str) -> bool:
    """Check if user has specific permission."""
    if not user_data:
        return False
    
    permissions = user_data.get("permissions", [])
    
    # Admin has all permissions
    if "*" in permissions or user_data.get("role") == "admin":
        return True
    
    # Check specific permission
    return permission_name in permissions

def require_permission(permission_name: str):
    """FastAPI dependency to check permissions."""
    def check_permission(current_user: dict = Depends(get_current_user)):
        if not has_permission(current_user, permission_name):
            raise HTTPException(
                status_code=403, 
                detail=f"Permission denied. Required: {permission_name}"
            )
        return current_user
    return check_permission

def get_user_permissions(user_data: dict) -> list:
    """Get all permissions for a user."""
    if not user_data:
        return []
    
    # Admin users have all permissions
    if user_data.get("role") == "admin":
        return ["departments.view", "departments.create", "departments.update", "departments.delete",
                "roles.view", "roles.create", "roles.update", "roles.delete",
                "users.view", "users.create", "users.update", "users.delete",
                "company.view", "company.create", "company.edit", "company.delete",
                "branch.view", "branch.create", "branch.edit", "branch.delete",
                "store.view", "store.create", "store.edit", "store.delete",
                "department.view",
                "items.view", "items.create", "items.edit", "items.delete",
                "category.view", "category.create", "category.edit", "category.delete",
                "subcategory.view", "subcategory.create", "subcategory.edit", "subcategory.delete",
                "brand.view", "brand.create", "brand.edit", "brand.delete",
                "masterdata.setup",
                "vendors.view", "vendors.create", "vendors.edit", "vendors.delete", "vendors.status",
                "customers.view", "customers.create", "customers.edit", "customers.delete", "customers.status",
                "locations.view", "locations.create_internal", "locations.create_external", "locations.edit", "locations.delete",
                "purchase_request.view", "purchase_request.create", "purchase_request.edit", "purchase_request.delete", "purchase_request.status", "purchase_request.send_po",
                "purchase_order.view", "purchase_order.print", "purchase_order.download"]
    
    return user_data.get("permissions", [])

# Department permission decorators
def require_departments_view():
    return require_permission("departments.view")

def require_departments_create():
    return require_permission("departments.create")

def require_departments_update():
    return require_permission("departments.update")

def require_departments_delete():
    return require_permission("departments.delete")

# Roles permission decorators
def require_roles_view():
    return require_permission("roles.view")

def require_roles_create():
    return require_permission("roles.create")

def require_roles_update():
    return require_permission("roles.update")

def require_roles_delete():
    return require_permission("roles.delete")

# Users permission decorators
def require_users_view():
    return require_permission("users.view")

def require_users_create():
    return require_permission("users.create")

def require_users_update():
    return require_permission("users.update")

def require_users_delete():
    return require_permission("users.delete")

# Company permission decorators
def require_company_view():
    return require_permission("company.view")

def require_company_create():
    return require_permission("company.create")

def require_company_edit():
    return require_permission("company.edit")

def require_company_delete():
    return require_permission("company.delete")

# Branch permission decorators
def require_branch_view():
    return require_permission("branch.view")

def require_branch_create():
    return require_permission("branch.create")

def require_branch_edit():
    return require_permission("branch.edit")

def require_branch_delete():
    return require_permission("branch.delete")

# Store permission decorators
def require_store_view():
    return require_permission("store.view")

def require_store_create():
    return require_permission("store.create")

def require_store_edit():
    return require_permission("store.edit")

def require_store_delete():
    return require_permission("store.delete")

# Department permission decorators
def require_department_view():
    return require_permission("department.view")

# Item Master permission decorators
def require_items_view():
    return require_permission("items.view")

def require_items_create():
    return require_permission("items.create")

def require_items_edit():
    return require_permission("items.edit")

def require_items_delete():
    return require_permission("items.delete")

# Category permission decorators
def require_category_view():
    return require_permission("category.view")

def require_category_create():
    return require_permission("category.create")

def require_category_edit():
    return require_permission("category.edit")

def require_category_delete():
    return require_permission("category.delete")

# Sub Category permission decorators
def require_subcategory_view():
    return require_permission("subcategory.view")

def require_subcategory_create():
    return require_permission("subcategory.create")

def require_subcategory_edit():
    return require_permission("subcategory.edit")

def require_subcategory_delete():
    return require_permission("subcategory.delete")

# Brand permission decorators
def require_brand_view():
    return require_permission("brand.view")

def require_brand_create():
    return require_permission("brand.create")

def require_brand_edit():
    return require_permission("brand.edit")

def require_brand_delete():
    return require_permission("brand.delete")

# Master Data Setup permission decorator
def require_masterdata_setup():
    return require_permission("masterdata.setup")

# Vendor Management permission decorators
def require_vendors_view():
    return require_permission("vendors.view")

def require_vendors_create():
    return require_permission("vendors.create")

def require_vendors_edit():
    return require_permission("vendors.edit")

def require_vendors_delete():
    return require_permission("vendors.delete")

def require_vendors_status():
    return require_permission("vendors.status")

# Customer Management permission decorators
def require_customers_view():
    return require_permission("customers.view")

def require_customers_create():
    return require_permission("customers.create")

def require_customers_edit():
    return require_permission("customers.edit")

def require_customers_delete():
    return require_permission("customers.delete")

def require_customers_status():
    return require_permission("customers.status")

# Location Management permission decorators
def require_locations_view():
    return require_permission("locations.view")

def require_locations_create_internal():
    return require_permission("locations.create_internal")

def require_locations_create_external():
    return require_permission("locations.create_external")

def require_locations_edit():
    return require_permission("locations.edit")

def require_locations_delete():
    return require_permission("locations.delete")

# Purchase Management permission decorators
def require_purchase_request_view():
    return require_permission("purchase_request.view")

def require_purchase_request_create():
    return require_permission("purchase_request.create")

def require_purchase_request_edit():
    return require_permission("purchase_request.edit")

def require_purchase_request_delete():
    return require_permission("purchase_request.delete")

def require_purchase_request_status():
    return require_permission("purchase_request.status")

def require_purchase_request_send_po():
    return require_permission("purchase_request.send_po")

def require_purchase_order_view():
    return require_permission("purchase_order.view")

def require_purchase_order_print():
    return require_permission("purchase_order.print")

def require_purchase_order_download():
    return require_permission("purchase_order.download")