import os # For environment variable
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
import sqlalchemy # Ensure this is present

from alembic import context
from alembic import op

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- BEGIN APP SPECIFIC CONFIG --- #
# Import your Base and models here so Alembic can see them
import sys
from pathlib import Path

# Add the project root to sys.path to allow imports from app
project_root = Path(__file__).resolve().parents[1] # This should point to NewsListener/
if str(project_root) not in sys.path:
    sys.path.append(str(project_root))

from app.db.database import Base # Import your Base
# Import all your models so Base.metadata is populated
from app.models import user_models
from app.models import news_models
from app.models import preference_models
from app.models import predefined_category_models

target_metadata = Base.metadata

# Get the database URL. Prioritize DATABASE_URL env var, then alembic.ini.
# This makes it flexible for different environments (e.g., Railway).
db_url = os.environ.get("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)
else:
    # If DATABASE_URL is not set, it will use the one from alembic.ini
    # Ensure alembic.ini has a default sqlalchemy.url set (e.g., for local dev)
    pass 
# --- END APP SPECIFIC CONFIG --- #

# other values from the config, defined by the needs of env.py,
# can be acquired: 
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True, # Add this to detect type changes (e.g. VARCHAR length)
        render_as_batch=True, 
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    engine_config = config.get_section(config.config_ini_section, {})
    # Override the sqlalchemy.url from engine_config with our resolved db_url from above
    engine_config["sqlalchemy.url"] = config.get_main_option("sqlalchemy.url")

    connectable = engine_from_config(
        engine_config, # Use the modified config
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True, # Add this to detect type changes
            render_as_batch=True # Add this for SQLite compatibility with certain operations
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
