# utils/error_log.py
from datetime import datetime
import traceback

def error_log(error: Exception, location: str = "unknown"):
    with open("error.log", "a") as f:
        f.write(
            f"\n[{datetime.utcnow()}] ERROR at {location}\n"
            f"{traceback.format_exc()}\n"
        )
