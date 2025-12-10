# ------------------ Department Schemas ------------------

from pydantic import BaseModel


class DepartmentBase(BaseModel):
    name: str
    description: str | None = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class DepartmentResponse(DepartmentBase):
    id: int
    is_active: bool

    class Config:
        orm_mode = True
