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
            
            # Add safety_stock column to items table
            try:
                conn.execute(text("ALTER TABLE items ADD COLUMN safety_stock INT DEFAULT 0 AFTER max_stock"))
                conn.commit()
                print("Added safety_stock column to items table")
            except Exception as e:
                if "Duplicate column name" not in str(e):
                    print(f"Error adding safety_stock column: {e}")
            
            # Add external transfer status management columns
            external_transfer_columns = [
                ("approved_by", "VARCHAR(255) NULL"),
                ("approved_at", "DATETIME NULL"),
                ("rejection_reason", "TEXT NULL"),
                ("sent_at", "DATETIME NULL"),
                ("return_date", "DATE NULL"),
                ("returned_at", "DATETIME NULL"),
                ("return_deadline", "DATE NULL"),
                ("staff_phone", "VARCHAR(20) NULL"),
                ("staff_email", "VARCHAR(100) NULL"),
                ("return_staff_name", "VARCHAR(255) NULL"),
                ("return_staff_phone", "VARCHAR(20) NULL"),
                ("return_staff_email", "VARCHAR(191) NULL"),
                ("staff_change_reason", "TEXT NULL")
            ]
            
            for column_name, column_def in external_transfer_columns:
                try:
                    conn.execute(text(f"ALTER TABLE external_transfers ADD COLUMN {column_name} {column_def}"))
                    print(f"Added {column_name} column to external_transfers table")
                except Exception as e:
                    if "Duplicate column name" not in str(e):
                        print(f"Error adding {column_name} column: {e}")
            
            # Add external transfer item columns
            item_columns_to_add = [
                ("returned_quantity", "INT DEFAULT 0"),
                ("damaged_quantity", "INT DEFAULT 0"),
                ("damage_reason", "TEXT NULL"),
                ("returned_at", "DATETIME NULL"),
                ("status", "VARCHAR(50) DEFAULT 'pending'")
            ]
            
            for column_name, column_def in item_columns_to_add:
                try:
                    conn.execute(text(f"ALTER TABLE external_transfer_items ADD COLUMN {column_name} {column_def}"))
                    print(f"Added {column_name} column to external_transfer_items table")
                except Exception as e:
                    if "Duplicate column name" not in str(e):
                        print(f"Error adding {column_name} column: {e}")
            
            # Add returned_qty column to return_items table
            try:
                conn.execute(text("ALTER TABLE return_items ADD COLUMN returned_qty DECIMAL(10, 2) DEFAULT 0.00"))
                conn.commit()
                print("Added returned_qty column to return_items table")
            except Exception as e:
                if "Duplicate column name" not in str(e):
                    print(f"Error adding returned_qty column: {e}")
            
            # Add missing columns to grn_items table
            grn_item_columns = [
                ("container", "INT DEFAULT 0"),
                ("package", "INT DEFAULT 0"),
                ("piece", "INT DEFAULT 0"),
                ("package_cost", "DECIMAL(10, 2) DEFAULT 0.00"),
                ("package_mrp", "DECIMAL(10, 2) DEFAULT 0.00"),
                ("total_pieces", "INT DEFAULT 0"),
                ("cost_per_piece", "DECIMAL(10, 2) DEFAULT 0.00"),
                ("mrp_per_piece", "DECIMAL(10, 2) DEFAULT 0.00")
            ]
            
            for column_name, column_def in grn_item_columns:
                try:
                    conn.execute(text(f"ALTER TABLE grn_items ADD COLUMN {column_name} {column_def}"))
                    print(f"Added {column_name} column to grn_items table")
                except Exception as e:
                    if "Duplicate column name" not in str(e):
                        print(f"Error adding {column_name} column to grn_items: {e}")
            
            # Add missing billing columns
            billing_columns = [
                ("discount_amount", "DECIMAL(10, 2) DEFAULT 0.00"),
                ("cgst_amount", "DECIMAL(10, 2) DEFAULT 0.00"),
                ("sgst_amount", "DECIMAL(10, 2) DEFAULT 0.00"),
                ("igst_amount", "DECIMAL(10, 2) DEFAULT 0.00")
            ]
            
            for column_name, column_def in billing_columns:
                try:
                    conn.execute(text(f"ALTER TABLE billing ADD COLUMN {column_name} {column_def}"))
                    print(f"Added {column_name} column to billing table")
                except Exception as e:
                    if "Duplicate column name" not in str(e):
                        print(f"Error adding {column_name} column to billing: {e}")
            
            # Create audit_logs table if not exists
            try:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS audit_logs (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NULL,
                        user_name VARCHAR(191) NULL,
                        action VARCHAR(100) NOT NULL,
                        table_name VARCHAR(100) NOT NULL,
                        record_id INT NULL,
                        old_values TEXT NULL,
                        new_values TEXT NULL,
                        ip_address VARCHAR(45) NULL,
                        user_agent VARCHAR(500) NULL,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        module VARCHAR(100) NULL,
                        description VARCHAR(500) NULL
                    )
                """))
                print("Created audit_logs table")
            except Exception as e:
                print(f"Error creating audit_logs table: {e}")
            
            # Ensure logo column is LONGBLOB in companies table
            try:
                conn.execute(text("ALTER TABLE companies MODIFY COLUMN logo LONGBLOB"))
                print("Updated logo column to LONGBLOB in companies table")
            except Exception as e:
                if "Unknown column" not in str(e) and "doesn't exist" not in str(e):
                    print(f"Error updating logo column: {e}")
            
            conn.commit()
                
    except Exception as e:
        print(f"Error in ensure_missing_columns: {e}")
