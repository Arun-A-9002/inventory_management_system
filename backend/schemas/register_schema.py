from pydantic import BaseModel, field_validator
import re

class RegisterModel(BaseModel):
    # Organization Info
    organization_name: str
    organization_type: str
    organization_license_number: str
    organization_address: str
    city: str
    state: str
    pincode: str
    contact_phone: str
    contact_email: str

    # Admin Info
    admin_name: str
    admin_email: str
    admin_phone: str
    admin_secondary_phone: str
    designation: str

    status: str
    password: str

    # CITY VALIDATION
    @field_validator("city")
    @classmethod
    def validate_city(cls, v):
        CITY_LIST = ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem"]
        if v not in CITY_LIST:
            raise ValueError(f"City must be one of: {CITY_LIST}")
        return v

    # STATE VALIDATION
    @field_validator("state")
    @classmethod
    def validate_state(cls, v):
        STATE_LIST = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"]
        if v not in STATE_LIST:
            raise ValueError(f"State must be one of: {STATE_LIST}")
        return v

    # PINCODE
    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v):
        if not re.fullmatch(r"\d{6}", v):
            raise ValueError("Pincode must be exactly 6 digits.")
        return v

    # PHONE
    @field_validator("contact_phone", "admin_phone", "admin_secondary_phone")
    @classmethod
    def validate_phone(cls, v):
        if not re.fullmatch(r"\d{10}", v):
            raise ValueError("Phone must be 10 digits.")
        return v

    # EMAIL
    @field_validator("contact_email", "admin_email")
    @classmethod
    def validate_email(cls, v):
        if "@" not in v or not v.endswith(".com"):
            raise ValueError("Email must contain '@' and end with '.com'")
        return v

    # PASSWORD
    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if (
            not re.search(r"[A-Z]", v)
            or not re.search(r"[a-z]", v)
            or not re.search(r"\d", v)
            or not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v)
        ):
            raise ValueError(
                "Password must include uppercase, lowercase, number and special character."
            )
        return v
