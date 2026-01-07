from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
import json

from database import get_tenant_db

from models.tenant_models import Store, Branch, AuditLog
from schemas.tenant_schemas import (
    StoreCreate, StoreUpdate, StoreResponse
)
from utils.permissions import require_store_view, require_store_create, require_store_edit, require_store_delete
from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/store", tags=["Store"])

# Helper function for audit logging
def log_audit_trail(db: Session, current_user: dict, action: str, table_name: str, record_id: int = None, old_values: dict = None, new_values: dict = None, description: str = None, request: Request = None):
    user_id = None
    user_name = 'System'
    
    if current_user:
        user_id = current_user.get('id') or current_user.get('sub')
        user_name = current_user.get('full_name') or current_user.get('email') or current_user.get('name', 'System')
        
        if user_id and isinstance(user_id, str):
            try:
                user_id = int(user_id)
            except ValueError:
                user_id = None
    
    # Extract IP and User Agent from request
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent')
    
    audit_log = AuditLog(
        user_id=user_id,
        user_name=user_name,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        ip_address=ip_address,
        user_agent=user_agent,
        module="ORGANIZATION",
        description=description
    )
    db.add(audit_log)
    db.commit()


# --------------------------
# CREATE STORE
# --------------------------
@router.post("/", response_model=StoreResponse)
def create_store(data: StoreCreate, request: Request, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_store_create())):
    log_api("CREATE STORE")

    try:
        # Ensure branch exists
        branch = db.query(Branch).filter(Branch.id == data.branch_id).first()
        if not branch:
            raise HTTPException(404, "Branch not found")

        store = Store(**data.dict())
        db.add(store)
        db.commit()
        db.refresh(store)
        
        # Audit log
        log_audit_trail(
            db=db,
            current_user=current_user,
            action="CREATE",
            table_name="stores",
            record_id=store.id,
            new_values={
                "name": store.name,
                "code": store.code,
                "store_type": store.store_type,
                "is_central": store.is_central,
                "description": store.description,
                "branch_id": store.branch_id
            },
            description=f"Created store {store.name}",
            request=request
        )

        log_audit(f"Store created → {store.name}")
        return store

    except Exception as e:
        log_error(e, "create_store")
        raise HTTPException(500, "Failed to create store")


# --------------------------
# LIST ALL STORES
# --------------------------
@router.get("/", response_model=list[StoreResponse])
def list_stores(db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_store_view())):
    return db.query(Store).options(joinedload(Store.branch)).all()


# --------------------------
# GET ONE STORE
# --------------------------
@router.get("/{store_id}", response_model=StoreResponse)
def get_store(store_id: int, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_store_view())):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(404, "Store not found")
    return store


# --------------------------
# UPDATE STORE
# --------------------------
@router.put("/{store_id}", response_model=StoreResponse)
def update_store(store_id: int, data: StoreUpdate, request: Request, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_store_edit())):
    log_api("UPDATE STORE")

    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(404, "Store not found")

    # Store old values for audit
    old_values = {
        "name": store.name,
        "code": store.code,
        "store_type": store.store_type,
        "is_central": store.is_central,
        "description": store.description,
        "branch_id": store.branch_id
    }

    for key, value in data.dict(exclude_unset=True).items():
        setattr(store, key, value)

    db.commit()
    db.refresh(store)
    
    # Store new values for audit
    new_values = {
        "name": store.name,
        "code": store.code,
        "store_type": store.store_type,
        "is_central": store.is_central,
        "description": store.description,
        "branch_id": store.branch_id
    }
    
    # Audit log
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="stores",
        record_id=store.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated store {store.name}",
        request=request
    )

    log_audit(f"Store updated → {store.name}")
    return store


# --------------------------
# DELETE STORE
# --------------------------
@router.delete("/{store_id}")
def delete_store(store_id: int, request: Request, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_store_delete())):
    log_api("DELETE STORE")

    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(404, "Store not found")

    # Store store details for audit before deletion
    store_details = {
        "name": store.name,
        "code": store.code,
        "store_type": store.store_type,
        "is_central": store.is_central,
        "description": store.description,
        "branch_id": store.branch_id
    }

    db.delete(store)
    db.commit()
    
    # Audit log
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="stores",
        record_id=store_id,
        old_values=store_details,
        description=f"Deleted store {store_details['name']}",
        request=request
    )

    log_audit(f"Store deleted → {store_id}")
    return {"message": "Store deleted"}
