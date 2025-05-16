import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

class KeyProvider:
    """
    Simple key provider that retrieves API keys from application settings (environment variables)
    or uses a user-provided key if available.
    """

    def __init__(self, key_type: str):
        """
        Initialize a key provider.
        Args:
            key_type: Type of key ('openai', 'google', etc.)
        """
        self.key_type = key_type.lower()

    async def get_key(self, user_provided_key: Optional[str] = None) -> str:
        """
        Get the actual API key at the point of use.
        Prioritizes user_provided_key, then falls back to settings.
        Args:
            user_provided_key: An optional API key provided directly by the user.
        Returns:
            str: The API key
        Raises:
            ValueError: If no valid key can be retrieved.
        """
        if user_provided_key:
            logger.info(f"Using user-provided API key for {self.key_type}.")
            # Basic validation for placeholder for user-provided keys
            if self.key_type == "openai" and user_provided_key == "YOUR_OPENAI_API_KEY_HERE":
                logger.error("User provided the placeholder OpenAI API key.")
                raise ValueError("User-provided OpenAI API key is a placeholder. Please provide a valid key.")
            if self.key_type == "google" and user_provided_key == "YOUR_GOOGLE_API_KEY_HERE":
                logger.error("User provided the placeholder Google API key.")
                raise ValueError("User-provided Google API key is a placeholder. Please provide a valid key.")
            if not user_provided_key.strip():
                logger.error(f"User provided an empty API key for {self.key_type}.")
                raise ValueError(f"User-provided API key for {self.key_type} is empty.")
            return user_provided_key

        logger.info(f"Attempting to retrieve {self.key_type} API key from settings.")
        api_key: Optional[str] = None
        if self.key_type == "openai":
            api_key = settings.OPENAI_API_KEY
            if not api_key or api_key == "YOUR_OPENAI_API_KEY_HERE": # Check for placeholder or empty
                logger.error("OpenAI API key is not configured in settings or is set to the placeholder.")
                raise ValueError("OpenAI API key is not configured in settings. Please set it in the .env file or provide it in the request.")
        elif self.key_type == "google":
            api_key = settings.GOOGLE_API_KEY
            if not api_key or api_key == "YOUR_GOOGLE_API_KEY_HERE": # Check for placeholder or empty
                logger.error("Google API key is not configured in settings or is set to the placeholder.")
                raise ValueError("Google API key is not configured in settings. Please set it in the .env file or provide it in the request.")
        else:
            logger.error(f"API key type '{self.key_type}' is not supported by this KeyProvider.")
            raise ValueError(f"Unsupported API key type: {self.key_type}")

        if not api_key:
            # This case should ideally be caught by the specific checks above, but as a fallback:
            logger.error(f"{self.key_type.upper()} API key is not set in environment variables or is empty.")
            raise ValueError(f"{self.key_type.upper()} API key not found or is empty. Check your .env file, app/core/config.py, or provide it in the request.")

        logger.debug(f"Providing {self.key_type} API key from settings.")
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

class GoogleKeyProvider(KeyProvider):
    def __init__(self):
        super().__init__("google") 