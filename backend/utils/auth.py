# utils/auth.py

from datetime import datetime, timedelta
from jose import jwt, JWTError
import os
import hashlib
import secrets
import smtplib
import ssl
import traceback
from email.mime.text import MIMEText
from dotenv import load_dotenv
from fastapi import HTTPException, Header, Depends
from typing import Optional, Dict, Any

# Logging helpers (assumed present in your project)
from utils.logger import log_error, log_audit, log_api

load_dotenv()

# ===========================================================
# ENV CONFIG
# ===========================================================
SECRET_KEY = os.getenv("SECRET_KEY", "mysecretkey")
ALGORITHM = "HS256"

ACCESS_EXPIRE_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", "NUTRYAH <no-reply@nutryah.com>")

# ===========================================================
# ACCESS TOKEN
# ===========================================================
def create_access_token(data: Dict[str, Any]) -> str:
    try:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_EXPIRE_MIN)
        to_encode = data.copy()
        to_encode.update({"exp": expire})

        token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        log_audit(f"Access token created for email={data.get('email')}")
        return token

    except Exception as e:
        log_error(e, location="create_access_token()")
        raise


# ===========================================================
# REFRESH TOKEN
# ===========================================================
def generate_refresh_token() -> str:
    token = secrets.token_urlsafe(64)
    log_audit("Refresh token generated")
    return token


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def refresh_expiry() -> datetime:
    return datetime.utcnow() + timedelta(days=REFRESH_EXPIRE_DAYS)


# ===========================================================
# OTP STORAGE (IN-MEMORY)
# ===========================================================
otp_store: dict = {}
OTP_EXPIRY_MIN = 5


def generate_otp(email: str) -> str:
    """Generate & store 6-digit OTP for 5 minutes."""
    try:
        otp = str(secrets.randbelow(900000) + 100000)
        expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MIN)

        otp_store[email] = {"otp": otp, "expires": expires_at}

        log_audit(f"OTP generated for {email}")
        return otp

    except Exception as e:
        log_error(e, location="generate_otp()")
        raise


def verify_otp(email: str, otp: str) -> bool:
    """Validate OTP and delete after use."""
    try:
        if email not in otp_store:
            return False

        data = otp_store[email]

        if datetime.utcnow() > data["expires"]:
            del otp_store[email]
            return False

        if data["otp"] != otp:
            return False

        del otp_store[email]
        log_audit(f"OTP verified successfully for {email}")
        return True

    except Exception as e:
        log_error(e, location="verify_otp()")
        return False


# ===========================================================
# SEND OTP EMAIL
# ===========================================================
def send_otp_email(to_email: str, otp: str):
    subject = "Your Nutryah Login OTP"
    body = f"""
    Dear User,

    Your OTP for login is: {otp}
    This OTP is valid for 5 minutes.

    Regards,
    Nutryah Team
    """

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email

    try:
        log_api(f"Sending OTP email → {to_email}")

        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())

        log_audit(f"OTP email sent to {to_email}")

    except Exception as e:
        log_error(e, location="send_otp_email()")
        raise HTTPException(500, "Email sending failed. Check SMTP settings.")


# ===========================================================
# WELCOME EMAIL
# ===========================================================
def send_welcome_email(to_email: str, username: str, temp_password: str):
    subject = "Welcome to Nutryah - Account Created"
    body = f"""
    Dear {username},

    Your account has been created.
    Email: {to_email}
    Temporary Password: {temp_password}

    Please login and change your password.

    Regards,
    Nutryah Team
    """

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())

        log_audit(f"Welcome email sent to {to_email}")

    except Exception as e:
        log_error(e, location="send_welcome_email()")
        raise HTTPException(500, "Welcome email sending failed.")


# ===========================================================
# PASSWORD HASHING
# ===========================================================
def hash_password(password: str) -> str:
    salt = "inventory_salt_2024"
    return hashlib.sha256((password + salt).encode()).hexdigest()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return hash_password(plain) == hashed
    except Exception:
        return False


# ===========================================================
# JWT VERIFY + CURRENT USER
# ===========================================================
def verify_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def _parse_bearer_token(header_value: str) -> Optional[str]:
    """Return token string if header is 'Bearer <token>' else None."""
    if not header_value:
        return None
    parts = header_value.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def get_current_user(Authorization: str = Header(None)) -> dict:
    """
    Extract JWT, validate, and return payload with full permissions.
    Raises 401 if token missing/invalid.
    """

    # Require header
    if not Authorization:
        log_error(Exception("Missing Authorization header"), location="get_current_user")
        raise HTTPException(401, "Token required")

    token = _parse_bearer_token(Authorization)
    if not token:
        log_error(Exception("Malformed Authorization header"), location="get_current_user")
        raise HTTPException(401, "Invalid token format")

    payload = verify_token(token)
    if not payload:
        log_error(Exception("JWT verification failed or expired"), location="get_current_user")
        raise HTTPException(401, "Token expired or invalid")

    # Default fields
    payload.setdefault("permissions", [])
    payload.setdefault("role", payload.get("role", "user"))

    # TENANT USER: refresh permissions from tenant DB (safe fetch)
    if payload.get("user_type") == "tenant_user":
        tenant_db = None
        try:
            from database import get_tenant_db
            from models.tenant_models import User

            tenant_db_gen = get_tenant_db("arun")
            tenant_db = next(tenant_db_gen)

            # sub may be string; convert safely
            try:
                user_id = int(payload.get("sub"))
            except Exception:
                user_id = None

            if user_id is not None:
                db_user = tenant_db.query(User).filter(User.id == user_id).first()
            else:
                db_user = None

            if db_user:
                permissions = []
                for role in db_user.roles:
                    for perm in role.permissions:
                        permissions.append(perm.name)

                payload["permissions"] = list(set(permissions))
                payload["role"] = "user"
            else:
                payload["permissions"] = []
                payload["role"] = "user"

        except Exception as e:
            log_error(e, location="get_current_user tenant_user load")
            # On error, do not escalate to 500 here — mark as unauthenticated
            raise HTTPException(401, "Unable to load user permissions")

        finally:
            # Close tenant DB session if we obtained one
            try:
                if tenant_db is not None:
                    tenant_db.close()
            except Exception:
                pass

    else:
        # ADMIN or master user token: respect any permissions already present on token.
        # If none provided, default to wildcard (full access)
        if payload.get("permissions"):
            # keep given permissions
            pass
        else:
            payload["permissions"] = ["*"]
        payload["role"] = payload.get("role", "admin")

    return payload


# ===========================================================
# PERMISSION CHECK DECORATOR
# ===========================================================
def check_permission(required_permission: str):
    """Used in routers to enforce RBAC."""
    def permission_checker(user = Depends(get_current_user)):
        # Admin → full access if role==admin OR wildcard present
        if user.get("role") == "admin" or "*" in user.get("permissions", []):
            return user

        # Tenant user: must have specific permission
        if required_permission not in user.get("permissions", []):
            log_error(Exception(f"Permission denied: {required_permission} for {user.get('email')}"),
                      location="check_permission")
            raise HTTPException(403, f"Permission denied: {required_permission} required")

        return user

    return permission_checker
