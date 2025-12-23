from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from database import get_tenant_db
from models.tenant_models import IssueHeader, IssueItem
from schemas.tenant_schemas import *

router = APIRouter(prefix="/consumption", tags=["Consumption & Issue"])
DEFAULT_DB = "arun"

def get_db():
    yield from get_tenant_db(DEFAULT_DB)

@router.post("/issue")
def create_issue(data: IssueCreate, db: Session = Depends(get_db)):
    issue_no = f"ISS-{date.today().strftime('%Y%m%d%H%M%S')}"

    header = IssueHeader(
        issue_no=issue_no,
        issue_type=data.issue_type,
        department=data.department,
        project_code=data.project_code,
        external_ref=data.external_ref,
        issue_date=data.issue_date,
        requested_by=data.requested_by,
        remarks=data.remarks
    )
    db.add(header)
    db.commit()
    db.refresh(header)

    for i in data.items:
        db.add(IssueItem(
            issue_id=header.id,
            item_name=i.item_name,
            qty=i.qty,
            uom=i.uom,
            batch_no=i.batch_no,
            item_type=i.item_type,
            remarks=i.remarks
        ))

    db.commit()
    return {"message": "Issue created", "issue_no": issue_no}
