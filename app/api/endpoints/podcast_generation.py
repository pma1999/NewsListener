import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import Any, Optional, Dict

from app.api import deps
from app.schemas import podcast_schemas
from app.services import news_processing_service, llm_service, podcast_service
from app.models.news_models import NewsDigest, NewsDigestStatus, PodcastEpisode
from app.models.user_models import User
from app.models.preference_models import UserPreference
from app.models.predefined_category_models import PredefinedCategory as PredefinedCategoryModel

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Background Task for Full Podcast Generation --- #
async def background_generate_full_podcast(
    db: Session,
    news_digest_id: int,
    user_id: int, 
    generation_criteria: Dict[str, Any],
    force_regenerate: bool,
    user_openai_api_key: Optional[str] = None,
    user_google_api_key: Optional[str] = None
):
    """
    The complete background task using consolidated generation criteria.
    """
    news_digest = db.query(NewsDigest).filter(NewsDigest.id == news_digest_id).first()
    if not news_digest:
        logger.error(f"[BG_TASK] NewsDigest {news_digest_id} not found at start of background task.")
        return

    try:
        logger.info(f"[BG_TASK] NewsDigest {news_digest_id}: Processing with criteria: {generation_criteria}")
        
        # 1. Get News Content
        news_processor = news_processing_service.NewsProcessingService()
        processed_news_content = await news_processor.get_content_for_news_digest(
            criteria=generation_criteria,
            user_id=user_id
        )

        if not processed_news_content or processed_news_content.strip().startswith("No news content") or processed_news_content.strip().startswith("This is placeholder news content") :
            logger.error(f"[BG_TASK] NewsDigest {news_digest_id}: News processing returned no or placeholder content. Content: {processed_news_content[:200]}")
            news_digest.status = NewsDigestStatus.FAILED
            news_digest.error_message = "Failed to process news content or no content found for criteria."
            if processed_news_content and len(processed_news_content) < 255 and (processed_news_content.strip().startswith("No news content") or processed_news_content.strip().startswith("This is placeholder news content")):
                 news_digest.error_message = processed_news_content.strip()
            db.commit()
            return
        
        logger.info(f"[BG_TASK] NewsDigest {news_digest_id}: News content processed. Length: {len(processed_news_content)}")

        news_digest.status = NewsDigestStatus.PENDING_AUDIO
        db.commit()

        language = generation_criteria.get("language", "en")
        audio_style = generation_criteria.get("audio_style", "standard")

        generated_script = await llm_service.generate_news_podcast_script(
            news_items_content=processed_news_content,
            language_iso_code=language,
            audio_style_key=audio_style,
            user_google_api_key=user_google_api_key
        )
        news_digest.generated_script_text = generated_script
        logger.info(f"[BG_TASK] NewsDigest {news_digest_id}: Script generated. Length: {len(generated_script)}")
        db.commit()

        audio_url, error_msg = await podcast_service.generate_podcast_audio_for_digest(
            db=db,
            news_digest_id=news_digest_id,
            language=language,
            audio_style=audio_style,
            force_regenerate=force_regenerate,
            user_openai_api_key=user_openai_api_key
        )

        if error_msg:
            logger.error(f"[BG_TASK] NewsDigest {news_digest_id}: Audio generation failed: {error_msg}")
        else:
            logger.info(f"[BG_TASK] NewsDigest {news_digest_id}: Audio generation successful. URL: {audio_url}")

    except Exception as e:
        logger.exception(f"[BG_TASK] NewsDigest {news_digest_id}: Unhandled exception: {e}")
        if news_digest:
            news_digest.status = NewsDigestStatus.FAILED
            news_digest.error_message = f"Background task failed: {str(e)[:200]}"
            db.commit()
    finally:
        pass

@router.post("/generate-podcast", 
              response_model=podcast_schemas.PodcastGenerationResponse, 
              status_code=status.HTTP_202_ACCEPTED)
async def generate_podcast_endpoint(
    *,
    db: Session = Depends(deps.get_db_session),
    request: podcast_schemas.PodcastGenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    logger.info(f"User {current_user.id} requested podcast generation with payload: {request.model_dump(exclude_none=True, exclude={'user_openai_api_key', 'user_google_api_key'})}")

    generation_criteria: Dict[str, Any] = {} 
    source_info_for_digest: Dict[str, Any] = {}

    # Mode 1: Specific Article URLs (Highest Priority)
    if request.specific_article_urls and request.specific_article_urls[0].strip() != "": # Check if not just empty strings
        logger.info(f"User {current_user.id}: Using 'Specific Article URLs' mode.")
        generation_criteria["source_type"] = "specific_urls"
        generation_criteria["urls"] = [str(url) for url in request.specific_article_urls if str(url).strip()]
        
        if not generation_criteria["urls"]:
             raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Specific article URLs provided but all were empty.")

        generation_criteria["language"] = request.language
        generation_criteria["audio_style"] = request.audio_style

        source_info_for_digest = {
            "source_type": "specific_urls",
            "urls": generation_criteria["urls"], # Use cleaned list
            "language": request.language,
            "audio_style": request.audio_style,
        }
    
    # Mode 2: Predefined Category
    elif request.predefined_category_id is not None:
        category = db.query(PredefinedCategoryModel).filter(
            PredefinedCategoryModel.id == request.predefined_category_id,
            PredefinedCategoryModel.is_active == True
        ).first()
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Predefined category ID {request.predefined_category_id} not found or not active.")
        
        logger.info(f"User {current_user.id}: Using 'Predefined Category' mode (ID: {category.id}, Name: '{category.name}').")
        
        # Base criteria from category, overridden by request fields.
        # Language & Audio Style: Request values are final. Frontend should pre-fill from category if user selected one.
        generation_criteria["language"] = request.language
        generation_criteria["audio_style"] = request.audio_style

        # List-based criteria:
        # If request field is explicitly provided (not None), use it (even if empty list, means user cleared it).
        # Otherwise, use the category's value (or an empty list if category's value is None/empty).
        generation_criteria["topics"] = request.request_topics if request.request_topics is not None else (category.topics or [])
        generation_criteria["keywords"] = request.request_keywords if request.request_keywords is not None else (category.keywords or [])
        # Ensure HttpUrl objects are converted to strings for RSS URLs from category
        category_rss_urls = [str(url_obj) for url_obj in category.rss_urls] if category.rss_urls else []
        generation_criteria["rss_urls"] = [str(url) for url in request.request_rss_urls] if request.request_rss_urls is not None else category_rss_urls
        
        generation_criteria["exclude_keywords"] = request.request_exclude_keywords if request.request_exclude_keywords is not None else (category.exclude_keywords or [])
        generation_criteria["exclude_source_domains"] = request.request_exclude_source_domains if request.request_exclude_source_domains is not None else (category.exclude_source_domains or [])
        
        generation_criteria["source_type"] = "predefined_category_resolved" 

        source_info_for_digest = {
            "source_type": "predefined_category_resolved",
            "predefined_category_id": category.id,
            "language": generation_criteria["language"],
            "audio_style": generation_criteria["audio_style"],
            "topics": generation_criteria["topics"],
            "keywords": generation_criteria["keywords"],
            "rss_urls": generation_criteria["rss_urls"],
            "exclude_keywords": generation_criteria["exclude_keywords"],
            "exclude_source_domains": generation_criteria["exclude_source_domains"],
        }

    # Mode 3: User Default Preferences
    elif request.use_user_default_preferences:
        logger.info(f"User {current_user.id}: Using 'User Default Preferences' mode.")
        user_prefs = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
        if not user_prefs:
            logger.info(f"User {current_user.id} has no preferences set up. Using request values or app defaults for this request.")
            # This mimics ad-hoc if prefs are missing, but with use_user_default_preferences=true.
            # The 'applied_criteria' in source_info_for_digest will reflect this lack of stored prefs.
            generation_criteria["source_type"] = "user_preferences" # Still mark as preference-based attempt
            generation_criteria["user_preference_id"] = None # No actual preference ID
            
            generation_criteria["language"] = request.language # Must be provided by request
            generation_criteria["audio_style"] = request.audio_style # Must be provided by request
            generation_criteria["topics"] = request.request_topics or []
            generation_criteria["keywords"] = request.request_keywords or []
            generation_criteria["rss_urls"] = [str(url) for url in request.request_rss_urls or []]
            generation_criteria["exclude_keywords"] = request.request_exclude_keywords or [] # Overrides for non-existent prefs still apply as direct input
            generation_criteria["exclude_source_domains"] = request.request_exclude_source_domains or []
            
            source_info_for_digest = {
                "source_type": "user_preferences",
                "user_preference_id": None, # Indicate no prefs found
                "applied_criteria": {
                    "language": generation_criteria["language"],
                    "audio_style": generation_criteria["audio_style"],
                    "topics": generation_criteria["topics"],
                    "keywords": generation_criteria["keywords"],
                    "rss_urls": generation_criteria["rss_urls"],
                    "exclude_keywords": generation_criteria["exclude_keywords"],
                    "exclude_source_domains": generation_criteria["exclude_source_domains"],
                }
            }
        else: # User has preferences
            generation_criteria["source_type"] = "user_preferences"
            generation_criteria["user_preference_id"] = user_prefs.id

            # Language & Audio Style: Request overrides preference, which overrides app default "en"/"standard"
            generation_criteria["language"] = request.language or user_prefs.default_language or "en"
            generation_criteria["audio_style"] = request.audio_style or user_prefs.default_audio_style or "standard"

            # List-based criteria: Request value (if not None) is an override. Otherwise, use preference.
            generation_criteria["topics"] = request.request_topics if request.request_topics is not None else (user_prefs.preferred_topics or [])
            generation_criteria["keywords"] = request.request_keywords if request.request_keywords is not None else (user_prefs.custom_keywords or [])
            
            pref_rss_urls = [str(url_obj) for url_obj in user_prefs.include_source_rss_urls] if user_prefs.include_source_rss_urls else []
            generation_criteria["rss_urls"] = [str(url) for url in request.request_rss_urls] if request.request_rss_urls is not None else pref_rss_urls

            generation_criteria["exclude_keywords"] = request.request_exclude_keywords if request.request_exclude_keywords is not None else (user_prefs.exclude_keywords or [])
            generation_criteria["exclude_source_domains"] = request.request_exclude_source_domains if request.request_exclude_source_domains is not None else (user_prefs.exclude_source_domains or [])
            
            source_info_for_digest = {
                "source_type": "user_preferences",
                "user_preference_id": user_prefs.id,
                "applied_criteria": { # Store the effectively applied criteria
                    "language": generation_criteria["language"],
                    "audio_style": generation_criteria["audio_style"],
                    "topics": generation_criteria["topics"],
                    "keywords": generation_criteria["keywords"],
                    "rss_urls": generation_criteria["rss_urls"],
                    "exclude_keywords": generation_criteria["exclude_keywords"],
                    "exclude_source_domains": generation_criteria["exclude_source_domains"],
                }
            }
    
    # Mode 4: Ad-hoc Criteria (no URLs, no category, use_user_default_preferences is false)
    else:
        logger.info(f"User {current_user.id}: Using 'Ad-hoc Criteria' mode.")
        generation_criteria["source_type"] = "direct_input"
        
        generation_criteria["language"] = request.language # Must be provided
        generation_criteria["audio_style"] = request.audio_style # Must be provided
        generation_criteria["topics"] = request.request_topics or []
        generation_criteria["keywords"] = request.request_keywords or []
        generation_criteria["rss_urls"] = [str(url) for url in request.request_rss_urls or []]
        
        # Exclusions are overrides to preferences. If not using prefs (pure ad-hoc), they are not applicable as overrides.
        # The news_processing_service might still accept them as direct filters if its API allows.
        # For now, let's send them if provided, news_processing_service can decide.
        generation_criteria["exclude_keywords"] = request.request_exclude_keywords or []
        generation_criteria["exclude_source_domains"] = request.request_exclude_source_domains or []

        source_info_for_digest = {
            "source_type": "direct_input",
            "language": request.language,
            "audio_style": request.audio_style,
            "topics": generation_criteria["topics"],
            "keywords": generation_criteria["keywords"],
            "rss_urls": generation_criteria["rss_urls"],
            "exclude_keywords": generation_criteria["exclude_keywords"],
            "exclude_source_domains": generation_criteria["exclude_source_domains"],
        }

    # Final check and fallback for language/audio_style in generation_criteria
    # This should ideally be redundant if all modes above correctly set these.
    if not generation_criteria.get("language"):
        logger.warning("Language not set in generation_criteria, falling back to 'en'. This indicates a potential logic gap.")
        generation_criteria["language"] = "en"
    if not generation_criteria.get("audio_style"):
        logger.warning("Audio style not set in generation_criteria, falling back to 'standard'. This indicates a potential logic gap.")
        generation_criteria["audio_style"] = "standard"
    
    effective_language = generation_criteria["language"]
    effective_audio_style = generation_criteria["audio_style"]

    logger.info(f"User {current_user.id}: Final generation criteria for NewsProcessingService: {generation_criteria}")
    logger.info(f"User {current_user.id}: Final source_info_for_digest for caching: {source_info_for_digest}")

    # --- Cache Check Logic ---
    if not request.force_regenerate:
        logger.info(f"User {current_user.id}: Checking cache for podcast. Effective lang={effective_language}, style={effective_audio_style}, source_info_keys={list(source_info_for_digest.keys()) if source_info_for_digest else 'N/A'}")
        
        cached_digest = db.query(NewsDigest) \
            .join(NewsDigest.podcast_episode) \
            .filter(
                NewsDigest.user_id == current_user.id,
                NewsDigest.original_articles_info == source_info_for_digest, # Compares JSON content
                NewsDigest.status == NewsDigestStatus.COMPLETED,
                PodcastEpisode.language == effective_language,
                PodcastEpisode.audio_style == effective_audio_style,
                PodcastEpisode.audio_url.isnot(None)
            ) \
            .order_by(NewsDigest.created_at.desc()) \
            .first()

        if cached_digest and cached_digest.podcast_episode:
            logger.info(f"User {current_user.id}: Cache hit. Reusing NewsDigest ID {cached_digest.id} (Episode ID {cached_digest.podcast_episode.id})")
            return podcast_schemas.PodcastGenerationResponse(
                news_digest_id=cached_digest.id,
                initial_status=str(cached_digest.status.value), # Ensure enum is stringified
                message="Podcast retrieved from cache. Audio is available."
            )
        else:
            logger.info(f"User {current_user.id}: No suitable completed podcast found in cache. Proceeding with new generation.")
    else:
        logger.info(f"User {current_user.id}: force_regenerate is True. Skipping cache check.")
    # --- End Cache Check Logic ---

    news_digest = NewsDigest(
        user_id=current_user.id,
        original_articles_info=source_info_for_digest, # This is crucial for caching
        status=NewsDigestStatus.PENDING_SCRIPT
    )
    db.add(news_digest)
    db.commit()
    db.refresh(news_digest)
    logger.info(f"Created NewsDigest record ID: {news_digest.id} for user {current_user.id}")

    background_tasks.add_task(
        background_generate_full_podcast,
        db=db,
        news_digest_id=news_digest.id,
        user_id=current_user.id,
        generation_criteria=generation_criteria, # Pass the fully resolved criteria
        force_regenerate=request.force_regenerate,
        user_openai_api_key=request.user_openai_api_key,
        user_google_api_key=request.user_google_api_key
    )

    return podcast_schemas.PodcastGenerationResponse(
        news_digest_id=news_digest.id,
        initial_status=str(news_digest.status.value), # Ensure enum is stringified
        message="Podcast generation process started." # Updated message for clarity
    )

@router.get("/podcast-status/{news_digest_id}", response_model=podcast_schemas.PodcastEpisodeStatusResponse)
async def get_podcast_status_endpoint(
    news_digest_id: int,
    db: Session = Depends(deps.get_db_session),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    logger.info(f"User {current_user.id} fetching status for NewsDigest ID: {news_digest_id}")
    news_digest = db.query(NewsDigest).filter(NewsDigest.id == news_digest_id).first()

    if not news_digest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NewsDigest not found")

    if news_digest.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this digest status")

    audio_url: Optional[str] = None
    script_preview: Optional[str] = None

    if news_digest.podcast_episode:
        audio_url = news_digest.podcast_episode.audio_url
    
    if news_digest.generated_script_text:
        # Truncate script preview if it's very long
        preview_limit = 250 
        script_preview = (news_digest.generated_script_text[:preview_limit] + "...") if len(news_digest.generated_script_text) > preview_limit else news_digest.generated_script_text

    return podcast_schemas.PodcastEpisodeStatusResponse(
        news_digest_id=news_digest.id,
        status=str(news_digest.status.value), # Explicitly convert enum to string value
        audio_url=audio_url,
        script_preview=script_preview,
        error_message=news_digest.error_message,
        created_at=news_digest.created_at.isoformat(),
        updated_at=news_digest.updated_at.isoformat(),
    ) 