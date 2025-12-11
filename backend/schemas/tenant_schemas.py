# ------------------ Department Schemas ------------------

from pydantic import BaseModel, ConfigDict
from typing import Optional


class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: Optional[bool] = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):
    id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

# ------------------ Role & Permission Schemas ------------------
from pydantic import BaseModel

class PermissionBase(BaseModel):
    name: str
    label: str
    group: str | None = None

class PermissionCreate(PermissionBase):
    pass

class PermissionResponse(PermissionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class RoleBase(BaseModel):
    name: str
    description: str | None = None
    is_active: bool | None = True

class RoleCreate(RoleBase):
    permission_ids: list[int] | None = []

class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    permission_ids: list[int] | None = None

class RoleResponse(RoleBase):
    id: int
    permissions: list[PermissionResponse] = []

    model_config = ConfigDict(from_attributes=True)

# ------------------ User Schemas ------------------
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    is_active: bool | None = True
    is_doctor: bool | None = False
    department_id: int | None = None

class UserCreate(UserBase):
    password: str
    role_ids: list[int] | None = []

class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    is_active: bool | None = None
    is_doctor: bool | None = None
    department_id: int | None = None
    role_ids: list[int] | None = None

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    is_active: bool = True
    is_doctor: bool = False
    department_id: int | None = None
    department: DepartmentResponse | None = None
    roles: list[RoleResponse] = []

    model_config = ConfigDict(from_attributes=True)

