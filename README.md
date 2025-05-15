# NewsListener: Personalized News Podcasts

NewsListener is a Python-based application designed to allow users to curate personalized news digests and generate podcasts from them, offering a custom radio-like news experience.

## Project Overview

The core functionality revolves around:
1.  **News Aggregation (Future):** Users will be able to specify news topics, sources, or keywords.
2.  **Script Generation:** An LLM (Language Model) will process the aggregated news content and generate an engaging podcast script.
3.  **Audio Generation:** A TTS (Text-to-Speech) service (currently OpenAI) will convert the script into an audio file.
4.  **API Interface:** FastAPI provides endpoints to request podcast generation and check the status.

## Current Status

-   **Project Structure:** Set up with a modular FastAPI application structure.
-   **Core Services:**
    -   `llm_service`: Generates podcast scripts from provided text (currently uses mock news content).
    -   `podcast_service`: Generates audio from a script using OpenAI TTS, handling chunking for long scripts and various audio styles.
    -   `news_processing_service`: Placeholder for actual news fetching and processing; currently provides mock news content.
-   **Database:** SQLAlchemy models for `User`, `NewsDigest` (tracks the news compilation and script), and `PodcastEpisode` (tracks the generated audio).
-   **API Endpoints:**
    -   `POST /api/v1/podcasts/generate-podcast`: Initiates the podcast generation process (runs in the background).
    -   `GET /api/v1/podcasts/podcast-status/{news_digest_id}`: Checks the status of a generation task and provides the audio URL if completed.
-   **Configuration:** Managed via `.env` file and `app/core/config.py`.

## Getting Started

### Prerequisites

-   Python 3.8+
-   An OpenAI API Key

### Setup

1.  **Clone the repository (if applicable):**
    ```bash
    # git clone <repository_url>
    # cd NewsListener
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
    -   Copy `.env.example` to a new file named `.env` in the project root.
        ```bash
        cp .env.example .env
        ```
    -   Edit the `.env` file and add your `OPENAI_API_KEY`.
    -   Modify `DATABASE_URL` if you are not using the default SQLite database.

5.  **Run the application:**
    ```bash
    uvicorn app.main:app --reload
    ```
    The application will typically be available at `http://127.0.0.1:8000`.

### API Usage

-   **Interactive API Docs (Swagger UI):** Once the app is running, navigate to `http://127.0.0.1:8000/docs`.
-   **Generate a Podcast:**
    -   Send a `POST` request to `/api/v1/podcasts/generate-podcast`.
    -   Body (example):
        ```json
        {
          "news_article_identifiers": ["latest technology trends", "global economic outlook"],
          "language": "en",
          "audio_style": "standard",
          "force_regenerate": false
        }
        ```
    -   This will return a `news_digest_id`.
-   **Check Podcast Status:**
    -   Send a `GET` request to `/api/v1/podcasts/podcast-status/{news_digest_id}` (replace `{news_digest_id}` with the actual ID).
    -   The response will indicate the status (`PENDING_SCRIPT`, `PENDING_AUDIO`, `PROCESSING_AUDIO`, `COMPLETED`, `FAILED`) and provide an `audio_url` when completed.

## Project Structure

```
NewsListener/
├── app/                  # Main application package
│   ├── api/              # API related modules (endpoints, dependencies)
│   ├── core/             # Core components (config, prompts, security)
│   ├── db/               # Database setup
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic services
│   ├── static/           # Static files (e.g., generated audio)
│   │   └── audio/
│   └── main.py           # FastAPI application entry point
├── tests/                # Tests package (to be developed)
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore file
├── README.md             # This file
└── requirements.txt      # Python dependencies
```

## Future Enhancements

-   **Real News Aggregation:** Implement the `news_processing_service` to fetch and process news from actual sources (APIs, RSS feeds, web scraping).
-   **User Authentication & Authorization:** Secure endpoints and associate news digests with authenticated users.
-   **Advanced Personalization:** Allow users to save preferences for news topics, sources, and podcast styles.
-   **Credit System/Usage Tracking:** Implement a system to manage API usage (the foundation from the provided `key_provider.py` and `usage_tracker.py` can be adapted).
-   **More LLM Options:** Support for different LLMs for script generation.
-   **More TTS Options:** Support for different TTS services.
-   **Improved Error Handling and Resilience:** More granular error reporting and retry mechanisms for external services.
-   **Scalability:** For high load, consider moving background tasks to a dedicated worker system like Celery.
-   **Testing:** Comprehensive unit and integration tests.
-   **Frontend UI:** A web interface for users to interact with the application.

## Contributing

(Details on how to contribute to the project, if applicable for an open-source version.) 