"""change_userrole_to_varchar

Revision ID: d6575a3085e7
Revises: 7bd9d1d11359
Create Date: 2026-01-11 19:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd6575a3085e7'
down_revision: Union[str, None] = '7bd9d1d11359'
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
