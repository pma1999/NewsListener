from typing import Generator, Optional, Annotated
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user_models import User
# Placeholder for future User model import for authentication dependency
# from app.models.user_models import User 
# from app.core import security
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from app.core.config import settings
from app.schemas import token_schemas # For TokenPayload if used in validation
from app.services import user_service # To fetch user by email

# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/login/access-token") # Example if you add token auth

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login/access-token" # Adjusted to new auth router path
)

def get_db_session() -> Generator[Session, None, None]:
    """
    Dependency function to get a database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Type alias for DB session dependency
DbSession = Annotated[Session, Depends(get_db_session)]

async def get_current_user(
    db: DbSession,
    token: str = Depends(reusable_oauth2)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
        # If you were to validate with Pydantic:
        # token_data = token_schemas.TokenPayload(sub=email) 
    except JWTError:
        raise credentials_exception
    # except ValidationError: # If using Pydantic validation for token_data
        # raise credentials_exception
    
    user = user_service.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

# Optional: for superuser-only endpoints
# async def get_current_active_superuser(
#     current_user: User = Depends(get_current_active_user),
# ) -> User:
#     if not current_user.is_superuser:
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="The user doesn't have enough privileges"
#         )
#     return current_user

# --- Placeholder for future authentication dependency ---
# async def get_current_user(
#     db: Session = Depends(get_db_session),
#     token: str = Depends(oauth2_scheme)
# ) -> User:
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         detail="Could not validate credentials",
#         headers={"WWW-Authenticate": "Bearer"},
#     )
#     try:
#         payload = security.decode_access_token(token) # You'd need to implement security.py
#         user_id: Optional[str] = payload.get("sub")
#         if user_id is None:
#             raise credentials_exception
#     except Exception: # Catch JWTError or others from decode_access_token
#         raise credentials_exception
    
#     user = db.query(User).filter(User.id == int(user_id)).first()
#     if user is None:
#         raise credentials_exception
#     return user

# async def get_current_active_user(
#     current_user: User = Depends(get_current_user)
# ) -> User:
#     if not current_user.is_active:
#         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
#     return current_user

# async def get_current_active_superuser(
#     current_user: User = Depends(get_current_active_user),
# ) -> User:
#     if not current_user.is_superuser:
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN, detail="The user doesn't have enough privileges"
#         )
#     return current_user 