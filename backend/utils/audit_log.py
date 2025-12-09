# utils/audit_log.py
from datetime import datetime
import traceback

def audit_log(action: str, email: str = "system", details: str = ""):
    try:
        with open("audit.log", "a") as f:
            f.write(
                f"[{datetime.utcnow()}] ACTION: {action} | BY: {email} | DETAILS: {details}\n"
            )
    except:
        pass
