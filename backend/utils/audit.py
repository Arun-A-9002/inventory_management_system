import json
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import Request
from models.tenant_models import AuditLog

def log_audit(
    db: Session,
    request: Request = None,
    user_id: int = None,
    user_name: str = None,
    action: str = None,
    table_name: str = None,
    record_id: int = None,
    old_values: dict = None,
    new_values: dict = None,
    module: str = None,
    description: str = None,
    ip_address: str = None,
    user_agent: str = None
):
    """
    Log audit trail for database operations
    
    Args:
        db: Database session
        request: FastAPI request object to extract IP and user agent
        user_id: ID of user performing action
        user_name: Name of user performing action
        action: Action performed (CREATE, UPDATE, DELETE, APPROVE, etc.)
        table_name: Name of table affected
        record_id: ID of record affected
        old_values: Dictionary of old values (for updates)
        new_values: Dictionary of new values (for creates/updates)
        module: Module name (GRN, INVENTORY, etc.)
        description: Human readable description
        ip_address: User's IP address (optional, will extract from request)
        user_agent: User's browser/client info (optional, will extract from request)
    """
    try:
        # Extract IP address and user agent from request if not provided
        if request:
            if not ip_address:
                ip_address = request.client.host if request.client else None
            if not user_agent:
                user_agent = request.headers.get("user-agent")
        
        audit_log = AuditLog(
            user_id=user_id,
            user_name=user_name,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_values=json.dumps(old_values) if old_values else None,
            new_values=json.dumps(new_values) if new_values else None,
            module=module,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(audit_log)
        db.commit()
        
    except Exception as e:
        print(f"Audit logging error: {e}")
        # Don't raise exception to avoid breaking main functionality
        pass

def get_user_info(current_user: dict):
    """Extract user info from current_user dict"""
    if not current_user:
        return None, None
    
    # JWT tokens use 'sub' for user ID, fallback to 'id'
    user_id = current_user.get('sub') or current_user.get('id')
    user_name = current_user.get('full_name') or current_user.get('email')
    
    # Convert user_id to int if it's a string
    if user_id and isinstance(user_id, str):
        try:
            user_id = int(user_id)
        except ValueError:
            user_id = None
    
    return user_id, user_name