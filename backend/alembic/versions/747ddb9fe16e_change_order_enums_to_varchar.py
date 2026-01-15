"""change_order_enums_to_varchar

Revision ID: 747ddb9fe16e
Revises: e460fe00f043
Create Date: 2026-01-11 18:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '747ddb9fe16e'
down_revision: Union[str, None] = 'e460fe00f043'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Convert enum columns to VARCHAR to use enum values instead of names
    # This allows SQLAlchemy to use the enum value (e.g., "placed") instead of name (e.g., "PLACED")
    
    # Convert order_status from enum to VARCHAR(50)
    op.execute(sa.text("""
        ALTER TABLE orders 
        ALTER COLUMN order_status TYPE VARCHAR(50) 
        USING order_status::text
    """))
    
    # Convert payment_mode from enum to VARCHAR(20)
    op.execute(sa.text("""
        ALTER TABLE orders 
        ALTER COLUMN payment_mode TYPE VARCHAR(20) 
        USING payment_mode::text
    """))
    
    # Convert payment_status from enum to VARCHAR(20)
    op.execute(sa.text("""
        ALTER TABLE orders 
        ALTER COLUMN payment_status TYPE VARCHAR(20) 
        USING payment_status::text
    """))


def downgrade() -> None:
    # Convert back to enum types
    # Note: This assumes the enum types still exist in the database
    
    # Convert order_status back to enum
    op.execute(sa.text("""
        ALTER TABLE orders 
        ALTER COLUMN order_status TYPE orderstatus 
        USING order_status::orderstatus
    """))
    
    # Convert payment_mode back to enum
    op.execute(sa.text("""
        ALTER TABLE orders 
        ALTER COLUMN payment_mode TYPE paymentmode 
        USING payment_mode::paymentmode
    """))
    
    # Convert payment_status back to enum
    op.execute(sa.text("""
        ALTER TABLE orders 
        ALTER COLUMN payment_status TYPE paymentstatus 
        USING payment_status::paymentstatus
    """))
