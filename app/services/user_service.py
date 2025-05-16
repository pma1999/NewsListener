from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import user_models
from app.schemas import user_schemas
from app.core import security

def get_user_by_email(db: Session, email: str) -> Optional[user_models.User]:
    return db.query(user_models.User).filter(user_models.User.email == email).first()

def create_user(db: Session, user_in: user_schemas.UserCreate) -> user_models.User:
    db_user = get_user_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    hashed_password = security.get_password_hash(user_in.password)
    db_user = user_models.User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        is_active=True # Default new users to active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str) -> Optional[user_models.User]:
    user = get_user_by_email(db, email=email)
    if not user:
        return None
    if not security.verify_password(password, user.hashed_password):
        return None
    return user 