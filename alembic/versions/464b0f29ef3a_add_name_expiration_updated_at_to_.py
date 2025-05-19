"""add_name_expiration_updated_at_to_podcast_episodes

Revision ID: 464b0f29ef3a
Revises: f35d0f78c143
Create Date: 2025-05-19 18:21:06.850072

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '464b0f29ef3a'
down_revision: Union[str, None] = 'f35d0f78c143'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('podcast_episodes', sa.Column('user_given_name', sa.String(length=255), nullable=True))
    op.add_column('podcast_episodes', sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()))
    op.add_column('podcast_episodes', sa.Column('expires_at', sa.DateTime(), nullable=True))
    op.create_index(op.f('ix_podcast_episodes_expires_at'), 'podcast_episodes', ['expires_at'], unique=False)
    
    # If you need to backfill `updated_at` for existing rows to be the same as `created_at`
    # op.execute('UPDATE podcast_episodes SET updated_at = created_at WHERE updated_at IS NULL')
    # However, since this is a new column with server_default, new rows get it, existing rows get the server_default if supported, or null then filled by app.
    # For SQLite, server_default might not work as expected for existing rows.
    # A more robust way for existing rows if `updated_at` needs to be non-null immediately:
    op.execute('UPDATE podcast_episodes SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)')
    # Make sure the column is not nullable if it shouldn't be, but we defined it as nullable=False with server_default.
    # The model defines default=func.now(), onupdate=func.now(). The migration adds it with server_default.
    # For existing records, if `updated_at` remains NULL after add_column (before this execute), this will fill it.


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_podcast_episodes_expires_at'), table_name='podcast_episodes')
    op.drop_column('podcast_episodes', 'expires_at')
    op.drop_column('podcast_episodes', 'updated_at')
    op.drop_column('podcast_episodes', 'user_given_name')
