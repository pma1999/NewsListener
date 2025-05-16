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
    logger.info(f"User {current_user.id} requested podcast generation: {request.model_dump(exclude_none=True)}")

    generation_criteria: Dict[str, Any] = {
        "language": request.language or "en",
        "audio_style": request.audio_style or "standard",
    }
    source_info_for_digest: Dict[str, Any] = {}

    if request.specific_article_urls:
        generation_criteria["source_type"] = "specific_urls"
        generation_criteria["urls"] = [str(url) for url in request.specific_article_urls]
        source_info_for_digest = {
            "source_type": "specific_urls",
            "urls": [str(url) for url in request.specific_article_urls],
            "language": request.language,
            "audio_style": request.audio_style,
        }
    elif request.use_user_default_preferences:
        user_prefs = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
        if not user_prefs:
            logger.info(f"User {current_user.id} has no preferences set up. Creating default preferences for this request.")
            user_prefs = UserPreference(user_id=current_user.id)
            db.add(user_prefs)
            db.flush()
            source_info_for_digest = {
                "source_type": "user_preferences",
                "user_preference_id": user_prefs.id,
                "applied_criteria": { 
                    "topics": request.request_topics if request.request_topics is not None else user_prefs.preferred_topics,
                    "keywords": request.request_keywords if request.request_keywords is not None else user_prefs.custom_keywords,
                    "rss_urls": [str(url) for url in request.request_rss_urls or []],
                    "language": request.language or user_prefs.default_language or "en",
                    "audio_style": request.audio_style or user_prefs.default_audio_style or "standard",
                }
            }
        else:
            generation_criteria["source_type"] = "user_preferences"
            generation_criteria["user_preference_id"] = user_prefs.id

            # Topics: Use request_topics if provided, otherwise use user_prefs.preferred_topics
            if request.request_topics is not None:
                generation_criteria["topics"] = request.request_topics
            elif user_prefs.preferred_topics:
                generation_criteria["topics"] = user_prefs.preferred_topics
            else:
                generation_criteria["topics"] = []

            # Keywords: Use request_keywords if provided, otherwise use user_prefs.custom_keywords
            if request.request_keywords is not None:
                generation_criteria["keywords"] = request.request_keywords
            elif user_prefs.custom_keywords:
                generation_criteria["keywords"] = user_prefs.custom_keywords
            else:
                generation_criteria["keywords"] = []

            # RSS URLs: Use request_rss_urls if provided, otherwise use user_prefs.include_source_rss_urls
            # This changes from merging to replacing if request_rss_urls is present.
            if request.request_rss_urls is not None:
                generation_criteria["rss_urls"] = [str(url) for url in request.request_rss_urls]
            elif user_prefs.include_source_rss_urls:
                generation_criteria["rss_urls"] = [str(url) for url in user_prefs.include_source_rss_urls]
            else:
                generation_criteria["rss_urls"] = []

            # Language & Audio Style (existing logic is fine: request > preference > default)
            generation_criteria["language"] = request.language or user_prefs.default_language or "en"
            generation_criteria["audio_style"] = request.audio_style or user_prefs.default_audio_style or "standard"

            # Exclude Keywords: Use request_exclude_keywords if provided, otherwise use user_prefs.exclude_keywords
            if request.request_exclude_keywords is not None:
                generation_criteria["exclude_keywords"] = request.request_exclude_keywords
            elif user_prefs.exclude_keywords:
                generation_criteria["exclude_keywords"] = user_prefs.exclude_keywords
            else:
                generation_criteria["exclude_keywords"] = []

            # Exclude Source Domains: Use request_exclude_source_domains if provided, otherwise use user_prefs.exclude_source_domains
            if request.request_exclude_source_domains is not None:
                generation_criteria["exclude_source_domains"] = request.request_exclude_source_domains
            elif user_prefs.exclude_source_domains:
                generation_criteria["exclude_source_domains"] = user_prefs.exclude_source_domains
            else:
                generation_criteria["exclude_source_domains"] = []
                
            source_info_for_digest = {
                "source_type": "user_preferences",
                "user_preference_id": user_prefs.id,
                "applied_criteria": { 
                    "topics": generation_criteria.get("topics"),
                    "keywords": generation_criteria.get("keywords"),
                    "rss_urls": generation_criteria.get("rss_urls"),
                    "language": generation_criteria["language"],
                    "audio_style": generation_criteria["audio_style"],
                }
            }
    else:
        generation_criteria["source_type"] = "direct_input"
        generation_criteria["topics"] = request.request_topics
        generation_criteria["keywords"] = request.request_keywords
        generation_criteria["rss_urls"] = [str(url) for url in request.request_rss_urls or []]
        source_info_for_digest = {
            "source_type": "direct_input",
            "criteria": {
                "topics": request.request_topics,
                "keywords": request.request_keywords,
                "rss_urls": [str(url) for url in request.request_rss_urls or []],
                "language": request.language,
                "audio_style": request.audio_style,
            }
        }

    # Ensure language and audio_style are finalized in generation_criteria for cache lookup
    if "language" not in generation_criteria or not generation_criteria["language"]:
        generation_criteria["language"] = request.language or "en"
    if "audio_style" not in generation_criteria or not generation_criteria["audio_style"]:
        generation_criteria["audio_style"] = request.audio_style or "standard"
    
    effective_language = generation_criteria["language"]
    effective_audio_style = generation_criteria["audio_style"]

    # --- Cache Check Logic ---
    if not request.force_regenerate:
        logger.info(f"User {current_user.id}: Checking cache for podcast. Criteria: lang={effective_language}, style={effective_audio_style}, source_info_keys={list(source_info_for_digest.keys()) if source_info_for_digest else 'N/A'}")
        
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
                initial_status=cached_digest.status, # This will be NewsDigestStatus.COMPLETED
                message="Podcast retrieved from cache. Audio is available."
            )
        else:
            logger.info(f"User {current_user.id}: No suitable completed podcast found in cache. Proceeding with new generation.")
    else:
        logger.info(f"User {current_user.id}: force_regenerate is True. Skipping cache check.")
    # --- End Cache Check Logic ---

    news_digest = NewsDigest(
        user_id=current_user.id,
        original_articles_info=source_info_for_digest,
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
        generation_criteria=generation_criteria,
        force_regenerate=request.force_regenerate,
        user_openai_api_key=request.user_openai_api_key,
        user_google_api_key=request.user_google_api_key
    )

    return podcast_schemas.PodcastGenerationResponse(
        news_digest_id=news_digest.id,
        initial_status=news_digest.status,
        message="Podcast generation process with custom preferences started."
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
        script_preview = news_digest.generated_script_text[:200] + "..."

    return podcast_schemas.PodcastEpisodeStatusResponse(
        news_digest_id=news_digest.id,
        status=news_digest.status,
        audio_url=audio_url,
        script_preview=script_preview,
        error_message=news_digest.error_message,
        created_at=news_digest.created_at.isoformat(),
        updated_at=news_digest.updated_at.isoformat(),
    ) 