# backend/routers/permissions.py

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_master_db
from models.register_models import Tenant
from utils.seed_permission import seed_permissions_for_tenant
from utils.logger import log_audit, log_error
from typing import List

router = APIRouter()


@router.post("/seed-permissions/{tenant_code}")
def seed_permissions_for_tenant_api(tenant_code: str, db: Session = Depends(get_master_db)):
    """
    Manually seed permissions for a specific tenant.
    """
    try:
        # Find tenant by tenant_code
        tenant = db.query(Tenant).filter(Tenant.tenant_code == tenant_code).first()
        
        if not tenant:
            raise HTTPException(status_code=404, detail=f"Tenant with code '{tenant_code}' not found")
        
        # Seed permissions
        success = seed_permissions_for_tenant(tenant.database_name)
        
        if success:
            log_audit(f"Manual permission seeding successful for tenant: {tenant.organization_name} ({tenant_code})")
            return {
                "message": f"Permissions seeded successfully for tenant '{tenant.organization_name}'",
                "tenant_code": tenant_code,
                "database_name": tenant.database_name,
                "success": True
            }
        else:
            log_error(Exception("Permission seeding failed"), f"Manual permission seeding failed for tenant: {tenant_code}")
            raise HTTPException(status_code=500, detail="Failed to seed permissions")
            
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, f"Error during manual permission seeding for tenant: {tenant_code}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/seed-permissions-bulk")
def seed_permissions_bulk_api(db: Session = Depends(get_master_db)):
    """
    Seed permissions for all existing tenants.
    """
    try:
        # Get all tenants
        tenants = db.query(Tenant).all()
        
        if not tenants:
            return {
                "message": "No tenants found",
                "total_tenants": 0,
                "success_count": 0,
                "failed_count": 0,
                "results": []
            }
        
        success_count = 0
        failed_count = 0
        results = []
        
        for tenant in tenants:
            try:
                success = seed_permissions_for_tenant(tenant.database_name)
                
                if success:
                    success_count += 1
                    results.append({
                        "tenant_code": tenant.tenant_code,
                        "organization_name": tenant.organization_name,
                        "database_name": tenant.database_name,
                        "status": "success"
                    })
                    log_audit(f"Bulk permission seeding successful for tenant: {tenant.organization_name}")
                else:
                    failed_count += 1
                    results.append({
                        "tenant_code": tenant.tenant_code,
                        "organization_name": tenant.organization_name,
                        "database_name": tenant.database_name,
                        "status": "failed"
                    })
                    log_error(Exception("Permission seeding failed"), f"Bulk permission seeding failed for tenant: {tenant.tenant_code}")
                    
            except Exception as e:
                failed_count += 1
                results.append({
                    "tenant_code": tenant.tenant_code,
                    "organization_name": tenant.organization_name,
                    "database_name": tenant.database_name,
                    "status": "error",
                    "error": str(e)
                })
                log_error(e, f"Error during bulk permission seeding for tenant: {tenant.tenant_code}")
        
        return {
            "message": "Bulk permission seeding completed",
            "total_tenants": len(tenants),
            "success_count": success_count,
            "failed_count": failed_count,
            "results": results
        }
        
    except Exception as e:
        log_error(e, "Error during bulk permission seeding")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/tenants")
def get_all_tenants(db: Session = Depends(get_master_db)):
    """
    Get list of all tenants for reference.
    """
    try:
        tenants = db.query(Tenant).all()
        
        tenant_list = []
        for tenant in tenants:
            tenant_list.append({
                "id": tenant.id,
                "tenant_code": tenant.tenant_code,
                "organization_name": tenant.organization_name,
                "database_name": tenant.database_name,
                "status": tenant.status,
                "admin_email": tenant.admin_email
            })
        
        return {
            "total_tenants": len(tenant_list),
            "tenants": tenant_list
        }
        
    except Exception as e:
        log_error(e, "Error fetching tenants list")
        raise HTTPException(status_code=500, detail="Internal server error")