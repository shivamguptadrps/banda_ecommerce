"""add_is_mobile_verified_to_users

Revision ID: 5b5c330eeab1
Revises: 3a9b9a435a45
Create Date: 2026-01-21 01:38:23.791560

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b5c330eeab1'
down_revision: Union[str, None] = '3a9b9a435a45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_mobile_verified column to users table
    op.add_column('users', sa.Column('is_mobile_verified', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Remove is_mobile_verified column from users table
    op.drop_column('users', 'is_mobile_verified')

