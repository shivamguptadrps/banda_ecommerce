"""add_otps_table

Revision ID: 3a9b9a435a45
Revises: 2b6a185e3616
Create Date: 2026-01-21 01:36:33.070333

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '3a9b9a435a45'
down_revision: Union[str, None] = '2b6a185e3616'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create OTPs table
    op.create_table(
        'otps',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column('mobile_number', sa.String(length=15), nullable=False),
        sa.Column('otp_code', sa.String(length=6), nullable=False),
        sa.Column('purpose', sa.String(length=50), nullable=False, server_default='login'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    
    # Create indexes
    op.create_index('ix_otps_mobile_number', 'otps', ['mobile_number'], unique=False)
    op.create_index('idx_mobile_purpose', 'otps', ['mobile_number', 'purpose'], unique=False)
    op.create_index(op.f('ix_otps_created_at'), 'otps', ['created_at'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_otps_created_at'), table_name='otps')
    op.drop_index('idx_mobile_purpose', table_name='otps')
    op.drop_index('ix_otps_mobile_number', table_name='otps')
    
    # Drop table
    op.drop_table('otps')

