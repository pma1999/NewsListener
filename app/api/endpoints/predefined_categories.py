from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.schemas import predefined_category_schemas
from app.models.predefined_category_models import PredefinedCategory as PredefinedCategoryModel
# from app.models.user_models import User # For future secured endpoints

router = APIRouter()

@router.get("/", response_model=List[predefined_category_schemas.PredefinedCategory])
def list_predefined_categories(
    db: Session = Depends(deps.get_db_session),
    # current_user: User = Depends(deps.get_current_active_user) # Example for authentication
):
    """
    Retrieve all active predefined news categories/profiles.
    """
    categories = db.query(PredefinedCategoryModel).filter(PredefinedCategoryModel.is_active == True).order_by(PredefinedCategoryModel.name).all()
    return categories

# Future: Add POST, PUT, DELETE for admin management of categories.
# Example for creating a category (would require admin authentication):
# @router.post("/", response_model=predefined_category_schemas.PredefinedCategory, status_code=status.HTTP_201_CREATED)
# def create_predefined_category(
#     category_in: predefined_category_schemas.PredefinedCategoryCreate,
#     db: Session = Depends(deps.get_db_session),
#     # current_admin_user: User = Depends(deps.get_current_active_superuser) # Ensure only admin can create
# ):
#     db_category = PredefinedCategoryModel(**category_in.model_dump())
#     # Check for duplicate name if needed
#     # existing_category = db.query(PredefinedCategoryModel).filter(PredefinedCategoryModel.name == db_category.name).first()
#     # if existing_category:
#     #     raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category name already exists")
#     db.add(db_category)
#     db.commit()
#     db.refresh(db_category)
#     return db_category 