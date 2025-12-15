from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_tenant_db
from models.tenant_models import (
    InventoryGlobalRule,
    ItemReorderRule,
    ItemVendorLeadTime,
    InventoryAlertRule
)
from schemas.tenant_schemas import *

router = APIRouter(prefix="/inventory-rules", tags=["Inventory Rules"])
DEFAULT_TENANT_DB = "arun"

def get_db():
    yield from get_tenant_db(DEFAULT_TENANT_DB)


# ---------------------------------------------------------
# GLOBAL RULES
# ---------------------------------------------------------
@router.post("/global", response_model=InventoryGlobalRuleResponse)
def save_global_rules(payload: InventoryGlobalRuleCreate, db: Session = Depends(get_db)):
    db.query(InventoryGlobalRule).delete()
    rule = InventoryGlobalRule(**payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/global", response_model=List[InventoryGlobalRuleResponse])
def get_global_rules(db: Session = Depends(get_db)):
    return db.query(InventoryGlobalRule).all()


# ---------------------------------------------------------
# ITEM REORDER RULES
# ---------------------------------------------------------
@router.post("/item", response_model=ItemReorderRuleResponse)
def create_item_rule(payload: ItemReorderRuleCreate, db: Session = Depends(get_db)):
    rule = ItemReorderRule(**payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/item", response_model=List[ItemReorderRuleResponse])
def list_item_rules(db: Session = Depends(get_db)):
    return db.query(ItemReorderRule).all()


# ---------------------------------------------------------
# LEAD TIME
# ---------------------------------------------------------
@router.post("/lead-time", response_model=LeadTimeResponse)
def save_lead_time(payload: LeadTimeCreate, db: Session = Depends(get_db)):
    lead = ItemVendorLeadTime(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/lead-time", response_model=List[LeadTimeResponse])
def list_lead_times(db: Session = Depends(get_db)):
    return db.query(ItemVendorLeadTime).all()


# ---------------------------------------------------------
# ALERT RULES
# ---------------------------------------------------------
@router.post("/alerts", response_model=InventoryAlertRuleResponse)
def save_alert_rule(payload: InventoryAlertRuleCreate, db: Session = Depends(get_db)):
    db.query(InventoryAlertRule).delete()
    rule = InventoryAlertRule(**payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/alerts", response_model=List[InventoryAlertRuleResponse])
def get_alert_rules(db: Session = Depends(get_db)):
    return db.query(InventoryAlertRule).all()
