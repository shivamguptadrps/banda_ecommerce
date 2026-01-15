"""add_delivery_partner_to_userrole_enum

Revision ID: 7bd9d1d11359
Revises: fb072af66e41
Create Date: 2026-01-11 19:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7bd9d1d11359'
down_revision: Union[str, None] = 'fb072af66e41'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Convert users.role from enum to VARCHAR to use enum values instead of names
    # This allows SQLAlchemy to use the enum value (e.g., "delivery_partner") instead of name (e.g., "DELIVERY_PARTNER")
    
    # Convert role from enum to VARCHAR(20)
    op.execute(sa.text("""
        ALTER TABLE users 
        ALTER COLUMN role TYPE VARCHAR(20) 
        USING role::text
    """))


def downgrade() -> None:
    # Convert back to enum type
    # Note: This assumes the enum type still exists in the database
    
    op.execute(sa.text("""
        ALTER TABLE users 
        ALTER COLUMN role TYPE userrole 
        USING role::userrole
    """))
