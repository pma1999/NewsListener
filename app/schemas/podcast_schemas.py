from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional, Dict, Any
from app.models.news_models import NewsDigestStatus # For status enum
from datetime import datetime # Added for default factory

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
    podcast_episode_id: Optional[int] = None # Include episode ID if created synchronously or for immediate naming

class PodcastEpisodeStatusResponse(BaseModel):
    news_digest_id: int
    status: str # From NewsDigest
    audio_url: Optional[str] = None # Reverted to str
    script_preview: Optional[str] = None # First few lines of the script
    error_message: Optional[str] = None # From NewsDigest
    created_at: datetime # NewsDigest created_at
    updated_at: datetime # NewsDigest updated_at

    # PodcastEpisode specific fields
    podcast_episode_id: Optional[int] = None
    user_given_name: Optional[str] = None
    episode_language: Optional[str] = None # To distinguish from request language if needed
    episode_audio_style: Optional[str] = None # To distinguish from request style if needed
    episode_created_at: Optional[datetime] = None # PodcastEpisode created_at
    episode_updated_at: Optional[datetime] = None # PodcastEpisode updated_at
    episode_expires_at: Optional[datetime] = None # PodcastEpisode expires_at


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
    created_at: datetime
    updated_at: datetime
    generated_script_text: Optional[str] = None
    status: str
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

class PodcastEpisodeBase(BaseModel):
    language: str
    audio_style: Optional[str] = None
    user_given_name: Optional[str] = Field(None, max_length=255)

class PodcastEpisodeCreate(PodcastEpisodeBase):
    news_digest_id: int
    # expires_at will be set by service

class PodcastEpisodeInDB(PodcastEpisodeBase):
    id: int
    news_digest_id: int
    audio_url: Optional[str] = None # Reverted to str
    file_path: Optional[str] = None
    duration_seconds: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- New Schemas for User Podcast Listing and Renaming ---
class PodcastEpisodeUpdateNameRequest(BaseModel):
    user_given_name: str = Field(..., min_length=1, max_length=255, description="The new user-defined name for the podcast episode.")

class UserPodcastListItem(BaseModel):
    news_digest_id: int
    podcast_episode_id: int
    user_given_name: Optional[str] = None
    audio_url: Optional[str] = None # Reverted to str
    original_request_summary: Optional[str] = Field(None, description="A brief summary of the original podcast generation request criteria.")
    status: str # NewsDigest status
    digest_created_at: datetime
    episode_created_at: datetime
    episode_expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserPodcastsListResponse(BaseModel):
    podcasts: List[UserPodcastListItem]
    total: int
    page: int
    size: int
    # total_pages: int # Helper, can be calculated total / size 