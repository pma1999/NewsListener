from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

from app.core.config import settings

# Base is defined here and will be imported by model files.
# Models will register themselves with this Base when their modules are loaded.
Base = declarative_base()

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, echo=False)
elif settings.DATABASE_URL.startswith("postgresql"):
    engine = create_engine(settings.DATABASE_URL, pool_size=5, max_overflow=10, echo=False)
else:
    print(f"Warning: DATABASE_URL ({settings.DATABASE_URL}) not recognized. Using default SQLite.")
    default_sqlite_path = os.path.join(os.getcwd(), "newslistener_fallback.db")
    print(f"Fallback SQLite DB at: {default_sqlite_path}")
    engine = create_engine(f"sqlite:///{default_sqlite_path}", connect_args={"check_same_thread": False}, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_db_and_tables():
    # Ensure all models are imported somewhere before this function is called
    # so that Base.metadata contains all the table definitions.
    # For example, in main.py or by importing the model modules themselves here (conditionally or carefully).
    # However, the primary fix is to remove model imports from the top of *this* file.
    Base.metadata.create_all(bind=engine) 