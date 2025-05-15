import asyncio
import logging
import time
from typing import Dict, Any, TypeVar, Generic

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import BaseOutputParser, StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI 
from langchain_openai import ChatOpenAI # Keep for potential future use or if TTS and LLM use different keys/providers

from app.core.config import settings
from app.core.prompts import NEWS_PODCAST_SCRIPT_PROMPTS_BY_LANG, NEWS_AUDIO_STYLE_CONFIG
# KeyProvider can be simplified or bypassed if keys come directly from settings for each service type
# from app.services.key_provider import KeyProvider 

logger = logging.getLogger(__name__)

T = TypeVar('T')  # Type variable for parser return type

# --- Helper: Escape Curly Braces (from your helpers.py) ---
def escape_curly_braces(text: str) -> str:
    if not isinstance(text, str):
        return str(text)
    return text.replace('{', '{{').replace('}', '}}')

# --- Helper: Create Retry Prompt (simplified for StrOutputParser focus) ---
def create_retry_prompt(original_prompt_template_str: str, failed_response: str, error_message: str) -> ChatPromptTemplate:
    safe_failed_response = escape_curly_braces(failed_response)
    safe_error_message = escape_curly_braces(error_message)
    retry_template_str = f"""You made an error in your previous response.
Original Request was based on a template similar to:
--------
{escape_curly_braces(original_prompt_template_str)}
--------
Your previous response that caused an error:
--------
{safe_failed_response}
--------
Error details:
--------
{safe_error_message}
--------
IMPORTANT: Please try again, ensuring your response is valid and complete text as expected for the script.
"""
    return ChatPromptTemplate.from_messages([("system", retry_template_str)])

# --- Core LLM Interaction Logic (adapted from run_chain) ---
async def run_llm_chain(
    prompt_template: ChatPromptTemplate,
    llm: Any, # ChatGoogleGenerativeAI or ChatOpenAI
    parser: BaseOutputParser[T],
    params: Dict[str, Any],
    max_retries: int = 2, 
    initial_retry_delay: float = 2.0,
) -> T:
    escaped_params = {key: escape_curly_braces(value) if isinstance(value, str) else value for key, value in params.items()}
    chain = prompt_template | llm | parser
    retries = 0
    last_error = None
    while retries <= max_retries:
        try:
            logger.info(f"Invoking LLM chain (Attempt {retries + 1}/{max_retries + 1}) with model: {llm.model_name if hasattr(llm, 'model_name') else type(llm)}")
            result = await chain.ainvoke(escaped_params)
            if isinstance(result, str) and not result.strip():
                logger.warning("LLM returned an empty string. Retrying if attempts left...")
                raise ValueError("LLM returned an empty string.")
            return result
        except Exception as e:
            logger.error(f"Error in LLM chain execution (Attempt {retries + 1}): {e}", exc_info=True)
            last_error = e
            retries += 1
            if retries <= max_retries:
                retry_delay = initial_retry_delay * (2 ** (retries - 1))
                logger.info(f"Waiting {retry_delay:.2f}s before retrying LLM chain.")
                await asyncio.sleep(retry_delay)
            else:
                logger.error("Max retries reached for LLM chain.")
                raise
    raise Exception(f"LLM chain failed after {max_retries} retries. Last error: {last_error}")

# --- LLM Instantiation ---
async def get_llm_instance():
    """Initialize and return the LLM instance, now defaulting to Gemini."""
    if not settings.GOOGLE_API_KEY or settings.GOOGLE_API_KEY == "YOUR_GOOGLE_API_KEY_HERE":
        logger.error("Google API Key for Gemini LLM is not configured or is set to placeholder.")
        raise ValueError("GOOGLE_API_KEY for LLM is not configured. Please set it in .env and app/core/config.py.")
    
    logger.info(f"Initializing Google Gemini LLM with model: {settings.GEMINI_MODEL_NAME}")
    try:
        return ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL_NAME, 
            google_api_key=settings.GOOGLE_API_KEY, 
            temperature=0.7, # Adjust as needed
            max_output_tokens=4096 # Adjust as needed, Gemini Pro has larger context
        )
    except Exception as e:
        logger.error(f"Failed to initialize ChatGoogleGenerativeAI: {e}", exc_info=True)
        raise ValueError(f"Could not initialize Gemini LLM: {e}")

# --- News Podcast Script Generation Service Function ---
async def generate_news_podcast_script(
    news_items_content: str,
    language_iso_code: str,
    audio_style_key: str # e.g., "standard", "engaging_storyteller"
) -> str:
    """
    Generates a news podcast script using an LLM.
    Args:
        news_items_content: A string containing the summarized/processed news items.
        language_iso_code: ISO 639-1 language code (e.g., "en", "es").
        audio_style_key: Key for the desired audio style from NEWS_AUDIO_STYLE_CONFIG.
    Returns:
        The generated audio script as a string.
    Raises:
        ValueError: If the language or audio style is not supported.
        Exception: If LLM script generation fails after retries.
    """
    if language_iso_code not in NEWS_PODCAST_SCRIPT_PROMPTS_BY_LANG:
        logger.error(f"Unsupported language for news script generation: {language_iso_code}")
        raise ValueError(f"Language '{language_iso_code}' is not supported for news script generation.")
    
    prompt_template_str = NEWS_PODCAST_SCRIPT_PROMPTS_BY_LANG[language_iso_code]
    style_config = NEWS_AUDIO_STYLE_CONFIG.get(audio_style_key, NEWS_AUDIO_STYLE_CONFIG["standard"])
    audio_style_llm_instruction = style_config["llm_script_instruction"]

    prompt = ChatPromptTemplate.from_template(prompt_template_str)
    llm = await get_llm_instance() # Now gets Gemini
    parser = StrOutputParser()

    MAX_CONTEXT_CHARS = 30000 # Gemini has a larger context window generally
    if len(news_items_content) > MAX_CONTEXT_CHARS:
        logger.warning(f"News content length ({len(news_items_content)}) exceeds limit ({MAX_CONTEXT_CHARS}). Truncating.")
        news_items_content = news_items_content[:MAX_CONTEXT_CHARS] + "... (content truncated)"

    params = {
        "news_context": news_items_content,
        "audio_style_script_instruction": audio_style_llm_instruction,
        # The prompts use {language_name}, ensure this aligns or change prompt to {language_iso_code}
        "language_name": language_iso_code 
    }

    logger.info(f"Generating news podcast script with Gemini for language: {language_iso_code}, style: {audio_style_key}")
    try:
        audio_script = await run_llm_chain(prompt, llm, parser, params)
        if not audio_script or len(audio_script.strip()) < 20:
            logger.error(f"LLM (Gemini) generated an invalid or very short script. Script: '{audio_script[:100]}...'")
            raise ValueError("Generated audio script was invalid or too short.")
        logger.info(f"Successfully generated news script with Gemini. Length: {len(audio_script)}")
        return audio_script
    except Exception as e:
        logger.exception(f"Failed to generate news podcast script with Gemini: {e}")
        raise 