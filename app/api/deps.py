from typing import Generator, Optional, Annotated
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user_models import User
# Placeholder for future User model import for authentication dependency
# from app.models.user_models import User 
# from app.core import security
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from app.core.config import settings
# from app.schemas.token_schemas import TokenPayload # If you have this schema

# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/login/access-token") # Example if you add token auth

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token" # Adjust if your login path is different
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

# Mock get_current_user for development without full OAuth2 setup
async def get_current_active_user(
    db: DbSession, 
    # token: str = Depends(reusable_oauth2) # Uncomment when real auth is implemented
) -> User:
    """
    Mock current user dependency. In a real app, this would validate the token.
    For development, it fetches a mock user (e.g., ID 1).
    """
    # MOCK IMPLEMENTATION: Always return user with ID 1 for now
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        # This might happen if the mock user hasn't been created in on_startup yet
        # or if the DB is clean. For robust dev, ensure mock user exists.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Mock User with ID 1 not found. Ensure it is created on startup."
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return user

# To use with real OAuth2 token validation (Example structure)
# async def get_current_active_user_real(
#     db: DbSession, token: str = Depends(reusable_oauth2)
# ) -> User:
#     try:
#         payload = jwt.decode(
#             token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
#         )
#         # token_data = TokenPayload(**payload) # Assuming TokenPayload schema
#         user_id: str = payload.get("sub") 
#         if user_id is None:
#             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials (no sub)")
#     except (jwt.JWTError, ValidationError) as e:
#         logger.error(f"Token validation error: {e}")
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Could not validate credentials (error)",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
    
#     user = db.query(User).filter(User.id == int(user_id)).first()
#     if not user:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
#     if not user.is_active:
#         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
#     return user

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