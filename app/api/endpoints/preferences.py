import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any
from pydantic import HttpUrl # Import HttpUrl for type checking if needed

from app.api import deps
from app.models.user_models import User
from app.models.preference_models import UserPreference
from app.schemas import preference_schemas

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/me", response_model=preference_schemas.UserPreferenceInDB)
async def read_user_preferences(
    db: Session = Depends(deps.get_db_session),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve the current authenticated user's preferences.
    Creates default preferences if none exist.
    """
    preferences = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not preferences:
        preferences = UserPreference(user_id=current_user.id) # Defaults from model will apply
        db.add(preferences)
        db.commit()
        db.refresh(preferences)
        logger.info(f"Created default preferences for user {current_user.id}")
    return preferences

@router.put("/me", response_model=preference_schemas.UserPreferenceInDB)
async def update_user_preferences(
    *,
    db: Session = Depends(deps.get_db_session),
    preference_in: preference_schemas.UserPreferenceUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create or update the current authenticated user's preferences.
    """
    preferences = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    
    update_data = preference_in.model_dump(exclude_unset=True)
    
    # Convert HttpUrl list to string list before saving to JSON field
    if "include_source_rss_urls" in update_data and update_data["include_source_rss_urls"] is not None:
        update_data["include_source_rss_urls"] = [
            str(url) for url in update_data["include_source_rss_urls"]
        ]

    if not preferences:
        # Pass the modified update_data here
        preferences = UserPreference(user_id=current_user.id, **update_data)
        db.add(preferences)
        logger.info(f"Creating preferences for user {current_user.id} with data: {update_data}")
    else:
        for field, value in update_data.items():
            setattr(preferences, field, value)
        logger.info(f"Updating preferences for user {current_user.id} with data: {update_data}")

    db.commit()
    db.refresh(preferences)
    return preferences 