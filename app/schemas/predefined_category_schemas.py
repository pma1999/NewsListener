from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime # For timestamp fields if we include them in response

class PredefinedCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    rss_urls: Optional[List[HttpUrl]] = [] 
    topics: Optional[List[str]] = []
    keywords: Optional[List[str]] = []
    exclude_keywords: Optional[List[str]] = []
    exclude_source_domains: Optional[List[str]] = []
    language: Optional[str] = None
    audio_style: Optional[str] = None
    is_active: bool = True

class PredefinedCategoryCreate(PredefinedCategoryBase):
    pass

class PredefinedCategory(PredefinedCategoryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None # Can be null if never updated

    class Config:
        from_attributes = True

class PredefinedCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rss_urls: Optional[List[HttpUrl]] = None
    topics: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    exclude_keywords: Optional[List[str]] = None
    exclude_source_domains: Optional[List[str]] = None
    language: Optional[str] = None
    audio_style: Optional[str] = None
    is_active: Optional[bool] = None 