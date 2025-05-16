from pydantic import BaseModel, EmailStr
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[EmailStr] = None # Subject of the token (user's email)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str 