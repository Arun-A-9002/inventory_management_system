# database.py

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import urllib.parse
import pymysql

from models.register_models import Base

# ⬇️ LOGGERS
from utils.logger import log_error, log_audit, log_api


DB_USER = "root"
DB_PASSWORD = ""
DB_HOST = "localhost"
DB_PORT = "3306"
MASTER_DB = "ims_master"

DB_URL = (
    f"mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD)}"
    f"@{DB_HOST}:{DB_PORT}/{MASTER_DB}"
)

# -------------------------------------------------------
# CREATE MASTER DB IF NOT EXISTS
# -------------------------------------------------------
try:
    log_api("Connecting to MySQL server to ensure MASTER DB exists")

    conn = pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        port=int(DB_PORT)
    )
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MASTER_DB}")
    conn.close()

    log_audit(f"MASTER DATABASE READY → {MASTER_DB}")

except Exception as e:
    log_error(e, location="Master DB Creation")
    pass


# -------------------------------------------------------
# SQLALCHEMY ENGINE + SESSION
# -------------------------------------------------------
try:
    engine = create_engine(DB_URL, echo=True, future=True)
    log_audit("Master DB engine initialized successfully")

except Exception as e:
    log_error(e, location="Engine Initialization")
    raise e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# -------------------------------------------------------
# CREATE TABLES IN MASTER DB
# -------------------------------------------------------
try:
    Base.metadata.create_all(bind=engine)
    log_audit("Master DB tables created successfully")

except Exception as e:
    log_error(e, location="Master Table Creation")


# -------------------------------------------------------
# DEPENDENCY — GET MASTER DB SESSION
# -------------------------------------------------------
def get_master_db():
    try:
        db = SessionLocal()
        log_api("Master DB session opened")
        yield db

    except Exception as e:
        log_error(e, location="Opening Master DB Session")
        raise e

    finally:
        db.close()
        log_api("Master DB session closed")


# -------------------------------------------------------
# CREATE TENANT DATABASE
# -------------------------------------------------------
def create_tenant_database(db_name: str):
    """Creates a DB for each tenant — no schema, only empty DB."""
    try:
        log_api(f"Creating tenant DB → {db_name}")

        url_no_db = (
            f"mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD)}"
            f"@{DB_HOST}:{DB_PORT}/"
        )

        temp_engine = create_engine(url_no_db, future=True)

        with temp_engine.connect() as conn:
            conn.execution_options(isolation_level="AUTOCOMMIT")
            conn.execute(
                text(
                    f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                    f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
                )
            )

        temp_engine.dispose()

        log_audit(f"Tenant DB created → {db_name}")

    except Exception as e:
        log_error(e, location=f"Create Tenant Database: {db_name}")
        raise e


# -------------------------------------------------------
# GET TENANT ENGINE
# -------------------------------------------------------
def get_tenant_engine(db_name: str):
    try:
        url = (
            f"mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD)}"
            f"@{DB_HOST}:{DB_PORT}/{db_name}"
        )

        log_api(f"Tenant DB engine initialized for: {db_name}")

        return create_engine(url, future=True)

    except Exception as e:
        log_error(e, location=f"Get Tenant Engine: {db_name}")
        raise e


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
