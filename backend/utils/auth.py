# backend/utils/auth.py

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import secrets
import hashlib
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from typing import Optional, Dict, Any
import redis
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ----------------------------------------------------------
# CONFIGURATION
# ----------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"))
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES"))

# Password hashing - using simple SHA256 with salt
# pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

# JWT Bearer
security = HTTPBearer()

# Redis for OTP storage (fallback to in-memory dict if Redis not available)
try:
    redis_host = os.getenv("REDIS_HOST")
    redis_port = int(os.getenv("REDIS_PORT"))
    redis_db = int(os.getenv("REDIS_DB"))
    redis_password = os.getenv("REDIS_PASSWORD")
    
    redis_client = redis.Redis(
        host=redis_host, 
        port=redis_port, 
        db=redis_db, 
        password=redis_password if redis_password else None,
        decode_responses=True
    )
    redis_client.ping()
    USE_REDIS = True
except:
    USE_REDIS = False
    otp_storage = {}  # In-memory fallback

# ----------------------------------------------------------
# PASSWORD UTILITIES
# ----------------------------------------------------------
import hashlib
import secrets

def hash_password(password: str) -> str:
    """Hash a password using SHA256 with salt."""
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${password_hash}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        salt, stored_hash = hashed_password.split('$', 1)
        password_hash = hashlib.sha256((plain_password + salt).encode()).hexdigest()
        return password_hash == stored_hash
    except:
        return False

# ----------------------------------------------------------
# TOKEN UTILITIES
# ----------------------------------------------------------
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_refresh_token() -> str:
    """Generate a secure refresh token."""
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    """Hash a token using SHA256."""
    return hashlib.sha256(token.encode()).hexdigest()

def refresh_expiry() -> datetime:
    """Get refresh token expiry datetime."""
    return datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

# ----------------------------------------------------------
# OTP UTILITIES
# ----------------------------------------------------------
def generate_otp(email: str) -> str:
    """Generate and store OTP for email."""
    otp = str(secrets.randbelow(900000) + 100000)  # 6-digit OTP
    expiry = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)  # Use env variable
    
    otp_data = {
        "otp": otp,
        "expiry": expiry.isoformat()
    }
    
    if USE_REDIS:
        redis_expire_time = int(os.getenv("REDIS_EXPIRE_TIME", str(OTP_EXPIRE_MINUTES * 60)))
        redis_client.setex(f"otp:{email}", redis_expire_time, json.dumps(otp_data))
        print(f"OTP stored in Redis for {email}: {otp}")
    else:
        otp_storage[email] = otp_data
        print(f"OTP stored in memory for {email}: {otp}")
    
    return otp

def verify_otp(email: str, otp: str) -> bool:
    """Verify OTP for email."""
    try:
        if USE_REDIS:
            stored_data = redis_client.get(f"otp:{email}")
            if not stored_data:
                print(f"No OTP found in Redis for {email}")
                return False
            
            otp_data = json.loads(stored_data)
            redis_client.delete(f"otp:{email}")  # Delete after use
        else:
            otp_data = otp_storage.get(email)
            if not otp_data:
                print(f"No OTP found in memory for {email}")
                return False
            
            del otp_storage[email]  # Delete after use
        
        # Check expiry
        expiry = datetime.fromisoformat(otp_data["expiry"])
        if datetime.utcnow() > expiry:
            print(f"OTP expired for {email}")
            return False
        
        is_valid = otp_data["otp"] == otp
        print(f"OTP verification for {email}: stored={otp_data['otp']}, provided={otp}, valid={is_valid}")
        return is_valid
    except Exception as e:
        print(f"Error verifying OTP for {email}: {e}")
        return False

# ----------------------------------------------------------
# EMAIL UTILITIES
# ----------------------------------------------------------
def _send_email_sync(email: str, otp: str) -> bool:
    """Synchronous email sending function."""
    try:
        smtp_server = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT"))
        smtp_username = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        
        if not smtp_username or not smtp_password:
            print("SMTP credentials not configured")
            return False
        
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = "Your Login OTP - NUTRYAH IMS"
        
        body = f"""
        <html>
        <body>
            <h2>NUTRYAH Inventory Management System</h2>
            <p>Your One-Time Password (OTP) for login is:</p>
            <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px;">{otp}</h1>
            <p>This OTP is valid for {OTP_EXPIRE_MINUTES} minutes.</p>
            <p>If you didn't request this OTP, please ignore this email.</p>
            <br>
            <p>Best regards,<br>NUTRYAH Team</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_username, email, msg.as_string())
        server.quit()
        
        return True
    except Exception as e:
        print(f"Failed to send OTP email: {e}")
        return False

def send_otp_email(email: str, otp: str) -> bool:
    """Send OTP via email asynchronously."""
    # For development/testing - log OTP to console
    print(f"\n=== OTP FOR {email} ===")
    print(f"OTP: {otp}")
    print(f"Valid for {OTP_EXPIRE_MINUTES} minutes")
    print("========================\n")
    
    # Try to send email in background, but don't fail if it doesn't work
    try:
        executor = ThreadPoolExecutor(max_workers=1)
        executor.submit(_send_email_sync, email, otp)
    except Exception as e:
        print(f"Email sending failed, but OTP is available in console: {e}")
    
    return True  # Always return True so login process continues

def send_registration_email(admin_email: str, organization_name: str, admin_name: str) -> bool:
    """Send registration confirmation email."""
    try:
        # Email configuration
        smtp_server = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT"))
        smtp_username = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        
        if not smtp_username or not smtp_password:
            print("SMTP credentials not configured")
            return False
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = admin_email
        msg['Subject'] = f"Welcome to NUTRYAH IMS - {organization_name}"
        
        body = f"""
        <html>
        <body>
            <h2>Welcome to NUTRYAH Inventory Management System</h2>
            <p>Dear {admin_name},</p>
            <p>Your organization <strong>{organization_name}</strong> has been successfully registered with NUTRYAH IMS.</p>
            <p>You can now log in to your account and start managing your inventory.</p>
            <p>If you have any questions, please contact our support team.</p>
            <br>
            <p>Best regards,<br>NUTRYAH Team</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, admin_email, text)
        server.quit()
        
        return True
        
    except Exception as e:
        print(f"Failed to send registration email: {e}")
        return False

def send_welcome_email(email: str, name: str, password: str, login_code: str) -> bool:
    """Send welcome email to new user."""
    try:
        # Email configuration
        smtp_server = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT"))
        smtp_username = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        
        if not smtp_username or not smtp_password:
            print("SMTP credentials not configured")
            return False
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = "Welcome to NUTRYAH IMS - Your Account Details"
        
        body = f"""
        <html>
        <body>
            <h2>Welcome to NUTRYAH Inventory Management System</h2>
            <p>Dear {name},</p>
            <p>Your account has been created successfully. Here are your login details:</p>
            <div style="background-color: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px;">
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Login Code:</strong> {login_code}</p>
                <p><strong>Temporary Password:</strong> {password}</p>
            </div>
            <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            <p>You can log in using either your email or login code along with your password.</p>
            <br>
            <p>Best regards,<br>NUTRYAH Team</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, email, text)
        server.quit()
        
        return True
        
    except Exception as e:
        print(f"Failed to send welcome email: {e}")
        return False

# ----------------------------------------------------------
# JWT AUTHENTICATION
# ----------------------------------------------------------
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise credentials_exception

# ----------------------------------------------------------
# PERMISSION UTILITIES
# ----------------------------------------------------------
def has_permission(user_data: dict, permission_name: str) -> bool:
    """Check if user has specific permission."""
    if not user_data:
        return False
    
    permissions = user_data.get("permissions", [])
    
    # Admin has all permissions
    if "*" in permissions or user_data.get("role") == "admin":
        return True
    
    # Check specific permission
    return permission_name in permissions

def check_permission(permission_name: str):
    """FastAPI dependency to check permissions."""
    def permission_checker(current_user: dict = Depends(get_current_user)):
        if not has_permission(current_user, permission_name):
            raise HTTPException(
                status_code=403, 
                detail=f"Permission denied. Required: {permission_name}"
            )
        return current_user
    return permission_checker