import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

class KeyProvider:
    """
    Simple key provider that retrieves API keys from application settings (environment variables).
    """

    def __init__(self, key_type: str):
        """
        Initialize a key provider.
        Args:
            key_type: Type of key ('openai', 'google', etc.)
        """
        self.key_type = key_type.lower()

    async def get_key(self) -> str:
        """
        Get the actual API key at the point of use.
        Returns:
            str: The API key
        Raises:
            ValueError: If no valid key can be retrieved for the specified type.
        """
        api_key: Optional[str] = None
        if self.key_type == "openai":
            api_key = settings.OPENAI_API_KEY
            if api_key == "YOUR_OPENAI_API_KEY_HERE": # Check for placeholder
                logger.error("OpenAI API key is set to the placeholder. Please configure it in your .env file.")
                raise ValueError("OpenAI API key is not configured. Please set it in the .env file.")
        # Example for other keys if added to settings
        # elif self.key_type == "google_llm":
        #     api_key = settings.GOOGLE_API_KEY
        #     if not api_key:
        #          logger.error("Google API key for LLM is not configured.")
        #          raise ValueError("Google API key for LLM is not configured.")
        else:
            logger.error(f"API key type '{self.key_type}' is not supported by this KeyProvider.")
            raise ValueError(f"Unsupported API key type: {self.key_type}")

        if not api_key:
            logger.error(f"{self.key_type.upper()} API key is not set in environment variables or is empty.")
            raise ValueError(f"{self.key_type.upper()} API key not found or is empty. Check your .env file and app/core/config.py.")

        logger.debug(f"Providing {self.key_type} API key.")
        return api_key

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(key_type='{self.key_type}')"

# Specific providers for convenience, though the generic one can be used with key_type.
class OpenAIKeyProvider(KeyProvider):
    def __init__(self):
        super().__init__("openai")

# Example for Google LLM if used later
# class GoogleLLMKeyProvider(KeyProvider):
#     def __init__(self):
#         super().__init__("google_llm") 