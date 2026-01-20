# Location and Quantity Fields Implementation

This document describes the implementation of location and quantity fields in the Item Master creation system.

## Changes Made

### 1. Backend Changes

#### Database Model Updates (`models/tenant_models.py`)
- Added `location_id` field (Foreign Key to `inventory_locations.id`)
- Added `current_quantity` field (Integer, default 0)
- Added relationship to `InventoryLocation` model

#### Schema Updates (`schemas/tenant_schemas.py`)
- Updated `ItemBase` schema to include `location_id` and `current_quantity`
- Updated `ItemUpdate` schema to include the new fields

#### Database Migration (`database.py`)
- Added automatic migration in `ensure_missing_columns()` function
- New columns are added automatically when tenant database is accessed

#### API Updates (`routers/items/item.py`)
- Updated item list endpoint to include location information
- Added `joinedload(Item.location)` for efficient loading
- Updated response to include `location_id`, `location_name`, and `current_quantity`

#### Bulk Upload Templates (`routers/items/bulk_upload.py`)
- Added `location_code` and `current_quantity` to XLSX template
- Added `location_code` and `current_quantity` to CSV template

### 2. Frontend Changes

#### Item Form (`frontend/src/pages/items/Item.jsx`)
- Added location and quantity fields to form state
- Added location dropdown populated from `/inventory/locations/` API
- Added current quantity input field
- Updated form validation and submission

#### Item List Display
- Added "Location & Quantity" column to desktop table view
- Updated mobile card view to show location and quantity
- Updated table headers and responsive design

## New Fields

### location_id
- **Type**: Integer (Foreign Key)
- **Purpose**: Links item to an inventory location
- **UI**: Dropdown showing location name and code
- **API**: References `inventory_locations.id`

### current_quantity
- **Type**: Integer
- **Default**: 0
- **Purpose**: Tracks current stock quantity for the item
- **UI**: Number input field
- **Display**: Prominently shown in item list

## Database Schema

```sql
-- New columns added to items table
ALTER TABLE items ADD COLUMN location_id INT NULL AFTER safety_stock;
ALTER TABLE items ADD COLUMN current_quantity INT DEFAULT 0 AFTER location_id;
ALTER TABLE items ADD CONSTRAINT fk_items_location FOREIGN KEY (location_id) REFERENCES inventory_locations(id);
```

## API Endpoints

### GET /items
**Response includes new fields:**
```json
{
  "id": 1,
  "name": "Item Name",
  "item_code": "ITEM001",
  "location_id": 1,
  "location_name": "Main Warehouse",
  "current_quantity": 100,
  // ... other fields
}
```

### POST /items
**Request body includes new fields:**
```json
{
  "name": "New Item",
  "item_code": "ITEM002",
  "location_id": 1,
  "current_quantity": 50,
  // ... other fields
}
```

## Bulk Upload Template

### New Columns in Templates:
- `location_code`: Code of the inventory location
- `current_quantity`: Initial quantity for the item

### Example Template Row:
```csv
name,item_code,description,category,sub_category,brand,manufacturer,item_type,min_stock,max_stock,safety_stock,location_code,current_quantity,fixing_price,mrp,tax,has_expiry,expiry_date,manufacture_date,has_warranty,warranty_period,warranty_period_type
Paracetamol 500mg,ITEM001,Pain relief medication,Medicine,Tablet,Generic,ABC Pharma,consumable,10,1000,5,LOC001,100,5.50,6.00,5.0,TRUE,2025-12-31,2024-01-01,TRUE,12,months
```

## Migration Process

The migration is automatic and happens when:
1. A tenant database is accessed for the first time after the update
2. The `ensure_missing_columns()` function runs
3. New columns are added if they don't exist

## Testing

To test the implementation:
1. Start the FastAPI server
2. Access any item-related endpoint to trigger migration
3. Create a new item with location and quantity
4. Verify the item list shows the new information

## Notes

- Existing items will have `current_quantity = 0` and `location_id = NULL`
- Location dropdown is populated from the inventory locations API
- The implementation is backward compatible
- All changes are automatically applied via database migrations