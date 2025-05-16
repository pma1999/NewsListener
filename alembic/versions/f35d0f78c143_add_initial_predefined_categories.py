"""add_initial_predefined_categories

Revision ID: f35d0f78c143
Revises: 468628883608
Create Date: 2025-05-16 22:06:11.123456 # Placeholder, actual date will be different

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql # For JSON type if needed explicitly for table definition

# revision identifiers, used by Alembic.
revision: str = 'f35d0f78c143'
down_revision: Union[str, None] = '468628883608' # Points to the previous migration
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add initial predefined categories."""
    # Define the table structure for op.bulk_insert
    # This needs to match the existing table columns
    predefined_categories_table = sa.table(
        'predefined_categories',
        sa.column('name', sa.String),
        sa.column('description', sa.String),
        sa.column('rss_urls', postgresql.JSONB), # Using JSONB for PostgreSQL, or sa.JSON
        sa.column('topics', postgresql.JSONB),
        sa.column('keywords', postgresql.JSONB),
        sa.column('exclude_keywords', postgresql.JSONB),
        sa.column('exclude_source_domains', postgresql.JSONB),
        sa.column('language', sa.String),
        sa.column('audio_style', sa.String),
        sa.column('is_active', sa.Boolean)
        # 'id', 'created_at', 'updated_at' are usually auto-handled
    )

    op.bulk_insert(
        predefined_categories_table,
        [
            {
                'name': "Últimas Noticias El País",
                'description': "Últimas noticias de El País",
                'rss_urls': ['https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/ultimas-noticias/portada'],
                'topics': [],
                'keywords': [],
                'exclude_keywords': [],
                'exclude_source_domains': [],
                'language': "es",
                'audio_style': None,
                'is_active': True,
            },
            {
                'name': "Titulares del Día El País",
                'description': "Titulares del día de El País",
                'rss_urls': ['https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada'],
                'topics': [],
                'keywords': [],
                'exclude_keywords': [],
                'exclude_source_domains': [],
                'language': "es",
                'audio_style': None,
                'is_active': True,
            },
        ]
    )


def downgrade() -> None:
    """Remove the initial predefined categories."""
    # Delete specifically by name to be safe
    op.execute(
        "DELETE FROM predefined_categories WHERE name IN ("
        "'Últimas Noticias El País', "
        "'Titulares del Día El País'"
        ")"
    )
