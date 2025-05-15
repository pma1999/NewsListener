import asyncio
import logging
import os
import uuid
import tempfile
import shutil # For robust temp file removal if needed, though os.remove is usually fine.
from typing import Optional, List, Tuple
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from openai import AsyncOpenAI, APIError
from pydub import AudioSegment
from langsmith.wrappers import wrap_openai # Added for LangSmith tracing

from app.core.config import settings
from app.models.news_models import NewsDigest, PodcastEpisode, NewsDigestStatus
from app.services.key_provider import OpenAIKeyProvider
# Import TTS instruction components and style configs from prompts.py
from app.core.prompts import (
    TTS_PERSONA_NEWS,
    Tts_tone_news_standard,
    Tts_pacing_news_standard,
    Tts_intonation_news_standard,
    Tts_accent_map_news,
    NEWS_AUDIO_STYLE_CONFIG
)

logger = logging.getLogger(__name__)

# --- Helper Function: Split Script (largely from your audio_service.py) ---
def _split_script(script: str, limit: int) -> List[str]:
    chunks = []
    paragraphs = [p.strip() for p in script.split('\n\n') if p.strip()]
    for paragraph in paragraphs:
        if len(paragraph) <= limit:
            if paragraph: chunks.append(paragraph)
        else:
            current_pos = 0
            while current_pos < len(paragraph):
                end_pos = current_pos + limit
                if end_pos >= len(paragraph):
                    chunk = paragraph[current_pos:]
                    if chunk.strip(): chunks.append(chunk.strip())
                    break
                else:
                    split_point = -1
                    for char in reversed(['.', '!', '?', '\n']):
                        found = paragraph.rfind(char, current_pos, end_pos)
                        if found != -1:
                            split_point = found + 1
                            break
                    if split_point == -1:
                        found = paragraph.rfind(' ', current_pos, end_pos)
                        if found != -1: split_point = found + 1
                        else: split_point = end_pos
                    chunk = paragraph[current_pos:split_point]
                    if chunk.strip(): chunks.append(chunk.strip())
                    current_pos = split_point
                    while current_pos < len(paragraph) and paragraph[current_pos].isspace():
                        current_pos += 1
    return chunks

# --- Helper Function: Generate TTS Chunk (largely from your audio_service.py) ---
async def _generate_tts_chunk(
    async_client: AsyncOpenAI,
    chunk_text: str,
    instruction_text: str,
    output_path: str,
    tts_model: str,
    tts_voice: str
):
    try:
        response = await async_client.audio.speech.create(
            model=tts_model,
            voice=tts_voice,
            input=chunk_text,
            instructions=instruction_text,
            response_format="mp3"
        )
        await asyncio.to_thread(response.stream_to_file, output_path)
        logger.debug(f"Successfully generated TTS chunk: {output_path}")
    except APIError as e:
        logger.error(f"OpenAI API error generating chunk for {output_path}: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating chunk {output_path}: {e}")
        raise

# --- Main Podcast Audio Generation Service Function ---
async def generate_podcast_audio_for_digest(
    db: Session,
    news_digest_id: int,
    language: str,
    audio_style: str,
    force_regenerate: bool = False
) -> Tuple[Optional[str], Optional[str]]: # Returns (audio_url, error_message)
    """
    Generates audio for a specific news digest using its pre-generated script.
    Handles TTS, chunking, concatenation, and database updates.

    Args:
        db: SQLAlchemy Session.
        news_digest_id: ID of the NewsDigest to process.
        language: ISO language code (e.g., 'en', 'es').
        audio_style: Key for the desired audio style.
        force_regenerate: If True, generates audio even if a cached version exists.

    Returns:
        A tuple (audio_url, error_message). audio_url is the public URL if successful,
        error_message contains details if generation failed.
    """
    news_digest = db.query(NewsDigest).filter(NewsDigest.id == news_digest_id).first()
    if not news_digest:
        logger.error(f"NewsDigest with id {news_digest_id} not found.")
        return None, f"NewsDigest with id {news_digest_id} not found."

    if not news_digest.generated_script_text:
        logger.error(f"NewsDigest {news_digest_id} has no generated script text.")
        news_digest.status = NewsDigestStatus.FAILED
        news_digest.error_message = "Script text was missing for audio generation."
        db.commit()
        return None, "Script text missing."

    audio_script = news_digest.generated_script_text

    # --- Check Cache (PodcastEpisode) ---
    if not force_regenerate:
        existing_episode = db.query(PodcastEpisode).filter(
            PodcastEpisode.news_digest_id == news_digest_id,
            PodcastEpisode.language == language,
            PodcastEpisode.audio_style == audio_style
        ).first()
        if existing_episode and existing_episode.audio_url:
            logger.info(f"Found cached audio URL for NewsDigest {news_digest_id} (lang: {language}, style: {audio_style}): {existing_episode.audio_url}")
            news_digest.status = NewsDigestStatus.COMPLETED # Ensure status is correct
            db.commit()
            return existing_episode.audio_url, None
        logger.info(f"No suitable cached audio found for NewsDigest {news_digest_id}. Proceeding to generation.")
    elif force_regenerate:
        logger.info(f"Force_regenerate=True. Skipping cache check for NewsDigest {news_digest_id}.")

    # --- Update NewsDigest status to PROCESSING_AUDIO ---
    news_digest.status = NewsDigestStatus.PROCESSING_AUDIO
    news_digest.error_message = None # Clear previous errors
    db.commit()

    # --- Key and TTS Configuration ---
    try:
        key_provider = OpenAIKeyProvider()
        api_key = await key_provider.get_key()
    except ValueError as e:
        logger.error(f"Failed to get OpenAI API key: {e}")
        news_digest.status = NewsDigestStatus.FAILED
        news_digest.error_message = f"OpenAI API key error: {e}"
        db.commit()
        return None, "OpenAI API key configuration error."

    async_openai_client = AsyncOpenAI(api_key=api_key)
    # Wrap the OpenAI client for LangSmith tracing if tracing is enabled
    if os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true" or os.getenv("LANGSMITH_TRACING", "false").lower() == "true":
        logger.info("LangSmith tracing enabled for OpenAI client in podcast_service.")
        try:
            async_openai_client = wrap_openai(async_openai_client)
            logger.info("AsyncOpenAI client wrapped successfully with LangSmith.")
        except Exception as e:
            logger.error(f"Failed to wrap AsyncOpenAI client with LangSmith: {e}", exc_info=True)
            # Optionally, decide if you want to proceed without tracing or raise an error
            # For now, we'll log and proceed with the unwrapped client if wrapping fails.
    else:
        logger.info("LangSmith tracing not enabled for OpenAI client in podcast_service.")

    tts_model = settings.OPENAI_TTS_MODEL
    tts_voice = settings.OPENAI_TTS_VOICE

    # --- Construct Rich TTS Instruction for News Anchor ---
    selected_style_config = NEWS_AUDIO_STYLE_CONFIG.get(audio_style, NEWS_AUDIO_STYLE_CONFIG["standard"])
    tts_instruction_suffix = selected_style_config["tts_instruction_suffix"]
    target_accent = Tts_accent_map_news.get(language, Tts_accent_map_news.get("en", "Standard accent for the language"))

    instruction_text = (
        f"Base Persona: Act as a {TTS_PERSONA_NEWS}. "
        f"Base Tone/Pacing: Maintain a {Tts_tone_news_standard} tone. Speak clearly at a {Tts_pacing_news_standard}. Use {Tts_intonation_news_standard}. "
        f"Language/Accent: Ensure accurate pronunciation using a {target_accent} in the {language} language. "
        f"Specific Style Guidance for this segment: {tts_instruction_suffix}"
    )
    logger.info(f"Using Rich TTS instruction for NewsDigest {news_digest_id}: {instruction_text}")

    permanent_audio_disk_path = None
    temp_files = []
    final_audio_url = None

    try:
        if len(audio_script) <= settings.TTS_CHUNK_CHAR_LIMIT:
            logger.info(f"Script for NewsDigest {news_digest_id} is short, generating single audio file.")
            unique_filename = f"news_podcast_{news_digest_id}_{uuid.uuid4()}.mp3"
            permanent_audio_disk_path = os.path.join(settings.STATIC_AUDIO_DIR, unique_filename)

            response = await async_openai_client.audio.speech.create(
                model=tts_model,
                voice=tts_voice,
                input=audio_script,
                instructions=instruction_text,
                response_format="mp3"
            )
            await asyncio.to_thread(response.stream_to_file, permanent_audio_disk_path)
            final_audio_url = f"/static/audio/{unique_filename}"
            logger.info(f"Single TTS audio for NewsDigest {news_digest_id} generated: {permanent_audio_disk_path}")
        else:
            logger.info(f"Script for NewsDigest {news_digest_id} (len: {len(audio_script)}) > limit. Splitting into chunks.")
            script_chunks = _split_script(audio_script, settings.TTS_CHUNK_CHAR_LIMIT)
            logger.info(f"Split script into {len(script_chunks)} chunks for NewsDigest {news_digest_id}.")

            tasks = []
            # Create temp files in the static audio directory for simplicity in this setup
            # Consider a dedicated temp directory if STATIC_AUDIO_DIR is network-mounted or has specific perms.
            for i, chunk_text in enumerate(script_chunks):
                fd, temp_path = tempfile.mkstemp(suffix=".mp3", dir=settings.STATIC_AUDIO_DIR)
                os.close(fd)
                temp_files.append(temp_path)
                tasks.append(_generate_tts_chunk(async_openai_client, chunk_text, instruction_text, temp_path, tts_model, tts_voice))
            
            logger.info(f"Generating TTS for {len(tasks)} chunks concurrently for NewsDigest {news_digest_id}...")
            await asyncio.gather(*tasks)
            logger.info(f"Finished generating all TTS chunks for NewsDigest {news_digest_id}.")

            if not temp_files or not all(os.path.exists(p) for p in temp_files):
                 raise ValueError("One or more temporary audio chunk files were not generated successfully.")

            logger.info(f"Concatenating {len(temp_files)} audio chunks for NewsDigest {news_digest_id}...")
            combined_audio = AudioSegment.empty()
            pause_segment = AudioSegment.silent(duration=settings.TTS_CHUNK_PAUSE_MS)
            first_segment = True
            for path in temp_files:
                try:
                    segment = await asyncio.to_thread(AudioSegment.from_mp3, path)
                    if first_segment:
                        combined_audio = segment
                        first_segment = False
                    else:
                        combined_audio += pause_segment + segment
                except Exception as e:
                    logger.error(f"Error loading/concatenating chunk {path} for NewsDigest {news_digest_id}: {e}")
                    raise
            
            unique_filename = f"news_podcast_{news_digest_id}_{uuid.uuid4()}.mp3"
            permanent_audio_disk_path = os.path.join(settings.STATIC_AUDIO_DIR, unique_filename)
            logger.info(f"Exporting concatenated audio for NewsDigest {news_digest_id} to {permanent_audio_disk_path}...")
            await asyncio.to_thread(combined_audio.export, permanent_audio_disk_path, format="mp3")
            final_audio_url = f"/static/audio/{unique_filename}"
            logger.info(f"Concatenated TTS audio for NewsDigest {news_digest_id} generated: {permanent_audio_disk_path}")

        # --- Successfully generated audio, update database ---
        if final_audio_url and permanent_audio_disk_path:
            # Delete old episode if force_regenerate was true and an old one existed
            if force_regenerate:
                old_episode_to_delete = db.query(PodcastEpisode).filter(
                    PodcastEpisode.news_digest_id == news_digest_id,
                    PodcastEpisode.language == language,
                    PodcastEpisode.audio_style == audio_style
                ).first()
                if old_episode_to_delete:
                    if old_episode_to_delete.file_path and os.path.exists(old_episode_to_delete.file_path):
                        try: os.remove(old_episode_to_delete.file_path)
                        except OSError as e: logger.error(f"Error deleting old audio file {old_episode_to_delete.file_path}: {e}")
                    db.delete(old_episode_to_delete)
                    logger.info(f"Deleted old podcast episode {old_episode_to_delete.id} due to force_regenerate.")
            
            # Create or update PodcastEpisode record
            episode = db.query(PodcastEpisode).filter_by(news_digest_id=news_digest_id).first()
            if episode:
                episode.audio_url = final_audio_url
                episode.file_path = permanent_audio_disk_path
                episode.language = language
                episode.audio_style = audio_style
                episode.created_at = datetime.utcnow() # Update timestamp
            else:
                episode = PodcastEpisode(
                    news_digest_id=news_digest_id,
                    audio_url=final_audio_url,
                    file_path=permanent_audio_disk_path,
                    language=language,
                    audio_style=audio_style
                )
                db.add(episode)
            
            news_digest.status = NewsDigestStatus.COMPLETED
            news_digest.error_message = None
            db.commit()
            logger.info(f"PodcastEpisode for NewsDigest {news_digest_id} saved to DB. Audio URL: {final_audio_url}")
            return final_audio_url, None
        else:
            # This case should ideally not be reached if logic above is correct
            raise ValueError("Audio generation completed but final_audio_url or permanent_audio_disk_path was not set.")

    except APIError as e:
        error_detail = f"OpenAI API error during TTS: {getattr(e, 'message', str(e))}"
        logger.exception(error_detail)
        news_digest.status = NewsDigestStatus.FAILED
        news_digest.error_message = error_detail
        db.commit()
        if permanent_audio_disk_path and os.path.exists(permanent_audio_disk_path): # Cleanup partially created file
            try: os.remove(permanent_audio_disk_path)
            except OSError as rm_err: logger.error(f"Failed to cleanup {permanent_audio_disk_path} after APIError: {rm_err}")
        return None, error_detail
    except Exception as e:
        error_detail = f"TTS generation/concatenation error: {str(e)}"
        logger.exception(error_detail)
        news_digest.status = NewsDigestStatus.FAILED
        news_digest.error_message = error_detail
        db.commit()
        if permanent_audio_disk_path and os.path.exists(permanent_audio_disk_path): # Cleanup partially created file
            try: os.remove(permanent_audio_disk_path)
            except OSError as rm_err: logger.error(f"Failed to cleanup {permanent_audio_disk_path} after Exception: {rm_err}")
        return None, error_detail
    finally:
        # --- Cleanup Temporary Chunk Files ---
        if temp_files:
            logger.info(f"Cleaning up {len(temp_files)} temporary audio chunk files for NewsDigest {news_digest_id}...")
            # Give a slight delay for file handles to release, especially on Windows
            await asyncio.sleep(0.2)
            for temp_path in temp_files:
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                        logger.debug(f"Removed temp file: {temp_path}")
                    except OSError as e:
                        # Log and continue if a temp file can't be removed.
                        logger.warning(f"Failed to remove temp file {temp_path}: {e}. Manual cleanup might be needed.")
