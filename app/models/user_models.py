from sqlalchemy import Boolean, Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship

from app.db.database import Base # Adjusted import path
# from app.models.preference_models import UserPreference # Avoid direct import if UserPreference imports User

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False) # Store hashed passwords
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, server_default='true')
    is_superuser = Column(Boolean, default=False, server_default='false') # e.g., for admin access
    credits = Column(Integer, default=0, nullable=False, server_default='0') # For metered usage
    created_at = Column(DateTime, default=func.now(), nullable=False, server_default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, server_default=func.now())

    # Relationships
    news_digests = relationship("NewsDigest", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>" 