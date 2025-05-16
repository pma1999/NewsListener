import os
from dotenv import load_dotenv

# Define the path to the .env file relative to this script's directory (core)
# then go up one level to the app's root, then to the project root.
# This assumes .env is in the NewsListener project root.
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

class Settings:
    PROJECT_NAME: str = "NewsListener"
    PROJECT_VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # API Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY_HERE")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "YOUR_GOOGLE_API_KEY_HERE") # Added for Gemini

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./newslistener.db")

    # TTS Settings
    OPENAI_TTS_MODEL: str = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    OPENAI_TTS_VOICE: str = os.getenv("OPENAI_TTS_VOICE", "alloy") # Options: alloy, echo, fable, onyx, nova, shimmer
    TTS_CHUNK_CHAR_LIMIT: int = int(os.getenv("TTS_CHUNK_CHAR_LIMIT", 3000))
    TTS_CHUNK_PAUSE_MS: int = int(os.getenv("TTS_CHUNK_PAUSE_MS", 200)) # Milliseconds

    # Static files
    # Correctly determine the project root relative to this config file
    # config.py is in NewsListener/app/core/
    # STATIC_DIR should be NewsListener/app/static/
    APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # This is /app
    STATIC_DIR: str = os.path.join(APP_DIR, "static")
    STATIC_AUDIO_DIR: str = os.path.join(STATIC_DIR, "audio")

    # Ensure static audio directory exists
    os.makedirs(STATIC_AUDIO_DIR, exist_ok=True)

    # LLM Settings
    GEMINI_MODEL_NAME: str = os.getenv("GEMINI_MODEL_NAME", "gemini-1.0-pro") # Changed from gemini-pro to gemini-1.0-pro for more common naming

    # LangSmith Tracing Settings
    LANGSMITH_TRACING_V2: str = os.getenv("LANGSMITH_TRACING_V2", "true")
    LANGSMITH_ENDPOINT: str = os.getenv("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")
    LANGSMITH_API_KEY: str = os.getenv("LANGSMITH_API_KEY", "YOUR_LANGSMITH_API_KEY_HERE")
    LANGSMITH_PROJECT: str = os.getenv("LANGSMITH_PROJECT", "NewsListener") # Default project name

    # CORS settings
    # Allow origins to be a comma-separated string from env, defaulting to a typical local dev setup
    CORS_ALLOWED_ORIGINS_STR: str = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    
    @property
    def CORS_ALLOWED_ORIGINS(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS_STR.split(',')]

    # CORS settings (example)
    # CORS_ORIGINS: list[str] = ["http://localhost:3000"] # For a React frontend, for example

settings = Settings()

# For logging
# print(f"Loaded settings. OpenAI Key loaded: {'Yes' if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != 'YOUR_OPENAI_API_KEY_HERE' else 'No/Default'}")
# print(f"Loaded settings. Google API Key loaded: {'Yes' if settings.GOOGLE_API_KEY and settings.GOOGLE_API_KEY != 'YOUR_GOOGLE_API_KEY_HERE' else 'No/Default'}")
# print(f"Database URL: {settings.DATABASE_URL}")
# print(f"Static Audio Directory: {settings.STATIC_AUDIO_DIR}")
# print(f"Gemini Model: {settings.GEMINI_MODEL_NAME}")

# For LangSmith logging (optional)
# print(f"LangSmith Tracing Enabled: {settings.LANGSMITH_TRACING_V2}")
# print(f"LangSmith Endpoint: {settings.LANGSMITH_ENDPOINT}")
# print(f"LangSmith API Key Loaded: {"Yes" if settings.LANGSMITH_API_KEY and settings.LANGSMITH_API_KEY != "YOUR_LANGSMITH_API_KEY_HERE" else "No/Default"}")
# print(f"LangSmith Project: {settings.LANGSMITH_PROJECT}") 