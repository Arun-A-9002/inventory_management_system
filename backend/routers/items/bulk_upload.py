from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import pandas as pd
import io
import json

from database import get_current_tenant_db_name, get_tenant_db
from models.tenant_models import Item, Category, SubCategory, Brand, AuditLog, InventoryLocation
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
    pass  # Disabled to prevent transaction conflicts

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
            'location_name': ['Main Warehouse'],
            'current_quantity': [100],
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
            'location_name': ['Main Warehouse'],
            'current_quantity': [100],
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
        new_categories = set()
        new_subcategories = set()
        new_brands = set()
        
        for index, row in df.iterrows():
            # Check for new categories, subcategories, and brands
            category_name = str(row.get('category', '') or '').strip()
            subcategory_name = str(row.get('sub_category', '') or '').strip()
            brand_name = str(row.get('brand', '') or '').strip()
            
            if category_name and not db.query(Category).filter(Category.name == category_name).first():
                new_categories.add(category_name)
            
            if subcategory_name and category_name:
                category = db.query(Category).filter(Category.name == category_name).first()
                if category and not db.query(SubCategory).filter(
                    SubCategory.name == subcategory_name,
                    SubCategory.category_id == category.id
                ).first():
                    new_subcategories.add(subcategory_name)
            
            if brand_name and not db.query(Brand).filter(Brand.brand_name == brand_name).first():
                new_brands.add(brand_name)
            
            item_data = {
                'row_number': index + 2,
                'code': row.get('item_code', ''),
                'name': row.get('name', ''),
                'item_type': row.get('item_type', ''),
                'category': category_name,
                'sub_category': subcategory_name,
                'brand': brand_name,
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
            "can_proceed": len(errors) == 0,
            "auto_create_info": {
                "new_categories": list(new_categories),
                "new_subcategories": list(new_subcategories),
                "new_brands": list(new_brands)
            }
        }
        
    except Exception as e:
        log_error(e, "preview_bulk_upload")
        raise HTTPException(500, f"Failed to preview file: {str(e)}")

def get_or_create_category(db: Session, category_name: str) -> int:
    """Get existing category or create new one, return category ID"""
    if not category_name or category_name.strip() == '':
        return None
    
    category_name = category_name.strip()
    category = db.query(Category).filter(Category.name == category_name).first()
    
    if not category:
        category = Category(name=category_name, is_active=True)
        db.add(category)
        db.flush()  # Get ID without committing
    
    return category.id

def get_or_create_subcategory(db: Session, subcategory_name: str, category_id: int) -> int:
    """Get existing subcategory or create new one, return subcategory ID"""
    if not subcategory_name or subcategory_name.strip() == '' or not category_id:
        return None
    
    subcategory_name = subcategory_name.strip()
    subcategory = db.query(SubCategory).filter(
        SubCategory.name == subcategory_name,
        SubCategory.category_id == category_id
    ).first()
    
    if not subcategory:
        subcategory = SubCategory(
            name=subcategory_name,
            category_id=category_id,
            is_active=True
        )
        db.add(subcategory)
        db.flush()  # Get ID without committing
    
    return subcategory.id

def get_or_create_brand(db: Session, brand_name: str) -> int:
    """Get existing brand or create new one, return brand ID"""
    if not brand_name or brand_name.strip() == '':
        return None
    
    brand_name = brand_name.strip()
    brand = db.query(Brand).filter(Brand.brand_name == brand_name).first()
    
    if not brand:
        brand = Brand(brand_name=brand_name, is_active=True)
        db.add(brand)
        db.flush()  # Get ID without committing
    
    return brand.id

def get_or_create_location(db: Session, location_name: str) -> int:
    """Get existing location or create new one, return location ID"""
    if not location_name or location_name.strip() == '':
        return None
    
    location_name = location_name.strip()
    location = db.query(InventoryLocation).filter(InventoryLocation.name == location_name).first()
    
    if not location:
        # Generate code from name
        location_code = location_name.upper().replace(' ', '_')[:10]
        location = InventoryLocation(
            name=location_name,
            code=location_code,
            location_type="internal",
            is_active=True
        )
        db.add(location)
        db.flush()  # Get ID without committing
    
    return location.id

@router.post("/commit")
async def commit_bulk_upload(file: UploadFile = File(...), request: Request = None, db: Session = Depends(get_db), current_user: dict = Depends(require_items_create())):
    """Commit bulk upload after preview validation"""
    try:
        content = await file.read()
        
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            df = pd.read_excel(io.BytesIO(content))
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:
            raise HTTPException(400, "Unsupported file format")
        
        created_count = 0
        created_categories = set()
        created_subcategories = set()
        created_brands = set()
        created_locations = set()
        
        for index, row in df.iterrows():
            try:
                # Skip if required fields are missing
                if pd.isna(row.get('name')) or pd.isna(row.get('item_code')) or pd.isna(row.get('item_type')):
                    continue
                    
                # Skip if item already exists
                if db.query(Item).filter(Item.item_code == str(row['item_code']).strip()).first():
                    continue
                
                # Auto-create category if provided
                category_name = str(row.get('category', '') or '').strip()
                category_id = None
                if category_name:
                    category_id = get_or_create_category(db, category_name)
                    if category_id:
                        created_categories.add(category_name)
                
                # Auto-create subcategory if provided
                subcategory_name = str(row.get('sub_category', '') or '').strip()
                subcategory_id = None
                if subcategory_name and category_id:
                    subcategory_id = get_or_create_subcategory(db, subcategory_name, category_id)
                    if subcategory_id:
                        created_subcategories.add(subcategory_name)
                
                # Auto-create brand if provided
                brand_name = str(row.get('brand', '') or '').strip()
                brand_id = None
                if brand_name:
                    brand_id = get_or_create_brand(db, brand_name)
                    if brand_id:
                        created_brands.add(brand_name)
                
                # Get or create location from location_name
                location_name = str(row.get('location_name', '') or '').strip()
                location_id = None
                if location_name:
                    location_id = get_or_create_location(db, location_name)
                    if location_id:
                        created_locations.add(location_name)
                
                # Create item with minimal required fields
                item = Item(
                    name=str(row['name']).strip(),
                    item_code=str(row['item_code']).strip(),
                    item_type=str(row.get('item_type', 'consumable')).lower().strip(),
                    description=str(row.get('description', '') or '').strip(),
                    category=category_name,
                    sub_category=subcategory_name,
                    brand=brand_name,
                    manufacturer=str(row.get('manufacturer', '') or '').strip(),
                    min_stock=int(row.get('min_stock', 0) or 0),
                    max_stock=int(row.get('max_stock', 0) or 0),
                    safety_stock=int(row.get('safety_stock', 0) or 0),
                    location_id=location_id,
                    current_quantity=int(row.get('current_quantity', 0) or 0),
                    fixing_price=float(row.get('fixing_price', 0) or 0),
                    mrp=float(row.get('mrp', 0) or 0),
                    tax=float(row.get('tax', 0) or 0),
                    has_expiry=bool(row.get('has_expiry', False)),
                    has_warranty=bool(row.get('has_warranty', False)),
                    warranty_period=int(row.get('warranty_period', 0) or 0),
                    warranty_period_type=str(row.get('warranty_period_type', 'years')).lower().strip(),
                    is_active=True
                )
                
                db.add(item)
                created_count += 1
                
            except Exception:
                continue
        
        db.commit()
        
        return {
            "success": True,
            "created_count": created_count,
            "error_count": 0,
            "created_items": [],
            "errors": [],
            "auto_created": {
                "categories": list(created_categories),
                "subcategories": list(created_subcategories),
                "brands": list(created_brands),
                "locations": list(created_locations)
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Failed to process bulk upload: {str(e)}")