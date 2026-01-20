# Item Master Permissions Documentation

## New Permissions Added

The following permissions have been added for the Item Master module:

### 1. Bulk Import Permission
- **Permission Name**: `items.bulk_import`
- **Label**: "Items — Bulk Import"
- **Group**: "Item Master"
- **Purpose**: Controls access to the bulk item import functionality

### 2. Location Access Permission
- **Permission Name**: `items.location_access`
- **Label**: "Items — Location Access"
- **Group**: "Item Master"
- **Purpose**: Controls access to location-related features in item management

### 3. Master Data Setup Permission
- **Permission Name**: `items.master_data_setup`
- **Label**: "Items — Master Data Setup"
- **Group**: "Item Master"
- **Purpose**: Controls access to master data setup functionality

## How to Use in Frontend

### 1. Check Permissions in React Components

```javascript
import { useAuth } from '../context/AuthContext';

function ItemMasterPage() {
    const { hasPermission } = useAuth();
    
    return (
        <div>
            {hasPermission('items.bulk_import') && (
                <button onClick={handleBulkImport}>
                    Bulk Import Items
                </button>
            )}
            
            {hasPermission('items.location_access') && (
                <button onClick={handleLocationAccess}>
                    Manage Locations
                </button>
            )}
            
            {hasPermission('items.master_data_setup') && (
                <button onClick={handleMasterDataSetup}>
                    Master Data Setup
                </button>
            )}
        </div>
    );
}
```

### 2. API Route Protection

In your backend routes, use these permissions:

```python
from utils.auth import check_permission

@router.post("/bulk-import")
def bulk_import_items(
    current_user: dict = Depends(check_permission("items.bulk_import"))
):
    # Bulk import logic here
    pass

@router.get("/locations")
def get_locations(
    current_user: dict = Depends(check_permission("items.location_access"))
):
    # Location access logic here
    pass

@router.post("/master-data-setup")
def setup_master_data(
    current_user: dict = Depends(check_permission("items.master_data_setup"))
):
    # Master data setup logic here
    pass
```

## Installation Steps

### 1. For New Tenants
New tenants will automatically get these permissions when running the seed script:
```bash
python backend/utils/seed_permission.py <tenant_name>
```

### 2. For Existing Tenants

#### Option A: Single Tenant
```bash
cd backend
python utils/add_item_master_permissions.py <tenant_db_name>
```

#### Option B: All Tenants
```bash
cd backend
python utils/add_item_master_permissions.py --bulk
```

#### Option C: Quick Setup (for 'arun' tenant)
```bash
cd backend
python utils/run_item_permissions.py
```

### 3. Assign to Roles

The script will automatically try to assign these permissions to admin roles. You can also manually assign them through the admin interface:

1. Go to User Management → Roles
2. Edit the desired role
3. Add the new permissions:
   - Items — Bulk Import
   - Items — Location Access
   - Items — Master Data Setup

## Role Recommendations

### Admin/Super Admin Roles
Should have all three permissions:
- ✅ items.bulk_import
- ✅ items.location_access  
- ✅ items.master_data_setup

### Store Manager Role
Should have location access:
- ❌ items.bulk_import
- ✅ items.location_access
- ❌ items.master_data_setup

### Data Entry Role
Should have bulk import:
- ✅ items.bulk_import
- ❌ items.location_access
- ❌ items.master_data_setup

### Regular User Role
Should have limited access:
- ❌ items.bulk_import
- ❌ items.location_access
- ❌ items.master_data_setup

## Verification

To verify the permissions were added correctly:

1. Check the database:
```sql
SELECT * FROM permissions WHERE name LIKE 'items.%';
```

2. Check role assignments:
```sql
SELECT r.name as role_name, p.name as permission_name, p.label 
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.name IN ('items.bulk_import', 'items.location_access', 'items.master_data_setup')
ORDER BY r.name, p.name;
```

3. Test in the frontend by logging in with different roles and checking if the buttons appear correctly.