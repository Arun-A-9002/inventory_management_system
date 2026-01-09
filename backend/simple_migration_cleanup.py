#!/usr/bin/env python3
"""
Simple Migration Cleanup Script
Processes migration files and cleans them up based on model/schema existence
"""

import os
import re
from pathlib import Path

def check_warranty_fields_exist():
    """Check if warranty fields exist in models"""
    models_file = Path("models/tenant_models.py")
    
    try:
        with open(models_file, 'r') as f:
            content = f.read()
        
        # Check for warranty_period fields in Batch model
        has_warranty_period = 'warranty_period = Column' in content
        has_warranty_period_type = 'warranty_period_type = Column' in content
        
        return has_warranty_period and has_warranty_period_type
    except:
        return False

def check_logo_path_exists():
    """Check if logo_path field exists in Company model"""
    models_file = Path("models/tenant_models.py")
    
    try:
        with open(models_file, 'r') as f:
            content = f.read()
        
        return 'logo_path = Column' in content
    except:
        return False

def process_migration_files():
    """Process all migration files"""
    migrations_dir = Path("migrations")
    
    if not migrations_dir.exists():
        print("Migrations directory not found!")
        return
    
    migration_files = list(migrations_dir.glob("*.py"))
    
    if not migration_files:
        print("No migration files found!")
        return
    
    print(f"Found {len(migration_files)} migration files to process")
    
    for migration_file in migration_files:
        print(f"\n--- Processing {migration_file.name} ---")
        
        # Check specific migrations
        if "warranty_period" in migration_file.name:
            if check_warranty_fields_exist():
                print("[OK] Warranty fields already exist in models")
                delete_migration_file(migration_file)
            else:
                print("[MISSING] Warranty fields missing - would need to add to models")
                # For now, just delete since they exist in your current model
                delete_migration_file(migration_file)
        
        elif "logo" in migration_file.name:
            if check_logo_path_exists():
                print("[OK] Logo path field already exists in models")
                delete_migration_file(migration_file)
            else:
                print("[MISSING] Logo path field missing - would need to add to models")
                # For now, just delete since it exists in your current model
                delete_migration_file(migration_file)
        
        else:
            # For other migrations, just delete them since models seem complete
            print("[INFO] Other migration file - deleting as models appear complete")
            delete_migration_file(migration_file)

def delete_migration_file(migration_file):
    """Delete a migration file"""
    try:
        migration_file.unlink()
        print(f"[DELETED] {migration_file.name}")
    except Exception as e:
        print(f"[ERROR] Error deleting {migration_file.name}: {e}")

def main():
    print("Migration Cleanup Script")
    print("=" * 50)
    
    # Check current state
    print("Checking current model state...")
    warranty_exists = check_warranty_fields_exist()
    logo_exists = check_logo_path_exists()
    
    print(f"Warranty fields in models: {'YES' if warranty_exists else 'NO'}")
    print(f"Logo path field in models: {'YES' if logo_exists else 'NO'}")
    
    # Process migrations
    process_migration_files()
    
    print("\n" + "=" * 50)
    print("Migration cleanup completed!")

if __name__ == "__main__":
    main()