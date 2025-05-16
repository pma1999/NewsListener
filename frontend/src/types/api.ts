/* eslint-disable @typescript-eslint/no-explicit-any */
// Types mirroring the backend Pydantic schemas

// From app/schemas/predefined_category_schemas.py
export interface PredefinedCategory {
  id: number;
  name: string;
  description?: string | null;
  rss_urls?: string[] | null; // Pydantic HttpUrl becomes string for frontend
  topics?: string[] | null;
  keywords?: string[] | null;
  exclude_keywords?: string[] | null;
  exclude_source_domains?: string[] | null;
  language?: string | null;
  audio_style?: string | null;
  is_active: boolean;
  created_at: string; // Assuming ISO datetime string from backend
  updated_at?: string | null; // Assuming ISO datetime string from backend
}

// From app/schemas/preference_schemas.py
export interface UserPreference {
  id: number;
  user_id: number;
  preferred_topics: string[] | null;
  custom_keywords: string[] | null;
  include_source_rss_urls: string[] | null; // Assuming HttpUrl becomes string
  exclude_keywords: string[] | null;
  exclude_source_domains: string[] | null;
  default_language: string | null;
  default_audio_style: string | null;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

export interface UserPreferenceUpdate {
  preferred_topics?: string[] | null;
  custom_keywords?: string[] | null;
  include_source_rss_urls?: string[] | null;
  exclude_keywords?: string[] | null;
  exclude_source_domains?: string[] | null;
  default_language?: string | null;
  default_audio_style?: string | null;
}

// From app/schemas/podcast_schemas.py
export interface PodcastGenerationRequest {
  predefined_category_id?: number | null;
  specific_article_urls?: string[] | null; // Assuming HttpUrl becomes string
  use_user_default_preferences: boolean;
  request_topics?: string[] | null;
  request_keywords?: string[] | null;
  request_rss_urls?: string[] | null; // Assuming HttpUrl becomes string
  request_exclude_keywords?: string[] | null;
  request_exclude_source_domains?: string[] | null;
  language: string;
  audio_style: string;
  force_regenerate: boolean;
  user_openai_api_key?: string | null;
  user_google_api_key?: string | null;
}

export interface PodcastGenerationResponse {
  news_digest_id: number;
  initial_status: string;
  message: string;
}

export enum NewsDigestStatus {
  PENDING_SCRIPT = "PENDING_SCRIPT",
  PENDING_AUDIO = "PENDING_AUDIO",
  PROCESSING_AUDIO = "PROCESSING_AUDIO",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface PodcastEpisodeStatusResponse {
  news_digest_id: number;
  status: NewsDigestStatus;
  audio_url?: string | null;
  script_preview?: string | null;
  error_message?: string | null;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

// Add other necessary types as identified, e.g., for User if auth is expanded. 