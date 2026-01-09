#!/usr/bin/env python3
"""
Migration Manager Script
Checks migration files and manages models/schemas accordingly
"""

import os
import re
import ast
from pathlib import Path

class MigrationManager:
    def __init__(self):
        self.migrations_dir = Path("migrations")
        self.models_file = Path("models/tenant_models.py")
        self.schemas_file = Path("schemas/tenant_schemas.py")
        
    def extract_table_info_from_migration(self, migration_file):
        """Extract table/model information from migration file"""
        try:
            with open(migration_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Look for table names in SQL statements
            table_patterns = [
                r'ALTER TABLE\s+(\w+)',
                r'CREATE TABLE\s+(\w+)',
                r'INSERT INTO\s+(\w+)',
                r'UPDATE\s+(\w+)',
                r'FROM\s+(\w+)',
            ]
            
            tables = set()
            for pattern in table_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                tables.update(matches)
            
            # Look for column additions
            column_patterns = [
                r'ADD COLUMN\s+(\w+)',
                r'MODIFY COLUMN\s+(\w+)',
            ]
            
            columns = set()
            for pattern in column_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                columns.update(matches)
            
            return {
                'tables': list(tables),
                'columns': list(columns),
                'file': migration_file
            }
        except Exception as e:
            print(f"Error reading {migration_file}: {e}")
            return None

    def check_model_exists(self, table_name):
        """Check if model exists in tenant_models.py"""
        try:
            with open(self.models_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Convert table name to class name (e.g., companies -> Company)
            class_name = self.table_to_class_name(table_name)
            
            # Check if class exists
            class_pattern = rf'class\s+{class_name}\s*\('
            return bool(re.search(class_pattern, content))
        except Exception as e:
            print(f"Error checking model for {table_name}: {e}")
            return False

    def check_schema_exists(self, table_name):
        """Check if schema exists in tenant_schemas.py"""
        try:
            with open(self.schemas_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Convert table name to schema class names
            class_name = self.table_to_class_name(table_name)
            schema_patterns = [
                rf'class\s+{class_name}Base\s*\(',
                rf'class\s+{class_name}Create\s*\(',
                rf'class\s+{class_name}Response\s*\(',
                rf'class\s+{class_name}Update\s*\(',
            ]
            
            for pattern in schema_patterns:
                if re.search(pattern, content):
                    return True
            return False
        except Exception as e:
            print(f"Error checking schema for {table_name}: {e}")
            return False

    def table_to_class_name(self, table_name):
        """Convert table name to class name (e.g., companies -> Company)"""
        # Handle special cases
        if table_name.endswith('ies'):
            return table_name[:-3] + 'y'
        elif table_name.endswith('s'):
            return table_name[:-1]
        return table_name.capitalize()

    def check_column_exists_in_model(self, table_name, column_name):
        """Check if column exists in the model"""
        try:
            with open(self.models_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            class_name = self.table_to_class_name(table_name)
            
            # Find the class definition
            class_pattern = rf'class\s+{class_name}\s*\([^)]+\):(.*?)(?=class\s+\w+|$)'
            class_match = re.search(class_pattern, content, re.DOTALL)
            
            if class_match:
                class_content = class_match.group(1)
                # Check if column exists as a Column definition
                column_pattern = rf'{column_name}\s*=\s*Column'
                return bool(re.search(column_pattern, class_content))
            
            return False
        except Exception as e:
            print(f"Error checking column {column_name} in {table_name}: {e}")
            return False

    def generate_model_code(self, table_name, columns):
        """Generate basic model code for missing table"""
        class_name = self.table_to_class_name(table_name)
        
        model_code = f'''
class {class_name}(TenantBase):
    __tablename__ = "{table_name}"

    id = Column(Integer, primary_key=True, index=True)
'''
        
        for column in columns:
            if column != 'id':  # Skip id as it's already added
                model_code += f'    {column} = Column(String(255), nullable=True)\n'
        
        model_code += f'''
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

'''
        return model_code

    def generate_schema_code(self, table_name):
        """Generate basic schema code for missing table"""
        class_name = self.table_to_class_name(table_name)
        
        schema_code = f'''
class {class_name}Base(BaseModel):
    name: str
    is_active: Optional[bool] = True

class {class_name}Create({class_name}Base):
    pass

class {class_name}Update(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class {class_name}Response({class_name}Base):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

'''
        return schema_code

    def add_column_to_model(self, table_name, column_name):
        """Add missing column to existing model"""
        try:
            with open(self.models_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            class_name = self.table_to_class_name(table_name)
            
            # Find the class and add column before the timestamps
            pattern = rf'(class\s+{class_name}\s*\([^)]+\):.*?)(    created_at\s*=\s*Column)'
            
            def replacement(match):
                class_def = match.group(1)
                created_at_line = match.group(2)
                new_column = f'    {column_name} = Column(String(255), nullable=True)\n\n'
                return class_def + new_column + created_at_line
            
            updated_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
            
            if updated_content != content:
                with open(self.models_file, 'w', encoding='utf-8') as f:
                    f.write(updated_content)
                print(f"Added column {column_name} to {class_name} model")
                return True
            
        except Exception as e:
            print(f"Error adding column {column_name} to {table_name}: {e}")
        
        return False

    def process_migrations(self):
        """Main method to process all migrations"""
        if not self.migrations_dir.exists():
            print("Migrations directory not found!")
            return
        
        migration_files = list(self.migrations_dir.glob("*.py"))
        
        if not migration_files:
            print("No migration files found!")
            return
        
        print(f"Found {len(migration_files)} migration files")
        
        for migration_file in migration_files:
            print(f"\n--- Processing {migration_file.name} ---")
            
            # Extract information from migration
            migration_info = self.extract_table_info_from_migration(migration_file)
            
            if not migration_info:
                continue
            
            tables = migration_info['tables']
            columns = migration_info['columns']
            
            print(f"Tables found: {tables}")
            print(f"Columns found: {columns}")
            
            # Check each table
            for table in tables:
                model_exists = self.check_model_exists(table)
                schema_exists = self.check_schema_exists(table)
                
                print(f"Table '{table}': Model exists: {model_exists}, Schema exists: {schema_exists}")
                
                if not model_exists:
                    print(f"Adding model for table '{table}'")
                    model_code = self.generate_model_code(table, columns)
                    
                    # Append to models file
                    with open(self.models_file, 'a', encoding='utf-8') as f:
                        f.write(model_code)
                
                if not schema_exists:
                    print(f"Adding schema for table '{table}'")
                    schema_code = self.generate_schema_code(table)
                    
                    # Append to schemas file
                    with open(self.schemas_file, 'a', encoding='utf-8') as f:
                        f.write(schema_code)
                
                # Check for missing columns in existing models
                if model_exists:
                    for column in columns:
                        if not self.check_column_exists_in_model(table, column):
                            print(f"Adding missing column '{column}' to table '{table}'")
                            self.add_column_to_model(table, column)
            
            # Delete the migration file
            try:
                migration_file.unlink()
                print(f"Deleted migration file: {migration_file.name}")
            except Exception as e:
                print(f"Error deleting {migration_file.name}: {e}")

def main():
    manager = MigrationManager()
    manager.process_migrations()

if __name__ == "__main__":
    main()