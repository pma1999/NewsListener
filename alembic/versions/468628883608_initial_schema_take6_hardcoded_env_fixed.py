"""initial_schema_take6_hardcoded_env_fixed

Revision ID: 468628883608
Revises: 
Create Date: 2025-05-16 21:01:19.834312

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '468628883608'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('predefined_categories',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('description', sa.String(), nullable=True),
    sa.Column('rss_urls', sa.JSON(), nullable=True),
    sa.Column('topics', sa.JSON(), nullable=True),
    sa.Column('keywords', sa.JSON(), nullable=True),
    sa.Column('exclude_keywords', sa.JSON(), nullable=True),
    sa.Column('exclude_source_domains', sa.JSON(), nullable=True),
    sa.Column('language', sa.String(), nullable=True),
    sa.Column('audio_style', sa.String(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('predefined_categories', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_predefined_categories_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_predefined_categories_name'), ['name'], unique=True)

    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('hashed_password', sa.String(), nullable=False),
    sa.Column('full_name', sa.String(), nullable=True),
    sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
    sa.Column('is_superuser', sa.Boolean(), server_default='false', nullable=True),
    sa.Column('credits', sa.Integer(), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_users_email'), ['email'], unique=True)
        batch_op.create_index(batch_op.f('ix_users_id'), ['id'], unique=False)

    op.create_table('news_digests',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('original_articles_info', sa.JSON(), nullable=True),
    sa.Column('generated_script_text', sa.Text(), nullable=True),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('news_digests', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_news_digests_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_news_digests_status'), ['status'], unique=False)
        batch_op.create_index(batch_op.f('ix_news_digests_user_id'), ['user_id'], unique=False)

    op.create_table('user_preferences',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('preferred_topics', sa.JSON(), nullable=True),
    sa.Column('custom_keywords', sa.JSON(), nullable=True),
    sa.Column('include_source_rss_urls', sa.JSON(), nullable=True),
    sa.Column('exclude_keywords', sa.JSON(), nullable=True),
    sa.Column('exclude_source_domains', sa.JSON(), nullable=True),
    sa.Column('default_language', sa.String(length=10), nullable=True),
    sa.Column('default_audio_style', sa.String(length=50), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('user_preferences', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_user_preferences_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_user_preferences_user_id'), ['user_id'], unique=True)

    op.create_table('podcast_episodes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('news_digest_id', sa.Integer(), nullable=False),
    sa.Column('audio_url', sa.String(), nullable=True),
    sa.Column('file_path', sa.String(), nullable=True),
    sa.Column('language', sa.String(length=10), nullable=False),
    sa.Column('audio_style', sa.String(length=50), nullable=True),
    sa.Column('duration_seconds', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['news_digest_id'], ['news_digests.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('podcast_episodes', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_podcast_episodes_audio_style'), ['audio_style'], unique=False)
        batch_op.create_index(batch_op.f('ix_podcast_episodes_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_podcast_episodes_language'), ['language'], unique=False)
        batch_op.create_index(batch_op.f('ix_podcast_episodes_news_digest_id'), ['news_digest_id'], unique=True)

    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('podcast_episodes', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_podcast_episodes_news_digest_id'))
        batch_op.drop_index(batch_op.f('ix_podcast_episodes_language'))
        batch_op.drop_index(batch_op.f('ix_podcast_episodes_id'))
        batch_op.drop_index(batch_op.f('ix_podcast_episodes_audio_style'))

    op.drop_table('podcast_episodes')
    with op.batch_alter_table('user_preferences', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_user_preferences_user_id'))
        batch_op.drop_index(batch_op.f('ix_user_preferences_id'))

    op.drop_table('user_preferences')
    with op.batch_alter_table('news_digests', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_news_digests_user_id'))
        batch_op.drop_index(batch_op.f('ix_news_digests_status'))
        batch_op.drop_index(batch_op.f('ix_news_digests_id'))

    op.drop_table('news_digests')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_id'))
        batch_op.drop_index(batch_op.f('ix_users_email'))

    op.drop_table('users')
    with op.batch_alter_table('predefined_categories', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_predefined_categories_name'))
        batch_op.drop_index(batch_op.f('ix_predefined_categories_id'))

    op.drop_table('predefined_categories')
    # ### end Alembic commands ###
