# database.py

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import urllib.parse
import pymysql

from models.register_models import Base
from utils.logger import log_error, log_audit, log_api


# -------------------------------------------------------
# MASTER DB CONFIG
# -------------------------------------------------------
DB_USER = "root"
DB_PASSWORD = ""
DB_HOST = "localhost"
DB_PORT = "3306"
MASTER_DB = "ims_master"

# -------------------------------------------------------
# TENANT DB CONFIG
# -------------------------------------------------------
TENANT_USER = DB_USER
TENANT_PASSWORD = DB_PASSWORD
TENANT_HOST = DB_HOST
TENANT_PORT = DB_PORT
TENANT_DATABASE_URL = f"mysql+pymysql://{TENANT_USER}:{urllib.parse.quote_plus(TENANT_PASSWORD)}@{TENANT_HOST}:{TENANT_PORT}/arun"

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
# MASTER ENGINE + SESSION
# -------------------------------------------------------
try:
    engine = create_engine(DB_URL, echo=False, future=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    log_audit("Master DB engine initialized successfully")
except Exception as e:
    log_error(e, location="Engine Initialization")
    raise e


# -------------------------------------------------------
# CREATE MASTER TABLES
# -------------------------------------------------------
try:
    Base.metadata.create_all(bind=engine)
    log_audit("Master DB tables created successfully")
except Exception as e:
    log_error(e, location="Master Table Creation")


# -------------------------------------------------------
# MASTER DB DEPENDENCY
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
# TENANT ENGINE CACHE
# -------------------------------------------------------
TENANT_ENGINES = {}
TENANT_SESSIONS = {}


def get_tenant_engine(db_name: str):
    """Return cached engine or create new one."""
    if db_name in TENANT_ENGINES:
        return TENANT_ENGINES[db_name]

    url = f"mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{db_name}"

    engine = create_engine(url, future=True)
    TENANT_ENGINES[db_name] = engine

    log_api(f"Tenant DB engine created → {db_name}")
    return engine


def get_tenant_sessionmaker(db_name: str):
    """Return cached sessionmaker."""
    if db_name in TENANT_SESSIONS:
        return TENANT_SESSIONS[db_name]

    engine = get_tenant_engine(db_name)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    TENANT_SESSIONS[db_name] = SessionLocal

    return SessionLocal


# -------------------------------------------------------
# FINAL — TENANT SESSION (USED IN ROUTERS)
# -------------------------------------------------------
def get_tenant_db(tenant_db_name: str = "arun"):

    """Creates tenant DB if not exists, ensures tables exist, returns session."""
    try:
        # 1️⃣ Create tenant DB if missing
        conn = pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASSWORD, port=int(DB_PORT))
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{tenant_db_name}`")
        conn.close()

        # 2️⃣ Get engine from cache
        engine = get_tenant_engine(tenant_db_name)

        # 3️⃣ Ensure tables exist
        from models.tenant_models import TenantBase
        TenantBase.metadata.create_all(bind=engine)
        
        # 4️⃣ Add missing columns to existing tables
        ensure_missing_columns(engine)

        # 5️⃣ Return DB session
        SessionLocal = get_tenant_sessionmaker(tenant_db_name)
        db = SessionLocal()

        print(f"Database session created for {tenant_db_name}")

        try:
            yield db
        finally:
            db.close()

    except Exception as e:
        print(f"Database error: {e}")
        raise


# -------------------------------------------------------
# RUN DEFAULT TENANT INITIALIZATION
# -------------------------------------------------------
# Removed init_tenant_db() to prevent startup errors


def ensure_missing_columns(engine):
    """Add missing columns to existing tables"""
    try:
        with engine.connect() as conn:
            # Add warranty columns to batches table
            try:
                conn.execute(text("ALTER TABLE batches ADD COLUMN warranty_start_date DATE NULL"))
                conn.execute(text("ALTER TABLE batches ADD COLUMN warranty_end_date DATE NULL"))
                conn.commit()
                print("Added warranty columns to batches table")
            except Exception as e:
                if "Duplicate column name" not in str(e):
                    print(f"Error adding warranty columns: {e}")
            
            # Add location column to return_headers table
            try:
                conn.execute(text("ALTER TABLE return_headers ADD COLUMN location VARCHAR(150) NULL AFTER department"))
                conn.commit()
                print("Added location column to return_headers table")
            except Exception as e:
                if "Duplicate column name" not in str(e):
                    print(f"Error adding location column: {e}")
                
    except Exception as e:
        print(f"Error in ensure_missing_columns: {e}")
