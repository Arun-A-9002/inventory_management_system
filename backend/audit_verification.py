#!/usr/bin/env python3
"""
Audit Verification Script
This script verifies that all major actions in the inventory management system
are properly logging to the audit trail database.
"""

import os
import re
from pathlib import Path

def check_file_for_audit_logging(file_path):
    """Check if a Python file has proper audit logging implementation"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for audit logging imports
        has_audit_import = (
            'from utils.audit import log_audit' in content or
            'log_database_audit' in content or
            'AuditLog' in content
        )
        
        # Check for audit logging calls
        audit_calls = []
        if 'log_audit(' in content:
            audit_calls.extend(re.findall(r'log_audit\([^)]+\)', content))
        if 'log_database_audit(' in content:
            audit_calls.extend(re.findall(r'log_database_audit\([^)]+\)', content))
        
        # Check for CRUD operations that should have audit logging
        crud_operations = []
        crud_patterns = [
            r'def create_\w+\(',
            r'def update_\w+\(',
            r'def delete_\w+\(',
            r'\.add\(',
            r'\.commit\(',
            r'\.delete\(',
            r'@router\.post\(',
            r'@router\.put\(',
            r'@router\.delete\(',
        ]
        
        for pattern in crud_patterns:
            matches = re.findall(pattern, content)
            crud_operations.extend(matches)
        
        return {
            'file': file_path.name,
            'has_audit_import': has_audit_import,
            'audit_calls_count': len(audit_calls),
            'crud_operations_count': len(crud_operations),
            'audit_calls': audit_calls[:3],  # Show first 3 calls
            'needs_attention': len(crud_operations) > 0 and len(audit_calls) == 0
        }
    
    except Exception as e:
        return {
            'file': file_path.name,
            'error': str(e),
            'needs_attention': True
        }

def main():
    """Main function to check all router files"""
    backend_path = Path(__file__).parent
    routers_path = backend_path / 'routers'
    
    print("🔍 Audit Logging Verification Report")
    print("=" * 50)
    
    # Files that should have audit logging
    router_files = []
    
    # Get all Python files in routers directory
    for root, dirs, files in os.walk(routers_path):
        for file in files:
            if file.endswith('.py') and file != '__init__.py':
                router_files.append(Path(root) / file)
    
    results = []
    for file_path in router_files:
        result = check_file_for_audit_logging(file_path)
        results.append(result)
    
    # Categorize results
    properly_logged = []
    needs_attention = []
    
    for result in results:
        if result.get('needs_attention', False):
            needs_attention.append(result)
        else:
            properly_logged.append(result)
    
    # Print results
    print(f"\n✅ Files with Proper Audit Logging ({len(properly_logged)}):")
    print("-" * 40)
    for result in properly_logged:
        if not result.get('error'):
            print(f"  📄 {result['file']}")
            print(f"     - Audit imports: {'✓' if result['has_audit_import'] else '✗'}")
            print(f"     - Audit calls: {result['audit_calls_count']}")
            print(f"     - CRUD operations: {result['crud_operations_count']}")
            if result['audit_calls']:
                print(f"     - Sample calls: {result['audit_calls'][0][:50]}...")
            print()
    
    print(f"\n⚠️  Files Needing Attention ({len(needs_attention)}):")
    print("-" * 40)
    for result in needs_attention:
        if result.get('error'):
            print(f"  ❌ {result['file']} - Error: {result['error']}")
        else:
            print(f"  📄 {result['file']}")
            print(f"     - Audit imports: {'✓' if result['has_audit_import'] else '✗'}")
            print(f"     - Audit calls: {result['audit_calls_count']}")
            print(f"     - CRUD operations: {result['crud_operations_count']}")
            print(f"     - Status: {'Missing audit logging for CRUD operations' if result['needs_attention'] else 'OK'}")
            print()
    
    # Summary
    print("\n📊 Summary:")
    print("-" * 20)
    print(f"Total files checked: {len(results)}")
    print(f"Files with proper audit logging: {len(properly_logged)}")
    print(f"Files needing attention: {len(needs_attention)}")
    
    if len(needs_attention) == 0:
        print("\n🎉 All files have proper audit logging!")
    else:
        print(f"\n⚠️  {len(needs_attention)} files need audit logging improvements.")
    
    # Key files that MUST have audit logging
    critical_files = [
        'auth.py', 'users.py', 'roles.py', 'register.py',
        'item.py', 'company.py', 'vendor.py', 'grn.py',
        'billing.py', 'stock.py'
    ]
    
    print(f"\n🔑 Critical Files Status:")
    print("-" * 25)
    for critical_file in critical_files:
        found = False
        for result in results:
            if critical_file in result['file']:
                status = "✅ OK" if not result.get('needs_attention', False) else "⚠️  NEEDS ATTENTION"
                print(f"  {critical_file}: {status}")
                found = True
                break
        if not found:
            print(f"  {critical_file}: ❓ NOT FOUND")

if __name__ == "__main__":
    main()