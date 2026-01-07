from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_tenant_db
from models.tenant_models import AuditLog
from typing import Optional
import json

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("/test")
def test_endpoint():
    """Test endpoint to verify router is working"""
    return {"message": "Audit log router is working"}

@router.get("/")
def get_audit_logs(
    db: Session = Depends(get_tenant_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    module: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None)
):
    """Get audit logs with pagination and filtering"""
    
    query = db.query(AuditLog)
    
    # Apply filters
    if module:
        query = query.filter(AuditLog.module.ilike(f"%{module}%"))
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if user_name:
        query = query.filter(AuditLog.user_name.ilike(f"%{user_name}%"))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    
    # Format response with all fields
    formatted_logs = []
    for log in logs:
        formatted_log = {
            "id": log.id,
            "user_id": log.user_id,
            "user_name": log.user_name,
            "action": log.action,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "old_values": json.loads(log.old_values) if log.old_values else None,
            "new_values": json.loads(log.new_values) if log.new_values else None,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "module": log.module,
            "description": log.description
        }
        formatted_logs.append(formatted_log)
    
    return {
        "logs": formatted_logs,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.post("/create-sample")
def create_sample_log(db: Session = Depends(get_tenant_db)):
    """Create a sample audit log entry"""
    sample_log = AuditLog(
        user_name="system",
        action="CREATE",
        table_name="test",
        record_id=1,
        module="SYSTEM",
        description="Sample audit log entry",
        ip_address="127.0.0.1"
    )
    db.add(sample_log)
    db.commit()
    return {"message": "Sample audit log created"}