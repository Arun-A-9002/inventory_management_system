# utils/auth.py

from datetime import datetime, timedelta
from jose import jwt
import os, hashlib, secrets, smtplib, ssl, traceback
from email.mime.text import MIMEText
from dotenv import load_dotenv

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
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_EXPIRE_MIN)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# -----------------------------------------
# REFRESH TOKEN
# -----------------------------------------
def generate_refresh_token():
    return secrets.token_urlsafe(64)

def hash_token(token: str):
    return hashlib.sha256(token.encode()).hexdigest()

def refresh_expiry():
    return datetime.utcnow() + timedelta(days=REFRESH_EXPIRE_DAYS)

# -----------------------------------------
# OTP STORAGE (in-memory)
# -----------------------------------------
otp_store = {}  
# Structure:
# otp_store[email] = { "otp": "123456", "expires": datetime.utcnow()+5min }

OTP_EXPIRY_MIN = 5

def generate_otp(email: str) -> str:
    """Generate & store OTP for 5 minutes in memory."""
    otp = str(secrets.randbelow(900000) + 100000)  # 6-digit OTP

    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MIN)

    otp_store[email] = {
        "otp": otp,
        "expires": expires_at
    }

    print(f"[OTP GENERATED] {email} = {otp} (expires {expires_at})")

    return otp


def verify_otp(email: str, otp: str) -> bool:
    """Validate OTP and remove after use."""
    try:
        if email not in otp_store:
            print("[OTP ERROR] No OTP stored for:", email)
            return False

        data = otp_store[email]

        # Expired?
        if datetime.utcnow() > data["expires"]:
            print("[OTP ERROR] Expired OTP for:", email)
            del otp_store[email]
            return False

        # Match?
        if data["otp"] != otp:
            print("[OTP ERROR] Incorrect OTP for:", email)
            return False

        # OTP is correct → remove from memory
        del otp_store[email]
        return True

    except Exception as e:
        print("[OTP VERIFY ERROR]:", e)
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
        print("🔍 DEBUG: Trying to send email...")
        print("SMTP_HOST:", SMTP_HOST)
        print("SMTP_PORT:", SMTP_PORT)
        print("SMTP_USER:", SMTP_USER)

        context = ssl.create_default_context()

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.set_debuglevel(1)  # ← PRINT EXACT SMTP ERROR

            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())

        print(f"✅ OTP SENT to {to_email}")

    except Exception as e:
        print("❌ EMAIL ERROR:", e)
        traceback.print_exc()
        raise HTTPException(500, "Email sending failed. Check SMTP settings.")
