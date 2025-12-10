# ------------------ Department Model ------------------

from sqlalchemy import Column, Integer, String, Boolean, DateTime,Table, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

# Base class for tenant-specific models
TenantBase = declarative_base()

class Department(TenantBase):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(191), unique=True, nullable=False)
    description = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

# Association table for Role <-> Permission (many-to-many)
role_permissions = Table(
    "role_permissions",
    TenantBase.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)



class Role(TenantBase):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(191), unique=True, nullable=False)
    description = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)

    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles", lazy="joined")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Permission(TenantBase):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(191), unique=True, nullable=False)  # e.g., departments.view
    label = Column(String(255), nullable=False)               # e.g., Departments — View
    group = Column(String(100), nullable=True)                # e.g., Departments

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions", lazy="joined")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

# User <-> Role many-to-many association table
user_roles = Table(
    "user_roles",
    TenantBase.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

class User(TenantBase):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(191), nullable=False)
    email = Column(String(191), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_doctor = Column(Boolean, default=False)

    # department: single relationship to departments table (one-to-many)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = relationship("Department", lazy="joined")

    roles = relationship("Role", secondary=user_roles, backref="users", lazy="joined")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
