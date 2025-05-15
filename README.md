# NewsListener: Personalized News Podcasts

<!-- Optional Badges -->
<!--
[![Build Status](https://travis-ci.org/your_username/NewsListener.svg?branch=main)](https://travis-ci.org/your_username/NewsListener)
[![Coverage Status](https://coveralls.io/repos/github/your_username/NewsListener/badge.svg?branch=main)](https://coveralls.io/github/your_username/NewsListener?branch=main)
[![Python Version](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/License-Not%20Specified-lightgrey.svg)](LICENSE.md)
-->

NewsListener is a Python-based application that empowers users to create personalized audio news experiences. It aggregates news content based on user preferences or specific inputs, generates engaging podcast scripts using advanced Language Models (LLMs), and then converts these scripts into listenable podcast episodes using Text-to-Speech (TTS) technology.

## Project Overview

The core functionality of NewsListener revolves around:

1.  **News Curation:** Users can define their news interests through topics, keywords, preferred RSS feeds, and exclusion filters, or by providing specific article URLs.
2.  **Content Aggregation & Processing:** The system fetches news articles from specified URLs and RSS feeds, extracting relevant text content.
3.  **Intelligent Script Generation:** Leveraging Google's Gemini LLM (via Langchain), the application synthesizes the processed news into a coherent and engaging podcast script, with support for multiple languages.
4.  **High-Quality Audio Synthesis:** OpenAI's TTS service transforms the generated script into a natural-sounding audio file, handling long scripts by chunking and supporting various vocal styles.
5.  **API-Driven Interface:** A FastAPI application provides robust endpoints to manage user preferences, initiate podcast generation as a background task, and retrieve the status and audio of generated podcasts.

## Key Features

*   **Personalized News Sourcing:**
    *   Define and store user preferences: preferred topics, custom keywords, RSS feed URLs, keywords to exclude, and source domains to exclude.
    *   Generate podcasts from specific article URLs.
    *   Generate podcasts using ad-hoc criteria (topics, keywords, RSS feeds) per request.
*   **Dynamic News Aggregation:**
    *   Fetches content from multiple RSS feeds.
    *   Extracts text content from specified web article URLs.
    *   Filters content based on user-defined inclusion/exclusion criteria.
*   **Advanced Script Generation:**
    *   Utilizes Google Gemini Pro for generating podcast scripts.
    *   Supports script generation in multiple languages (currently English, Spanish, and French prompts are available).
    *   Customizable script styles (e.g., "standard", "engaging_storyteller", "quick_brief") through detailed LLM prompting.
*   **High-Quality TTS Audio:**
    *   Uses OpenAI's TTS models (e.g., `gpt-4o-mini-tts`) for audio generation.
    *   Supports various voices (e.g., "alloy", "nova") and rich instructional prompts for nuanced delivery.
    *   Automatically chunks long scripts for TTS processing and seamlessly concatenates audio segments.
*   **Robust API:**
    *   FastAPI backend with Pydantic data validation.
    *   Endpoints for managing user preferences.
    *   Endpoints for initiating podcast generation (asynchronous background tasks) and checking their status.
*   **Database Integration:**
    *   SQLAlchemy ORM for database interactions (supports SQLite and PostgreSQL).
    *   Stores user data, news digest details (source criteria, generated script, status), podcast episode metadata (audio URL, file path), and user preferences.
*   **Configuration Flexibility:**
    *   Easy configuration via `.env` file for API keys and other settings.
*   **Static File Serving:**
    *   Serves generated audio files statically.

## Current Status

The project is currently in an **alpha/beta development stage**. Core features for personalized news aggregation, script generation, and audio podcast creation are implemented and functional.

*   **Implemented:**
    *   User preferences management.
    *   News fetching from RSS and URLs.
    *   Content filtering and processing.
    *   Script generation using Google Gemini.
    *   Audio generation using OpenAI TTS, including chunking.
    *   Background task processing for podcast generation.
    *   Database models and interaction for users, preferences, news digests, and podcast episodes.
    *   API endpoints for all core functionalities.
    *   Basic API testing script (`run_api_tests.py`).
*   **Work-in-Progress / TODOs:**
    *   Full user authentication and authorization (currently uses a mock user for development).
    *   Comprehensive unit and integration tests (the `tests/` directory is largely a placeholder).
    *   More robust error handling and retry mechanisms for external dependencies.
    *   UI/Frontend for easier user interaction.
    *   Alembic database migrations for production environments.

## Technology Stack

*   **Language:** Python 3.8+
*   **Framework:** FastAPI
*   **Web Server:** Uvicorn
*   **ORM:** SQLAlchemy
*   **Database:** SQLite (default), PostgreSQL (supported)
*   **Data Validation:** Pydantic
*   **LLM Interaction:**
    *   Langchain (`langchain`, `langchain-google-genai`)
    *   Google Generative AI (Gemini Pro)
*   **Text-to-Speech (TTS):** OpenAI API (`openai` library)
*   **Audio Processing:** Pydub
*   **News Fetching/Parsing:** `feedparser`, `requests`, `beautifulsoup4`
*   **Configuration:** `python-dotenv`
*   **Asynchronous HTTP:** `aiohttp` (via Langchain), `httpx` (for API tests)

## Project Structure

```
NewsListener/
├── app/                            # Main application package
│   ├── api/                        # API related modules
│   │   ├── deps.py                 # API dependencies (e.g., DB session, mock user)
│   │   └── endpoints/              # FastAPI endpoint definitions
│   │       ├── podcast_generation.py
│   │       └── preferences.py
│   ├── core/                       # Core components
│   │   ├── config.py               # Application settings
│   │   └── prompts.py              # LLM and TTS prompt templates
│   ├── db/                         # Database setup
│   │   └── database.py             # SQLAlchemy engine, session, Base
│   ├── models/                     # SQLAlchemy models
│   │   ├── news_models.py
│   │   ├── preference_models.py
│   │   └── user_models.py
│   ├── schemas/                    # Pydantic schemas for API validation
│   │   ├── podcast_schemas.py
│   │   └── preference_schemas.py
│   ├── services/                   # Business logic services
│   │   ├── key_provider.py         # API key management
│   │   ├── llm_service.py          # LLM interaction logic
│   │   ├── news_processing_service.py # News fetching and processing
│   │   └── podcast_service.py      # TTS audio generation
│   ├── static/                     # Static files
│   │   └── audio/                  # Generated audio podcasts
│   └── main.py                     # FastAPI application entry point & startup logic
├── tests/                          # Placeholder for unit/integration tests
├── .env                            # Local environment variables (create this file)
├── .gitignore                      # Git ignore file
├── README.md                       # This file
├── requirements.txt                # Python dependencies
└── run_api_tests.py                # Script for running API interaction tests
```

## Prerequisites

*   Python 3.8 or higher.
*   An **OpenAI API Key** for Text-to-Speech services.
*   A **Google API Key** for Google Generative AI (Gemini) for script generation.
*   (Optional) A PostgreSQL server if you prefer it over the default SQLite.

## Setup and Installation

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <repository_url>
    cd NewsListener
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    # On Windows
    venv\Scripts\activate
    # On macOS/Linux
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the project root directory (e.g., `NewsListener/.env`). Add the following required variables:

    ```env
    OPENAI_API_KEY="your_openai_api_key_here"
    GOOGLE_API_KEY="your_google_api_key_here"

    # Optional: Defaults to "sqlite:///./newslistener.db"
    # DATABASE_URL="postgresql://user:password@host:port/dbname"

    # Optional: TTS settings (defaults are provided in config.py)
    # OPENAI_TTS_MODEL="gpt-4o-mini-tts-hd"
    # OPENAI_TTS_VOICE="nova"
    # TTS_CHUNK_CHAR_LIMIT=3000
    # TTS_CHUNK_PAUSE_MS=200

    # Optional: LLM settings (defaults are provided in config.py)
    # GEMINI_MODEL_NAME="gemini-1.0-pro" # or other compatible Gemini model
    ```
    Replace placeholder values with your actual API keys.

## Configuration

The application is configured primarily through environment variables defined in the `.env` file and loaded by `app/core/config.py`.

Key environment variables:

*   `OPENAI_API_KEY`: **Required.** Your API key for OpenAI TTS services.
*   `GOOGLE_API_KEY`: **Required.** Your API key for Google Generative AI (Gemini).
*   `DATABASE_URL`: The connection string for your database.
    *   Default: `sqlite:///./newslistener.db` (creates a SQLite file in the project root).
    *   For PostgreSQL: `postgresql://username:password@host:port/database_name`.
*   `OPENAI_TTS_MODEL`: OpenAI TTS model to use (default: `gpt-4o-mini-tts`).
*   `OPENAI_TTS_VOICE`: OpenAI TTS voice (default: `alloy`). Other options include `echo`, `fable`, `onyx`, `nova`, `shimmer`.
*   `TTS_CHUNK_CHAR_LIMIT`: Character limit for splitting text before sending to TTS (default: `3000`).
*   `TTS_CHUNK_PAUSE_MS`: Milliseconds of silence to add between concatenated audio chunks (default: `200`).
*   `GEMINI_MODEL_NAME`: Google Gemini model for script generation (default: `gemini-1.0-pro`).

The `app/static/audio/` directory will be created automatically if it doesn't exist, for storing generated audio files.

## Usage / How to Run

1.  **Start the FastAPI application:**
    ```bash
    uvicorn app.main:app --reload
    ```
    The `--reload` flag enables auto-reloading during development.

2.  **Access the API:**
    The application will typically be available at `http://127.0.0.1:8000`.

3.  **Interactive API Documentation:**
    *   Swagger UI: `http://127.0.0.1:8000/docs`
    *   ReDoc: `http://127.0.0.1:8000/redoc`

**Mock Authentication:**
For local development and testing, the application automatically creates a mock user (ID: 1) and default preferences for this user upon startup if they don't already exist. API endpoints requiring authentication will use this mock user by default, so no explicit login is needed to test the endpoints locally.

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Health Check

*   **Endpoint:** `GET /health`
*   **Description:** Basic health check for the application.
*   **Response (200 OK):**
    ```json
    {
      "status": "ok",
      "project": "NewsListener",
      "version": "0.1.0"
    }
    ```

### User Preferences

Endpoints for managing the (mock) authenticated user's news preferences.

*   **Endpoint:** `GET /user/preferences/me`
    *   **Description:** Retrieve the current user's preferences. If no preferences exist, default ones are created and returned.
    *   **Response (200 OK):** (Example with some values)
        ```json
        {
          "preferred_topics": ["technology", "science"],
          "custom_keywords": ["AI advancements"],
          "include_source_rss_urls": ["http://feeds.bbci.co.uk/news/technology/rss.xml"],
          "exclude_keywords": ["rumors"],
          "exclude_source_domains": ["fakenews.example.com"],
          "default_language": "en",
          "default_audio_style": "standard",
          "id": 1,
          "user_id": 1,
          "created_at": "2023-10-27T10:00:00.000Z",
          "updated_at": "2023-10-27T10:05:00.000Z"
        }
        ```

*   **Endpoint:** `PUT /user/preferences/me`
    *   **Description:** Create or update the current user's preferences.
    *   **Request Body:** (Fields are optional; only provided fields will be updated)
        ```json
        {
          "preferred_topics": ["business", "global economy"],
          "custom_keywords": ["market trends", "startup funding"],
          "include_source_rss_urls": [
            "https://www.wsj.com/xml/rss/3_7085.xml"
          ],
          "exclude_keywords": ["opinion", "editorial"],
          "exclude_source_domains": [],
          "default_language": "en",
          "default_audio_style": "professional_narrator"
        }
        ```
    *   **Response (200 OK):** The updated user preference object (similar to GET response).

### Podcast Generation

Endpoints for generating podcasts and checking their status.

*   **Endpoint:** `POST /podcasts/generate-podcast`
    *   **Description:** Initiates the podcast generation process as a background task. You can specify news sources in three ways (in order of precedence):
        1.  `specific_article_urls`: Provide direct URLs.
        2.  `use_user_default_preferences = true`: Use stored user preferences. You can override parts of these preferences using `request_*` fields.
        3.  `use_user_default_preferences = false`: Provide ad-hoc criteria using `request_*` fields for this request only.
    *   **Request Body (`application/json`):**
        ```json
        {
          "specific_article_urls": null, // or ["http://example.com/article1", "http://example.com/article2"]
          "use_user_default_preferences": true,
          "request_topics": null, // or ["artificial intelligence"] to override/set topics
          "request_keywords": null, // or ["quantum computing"] to override/set keywords
          "request_rss_urls": null, // or ["http://newfeed.com/rss.xml"] to override/set RSS feeds
          "request_exclude_keywords": null, // or ["old news"] to override/set exclusions
          "request_exclude_source_domains": null, // or ["ignorethis.com"]
          "language": "en", // Target language (e.g., "en", "es", "fr")
          "audio_style": "standard", // e.g., "standard", "engaging_storyteller", "quick_brief", "news_anchor"
          "force_regenerate": false // If true, regenerates even if cached audio exists
        }
        ```
    *   **Response (202 Accepted):**
        ```json
        {
          "news_digest_id": 123,
          "initial_status": "PENDING_SCRIPT", // Or another initial status
          "message": "Podcast generation process with custom preferences started."
        }
        ```

*   **Endpoint:** `GET /podcasts/podcast-status/{news_digest_id}`
    *   **Description:** Checks the status of a podcast generation task.
    *   **Path Parameter:** `news_digest_id` (integer) - The ID received from the `POST /generate-podcast` response.
    *   **Response (200 OK):**
        ```json
        {
          "news_digest_id": 123,
          "status": "COMPLETED", // PENDING_SCRIPT, PENDING_AUDIO, PROCESSING_AUDIO, COMPLETED, FAILED
          "audio_url": "/static/audio/news_podcast_123_xxxx.mp3", // If status is COMPLETED
          "script_preview": "Welcome to today's news update...", // First 200 chars of script if available
          "error_message": null, // Error details if status is FAILED
          "created_at": "2023-10-27T10:10:00.000Z",
          "updated_at": "2023-10-27T10:15:00.000Z"
        }
        ```
    *   **Response (404 Not Found):** If `news_digest_id` does not exist.

## Running Tests

The project includes an API interaction testing script `run_api_tests.py`. These are not unit tests but rather integration tests that call the running API endpoints. The `tests/` directory is currently a placeholder for future unit and integration tests.

To run the API tests:

1.  **Ensure the NewsListener application is running:**
    ```bash
    uvicorn app.main:app --reload
    ```
2.  **Execute the test script from the project root directory:**
    ```bash
    python run_api_tests.py
    ```
    The script will print output to the console indicating the success or failure of various API calls. It tests preference updates, different podcast generation scenarios, and status checks. These tests rely on the mock user (ID 1) created by the application on startup.

## Future Enhancements

*   **Full User Authentication & Authorization:** Implement a proper authentication system (e.g., OAuth2 with JWTs) to replace the current mock user setup.
*   **Comprehensive Testing:** Develop a full suite of unit and integration tests for all services and components (beyond `run_api_tests.py`).
*   **Alembic Database Migrations:** Integrate Alembic for managing database schema changes in production environments.
*   **Enhanced Credit/Usage System:** Implement logic for tracking and managing API usage or generation credits (the `User.credits` field is a starting point).
*   **Switchable LLM/TTS Providers:** Allow configuration to easily switch between different LLM (e.g., OpenAI models) or TTS services.
*   **Improved Error Handling & Resilience:** Enhance error reporting and implement more robust retry mechanisms for calls to external services.
*   **Scalability:** For higher loads, consider moving background tasks to a dedicated worker system like Celery with a message broker (e.g., RabbitMQ, Redis).
*   **Advanced Content Extraction:** Improve the `news_processing_service` with more sophisticated web content extraction techniques.
*   **Broader Language Support:** Add prompts and TTS configurations for more languages.
*   **Caching Strategies:** Implement more advanced caching for LLM responses or frequently requested news items.
*   **Admin Interface:** A simple interface for administrators to manage users, view all digests, system health, etc.
*   **Frontend UI:** Develop a web interface for users to interact with the application more easily.

## Contributing

Contributions are welcome! If you'd like to contribute, please follow these general guidelines:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or bug fix: `git checkout -b feature/your-feature-name` or `git checkout -b fix/your-bug-fix`.
3.  **Make your changes** and commit them with clear, descriptive messages.
4.  **Ensure your code adheres to existing style** (e.g., run a linter/formatter if configured).
5.  **Add tests** for any new functionality or bug fixes.
6.  **Push your changes** to your forked repository.
7.  **Open a Pull Request** to the main repository, detailing your changes.

Please ensure your PRs are focused and address a single issue or feature.