from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_tenant_db

from models.tenant_models import Store, Branch
from schemas.tenant_schemas import (
    StoreCreate, StoreUpdate, StoreResponse
)

from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/store", tags=["Store"])


# --------------------------
# CREATE STORE
# --------------------------
@router.post("/", response_model=StoreResponse)
def create_store(data: StoreCreate, db: Session = Depends(get_tenant_db)):
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

        log_audit(f"Store created → {store.name}")
        return store

    except Exception as e:
        log_error(e, "create_store")
        raise HTTPException(500, "Failed to create store")


# --------------------------
# LIST ALL STORES
# --------------------------
@router.get("/", response_model=list[StoreResponse])
def list_stores(db: Session = Depends(get_tenant_db)):
    return db.query(Store).all()


# --------------------------
# GET ONE STORE
# --------------------------
@router.get("/{store_id}", response_model=StoreResponse)
def get_store(store_id: int, db: Session = Depends(get_tenant_db)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(404, "Store not found")
    return store


# --------------------------
# UPDATE STORE
# --------------------------
@router.put("/{store_id}", response_model=StoreResponse)
def update_store(store_id: int, data: StoreUpdate, db: Session = Depends(get_tenant_db)):
    log_api("UPDATE STORE")

    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(404, "Store not found")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(store, key, value)

    db.commit()
    db.refresh(store)

    log_audit(f"Store updated → {store.name}")
    return store


# --------------------------
# DELETE STORE
# --------------------------
@router.delete("/{store_id}")
def delete_store(store_id: int, db: Session = Depends(get_tenant_db)):
    log_api("DELETE STORE")

    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(404, "Store not found")

    db.delete(store)
    db.commit()

    log_audit(f"Store deleted → {store_id}")
    return {"message": "Store deleted"}
