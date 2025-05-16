from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    credits: Optional[int] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    credits: int

    class Config:
        from_attributes = True # Replaces orm_mode in Pydantic v2 