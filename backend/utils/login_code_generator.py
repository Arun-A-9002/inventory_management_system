# backend/utils/login_code_generator.py

import random
import string
from sqlalchemy.orm import Session
from models.tenant_models import User

def generate_unique_login_code(db: Session, length: int = 8) -> str:
    """
    Generate a unique login code for a user.
    Format: 2 letters + 6 digits (e.g., AB123456)
    """
    max_attempts = 100
    
    for _ in range(max_attempts):
        # Generate 2 random uppercase letters
        letters = ''.join(random.choices(string.ascii_uppercase, k=2))
        
        # Generate 6 random digits
        digits = ''.join(random.choices(string.digits, k=6))
        
        # Combine to create login code
        login_code = letters + digits
        
        # Check if this code already exists
        existing_user = db.query(User).filter(User.login_code == login_code).first()
        
        if not existing_user:
            return login_code
    
    # If we couldn't generate a unique code after max_attempts, raise an error
    raise Exception("Unable to generate unique login code after maximum attempts")

def generate_login_code_on_demand() -> str:
    """
    Generate a login code without database check (for frontend display).
    This will be validated and regenerated if needed during actual user creation.
    """
    letters = ''.join(random.choices(string.ascii_uppercase, k=2))
    digits = ''.join(random.choices(string.digits, k=6))
    return letters + digits