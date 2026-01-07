# backend/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import hashlib
import traceback

from database import get_master_db
from models.register_models import Tenant

from utils.auth import (
    create_access_token,
    generate_refresh_token,
    hash_token,
    refresh_expiry,
    generate_otp,
    verify_otp,
    send_otp_email,
    get_current_user
)

# Logging
from utils.logger import log_error, log_audit, log_api

router = APIRouter(tags=["Authentication"], prefix="/auth")


# --------------------------
# LOGIN REQUEST → SEND OTP
# --------------------------
class LoginModel(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(req: LoginModel, db: Session = Depends(get_master_db)):
    log_api(f"LOGIN ATTEMPT → {req.email}")
    
    try:
        # First check admin users
        user = db.query(Tenant).filter(Tenant.admin_email == req.email).first()
        
        if user:
            hashed_pw = hashlib.sha256(req.password.encode()).hexdigest()
            if hashed_pw == user.password_hash:
                otp = generate_otp(req.email)
                send_otp_email(req.email, otp)
                log_audit(f"OTP SENT TO ADMIN {req.email}")
                return {"message": "OTP sent to email"}
        
        # Then check tenant users in arun database
        from database import get_tenant_db
        from models.tenant_models import User
        from utils.auth import verify_password
        
        tenant_db_gen = get_tenant_db("arun")
        tenant_db = next(tenant_db_gen)
        
        tenant_user = tenant_db.query(User).filter(User.email == req.email).first()
        
        if tenant_user and verify_password(req.password, tenant_user.hashed_password):
            if not tenant_user.is_active:
                tenant_db.close()
                raise HTTPException(400, "Account is inactive")
            
            # Send OTP for tenant user
            otp = generate_otp(req.email)
            send_otp_email(req.email, otp)
            tenant_db.close()
            log_audit(f"OTP SENT TO TENANT USER {req.email}")
            return {"message": "OTP sent to email"}
        
        tenant_db.close()
        
        log_error(Exception("Invalid credentials"), location="Login Check")
        raise HTTPException(400, "Invalid email or password")
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, location="Login Endpoint")
        raise HTTPException(500, "Internal server error")


# --------------------------
# VERIFY OTP → ISSUE TOKENS
# --------------------------
class OTPVerifyModel(BaseModel):
    email: str
    otp: str


@router.post("/verify")
def verify(req: OTPVerifyModel, response: Response, db: Session = Depends(get_master_db)):

    log_api(f"OTP VERIFY ATTEMPT → {req.email}")

    try:
        if not verify_otp(req.email, req.otp):
            log_error(Exception("Invalid OTP"), location="OTP Verify")
            raise HTTPException(400, "Invalid or expired OTP")

        # Check admin users first
        user = db.query(Tenant).filter(Tenant.admin_email == req.email).first()
        
        if user:
            access_token = create_access_token({
                "sub": str(user.id),
                "tenant_id": user.id,
                "email": user.admin_email,
                "org": user.organization_name,
                "role": "admin",
                "full_name": user.organization_name  # Use org name as display name for admin
            })

            # Refresh token rotation
            raw_refresh = generate_refresh_token()
            user.refresh_token_hash = hash_token(raw_refresh)
            user.refresh_token_expires_at = refresh_expiry()
            db.commit()

            response.set_cookie(
                key="refresh_token",
                value=raw_refresh,
                httponly=True,
                secure=False,
                samesite="lax",
                max_age=7 * 24 * 3600
            )

            log_audit(f"ADMIN LOGIN SUCCESS → {req.email}")
            return {"access_token": access_token, "token_type": "bearer"}
        
        # Then check tenant users
        from database import get_tenant_db
        from models.tenant_models import User
        
        tenant_db_gen = get_tenant_db("arun")
        tenant_db = next(tenant_db_gen)
        
        tenant_user = tenant_db.query(User).filter(User.email == req.email).first()
        
        if tenant_user:
            # Get user permissions
            permissions = []
            for role in tenant_user.roles:
                for permission in role.permissions:
                    permissions.append(permission.name)
            
            # Get role names
            role_names = [role.name for role in tenant_user.roles]
            primary_role = role_names[0] if role_names else "user"
            
            access_token = create_access_token({
                "sub": str(tenant_user.id),
                "email": tenant_user.email,
                "tenant_db": "arun",
                "user_type": "tenant_user",
                "permissions": list(set(permissions)),  # Remove duplicates
                "full_name": tenant_user.full_name,
                "role": primary_role
            })
            tenant_db.close()
            log_audit(f"TENANT USER LOGIN SUCCESS → {req.email}")
            return {"access_token": access_token, "token_type": "bearer"}
        
        tenant_db.close()
        
        log_error(Exception("User not found"), location="OTP Verify User Fetch")
        raise HTTPException(400, "Invalid email")

    except HTTPException:
        raise
    except Exception as e:
        log_error(e, location="Verify Endpoint")
        raise HTTPException(500, "Internal server error")


# --------------------------
# REFRESH TOKEN ROTATION
# --------------------------
@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_master_db)):

    log_api("REFRESH TOKEN CALLED")

    try:
        raw = request.cookies.get("refresh_token")
        if not raw:
            log_error(Exception("Missing refresh token"), location="Refresh Token")
            raise HTTPException(401, "Missing refresh token")

        hashed = hash_token(raw)
        user = db.query(Tenant).filter(Tenant.refresh_token_hash == hashed).first()

        if not user:
            log_error(Exception("Invalid refresh token"), location="Refresh Token")
            raise HTTPException(401, "Invalid refresh token")

        if not user.refresh_token_expires_at or user.refresh_token_expires_at < datetime.utcnow():
            log_error(Exception("Expired refresh token"), location="Refresh Token Expiry")
            raise HTTPException(401, "Refresh token expired")

        # ROTATE
        new_raw = generate_refresh_token()
        user.refresh_token_hash = hash_token(new_raw)
        user.refresh_token_expires_at = refresh_expiry()
        db.commit()

        response.set_cookie(
            key="refresh_token",
            value=new_raw,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=7 * 24 * 3600
        )

        # -------------------------------
        # 🔥 UPDATED ACCESS TOKEN (with tenant_id)
        # -------------------------------
        new_access = create_access_token({
            "sub": str(user.id),
            "tenant_id": user.id,   # 👈 ADDED
            "email": user.admin_email,
            "org": user.organization_name
        })

        log_audit(f"TOKEN ROTATED → {user.admin_email}")

        return {"access_token": new_access}

    except Exception as e:
        log_error(e, location="Refresh Endpoint")
        raise HTTPException(500, "Internal server error")


# --------------------------
# LOGOUT
# --------------------------
@router.post("/logout")
def logout(response: Response, request: Request, db: Session = Depends(get_master_db)):

    log_api("LOGOUT CALLED")

    try:
        raw = request.cookies.get("refresh_token")

        if raw:
            hashed = hash_token(raw)
            user = db.query(Tenant).filter(Tenant.refresh_token_hash == hashed).first()

            if user:
                user.refresh_token_hash = None
                user.refresh_token_expires_at = None
                db.commit()

        response.delete_cookie("refresh_token")

        log_audit("LOGOUT SUCCESS")

        return {"message": "Logged out"}

    except Exception as e:
        log_error(e, location="Logout Endpoint")
        raise HTTPException(500, "Internal server error")


# --------------------------
# GET CURRENT USER PROFILE
# --------------------------
@router.get("/profile")
def get_profile(current_user = Depends(get_current_user)):
    """Get current user profile with permissions."""
    log_api(f"PROFILE REQUEST → {current_user.get('email')}")
    
    try:
        profile = {
            "id": current_user.get("sub"),
            "email": current_user.get("email"),
            "role": current_user.get("role", "user"),
            "permissions": current_user.get("permissions", []),
            "user_type": current_user.get("user_type", "admin")
        }
        
        # Add organization info for admin users
        if current_user.get("org"):
            profile["organization"] = current_user.get("org")
        
        # Add tenant info and fetch full name for tenant users
        if current_user.get("tenant_db"):
            profile["tenant_db"] = current_user.get("tenant_db")
            
            # Fetch full name from tenant database
            try:
                from database import get_tenant_db
                from models.tenant_models import User
                
                tenant_db_gen = get_tenant_db("arun")
                tenant_db = next(tenant_db_gen)
                
                user_id = int(current_user.get("sub"))
                db_user = tenant_db.query(User).filter(User.id == user_id).first()
                
                if db_user:
                    profile["full_name"] = db_user.full_name
                    # Get role names from user roles
                    role_names = [role.name for role in db_user.roles]
                    if role_names:
                        profile["role_names"] = role_names
                        profile["role"] = role_names[0] if len(role_names) == 1 else "Multiple Roles"
                
                tenant_db.close()
            except Exception as e:
                log_error(e, location="Profile fetch user details")
        
        return profile
        
    except Exception as e:
        log_error(e, location="Profile Endpoint")
        raise HTTPException(500, "Internal server error")
