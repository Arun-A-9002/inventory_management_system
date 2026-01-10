# Automatic Permission Seeding

This document explains the automatic permission seeding functionality implemented in the inventory management system.

## Overview

When a new tenant is created through the registration process, all predefined permissions are automatically loaded into the tenant's database. This ensures that every new tenant has access to all system permissions without manual intervention.

## How It Works

### 1. Automatic Seeding During Registration

When a new tenant registers:
1. Master database entry is created
2. Tenant database is created
3. Tenant tables are created
4. **Permissions are automatically seeded** ✨
5. Admin user is created
6. Registration email is sent

### 2. Permission List

All permissions are defined in `backend/utils/seed_permission.py` in the `PERMISSIONS` list. The system includes permissions for:

- Departments (view, create, update, delete)
- Roles (view, create, update, delete)
- Users (view, create, update, delete)
- Company Management
- Branch Management
- Store Management
- Item Master
- Master Data (Category, Sub Category, Brand)
- Vendor Management
- Customer Management
- Location Management
- Purchase Management
- Goods Receipt & Inspection (GRN)
- Return and Disposal
- Stock Management
- External Transfer
- And many more...

## API Endpoints

### Manual Permission Seeding

If you need to manually seed permissions for existing tenants:

#### Seed permissions for a specific tenant:
```
POST /api/permissions/seed-permissions/{tenant_code}
```

#### Seed permissions for all tenants:
```
POST /api/permissions/seed-permissions-bulk
```

#### Get list of all tenants:
```
GET /api/permissions/tenants
```

## Utility Scripts

### 1. Individual Tenant Seeding
```bash
python backend/utils/seed_permission.py <tenant_db_name>
```

### 2. Bulk Seeding for All Tenants
```bash
python backend/utils/bulk_seed_permissions.py
```

### 3. Test Permission Seeding
```bash
python backend/test_permission_seeding.py
```

## Files Modified/Created

### Modified Files:
- `backend/routers/register.py` - Added automatic permission seeding to registration process
- `backend/utils/seed_permission.py` - Added reusable seeding function
- `backend/main.py` - Added permissions router

### New Files:
- `backend/routers/permissions.py` - API endpoints for manual permission management
- `backend/utils/bulk_seed_permissions.py` - Bulk seeding utility
- `backend/test_permission_seeding.py` - Test script

## Benefits

1. **Automatic Setup**: New tenants get all permissions automatically
2. **Consistency**: All tenants have the same permission structure
3. **No Manual Work**: Eliminates the need to manually run seeding scripts
4. **Backup Options**: Manual seeding APIs available if needed
5. **Bulk Operations**: Can seed permissions for multiple tenants at once

## Registration Response

The registration API now returns additional information:

```json
{
    "message": "Organization registered successfully",
    "id": 123,
    "database_name": "tenant_db_name",
    "permissions_seeded": true,
    "email_sent": true
}
```

## Error Handling

- If permission seeding fails during registration, it's logged but doesn't stop the registration process
- Manual seeding APIs provide detailed error information
- All operations are logged for audit purposes

## Future Enhancements

- Permission versioning system
- Selective permission seeding based on tenant type
- Permission templates for different organization types
- Automatic permission updates when new features are added