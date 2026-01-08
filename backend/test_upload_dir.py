import os
from pathlib import Path

# Test the upload directory
upload_dir = Path(r"c:\Users\aarun\OneDrive\Desktop\inventory_management_system\frontend\public\uploads")

print(f"Directory exists: {upload_dir.exists()}")
print(f"Directory path: {upload_dir}")
print(f"Is directory: {upload_dir.is_dir()}")

# Test write permissions
test_file = upload_dir / "test.txt"
try:
    with open(test_file, "w") as f:
        f.write("test")
    print("Write permission: OK")
    test_file.unlink()  # Clean up
except Exception as e:
    print(f"Write permission error: {e}")

# List current files
if upload_dir.exists():
    files = list(upload_dir.iterdir())
    print(f"Current files: {[f.name for f in files]}")