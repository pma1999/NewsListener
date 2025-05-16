from sqlalchemy import Column, Integer, String, JSON, Boolean, DateTime
from sqlalchemy.sql import func # For default timestamps
from app.db.database import Base

class PredefinedCategory(Base):
    __tablename__ = "predefined_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False, unique=True)
    description = Column(String, nullable=True)
    
    rss_urls = Column(JSON, nullable=True) # Stores List[str]
    topics = Column(JSON, nullable=True) # Stores List[str]
    keywords = Column(JSON, nullable=True) # Stores List[str]
    
    exclude_keywords = Column(JSON, nullable=True) # Stores List[str]
    exclude_source_domains = Column(JSON, nullable=True) # Stores List[str]

    language = Column(String, nullable=True) 
    audio_style = Column(String, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) 