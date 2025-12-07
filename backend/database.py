# database.py
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import urllib.parse
import pymysql
from models.register_models import Base

DB_USER = "root"
DB_PASSWORD = ""
DB_HOST = "localhost"
DB_PORT = "3306"
MASTER_DB = "ims_master"

DB_URL = (
    f"mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD)}"
    f"@{DB_HOST}:{DB_PORT}/{MASTER_DB}"
)

# Create master database if not exists

try:
    conn = pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASSWORD, port=int(DB_PORT))
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MASTER_DB}")
    conn.close()
except:
    pass

engine = create_engine(DB_URL, echo=True, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables

Base.metadata.create_all(bind=engine)


def get_master_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------- CREATE TENANT DATABASE ----------------

def create_tenant_database(db_name: str):
    url_without_db = (
        f"mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD)}"
        f"@{DB_HOST}:{DB_PORT}/"
    )
    temp_engine = create_engine(url_without_db, future=True)

    with temp_engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        conn.execute(
            text(f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                 f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        )
    temp_engine.dispose()

def get_tenant_engine(db_name: str):
    url = (
        f"mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD)}"
        f"@{DB_HOST}:{DB_PORT}/{db_name}"
    )
    return create_engine(url, future=True)
