# backend/routers/subscription.py
"""
Subscription management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_current_tenant_db_name, get_master_db
from models.register_models import Tenant
from utils.auth import check_permission
from utils.subscription_permissions import get_permissions_for_tier

router = APIRouter(prefix="/subscription", tags=["Subscription"])

@router.get("/info")
def get_subscription_info(
    tenant_db_name: str = Depends(get_current_tenant_db_name()),
    current_user: dict = Depends(check_permission("company.view")),
    master_db: Session = Depends(get_master_db)
):
    """Get current tenant's subscription information."""
    try:
        tenant = master_db.query(Tenant).filter(Tenant.database_name == tenant_db_name).first()
        
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Get available permissions for this tier
        available_permissions = get_permissions_for_tier(tenant.subscription_tier)
        
        return {
            "subscription_tier": tenant.subscription_tier.value,
            "organization_name": tenant.organization_name,
            "total_available_permissions": len(available_permissions),
            "tier_features": {
                "basic": {
                    "description": "Essential features for small organizations",
                    "max_permissions": len(get_permissions_for_tier(tenant.subscription_tier.__class__.BASIC))
                },
                "standard": {
                    "description": "Advanced features for growing businesses", 
                    "max_permissions": len(get_permissions_for_tier(tenant.subscription_tier.__class__.STANDARD))
                },
                "premium": {
                    "description": "Full feature access for enterprise organizations",
                    "max_permissions": len(get_permissions_for_tier(tenant.subscription_tier.__class__.PREMIUM))
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")