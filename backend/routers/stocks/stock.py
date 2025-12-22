from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_tenant_db
from models.tenant_models import Stock, StockLedger, StockTransfer, StockIssue
from schemas.tenant_schemas import *

router = APIRouter(prefix="/stocks", tags=["Stock Management"])
DEFAULT_DB = "arun"

def get_db():
    yield from get_tenant_db(DEFAULT_DB)

# ---------------- OVERVIEW ----------------
@router.get("/", response_model=list[StockResponse])
def list_stock(db: Session = Depends(get_db)):
    return db.query(Stock).all()


# ---------------- ADJUSTMENT ----------------
@router.post("/adjust")
def adjust_stock(data: StockAdjustmentCreate, db: Session = Depends(get_db)):
    stock = db.query(Stock).get(data.stock_id)
    if not stock:
        raise HTTPException(404, "Stock not found")

    if data.adjustment_type in ["OPENING", "INCREASE"]:
        stock.total_qty += data.quantity
        stock.available_qty += data.quantity
        qty_in, qty_out = data.quantity, 0
    else:
        stock.total_qty -= data.quantity
        stock.available_qty -= data.quantity
        qty_in, qty_out = 0, data.quantity

    ledger = StockLedger(
        stock_id=stock.id,
        batch_no=data.batch_no,
        txn_type=data.adjustment_type,
        qty_in=qty_in,
        qty_out=qty_out,
        balance=stock.available_qty,
        remarks=data.reason
    )

    db.add(ledger)
    db.commit()
    return {"message": "Stock adjusted successfully"}


# ---------------- TRANSFER ----------------
@router.post("/transfer")
def transfer_stock(data: StockTransferCreate, db: Session = Depends(get_db)):
    transfer = StockTransfer(**data.dict())
    db.add(transfer)
    db.commit()
    return {"message": "Transfer initiated"}


# ---------------- ISSUE ----------------
@router.post("/issue")
def issue_stock(data: StockIssueCreate, db: Session = Depends(get_db)):
    issue = StockIssue(
        issue_no=f"ISS-{data.stock_id}-{int(datetime.utcnow().timestamp())}",
        **data.dict()
    )
    db.add(issue)
    db.commit()
    return {"message": "Stock issued"}
