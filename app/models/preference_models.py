from sqlalchemy import Column, Integer, String, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db.database import Base
# Ensure User model is available for relationship, though direct import might be tricky.
# SQLAlchemy often resolves string-based relationship linkage if models are registered with Base.

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True) # One-to-one with User

    # Core preference fields
    preferred_topics = Column(JSON, nullable=True) # List of strings, e.g., ["technology", "world_news"]
    custom_keywords = Column(JSON, nullable=True)  # List of strings, e.g., ["AI in healthcare", "local election results [CityName]"]
    include_source_rss_urls = Column(JSON, nullable=True) # List of valid HttpUrl strings
    exclude_keywords = Column(JSON, nullable=True) # List of strings
    exclude_source_domains = Column(JSON, nullable=True) # List of strings (domains like "example.com")

    # Default generation settings
    default_language = Column(String(10), nullable=True, default="en") # ISO 639-1 code
    default_audio_style = Column(String(50), nullable=True, default="standard")

    created_at = Column(DateTime, default=func.now(), nullable=False, server_default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, server_default=func.now())

    user = relationship("User", back_populates="preferences")

    def __repr__(self):
        return f"<UserPreference(id={self.id}, user_id={self.user_id})>" 