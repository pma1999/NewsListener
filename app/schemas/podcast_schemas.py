from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional, Dict, Any
from app.models.news_models import NewsDigestStatus # For status enum

class PodcastGenerationRequest(BaseModel):
    predefined_category_id: Optional[int] = Field(None, title="Predefined Category ID", description="ID of a predefined category to use as a base. If provided, 'use_user_default_preferences' is ignored for sourcing base criteria, and specific request_* fields act as overrides to the category's settings.")
    specific_article_urls: Optional[List[HttpUrl]] = Field(None, title="Specific Article URLs", description="List of specific article URLs to generate podcast from. Overrides other preferences if provided.")

    use_user_default_preferences: bool = Field(True, title="Use Stored Preferences", description="If true (and specific_article_urls and predefined_category_id are not provided), use the authenticated user's stored preferences.")

    # Overrides for user's stored preferences OR direct input if use_user_default_preferences = False
    request_topics: Optional[List[str]] = Field(None, title="Request Topics", description="Topics for this specific request.")
    request_keywords: Optional[List[str]] = Field(None, title="Request Keywords", description="Keywords for this specific request.")
    request_rss_urls: Optional[List[HttpUrl]] = Field(None, title="Request RSS URLs", description="RSS feed URLs for this specific request.")
    request_exclude_keywords: Optional[List[str]] = Field(None, title="Request Exclude Keywords", description="Keywords to exclude for this specific request. Overrides user's default exclude_keywords if provided when use_user_default_preferences is true.")
    request_exclude_source_domains: Optional[List[str]] = Field(None, title="Request Exclude Source Domains", description="Source domains to exclude for this specific request. Overrides user's default exclude_source_domains if provided when use_user_default_preferences is true.")

    language: str = Field("en", title="Language", description="Target language for the podcast (ISO 639-1 code). Falls back to user's default if not provided and using preferences.")
    audio_style: str = Field("standard", title="Audio Style", description="Desired audio style. Falls back to user's default if not provided and using preferences.")

    force_regenerate: bool = Field(False, title="Force Regenerate", description="If true, regenerates the podcast even if a cached version exists.")

    # User-provided API keys (optional)
    user_openai_api_key: Optional[str] = Field(None, title="User OpenAI API Key", description="Optional OpenAI API key provided by the user for this request. Will not be stored.", exclude=True) # exclude=True to prevent it from being returned in responses if the model is reused
    user_google_api_key: Optional[str] = Field(None, title="User Google API Key", description="Optional Google API key provided by the user for this request. Will not be stored.", exclude=True)

class PodcastGenerationResponse(BaseModel):
    news_digest_id: int
    initial_status: str
    message: str

class PodcastEpisodeStatusResponse(BaseModel):
    news_digest_id: int
    status: str
    audio_url: Optional[str] = None
    script_preview: Optional[str] = None # First few lines of the script
    error_message: Optional[str] = None
    created_at: str # Should be datetime, but often str in responses
    updated_at: str # Should be datetime, but often str in responses

class NewsDigestBase(BaseModel):
    original_articles_info: Optional[Dict[str, Any]] = None

class NewsDigestCreate(NewsDigestBase):
    user_id: int

class NewsDigestUpdate(BaseModel):
    generated_script_text: Optional[str] = None
    status: Optional[str] = None
    error_message: Optional[str] = None

class NewsDigestInDB(NewsDigestBase):
    id: int
    user_id: int
    created_at: str # Consistent with PodcastEpisodeStatusResponse
    updated_at: str # Consistent with PodcastEpisodeStatusResponse
    generated_script_text: Optional[str] = None
    status: str
    error_message: Optional[str] = None

    class Config:
        from_attributes = True # Pydantic V2

class PodcastEpisodeBase(BaseModel):
    language: str
    audio_style: Optional[str] = None

class PodcastEpisodeCreate(PodcastEpisodeBase):
    news_digest_id: int

class PodcastEpisodeInDB(PodcastEpisodeBase):
    id: int
    news_digest_id: int
    audio_url: Optional[str] = None
    file_path: Optional[str] = None
    duration_seconds: Optional[int] = None
    created_at: str # Consistent

    class Config:
        from_attributes = True # Pydantic V2 