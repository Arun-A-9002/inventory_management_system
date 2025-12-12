import pymysql
from sqlalchemy import create_engine, inspect, text
from models.tenant_models import TenantBase, Company, Branch, Store, Category, SubCategory, Brand, UOM, TaxCode
from database import TENANT_DATABASE_URL  # adjust import based on your database.py


def run_migration():
    print("Running Auto-Migration for Tenant Database...")

    # Connect to tenant DB
    engine = create_engine(TENANT_DATABASE_URL)
    inspector = inspect(engine)

    # Loop through all SQLAlchemy models
    for table in TenantBase.metadata.sorted_tables:
        table_name = table.name
        print(f"\nChecking table: {table_name}")

        # Fetch existing DB columns
        try:
            existing_columns = [col["name"] for col in inspector.get_columns(table_name)]
        except Exception:
            print(f"Table {table_name} does not exist - Creating table...")
            table.create(bind=engine)
            continue

        # Check for missing columns
        for column in table.columns:
            col_name = column.name

            if col_name not in existing_columns:
                col_type = str(column.type)
                nullable = "NULL" if column.nullable else "NOT NULL"

                alter_sql = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type} {nullable};"

                try:
                    with engine.connect() as conn:
                        print(f"Adding missing column: {col_name} ({col_type})")
                        conn.execute(text(alter_sql))
                        conn.commit()
                except Exception as e:
                    print(f"Failed to add column {col_name}: {e}")

    print("\nMigration Complete! Database schema is now up-to-date.")


if __name__ == "__main__":
    run_migration()
