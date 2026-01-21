# backend/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import hashlib
import traceback
import os
import json

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
from utils.audit import log_audit as log_database_audit, get_user_info

router = APIRouter(tags=["Authentication"])


# --------------------------
# LOGIN REQUEST → SEND OTP OR DIRECT LOGIN
# --------------------------
class LoginModel(BaseModel):
    tenant_code: str
    login_identifier: str  # Can be either login_code or email
    password: str
    
    class Config:
        str_strip_whitespace = True  # Automatically strip whitespace
        
    def __init__(self, **data):
        # Handle potential field name variations
        if 'email' in data and 'login_identifier' not in data:
            data['login_identifier'] = data.pop('email')
        if 'login_code' in data and 'login_identifier' not in data:
            data['login_identifier'] = data.pop('login_code')
        super().__init__(**data)

class LoginEmailModel(BaseModel):
    tenant_code: str
    email: str
    password: str


@router.post("/test-login")
async def test_login_debug(request: Request):
    """Debug endpoint to test if the server is receiving requests"""
    try:
        body = await request.body()
        headers = dict(request.headers)
        
        return {
            "message": "Server is working",
            "method": request.method,
            "url": str(request.url),
            "headers": headers,
            "body": body.decode() if body else "No body",
            "client": request.client.host if request.client else "No client info"
        }
    except Exception as e:
        return {"error": str(e)}


@router.post("/debug-login")
async def debug_login(request: Request):
    """Debug endpoint to see raw request data"""
    try:
        body = await request.body()
        headers = dict(request.headers)
        
        # Try to parse JSON
        try:
            import json
            json_data = json.loads(body.decode()) if body else {}
        except:
            json_data = "Could not parse JSON"
        
        return {
            "message": "Debug endpoint working",
            "raw_body": body.decode() if body else "No body",
            "parsed_json": json_data,
            "content_type": headers.get('content-type'),
            "method": request.method
        }
    except Exception as e:
        return {"error": str(e)}


@router.post("/login")
async def login(request: Request, db: Session = Depends(get_master_db)):
    try:
        # Parse JSON manually
        body = await request.body()
        import json
        data = json.loads(body.decode())
        
        tenant_code = data.get('tenant_code', '').strip()
        login_identifier = data.get('login_identifier', '').strip()
        password = data.get('password', '').strip()
        
        log_api(f"LOGIN ATTEMPT → {login_identifier} with tenant code {tenant_code}")
        
        # Validate required fields
        if not tenant_code:
            raise HTTPException(400, "Tenant code is required")
        if not login_identifier:
            raise HTTPException(400, "Login identifier (email or login code) is required")
        if not password:
            raise HTTPException(400, "Password is required")
        
        # Find tenant
        tenant = db.query(Tenant).filter(Tenant.tenant_code.ilike(tenant_code)).first()
        if not tenant:
            raise HTTPException(400, "Invalid tenant code")
        
        # Check if admin login (by email OR by login code matching admin email)
        admin_user = None
        if '@' in login_identifier and tenant.admin_email == login_identifier:
            # Admin login by email - find the admin user in tenant DB
            from database import get_tenant_db
            from models.tenant_models import User
            
            tenant_db_gen = get_tenant_db(tenant.database_name)
            tenant_db = next(tenant_db_gen)
            
            admin_user = tenant_db.query(User).filter(User.email == login_identifier).first()
            tenant_db.close()
        elif '@' not in login_identifier:
            # Check if this login code belongs to an admin user
            from database import get_tenant_db
            from models.tenant_models import User
            
            tenant_db_gen = get_tenant_db(tenant.database_name)
            tenant_db = next(tenant_db_gen)
            
            admin_user = tenant_db.query(User).filter(
                User.login_code == login_identifier.upper(),
                User.email == tenant.admin_email
            ).first()
            
            tenant_db.close()
        
        if admin_user:
            hashed_pw = hashlib.sha256(password.encode()).hexdigest()
            if hashed_pw == tenant.password_hash:
                # Check if admin user has 2FA enabled
                if admin_user.two_factor_enabled:
                    otp = generate_otp(admin_user.email)
                    send_otp_email(admin_user.email, otp)
                    return {"message": "OTP sent to email", "requires_otp": True, "email": admin_user.email}
                else:
                    # Direct admin login without 2FA - get admin permissions
                    from database import get_tenant_db
                    from models.tenant_models import User
                    
                    tenant_db_gen = get_tenant_db(tenant.database_name)
                    tenant_db = next(tenant_db_gen)
                    
                    # Get admin user permissions
                    admin_permissions = []
                    admin_user_db = tenant_db.query(User).filter(User.email == admin_user.email).first()
                    if admin_user_db:
                        for role in admin_user_db.roles:
                            for permission in role.permissions:
                                admin_permissions.append(permission.name)
                    
                    tenant_db.close()
                    
                    access_token = create_access_token({
                        "sub": str(tenant.id),
                        "tenant_id": tenant.id,
                        "email": tenant.admin_email,
                        "org": tenant.organization_name,
                        "role": "admin",
                        "tenant_db": tenant.database_name,
                        "tenant_code": tenant.tenant_code,
                        "user_type": "admin",
                        "full_name": tenant.admin_name,
                        "permissions": list(set(admin_permissions)) if admin_permissions else []
                    })
                    return {"access_token": access_token, "token_type": "bearer", "requires_otp": False}
            else:
                raise HTTPException(400, "Invalid credentials")
        
        # Regular user login
        from database import get_tenant_db
        from models.tenant_models import User, UserSession
        from utils.auth import verify_password
        import secrets
        
        tenant_db_gen = get_tenant_db(tenant.database_name)
        tenant_db = next(tenant_db_gen)
        
        # Find user
        if '@' in login_identifier:
            tenant_user = tenant_db.query(User).filter(User.email == login_identifier).first()
        else:
            tenant_user = tenant_db.query(User).filter(User.login_code == login_identifier.upper()).first()
        
        if tenant_user and verify_password(password, tenant_user.hashed_password):
            if not tenant_user.is_active:
                tenant_db.close()
                raise HTTPException(400, "Account is inactive")
            
            # Check 2FA
            if tenant_user.two_factor_enabled:
                otp = generate_otp(tenant_user.email)
                send_otp_email(tenant_user.email, otp)
                tenant_db.close()
                return {"message": "OTP sent to email", "requires_otp": True, "email": tenant_user.email}
            
            # Direct login
            if not tenant_user.multi_login_enabled:
                existing_sessions = tenant_db.query(UserSession).filter(
                    UserSession.user_id == tenant_user.id,
                    UserSession.is_active == True
                ).all()
                for session in existing_sessions:
                    session.is_active = False
                if existing_sessions:
                    tenant_db.commit()
            
            # Get permissions
            permissions = []
            for role in tenant_user.roles:
                for permission in role.permissions:
                    permissions.append(permission.name)
            
            role_names = [role.name for role in tenant_user.roles]
            primary_role = role_names[0] if role_names else "user"
            
            # Create session
            session_token = secrets.token_urlsafe(32)
            session_hash = hashlib.sha256(session_token.encode()).hexdigest()
            
            user_session = UserSession(
                user_id=tenant_user.id,
                session_token=session_hash,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get('user-agent')
            )
            tenant_db.add(user_session)
            tenant_db.commit()
            
            access_token = create_access_token({
                "sub": str(tenant_user.id),
                "email": tenant_user.email,
                "login_code": tenant_user.login_code,
                "tenant_db": tenant.database_name,
                "tenant_code": tenant.tenant_code,
                "user_type": "tenant_user",
                "permissions": list(set(permissions)),
                "full_name": tenant_user.full_name,
                "role": primary_role,
                "session_token": session_hash
            })
            
            tenant_db.close()
            return {"access_token": access_token, "token_type": "bearer", "requires_otp": False}
        
        tenant_db.close()
        raise HTTPException(400, "Invalid login code/email or password")
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, location="Login Endpoint")
        raise HTTPException(500, "Internal server error")


@router.post("/admin-login")
def admin_login(req: LoginEmailModel, db: Session = Depends(get_master_db)):
    log_api(f"ADMIN LOGIN ATTEMPT → {req.email} with tenant code {req.tenant_code}")
    
    try:
        # First find the tenant by tenant_code AND admin_email (both must match)
        tenant = db.query(Tenant).filter(
            Tenant.tenant_code.ilike(req.tenant_code),
            Tenant.admin_email == req.email
        ).first()
        
        if not tenant:
            log_error(Exception(f"Invalid tenant code or admin email: {req.tenant_code}, {req.email}"), location="Admin Login Check")
            raise HTTPException(400, "Invalid tenant code or email")
        
        # Verify password
        hashed_pw = hashlib.sha256(req.password.encode()).hexdigest()
        if hashed_pw == tenant.password_hash:
            otp = generate_otp(req.email)
            send_otp_email(req.email, otp)
            log_audit(f"OTP SENT TO ADMIN {req.email} for tenant {req.tenant_code}")
            return {"message": "OTP sent to email", "requires_otp": True}
        else:
            log_error(Exception("Invalid admin password"), location="Admin Login Check")
            raise HTTPException(400, "Invalid email or password")
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, location="Admin Login Endpoint")
        raise HTTPException(500, "Internal server error")


# --------------------------
# VERIFY OTP → ISSUE TOKENS
# --------------------------
class OTPVerifyModel(BaseModel):
    tenant_code: str
    email: str
    otp: str
    login_code: str = None  # Optional for admin logins


@router.post("/verify")
def verify(req: OTPVerifyModel, response: Response, db: Session = Depends(get_master_db)):

    log_api(f"OTP VERIFY ATTEMPT → {req.email} for tenant {req.tenant_code}")

    try:
        if not verify_otp(req.email, req.otp):
            log_error(Exception("Invalid OTP"), location="OTP Verify")
            raise HTTPException(400, "Invalid or expired OTP")

        # Find the tenant by tenant_code AND admin_email (both must match for admin login)
        tenant = db.query(Tenant).filter(
            Tenant.tenant_code.ilike(req.tenant_code),
            Tenant.admin_email == req.email
        ).first()
        
        # If this is an admin login (both tenant_code and email match)
        if tenant:
            # Get admin user permissions from tenant database
            from database import get_tenant_db
            from models.tenant_models import User
            
            tenant_db_gen = get_tenant_db(tenant.database_name)
            tenant_db = next(tenant_db_gen)
            
            admin_permissions = []
            admin_user_db = tenant_db.query(User).filter(User.email == req.email).first()
            if admin_user_db:
                for role in admin_user_db.roles:
                    for permission in role.permissions:
                        admin_permissions.append(permission.name)
            
            tenant_db.close()
            
            access_token = create_access_token({
                "sub": str(tenant.id),
                "tenant_id": tenant.id,
                "email": tenant.admin_email,
                "org": tenant.organization_name,
                "role": "admin",
                "tenant_db": tenant.database_name,
                "tenant_code": tenant.tenant_code,
                "user_type": "admin",
                "full_name": tenant.admin_name,
                "permissions": list(set(admin_permissions)) if admin_permissions else []
            })

            # Refresh token rotation
            raw_refresh = generate_refresh_token()
            tenant.refresh_token_hash = hash_token(raw_refresh)
            tenant.refresh_token_expires_at = refresh_expiry()
            db.commit()

            response.set_cookie(
                key="refresh_token",
                value=raw_refresh,
                httponly=True,
                secure=False,
                samesite="lax",
                max_age=7 * 24 * 3600
            )

            log_audit(f"ADMIN LOGIN SUCCESS → {req.email} for tenant {req.tenant_code}")
            return {"access_token": access_token, "token_type": "bearer"}
        
        # If not admin login, find tenant by tenant_code only for regular user login
        tenant = db.query(Tenant).filter(Tenant.tenant_code.ilike(req.tenant_code)).first()
        
        if not tenant:
            log_error(Exception("Invalid tenant code"), location="OTP Verify")
            raise HTTPException(400, "Invalid tenant code")
        
        # Check tenant users in the specific tenant database
        from database import get_tenant_db
        from models.tenant_models import User, UserSession
        import secrets
        import hashlib
        
        try:
            tenant_db_gen = get_tenant_db(tenant.database_name)
            tenant_db = next(tenant_db_gen)
            
            # Find user by email (for 2FA users)
            tenant_user = tenant_db.query(User).filter(User.email == req.email).first()
            
            if tenant_user:
                # Check multi-login settings
                if not tenant_user.multi_login_enabled:
                    # Check for existing active sessions
                    existing_sessions = tenant_db.query(UserSession).filter(
                        UserSession.user_id == tenant_user.id,
                        UserSession.is_active == True
                    ).all()
                    
                    if existing_sessions:
                        tenant_db.close()
                        log_audit(f"2FA LOGIN BLOCKED - User {tenant_user.email} already logged in on another device")
                        raise HTTPException(400, "You are already logged in on another device. Please logout from the other device first or contact your administrator to enable multi-login.")
                
                # Get user permissions
                permissions = []
                for role in tenant_user.roles:
                    for permission in role.permissions:
                        permissions.append(permission.name)
                
                # Get role names
                role_names = [role.name for role in tenant_user.roles]
                primary_role = role_names[0] if role_names else "user"
                
                # Create session token
                session_token = secrets.token_urlsafe(32)
                session_hash = hashlib.sha256(session_token.encode()).hexdigest()
                
                # Create user session record
                user_session = UserSession(
                    user_id=tenant_user.id,
                    session_token=session_hash,
                    ip_address=None,  # Can be extracted from request if needed
                    user_agent=None   # Can be extracted from request if needed
                )
                tenant_db.add(user_session)
                tenant_db.commit()
                
                access_token = create_access_token({
                    "sub": str(tenant_user.id),
                    "email": tenant_user.email,
                    "login_code": tenant_user.login_code,
                    "tenant_db": tenant.database_name,
                    "tenant_code": tenant.tenant_code,
                    "user_type": "tenant_user",
                    "permissions": list(set(permissions)),
                    "full_name": tenant_user.full_name,
                    "role": primary_role,
                    "session_token": session_hash
                })
                tenant_db.close()
                log_audit(f"TENANT USER 2FA LOGIN SUCCESS → {req.email} for tenant {req.tenant_code}")
                return {"access_token": access_token, "token_type": "bearer"}
            
            tenant_db.close()
        except Exception as e:
            log_error(e, f"Error checking tenant DB {tenant.database_name} for verify")
        
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

        # 🔥 UPDATED ACCESS TOKEN (with tenant_id and permissions)
        # Get admin permissions from tenant database
        from database import get_tenant_db
        from models.tenant_models import User
        
        admin_permissions = []
        try:
            tenant_db_gen = get_tenant_db(user.database_name)
            tenant_db = next(tenant_db_gen)
            
            admin_user_db = tenant_db.query(User).filter(User.email == user.admin_email).first()
            if admin_user_db:
                for role in admin_user_db.roles:
                    for permission in role.permissions:
                        admin_permissions.append(permission.name)
            
            tenant_db.close()
        except Exception as e:
            log_error(e, "Error getting admin permissions for refresh")
        
        new_access = create_access_token({
            "sub": str(user.id),
            "tenant_id": user.id,
            "email": user.admin_email,
            "org": user.organization_name,
            "tenant_db": user.database_name,
            "tenant_code": user.tenant_code,
            "role": "admin",
            "user_type": "admin",
            "full_name": user.admin_name,
            "permissions": list(set(admin_permissions)) if admin_permissions else []
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
def logout(response: Response, request: Request, db: Session = Depends(get_master_db), current_user = Depends(get_current_user)):

    log_api("LOGOUT CALLED")

    try:
        # Handle tenant user logout (deactivate session)
        if current_user.get("user_type") == "tenant_user":
            session_token = current_user.get("session_token")
            tenant_db_name = current_user.get("tenant_db")
            
            if session_token and tenant_db_name:
                from database import get_tenant_db
                from models.tenant_models import UserSession
                
                try:
                    tenant_db_gen = get_tenant_db(tenant_db_name)
                    tenant_db = next(tenant_db_gen)
                    
                    # Deactivate the current session
                    session = tenant_db.query(UserSession).filter(
                        UserSession.session_token == session_token,
                        UserSession.is_active == True
                    ).first()
                    
                    if session:
                        session.is_active = False
                        tenant_db.commit()
                        
                        # Database audit log for logout
                        user_id, user_name = get_user_info(current_user)
                        log_database_audit(
                            db=tenant_db,
                            request=request,
                            user_id=user_id,
                            user_name=user_name,
                            action="LOGOUT",
                            table_name="user_sessions",
                            record_id=session.id,
                            old_values={"is_active": True},
                            new_values={"is_active": False},
                            module="AUTHENTICATION",
                            description=f"User logged out: {current_user.get('email')}"
                        )
                        
                        log_audit(f"SESSION DEACTIVATED for user {current_user.get('email')}")
                    
                    tenant_db.close()
                except Exception as e:
                    log_error(e, "Error deactivating tenant user session")
        
        # Handle admin logout (clear refresh token)
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

        return {"message": "Logged out successfully"}

    except Exception as e:
        log_error(e, location="Logout Endpoint")
        raise HTTPException(500, "Internal server error")


# --------------------------
# GET USER PERMISSIONS
# --------------------------
@router.get("/permissions")
def get_user_permissions(current_user = Depends(get_current_user)):
    """Get current user permissions for sidebar visibility."""
    log_api(f"PERMISSIONS REQUEST → {current_user.get('email')}")
    
    try:
        permissions = current_user.get("permissions", [])
        user_type = current_user.get("user_type", "admin")
        role = current_user.get("role", "user")
        
        # Admin users have all permissions
        if user_type == "admin" or role == "admin":
            permissions = ["*"]  # Wildcard for all permissions
        
        return {
            "permissions": permissions,
            "user_type": user_type,
            "role": role,
            "is_admin": user_type == "admin" or role == "admin"
        }
        
    except Exception as e:
        log_error(e, location="Permissions Endpoint")
        raise HTTPException(500, "Internal server error")
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
        
        # Fetch user details from database for all users
        if current_user.get("tenant_db"):
            profile["tenant_db"] = current_user.get("tenant_db")
            
            try:
                from database import get_tenant_db
                from models.tenant_models import User
                
                tenant_db_name = current_user.get("tenant_db")
                tenant_db_gen = get_tenant_db(tenant_db_name)
                tenant_db = next(tenant_db_gen)
                
                user_id = int(current_user.get("sub"))
                
                if current_user.get("user_type") == "admin":
                    # For admin users, fetch from master DB first, then check tenant DB
                    from database import get_master_db
                    master_db_gen = get_master_db()
                    master_db = next(master_db_gen)
                    
                    admin_user = master_db.query(Tenant).filter(Tenant.id == user_id).first()
                    if admin_user:
                        profile["full_name"] = admin_user.admin_name
                    master_db.close()
                else:
                    # For tenant users, fetch from tenant DB
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


# --------------------------
# GET ACTIVE SESSIONS (Admin only)
# --------------------------
@router.get("/active-sessions")
def get_active_sessions(current_user = Depends(get_current_user)):
    """Get all active user sessions for administrators."""
    log_api(f"ACTIVE SESSIONS REQUEST → {current_user.get('email')}")
    
    try:
        # Only allow admin users to view active sessions
        if current_user.get("user_type") != "admin":
            raise HTTPException(403, "Access denied. Admin privileges required.")
        
        tenant_db_name = current_user.get("tenant_db")
        if not tenant_db_name:
            raise HTTPException(400, "Tenant database not found")
        
        from database import get_tenant_db
        from models.tenant_models import UserSession, User
        
        tenant_db_gen = get_tenant_db(tenant_db_name)
        tenant_db = next(tenant_db_gen)
        
        # Get all active sessions with user details
        active_sessions = tenant_db.query(UserSession, User).join(
            User, UserSession.user_id == User.id
        ).filter(
            UserSession.is_active == True
        ).all()
        
        sessions_data = []
        for session, user in active_sessions:
            sessions_data.append({
                "session_id": session.id,
                "user_id": user.id,
                "user_name": user.full_name,
                "user_email": user.email,
                "login_code": user.login_code,
                "multi_login_enabled": user.multi_login_enabled,
                "ip_address": session.ip_address,
                "user_agent": session.user_agent,
                "login_time": session.login_time,
                "last_activity": session.last_activity
            })
        
        tenant_db.close()
        
        return {
            "active_sessions": sessions_data,
            "total_sessions": len(sessions_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, location="Active Sessions Endpoint")
        raise HTTPException(500, "Internal server error")


# --------------------------
# FORCE LOGOUT USER SESSION (Admin only)
# --------------------------
@router.post("/force-logout/{session_id}")
def force_logout_session(session_id: int, current_user = Depends(get_current_user)):
    """Force logout a specific user session (Admin only)."""
    log_api(f"FORCE LOGOUT SESSION {session_id} → {current_user.get('email')}")
    
    try:
        # Only allow admin users to force logout sessions
        if current_user.get("user_type") != "admin":
            raise HTTPException(403, "Access denied. Admin privileges required.")
        
        tenant_db_name = current_user.get("tenant_db")
        if not tenant_db_name:
            raise HTTPException(400, "Tenant database not found")
        
        from database import get_tenant_db
        from models.tenant_models import UserSession, User
        
        tenant_db_gen = get_tenant_db(tenant_db_name)
        tenant_db = next(tenant_db_gen)
        
        # Find the session
        session = tenant_db.query(UserSession).filter(
            UserSession.id == session_id,
            UserSession.is_active == True
        ).first()
        
        if not session:
            tenant_db.close()
            raise HTTPException(404, "Active session not found")
        
        # Get user details for logging
        user = tenant_db.query(User).filter(User.id == session.user_id).first()
        
        # Deactivate the session
        session.is_active = False
        tenant_db.commit()
        
        log_audit(f"ADMIN FORCE LOGOUT → Session {session_id} for user {user.email if user else 'Unknown'} by admin {current_user.get('email')}")
        
        tenant_db.close()
        
        return {
            "message": f"Session {session_id} has been terminated successfully",
            "user_email": user.email if user else "Unknown"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, location="Force Logout Endpoint")
        raise HTTPException(500, "Internal server error")
