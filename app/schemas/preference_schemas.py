from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional
from datetime import datetime

class UserPreferenceBase(BaseModel):
    preferred_topics: Optional[List[str]] = Field(None, example=["technology", "world_news"])
    custom_keywords: Optional[List[str]] = Field(None, example=["AI in healthcare", "local election results MyCity"])
    include_source_rss_urls: Optional[List[HttpUrl]] = Field(None, example=["https://www.example.com/feed.xml"])
    exclude_keywords: Optional[List[str]] = Field(None, example=["celebrity gossip"])
    exclude_source_domains: Optional[List[str]] = Field(None, example=["tabloid.com"])
    default_language: Optional[str] = Field("en", example="en", min_length=2, max_length=10)
    default_audio_style: Optional[str] = Field("standard", example="standard", min_length=3, max_length=50)

class UserPreferenceCreate(UserPreferenceBase):
    pass

class UserPreferenceUpdate(UserPreferenceBase):
    pass

class UserPreferenceInDB(UserPreferenceBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True # Pydantic v2 (orm_mode for v1) 