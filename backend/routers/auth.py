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

router = APIRouter(tags=["Authentication"], prefix="/auth")


# --------------------------------------
# LOGIN REQUEST (STEP 1 → SEND OTP)
# --------------------------------------
class LoginModel(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(req: LoginModel, db: Session = Depends(get_master_db)):
    """
    Step 1:
    - Validate email/password
    - Generate OTP (valid 5 min)
    - Send OTP to email
    """

    try:
        user = db.query(Tenant).filter(Tenant.admin_email == req.email).first()
        if not user:
            raise HTTPException(400, "Invalid email or password")

        # password check (sha256)
        hashed_pw = hashlib.sha256(req.password.encode()).hexdigest()
        if hashed_pw != user.password_hash:
            raise HTTPException(400, "Invalid email or password")

        # Generate OTP and store it in memory
        otp = generate_otp(req.email)

        # Send email
        send_otp_email(req.email, otp)

        return {"message": "OTP sent to email"}
    except Exception as e:
        print("LOGIN ERROR:", e)
        traceback.print_exc()
        raise HTTPException(500, "Internal server error")
    

# --------------------------------------
# VERIFY OTP (STEP 2 → SET REFRESH TOKEN)
# --------------------------------------
class OTPVerifyModel(BaseModel):
    email: str
    otp: str


@router.post("/verify")
def verify(req: OTPVerifyModel, response: Response, db: Session = Depends(get_master_db)):
    """
    Step 2:
    - Validate OTP
    - Create access token
    - Create refresh token (hash stored in DB)
    - Set refresh token in HTTP-only cookie
    """

    try:
        # Validate OTP
        if not verify_otp(req.email, req.otp):
            raise HTTPException(400, "Invalid or expired OTP")

        user = db.query(Tenant).filter(Tenant.admin_email == req.email).first()
        if not user:
            raise HTTPException(400, "Invalid email")

        # Create access token (expires 30 min)
        access_token = create_access_token({
            "sub": str(user.id),
            "email": user.admin_email,
            "org": user.organization_name
        })

        # Create refresh token (rotating)
        raw_refresh = generate_refresh_token()

        # Store hashed refresh token in DB
        user.refresh_token_hash = hash_token(raw_refresh)
        user.refresh_token_expires_at = refresh_expiry()

        db.commit()

        # Set cookie
        response.set_cookie(
            key="refresh_token",
            value=raw_refresh,
            httponly=True,
            secure=False,     # change to True in production
            samesite="lax",
            max_age=7 * 24 * 3600
        )

        return {"access_token": access_token, "token_type": "bearer"}

    except HTTPException:
        raise
    except Exception as e:
        print("VERIFY OTP ERROR:", e)
        traceback.print_exc()
        raise HTTPException(500, "Internal server error")


# --------------------------------------
# REFRESH TOKEN → ROTATE NEW REFRESH
# --------------------------------------
@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_master_db)):
    """
    - Read refresh token cookie
    - Validate & verify hashed token in DB
    - Rotate the refresh token
    - Issue new access token
    """

    try:
        raw = request.cookies.get("refresh_token")
        if not raw:
            raise HTTPException(401, "Missing refresh token")

        hashed = hash_token(raw)

        user = db.query(Tenant).filter(Tenant.refresh_token_hash == hashed).first()
        if not user:
            raise HTTPException(401, "Invalid refresh token")

        if not user.refresh_token_expires_at or user.refresh_token_expires_at < datetime.utcnow():
            raise HTTPException(401, "Refresh token expired")

        # ROTATE refresh token
        new_raw = generate_refresh_token()
        user.refresh_token_hash = hash_token(new_raw)
        user.refresh_token_expires_at = refresh_expiry()
        db.commit()

        # Replace cookie
        response.set_cookie(
            key="refresh_token",
            value=new_raw,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=7 * 24 * 3600
        )

        new_access = create_access_token({
            "sub": str(user.id),
            "email": user.admin_email,
            "org": user.organization_name
        })

        return {"access_token": new_access}

    except HTTPException:
        raise
    except Exception as e:
        print("REFRESH ERROR:", e)
        traceback.print_exc()
        raise HTTPException(500, "Internal server error")


# --------------------------------------
# LOGOUT → REMOVE REFRESH TOKEN
# --------------------------------------
@router.post("/logout")
def logout(response: Response, request: Request, db: Session = Depends(get_master_db)):
    try:
        raw = request.cookies.get("refresh_token")
        if raw:
            hashed = hash_token(raw)
            user = db.query(Tenant).filter(Tenant.refresh_token_hash == hashed).first()

            if user:
                user.refresh_token_hash = None
                user.refresh_token_expires_at = None
                db.commit()

        # Delete cookie
        response.delete_cookie("refresh_token")
        return {"message": "Logged out"}
    except Exception as e:
        print("LOGOUT ERROR:", e)
        traceback.print_exc()
        raise HTTPException(500, "Internal server error")
