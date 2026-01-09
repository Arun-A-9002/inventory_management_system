#!/usr/bin/env python3
"""
Comprehensive Migration Manager
Handles migration files by checking if corresponding models/schemas exist
and manages them accordingly.
"""

import os
import re
import ast
from pathlib import Path
from typing import List, Dict, Set

class MigrationManager:
    def __init__(self, migrations_dir="migrations", models_file="models/tenant_models.py", schemas_file="schemas/tenant_schemas.py"):
        self.migrations_dir = Path(migrations_dir)
        self.models_file = Path(models_file)
        self.schemas_file = Path(schemas_file)
        
    def extract_migration_info(self, migration_file: Path) -> Dict:
        """Extract table and column information from migration file"""
        try:
            with open(migration_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            info = {
                'file': migration_file,
                'tables': set(),
                'columns': set(),
                'operations': []
            }
            
            # SQL patterns to extract table names
            sql_patterns = [
                (r'ALTER TABLE\s+(\w+)', 'ALTER'),
                (r'CREATE TABLE\s+(\w+)', 'CREATE'),
                (r'INSERT INTO\s+(\w+)', 'INSERT'),
                (r'UPDATE\s+(\w+)', 'UPDATE'),
                (r'FROM\s+(\w+)', 'SELECT'),
                (r'DROP TABLE\s+(\w+)', 'DROP'),
            ]
            
            for pattern, operation in sql_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                for match in matches:
                    info['tables'].add(match)
                    info['operations'].append(f"{operation} on {match}")
            
            # Column patterns
            column_patterns = [
                r'ADD COLUMN\s+(\w+)',
                r'MODIFY COLUMN\s+(\w+)',
                r'DROP COLUMN\s+(\w+)',
            ]
            
            for pattern in column_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                info['columns'].update(matches)
            
            return info
            
        except Exception as e:
            print(f"[ERROR] Reading {migration_file}: {e}")
            return None
    
    def get_model_tables(self) -> Set[str]:
        """Get all table names from models file"""
        try:
            with open(self.models_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find all __tablename__ declarations
            pattern = r'__tablename__\s*=\s*["\'](\w+)["\']'
            tables = set(re.findall(pattern, content))
            return tables
            
        except Exception as e:
            print(f"[ERROR] Reading models file: {e}")
            return set()
    
    def get_model_columns(self, table_name: str) -> Set[str]:
        """Get all columns for a specific table from models"""
        try:
            with open(self.models_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find the class with this table name
            table_pattern = rf'__tablename__\s*=\s*["\']({table_name})["\']'
            table_match = re.search(table_pattern, content)
            
            if not table_match:
                return set()
            
            # Find the class definition containing this tablename
            class_pattern = r'class\s+(\w+)\s*\([^)]+\):(.*?)(?=class\s+\w+|$)'
            class_matches = re.findall(class_pattern, content, re.DOTALL)
            
            for class_name, class_content in class_matches:
                if table_name in class_content:
                    # Extract column names
                    column_pattern = r'(\w+)\s*=\s*Column'
                    columns = set(re.findall(column_pattern, class_content))
                    return columns
            
            return set()
            
        except Exception as e:
            print(f"[ERROR] Getting columns for {table_name}: {e}")
            return set()
    
    def check_schema_exists(self, table_name: str) -> bool:
        """Check if schemas exist for a table"""
        try:
            with open(self.schemas_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            class_name = self.table_to_class_name(table_name)
            
            # Check for common schema patterns
            patterns = [
                rf'class\s+{class_name}Base\s*\(',
                rf'class\s+{class_name}Create\s*\(',
                rf'class\s+{class_name}Response\s*\(',
            ]
            
            for pattern in patterns:
                if re.search(pattern, content):
                    return True
            
            return False
            
        except Exception as e:
            print(f"[ERROR] Checking schema for {table_name}: {e}")
            return False
    
    def table_to_class_name(self, table_name: str) -> str:
        """Convert table name to class name"""
        # Handle plurals
        if table_name.endswith('ies'):
            return table_name[:-3] + 'y'
        elif table_name.endswith('s') and not table_name.endswith('ss'):
            return table_name[:-1]
        
        # Capitalize first letter
        return table_name.capitalize()
    
    def analyze_migration(self, migration_info: Dict) -> Dict:
        """Analyze a migration and determine what action to take"""
        analysis = {
            'file': migration_info['file'],
            'action': 'DELETE',  # Default action
            'reason': '',
            'missing_tables': [],
            'missing_columns': {},
            'existing_tables': [],
        }
        
        model_tables = self.get_model_tables()
        
        for table in migration_info['tables']:
            if table in model_tables:
                analysis['existing_tables'].append(table)
                
                # Check for missing columns
                model_columns = self.get_model_columns(table)
                missing_cols = migration_info['columns'] - model_columns
                
                if missing_cols:
                    analysis['missing_columns'][table] = list(missing_cols)
            else:
                analysis['missing_tables'].append(table)
        
        # Determine action and reason
        if analysis['missing_tables']:
            analysis['action'] = 'ADD_MODELS'
            analysis['reason'] = f"Missing models for tables: {', '.join(analysis['missing_tables'])}"
        elif analysis['missing_columns']:
            analysis['action'] = 'ADD_COLUMNS'
            analysis['reason'] = f"Missing columns in existing models"
        else:
            analysis['action'] = 'DELETE'
            analysis['reason'] = "All models and columns exist"
        
        return analysis
    
    def process_migrations(self, dry_run: bool = False) -> None:
        """Process all migration files"""
        if not self.migrations_dir.exists():
            print("[ERROR] Migrations directory not found!")
            return
        
        migration_files = list(self.migrations_dir.glob("*.py"))
        
        if not migration_files:
            print("[INFO] No migration files found!")
            return
        
        print(f"[INFO] Found {len(migration_files)} migration files")
        print(f"[INFO] Dry run mode: {'ON' if dry_run else 'OFF'}")
        print("=" * 60)
        
        for migration_file in migration_files:
            print(f"\n--- Processing {migration_file.name} ---")
            
            # Extract migration info
            migration_info = self.extract_migration_info(migration_file)
            if not migration_info:
                continue
            
            # Analyze migration
            analysis = self.analyze_migration(migration_info)
            
            print(f"Tables: {list(migration_info['tables'])}")
            print(f"Columns: {list(migration_info['columns'])}")
            print(f"Action: {analysis['action']}")
            print(f"Reason: {analysis['reason']}")
            
            if not dry_run:
                self.execute_action(analysis)
            else:
                print("[DRY RUN] Would execute action")
    
    def execute_action(self, analysis: Dict) -> None:
        """Execute the determined action"""
        action = analysis['action']
        
        if action == 'DELETE':
            self.delete_migration_file(analysis['file'])
        elif action == 'ADD_MODELS':
            print(f"[TODO] Would add models for: {analysis['missing_tables']}")
            # For now, just delete the migration
            self.delete_migration_file(analysis['file'])
        elif action == 'ADD_COLUMNS':
            print(f"[TODO] Would add columns: {analysis['missing_columns']}")
            # For now, just delete the migration
            self.delete_migration_file(analysis['file'])
    
    def delete_migration_file(self, migration_file: Path) -> None:
        """Delete a migration file"""
        try:
            migration_file.unlink()
            print(f"[DELETED] {migration_file.name}")
        except Exception as e:
            print(f"[ERROR] Deleting {migration_file.name}: {e}")

def main():
    print("Comprehensive Migration Manager")
    print("=" * 60)
    
    manager = MigrationManager()
    
    # Ask user for dry run
    dry_run = input("Run in dry-run mode? (y/N): ").lower().startswith('y')
    
    manager.process_migrations(dry_run=dry_run)
    
    print("\n" + "=" * 60)
    print("Migration processing completed!")

if __name__ == "__main__":
    main()