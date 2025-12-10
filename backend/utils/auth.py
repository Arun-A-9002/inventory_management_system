# utils/auth.py

from datetime import datetime, timedelta
from jose import jwt
import os, hashlib, secrets, smtplib, ssl, traceback
from email.mime.text import MIMEText
from dotenv import load_dotenv
from fastapi import HTTPException

# ⬇️ IMPORT LOGGERS
from utils.logger import log_error, log_audit, log_api

load_dotenv()

# -----------------------------------------
# ENV CONFIG
# -----------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "mysecretkey")
ALGORITHM = "HS256"

ACCESS_EXPIRE_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", "NUTRYAH <no-reply@nutryah.com>")


# -----------------------------------------
# ACCESS TOKEN
# -----------------------------------------
def create_access_token(data: dict):
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


# -----------------------------------------
# REFRESH TOKEN
# -----------------------------------------
def generate_refresh_token():
    token = secrets.token_urlsafe(64)
    log_audit("Refresh token generated")
    return token


def hash_token(token: str):
    hashed = hashlib.sha256(token.encode()).hexdigest()
    return hashed


def refresh_expiry():
    exp = datetime.utcnow() + timedelta(days=REFRESH_EXPIRE_DAYS)
    return exp


# -----------------------------------------
# OTP STORAGE (in-memory)
# -----------------------------------------
otp_store = {}
OTP_EXPIRY_MIN = 5


def generate_otp(email: str) -> str:
    """Generate & store OTP for 5 minutes in memory."""

    try:
        otp = str(secrets.randbelow(900000) + 100000)  # 6-digit OTP
        expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MIN)

        otp_store[email] = {
            "otp": otp,
            "expires": expires_at
        }

        log_audit(f"OTP generated for {email}")
        return otp

    except Exception as e:
        log_error(e, location="generate_otp()")
        raise


def verify_otp(email: str, otp: str) -> bool:
    """Validate OTP and remove after use."""

    try:
        if email not in otp_store:
            log_error(Exception("OTP not found"), location=f"verify_otp() - {email}")
            return False

        data = otp_store[email]

        # Expired?
        if datetime.utcnow() > data["expires"]:
            log_error(Exception("OTP expired"), location=f"verify_otp() - {email}")
            del otp_store[email]
            return False

        # Match?
        if data["otp"] != otp:
            log_error(Exception("OTP mismatch"), location=f"verify_otp() - {email}")
            return False

        del otp_store[email]
        log_audit(f"OTP verified successfully for {email}")
        return True

    except Exception as e:
        log_error(e, location="verify_otp()")
        traceback.print_exc()
        return False


# -----------------------------------------
# SEND OTP EMAIL
# -----------------------------------------
def send_otp_email(to_email: str, otp: str):
    """Send OTP using Office365 SMTP."""

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
        log_api(f"Attempting to send OTP email → {to_email}")

        context = ssl.create_default_context()

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())

        log_audit(f"OTP email sent to {to_email}")

    except Exception as e:
        log_error(e, location="send_otp_email()")
        traceback.print_exc()
        raise HTTPException(500, "Email sending failed. Check SMTP settings.")

def send_welcome_email(to_email: str, username: str, temp_password: str):
    """Send welcome email for new user creation."""

    subject = "Welcome to Nutryah - Account Created"
    body = f"""
    Dear {username},

    Welcome to Nutryah Inventory Management System!

    Your account has been successfully created.
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
        log_api(f"Sending welcome email → {to_email}")

        context = ssl.create_default_context()

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())

        log_audit(f"Welcome email sent to {to_email}")

    except Exception as e:
        log_error(e, location="send_welcome_email()")
        raise HTTPException(500, "Welcome email sending failed.")


# -----------------------------------------
# PASSWORD HASHING
# -----------------------------------------
import hashlib

def hash_password(password: str) -> str:
    """Hash a plain password using SHA256 with salt."""
    salt = "inventory_salt_2024"
    return hashlib.sha256((password + salt).encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain password against stored hash."""
    try:
        return hash_password(plain) == hashed
    except:
        return False
