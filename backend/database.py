# database.py
import os
import urllib.parse
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging


# MASTER DB
DB_USER = os.getenv("MASTER_DB_USER", "root")
DB_PASSWORD = os.getenv("MASTER_DB_PASSWORD", "")
DB_HOST = os.getenv("MASTER_DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("MASTER_DB_PORT", "3306")
MASTER_DB_NAME = os.getenv("MASTER_DB_NAME", "IMS_master")

MASTER_DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD)}"
    f"@{DB_HOST}:{DB_PORT}/{MASTER_DB_NAME}"
)

master_engine = create_engine(
    MASTER_DATABASE_URL,
    pool_pre_ping=True,
    future=True
)

MasterSessionLocal = sessionmaker(bind=master_engine, autoflush=False, autocommit=False)


def get_master_db() -> Generator:
    db = MasterSessionLocal()
    try:
        yield db
    finally:
        db.close()


# CREATE TENANT
def create_tenant_database(db_name: str):

    url_no_db = f"mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/"
    engine = create_engine(url_no_db, pool_pre_ping=True, future=True)

    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        conn.execute(text(f"""
            CREATE DATABASE IF NOT EXISTS {db_name}
            CHARACTER SET utf8mb4
            COLLATE utf8mb4_unicode_ci;
        """))

    engine.dispose()


# TENANT ENGINE
def get_tenant_engine(db_name: str):
    url = (
        f"mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD)}"
        f"@{DB_HOST}:{DB_PORT}/{db_name}"
    )
    return create_engine(url, pool_pre_ping=True, future=True)