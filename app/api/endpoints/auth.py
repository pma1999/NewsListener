from fastapi import APIRouter, Depends, HTTPException, status
# from fastapi.security import OAuth2PasswordRequestForm # If using form data for login
from sqlalchemy.orm import Session
from datetime import timedelta

from app.api import deps
from app.core import security
from app.schemas import token_schemas, user_schemas
from app.services import user_service
from app.core.config import settings
from app.models import user_models # For response model in /users/me

router = APIRouter()

@router.post("/register", response_model=user_schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_new_user(
    *,
    db: Session = Depends(deps.get_db_session),
    user_in: user_schemas.UserCreate,
):
    """
    Create new user.
    """
    user = user_service.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system.",
        )
    user = user_service.create_user(db=db, user_in=user_in)
    return user

@router.post("/login/access-token", response_model=token_schemas.Token)
def login_for_access_token(
    form_data: token_schemas.LoginRequest,
    db: Session = Depends(deps.get_db_session)
):
    """
    OAuth2 compatible token login, get an access token for future requests.
    Uses email as username for the purpose of this system.
    """
    user = user_service.authenticate_user(db, email=form_data.email, password=form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=user_schemas.UserResponse)
def read_users_me(
    current_user: user_models.User = Depends(deps.get_current_active_user),
):
    """
    Get current user.
    """
    return current_user 