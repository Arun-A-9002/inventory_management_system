import logging
import traceback
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get log level from environment
LOG_LEVEL = os.getenv("LOG_LEVEL")
LOG_FILE = os.getenv("LOG_FILE")

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

error_logger = logging.getLogger("ERROR_LOGGER")
audit_logger = logging.getLogger("AUDIT_LOGGER")
api_logger = logging.getLogger("API_LOGGER")


# ERROR LOGGING
def log_error(error: Exception, location="Unknown"):
    error_logger.error(
        f"""
🔥 ERROR
Location: {location}
Type: {type(error).__name__}
Message: {str(error)}
Traceback:
{traceback.format_exc()}
"""
    )


# AUDIT LOGGING (important activities)
def log_audit(message: str):
    audit_logger.info(f"🔎 AUDIT → {message}")


# API LOGGING (all incoming requests)
def log_api(message: str):
    api_logger.info(f"📡 API → {message}")
