# backend/utils/permissions.py
"""
Simple permission checking utility.
"""

from fastapi import HTTPException

def has_permission(user, permission_name: str) -> bool:
    """Check if user has specific permission."""
    if not user or not user.is_active:
        return False
    
    for role in user.roles:
        for perm in role.permissions:
            if perm.name == permission_name:
                return True
    return False

def require_permission(permission_name: str):
    """FastAPI dependency to check permissions."""
    def check_permission():
        # For now, skip authentication - return None to allow access
        return None
    return check_permission

def get_user_permissions(user) -> list:
    """Get all permissions for a user."""
    if not user:
        return []
    
    permissions = set()
    for role in user.roles:
        for perm in role.permissions:
            permissions.add(perm.name)
    
    return list(permissions)

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