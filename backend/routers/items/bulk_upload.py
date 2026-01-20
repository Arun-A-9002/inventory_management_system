from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import pandas as pd
import io
import json

from database import get_current_tenant_db_name, get_tenant_db
from models.tenant_models import Item, Category, SubCategory, Brand, AuditLog
from schemas.tenant_schemas import ItemCreate
from utils.permissions import require_items_create, require_items_view
from utils.logger import log_api, log_error, log_audit

router = APIRouter(
    prefix="/bulk",
    tags=["Bulk Item Upload"]
)

def get_db(tenant_db_name: str = Depends(get_current_tenant_db_name())):
    yield from get_tenant_db(tenant_db_name)

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
        module="BULK_ITEM_UPLOAD",
        description=description
    )
    db.add(audit_log)
    db.commit()

@router.get("/template/xlsx")
def download_xlsx_template(db: Session = Depends(get_db), current_user: dict = Depends(require_items_view())):
    """Download Excel template for bulk item upload"""
    log_api("DOWNLOAD XLSX TEMPLATE")
    
    try:
        template_data = {
            'name': ['Paracetamol 500mg'],
            'item_code': ['ITEM001'],
            'description': ['Pain relief medication'],
            'category': ['Medicine'],
            'sub_category': ['Tablet'],
            'brand': ['Generic'],
            'manufacturer': ['ABC Pharma'],
            'item_type': ['consumable'],
            'min_stock': [10],
            'max_stock': [1000],
            'safety_stock': [5],
            'fixing_price': [5.50],
            'mrp': [6.00],
            'tax': [5.0],
            'has_expiry': [True],
            'expiry_date': ['2025-12-31'],
            'manufacture_date': ['2024-01-01'],
            'has_warranty': [True],
            'warranty_period': [12],
            'warranty_period_type': ['months']
        }
        
        df = pd.DataFrame(template_data)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Items', index=False)
            
            workbook = writer.book
            worksheet = writer.sheets['Items']
            
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width
        
        output.seek(0)
        
        log_audit_trail(
            db=db,
            current_user=current_user,
            action="DOWNLOAD",
            table_name="bulk_template",
            description="Downloaded XLSX template for bulk item upload"
        )
        
        return StreamingResponse(
            io.BytesIO(output.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=items_template.xlsx"}
        )
        
    except Exception as e:
        log_error(e, "download_xlsx_template")
        raise HTTPException(500, "Failed to generate template")

@router.get("/template/csv")
def download_csv_template(db: Session = Depends(get_db), current_user: dict = Depends(require_items_view())):
    """Download CSV template for bulk item upload"""
    log_api("DOWNLOAD CSV TEMPLATE")
    
    try:
        template_data = {
            'name': ['Paracetamol 500mg'],
            'item_code': ['ITEM001'],
            'description': ['Pain relief medication'],
            'category': ['Medicine'],
            'sub_category': ['Tablet'],
            'brand': ['Generic'],
            'manufacturer': ['ABC Pharma'],
            'item_type': ['consumable'],
            'min_stock': [10],
            'max_stock': [1000],
            'safety_stock': [5],
            'fixing_price': [5.50],
            'mrp': [6.00],
            'tax': [5.0],
            'has_expiry': [True],
            'expiry_date': ['2025-12-31'],
            'manufacture_date': ['2024-01-01'],
            'has_warranty': [True],
            'warranty_period': [12],
            'warranty_period_type': ['months']
        }
        
        df = pd.DataFrame(template_data)
        
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        
        log_audit_trail(
            db=db,
            current_user=current_user,
            action="DOWNLOAD",
            table_name="bulk_template",
            description="Downloaded CSV template for bulk item upload"
        )
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=items_template.csv"}
        )
        
    except Exception as e:
        log_error(e, "download_csv_template")
        raise HTTPException(500, "Failed to generate template")

@router.post("/preview")
async def preview_bulk_upload(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: dict = Depends(require_items_create())):
    """Preview bulk upload data before committing"""
    log_api("PREVIEW BULK UPLOAD")
    
    try:
        content = await file.read()
        
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            df = pd.read_excel(io.BytesIO(content))
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:
            raise HTTPException(400, "Unsupported file format. Please use Excel (.xlsx) or CSV (.csv)")
        
        required_columns = ['item_code', 'name', 'item_type']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(400, f"Missing required columns: {', '.join(missing_columns)}")
        
        duplicate_codes = df[df.duplicated(subset=['item_code'], keep=False)]['item_code'].tolist()
        
        existing_codes = []
        for code in df['item_code'].tolist():
            if db.query(Item).filter(Item.item_code == code).first():
                existing_codes.append(code)
        
        preview_data = []
        errors = []
        
        for index, row in df.iterrows():
            item_data = {
                'row_number': index + 2,
                'code': row.get('item_code', ''),
                'name': row.get('name', ''),
                'item_type': row.get('item_type', ''),
                'category': row.get('category', ''),
                'brand': row.get('brand', ''),
                'fixing_price': row.get('fixing_price', 0),
                'mrp': row.get('mrp', 0),
                'status': 'Valid'
            }
            
            row_errors = []
            if not row.get('item_code'):
                row_errors.append("Item code is required")
            if not row.get('name'):
                row_errors.append("Name is required")
            if not row.get('item_type'):
                row_errors.append("Item type is required")
            if row.get('item_code') in duplicate_codes:
                row_errors.append("Duplicate code in file")
            if row.get('item_code') in existing_codes:
                row_errors.append("Code already exists in database")
            
            # Validate expiry fields
            if row.get('has_expiry') and not row.get('expiry_date'):
                row_errors.append("Expiry date is required when has_expiry is True")
            
            # Validate warranty fields
            if row.get('has_warranty') and not row.get('warranty_period'):
                row_errors.append("Warranty period is required when has_warranty is True")
            
            # Validate warranty period type
            if row.get('has_warranty') and row.get('warranty_period_type'):
                valid_types = ['years', 'months']
                if str(row.get('warranty_period_type')).lower() not in valid_types:
                    row_errors.append(f"Invalid warranty_period_type '{row.get('warranty_period_type')}'. Must be 'years' or 'months'")
            
            # Validate item type
            if row.get('item_type'):
                valid_item_types = ['consumable', 'non_consumable']
                if str(row.get('item_type')).lower() not in valid_item_types:
                    row_errors.append(f"Invalid item_type '{row.get('item_type')}'. Must be 'consumable' or 'non_consumable'")
            
            if row_errors:
                item_data['status'] = 'Error'
                item_data['errors'] = row_errors
                errors.extend([f"Row {index + 2}: {error}" for error in row_errors])
            
            preview_data.append(item_data)
        
        return {
            "total_rows": len(df),
            "valid_rows": len([item for item in preview_data if item['status'] == 'Valid']),
            "error_rows": len([item for item in preview_data if item['status'] == 'Error']),
            "preview_data": preview_data[:50],
            "errors": errors,
            "can_proceed": len(errors) == 0
        }
        
    except Exception as e:
        log_error(e, "preview_bulk_upload")
        raise HTTPException(500, f"Failed to preview file: {str(e)}")

@router.post("/commit")
async def commit_bulk_upload(file: UploadFile = File(...), request: Request = None, db: Session = Depends(get_db), current_user: dict = Depends(require_items_create())):
    """Commit bulk upload after preview validation"""
    log_api("COMMIT BULK UPLOAD")
    
    try:
        content = await file.read()
        
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            df = pd.read_excel(io.BytesIO(content))
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:
            raise HTTPException(400, "Unsupported file format")
        
        categories = {cat.name: cat.id for cat in db.query(Category).all()}
        subcategories = {sub.name: sub.id for sub in db.query(SubCategory).all()}
        brands = {brand.brand_name: brand.id for brand in db.query(Brand).all()}
        
        created_items = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                if db.query(Item).filter(Item.item_code == row['item_code']).first():
                    errors.append(f"Row {index + 2}: Item code '{row['item_code']}' already exists")
                    continue
                
                # Handle date fields safely
                expiry_date = None
                if row.get('expiry_date') and pd.notna(row.get('expiry_date')):
                    try:
                        expiry_date = pd.to_datetime(row.get('expiry_date')).date()
                    except:
                        pass
                
                manufacture_date = None
                if row.get('manufacture_date') and pd.notna(row.get('manufacture_date')):
                    try:
                        manufacture_date = pd.to_datetime(row.get('manufacture_date')).date()
                    except:
                        pass
                
                item_data = {
                    'name': row['name'],
                    'item_code': row['item_code'],
                    'description': row.get('description', ''),
                    'category': row.get('category', ''),
                    'sub_category': row.get('sub_category', ''),
                    'brand': row.get('brand', ''),
                    'manufacturer': row.get('manufacturer', ''),
                    'min_stock': int(row.get('min_stock', 0)),
                    'max_stock': int(row.get('max_stock', 0)),
                    'safety_stock': int(row.get('safety_stock', 0)),
                    'fixing_price': float(row.get('fixing_price', 0)),
                    'mrp': float(row.get('mrp', 0)),
                    'tax': float(row.get('tax', 0)),
                    'item_type': row.get('item_type', 'consumable'),
                    'has_expiry': bool(row.get('has_expiry', False)),
                    'expiry_date': expiry_date,
                    'manufacture_date': manufacture_date,
                    'has_warranty': bool(row.get('has_warranty', False)),
                    'warranty_period': int(row.get('warranty_period', 0)),
                    'warranty_period_type': row.get('warranty_period_type', 'years'),
                    'is_active': True
                }
                
                item = Item(**item_data)
                db.add(item)
                db.flush()
                
                created_items.append({
                    'id': item.id,
                    'name': item.name,
                    'code': item.item_code
                })
                
                log_audit_trail(
                    db=db,
                    current_user=current_user,
                    action="BULK_CREATE",
                    table_name="items",
                    record_id=item.id,
                    new_values={
                        "name": item.name,
                        "item_code": item.item_code,
                        "category": item.category,
                        "brand": item.brand,
                        "item_type": item.item_type
                    },
                    description=f"Bulk created item {item.name} ({item.item_code})",
                    request=request
                )
                
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
                continue
        
        db.commit()
        
        log_audit(f"Bulk upload completed → {len(created_items)} items created, {len(errors)} errors")
        
        return {
            "success": True,
            "created_count": len(created_items),
            "error_count": len(errors),
            "created_items": created_items,
            "errors": errors
        }
        
    except Exception as e:
        db.rollback()
        log_error(e, "commit_bulk_upload")
        raise HTTPException(500, f"Failed to process bulk upload: {str(e)}")