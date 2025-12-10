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
    send_otp_email
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
        user = db.query(Tenant).filter(Tenant.admin_email == req.email).first()

        if not user:
            log_error(Exception("Invalid credentials"), location="Login Email Check")
            raise HTTPException(400, "Invalid email or password")

        hashed_pw = hashlib.sha256(req.password.encode()).hexdigest()
        if hashed_pw != user.password_hash:
            log_error(Exception("Wrong password"), location="Password Check")
            raise HTTPException(400, "Invalid email or password")

        otp = generate_otp(req.email)
        send_otp_email(req.email, otp)

        log_audit(f"OTP SENT TO {req.email}")

        return {"message": "OTP sent to email"}

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

        user = db.query(Tenant).filter(Tenant.admin_email == req.email).first()

        if not user:
            log_error(Exception("User not found"), location="OTP Verify User Fetch")
            raise HTTPException(400, "Invalid email")

        # -------------------------------
        # 🔥 UPDATED ACCESS TOKEN (with tenant_id)
        # -------------------------------
        access_token = create_access_token({
            "sub": str(user.id),
            "tenant_id": user.id,   # 👈 ADDED
            "email": user.admin_email,
            "org": user.organization_name
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

        log_audit(f"LOGIN SUCCESS → {req.email}")

        return {"access_token": access_token, "token_type": "bearer"}

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
