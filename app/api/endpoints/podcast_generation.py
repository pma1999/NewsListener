import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import cast, TEXT, desc, func as sql_func
from typing import Any, Optional, Dict, List
from datetime import datetime, timedelta

from app.api import deps
from app.schemas import podcast_schemas
from app.services import news_processing_service, llm_service, podcast_service
from app.models.news_models import NewsDigest, NewsDigestStatus, PodcastEpisode
from app.models.user_models import User
from app.models.preference_models import UserPreference
from app.models.predefined_category_models import PredefinedCategory as PredefinedCategoryModel
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Helper function to generate request summary
def _generate_request_summary(original_info: Optional[Dict[str, Any]]) -> Optional[str]:
    if not original_info:
        return "General request"
    
    source_type = original_info.get("source_type")
    summary_parts = []

    if source_type == "specific_urls":
        urls = original_info.get("urls", [])
        summary_parts.append(f"From URLs: {len(urls)} specified ({', '.join(urls[:2])}{'...' if len(urls) > 2 else ''})")
    elif source_type == "predefined_category_resolved":
        category_id = original_info.get("predefined_category_id")
        # Potentially store category_name in original_info in the future for better summary
        summary_parts.append(f"From Predefined Category ID: {category_id}")
    elif source_type == "user_preferences":
        pref_id = original_info.get("user_preference_id")
        applied = original_info.get("applied_criteria", {})
        if not pref_id:
            summary_parts.append("Based on ad-hoc input (no stored preferences found)")
        else:
            summary_parts.append(f"Based on User Preferences (ID: {pref_id})")
        
        topics = applied.get("topics")
        keywords = applied.get("keywords")
        if topics: summary_parts.append(f"Topics: {', '.join(topics[:3])}{'...' if len(topics) > 3 else ''}")
        if keywords: summary_parts.append(f"Keywords: {', '.join(keywords[:3])}{'...' if len(keywords) > 3 else ''}")

    elif source_type == "direct_input":
        summary_parts.append("Ad-hoc request.")
        topics = original_info.get("topics")
        keywords = original_info.get("keywords")
        if topics: summary_parts.append(f"Topics: {', '.join(topics[:3])}{'...' if len(topics) > 3 else ''}")
        if keywords: summary_parts.append(f"Keywords: {', '.join(keywords[:3])}{'...' if len(keywords) > 3 else ''}")
    else:
        summary_parts.append("Criteria based request.")

    language = original_info.get("language")
    audio_style = original_info.get("audio_style")
    if language: summary_parts.append(f"Lang: {language}")
    if audio_style: summary_parts.append(f"Style: {audio_style}")
    
    return ", ".join(filter(None, summary_parts)) if summary_parts else "General podcast criteria"

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
    if request.specific_article_urls and str(request.specific_article_urls[0]).strip() != "": # Check if not just empty strings
        logger.info(f"User {current_user.id}: Using 'Specific Article URLs' mode.")
        generation_criteria["source_type"] = "specific_urls"
        generation_criteria["urls"] = [str(url) for url in request.specific_article_urls if str(url).strip()] # Ensure all URLs are stripped and non-empty
        
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
        
        generation_criteria["language"] = request.language
        generation_criteria["audio_style"] = request.audio_style
        generation_criteria["topics"] = request.request_topics if request.request_topics is not None else (category.topics or [])
        generation_criteria["keywords"] = request.request_keywords if request.request_keywords is not None else (category.keywords or [])
        category_rss_urls = [str(url_obj) for url_obj in category.rss_urls] if category.rss_urls else []
        generation_criteria["rss_urls"] = [str(url) for url in request.request_rss_urls] if request.request_rss_urls is not None else category_rss_urls
        generation_criteria["exclude_keywords"] = request.request_exclude_keywords if request.request_exclude_keywords is not None else (category.exclude_keywords or [])
        generation_criteria["exclude_source_domains"] = request.request_exclude_source_domains if request.request_exclude_source_domains is not None else (category.exclude_source_domains or [])
        
        generation_criteria["source_type"] = "direct_input" 

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
                cast(NewsDigest.original_articles_info, TEXT) == str(source_info_for_digest), # Cast DB JSON to TEXT and compare with stringified dict
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
                initial_status=str(cached_digest.status), # status is already a string
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

    # Try to get podcast_episode_id if it was created synchronously (not typical with background tasks)
    # However, the PodcastEpisode is typically created *within* the background task.
    # So, this might be None here.
    podcast_episode_id: Optional[int] = None
    if news_digest.podcast_episode:
        podcast_episode_id = news_digest.podcast_episode.id

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
        initial_status=str(news_digest.status), # status is already a string
        message="Podcast generation process started.", # Updated message for clarity
        podcast_episode_id=podcast_episode_id # May be None
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

    # Initialize PodcastEpisode specific fields to None
    podcast_episode_id: Optional[int] = None
    user_given_name: Optional[str] = None
    episode_language: Optional[str] = None
    episode_audio_style: Optional[str] = None
    episode_created_at_iso: Optional[str] = None
    episode_updated_at_iso: Optional[str] = None
    episode_expires_at_iso: Optional[str] = None
    audio_url: Optional[str] = None

    if news_digest.podcast_episode:
        episode = news_digest.podcast_episode
        podcast_episode_id = episode.id
        user_given_name = episode.user_given_name
        episode_language = episode.language
        episode_audio_style = episode.audio_style
        audio_url = episode.audio_url # Keep this for direct audio_url access
        if episode.created_at: episode_created_at_iso = episode.created_at.isoformat()
        if episode.updated_at: episode_updated_at_iso = episode.updated_at.isoformat()
        if episode.expires_at: episode_expires_at_iso = episode.expires_at.isoformat()
    
    script_preview: Optional[str] = None
    if news_digest.generated_script_text:
        preview_limit = 250 
        script_preview = (news_digest.generated_script_text[:preview_limit] + "...") if len(news_digest.generated_script_text) > preview_limit else news_digest.generated_script_text

    return podcast_schemas.PodcastEpisodeStatusResponse(
        news_digest_id=news_digest.id,
        status=str(news_digest.status),
        audio_url=audio_url, # This is the direct audio_url from podcast_episode
        script_preview=script_preview,
        error_message=news_digest.error_message,
        created_at=news_digest.created_at.isoformat(),
        updated_at=news_digest.updated_at.isoformat(),
        
        podcast_episode_id=podcast_episode_id,
        user_given_name=user_given_name,
        episode_language=episode_language,
        episode_audio_style=episode_audio_style,
        episode_created_at=episode_created_at_iso,
        episode_updated_at=episode_updated_at_iso,
        episode_expires_at=episode_expires_at_iso,
    )

@router.get("/my-podcasts", response_model=podcast_schemas.UserPodcastsListResponse)
async def list_my_podcasts(
    db: Session = Depends(deps.get_db_session),
    current_user: User = Depends(deps.get_current_active_user),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size")
) -> Any:
    """
    Retrieve a paginated list of the current user's completed podcasts.
    Only podcasts with generated audio and not yet expired (or all if not strictly filtering expired) are returned.
    """
    logger.info(f"User {current_user.id} fetching their podcasts, page={page}, size={size}")

    offset = (page - 1) * size

    # Query for NewsDigests with associated completed PodcastEpisodes for the current user
    query_base = db.query(NewsDigest, PodcastEpisode) \
        .join(PodcastEpisode, NewsDigest.id == PodcastEpisode.news_digest_id) \
        .filter(NewsDigest.user_id == current_user.id) \
        .filter(NewsDigest.status == NewsDigestStatus.COMPLETED) \
        .filter(PodcastEpisode.audio_url.isnot(None))
        # Optionally, filter out expired podcasts strictly at DB level:
        # .filter(PodcastEpisode.expires_at > datetime.utcnow())

    total_count = query_base.count()

    results = query_base.order_by(desc(NewsDigest.created_at)) \
                      .limit(size) \
                      .offset(offset) \
                      .all()

    user_podcasts: List[podcast_schemas.UserPodcastListItem] = []
    for news_digest, podcast_episode in results:
        # Filter for display if not done in DB query, or just pass through if already filtered
        if podcast_episode.expires_at and podcast_episode.expires_at < datetime.utcnow():
            # Simple skip for this example, could be handled in query too for efficiency
            # total_count would need adjustment if filtering here and not in query_base.count()
            pass # Or continue, if strict filtering is desired and not in main query

        user_podcasts.append(
            podcast_schemas.UserPodcastListItem(
                news_digest_id=news_digest.id,
                podcast_episode_id=podcast_episode.id,
                user_given_name=podcast_episode.user_given_name,
                audio_url=podcast_episode.audio_url,
                original_request_summary=_generate_request_summary(news_digest.original_articles_info),
                status=str(news_digest.status),
                digest_created_at=news_digest.created_at.isoformat(),
                episode_created_at=podcast_episode.created_at.isoformat(),
                episode_expires_at=podcast_episode.expires_at.isoformat() if podcast_episode.expires_at else None,
            )
        )
    
    return podcast_schemas.UserPodcastsListResponse(
        podcasts=user_podcasts,
        total=total_count, # This count is before Python-side expiration filtering, adjust if needed
        page=page,
        size=size
    )

@router.put("/episodes/{podcast_episode_id}/name", response_model=podcast_schemas.PodcastEpisodeInDB)
async def update_podcast_episode_name(
    podcast_episode_id: int,
    request: podcast_schemas.PodcastEpisodeUpdateNameRequest,
    db: Session = Depends(deps.get_db_session),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Update the user-given name of a specific podcast episode.
    """
    logger.info(f"User {current_user.id} attempting to rename podcast episode {podcast_episode_id} to '{request.user_given_name}'")

    episode = db.query(PodcastEpisode).filter(PodcastEpisode.id == podcast_episode_id).first()

    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Podcast episode not found")

    # Verify ownership: Check if the related NewsDigest belongs to the current user
    news_digest = db.query(NewsDigest).filter(NewsDigest.id == episode.news_digest_id).first()
    if not news_digest or (news_digest.user_id != current_user.id and not current_user.is_superuser):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this podcast episode")

    episode.user_given_name = request.user_given_name
    episode.updated_at = datetime.utcnow() # Manually trigger update for updated_at timestamp
    db.commit()
    db.refresh(episode)

    return episode 