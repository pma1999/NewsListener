import logging
from fastapi import FastAPI, Request, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.api.endpoints import podcast_generation
from app.api.endpoints import preferences as preferences_router
from app.db.database import create_db_and_tables, SessionLocal

# Ensure all model modules are imported before create_db_and_tables is called
# This helps Base metadata to be populated correctly.
from app.models import user_models # noqa
from app.models import news_models # noqa
from app.models import preference_models # noqa

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    openapi_url=f"/api/v1/openapi.json" # Standard OpenAPI path
)

# --- Event Handlers ---
@app.on_event("startup")
def on_startup():
    logger.info("Starting up NewsListener application...")
    # Create database tables if they don't exist
    # This is suitable for development; for production, use Alembic migrations.
    try:
        create_db_and_tables()
        logger.info("Database tables checked/created.")
        
        # You might want to create a default user if one doesn't exist for testing the /generate-podcast endpoint
        # This is purely for local development convenience without full auth setup yet.
        db = SessionLocal()
        try:
            mock_user = db.query(user_models.User).filter(user_models.User.id == 1).first()
            if not mock_user:
                logger.info("Creating mock user with ID 1 for testing purposes.")
                # In a real app, password should be properly hashed using a utility function.
                # This is a placeholder for a hashed password.
                mock_hashed_password = "$2b$12$D4g6sZQkof/2Y8cZmz5p4O9L7E0gCY0jEy0uLh27B6c5E0p9a1x/q" # Example hash
                user = user_models.User(id=1, email="user@example.com", hashed_password=mock_hashed_password, is_active=True)
                db.add(user)
                # Optionally, create default preferences for mock user 1 if they don't exist
                mock_user_prefs = db.query(preference_models.UserPreference).filter(preference_models.UserPreference.user_id == 1).first()
                if not mock_user_prefs:
                    logger.info("Creating default preferences for mock user ID 1.")
                    default_prefs = preference_models.UserPreference(user_id=1)
                    db.add(default_prefs)
                db.commit()
                logger.info("Mock user and/or default preferences created.")
            else:
                logger.info("Mock user with ID 1 already exists.")
                # Check and create default preferences if missing for existing mock user
                mock_user_prefs = db.query(preference_models.UserPreference).filter(preference_models.UserPreference.user_id == 1).first()
                if not mock_user_prefs:
                    logger.info("Creating default preferences for existing mock user ID 1.")
                    default_prefs = preference_models.UserPreference(user_id=1)
                    db.add(default_prefs)
                    db.commit()
                    logger.info("Default preferences created for mock user 1.")
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error during startup (DB table creation or mock user/prefs): {e}", exc_info=True)
        # Depending on the severity, you might want to prevent startup or handle gracefully.

@app.on_event("shutdown")
def on_shutdown():
    logger.info("Shutting down NewsListener application...")

# --- Exception Handlers ---
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"SQLAlchemy error occurred: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "A database error occurred. Please try again later."},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Request validation error: {exc.errors()}")
    # You can customize the response further if needed
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body if hasattr(exc, 'body') else None}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"An unexpected error occurred: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected internal server error occurred."},
    )

# --- Static Files Mounting ---
# This serves files from app/static/ at the /static URL path
# e.g., an audio file at app/static/audio/file.mp3 will be accessible at /static/audio/file.mp3
try:
    app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")
    logger.info(f"Mounted static files from directory: {settings.STATIC_DIR}")
except RuntimeError as e:
    logger.error(f"Error mounting static files from {settings.STATIC_DIR}: {e}")
    logger.error("Ensure the static directory exists and is accessible.")

# --- API Routers ---
# Include the router for podcast generation
app.include_router(podcast_generation.router, prefix="/api/v1/podcasts", tags=["Podcasts"])
app.include_router(preferences_router.router, prefix="/api/v1/user/preferences", tags=["User Preferences"])

# --- Root Endpoint --- #
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """Basic health check endpoint."""
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.PROJECT_VERSION}

# To run the app (for development):
# uvicorn app.main:app --reload 