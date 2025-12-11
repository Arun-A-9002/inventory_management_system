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
                "users.view", "users.create", "users.update", "users.delete"]
    
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