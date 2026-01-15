"""add_placed_picked_packed_statuses_and_timestamps

Revision ID: e460fe00f043
Revises: f3b0ee454491
Create Date: 2026-01-11 17:33:33.429076

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e460fe00f043'
down_revision: Union[str, None] = 'f3b0ee454491'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Add new timestamp columns FIRST (before enum changes)
    op.add_column('orders', sa.Column('picked_at', sa.DateTime(), nullable=True))
    op.add_column('orders', sa.Column('packed_at', sa.DateTime(), nullable=True))
    op.add_column('orders', sa.Column('out_for_delivery_at', sa.DateTime(), nullable=True))
    
    # Step 2: Add new enum values
    # Postgres requires ALTER TYPE ... ADD VALUE to run outside a transaction.
    # Alembic provides an autocommit block for this.
    new_values = ["placed", "picked", "packed", "out_for_delivery"]
    with op.get_context().autocommit_block():
        for value in new_values:
            # DDL can't be reliably parameterized across drivers; values are fixed constants here.
            op.execute(sa.text(f"ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS '{value}'"))
    
    # Step 3: Migrate existing data (now enum values are available)
    # PENDING -> PLACED
    op.execute(sa.text("""
        UPDATE orders 
        SET order_status = 'placed'::orderstatus
        WHERE order_status::text = 'pending'
    """))
    
    # PROCESSING -> PICKED
    op.execute(sa.text("""
        UPDATE orders 
        SET order_status = 'picked'::orderstatus, picked_at = processing_at
        WHERE order_status::text = 'processing' AND processing_at IS NOT NULL
    """))
    op.execute(sa.text("""
        UPDATE orders 
        SET order_status = 'picked'::orderstatus
        WHERE order_status::text = 'processing' AND processing_at IS NULL
    """))
    
    # SHIPPED -> OUT_FOR_DELIVERY
    op.execute(sa.text("""
        UPDATE orders 
        SET order_status = 'out_for_delivery'::orderstatus, out_for_delivery_at = shipped_at
        WHERE order_status::text = 'shipped' AND shipped_at IS NOT NULL
    """))
    op.execute(sa.text("""
        UPDATE orders 
        SET order_status = 'out_for_delivery'::orderstatus
        WHERE order_status::text = 'shipped' AND shipped_at IS NULL
    """))


def downgrade() -> None:
    # Migrate data back to old statuses
    # PLACED -> PENDING
    op.execute("""
        UPDATE orders 
        SET order_status = 'pending' 
        WHERE order_status = 'placed'
    """)
    
    # PICKED -> PROCESSING
    op.execute("""
        UPDATE orders 
        SET order_status = 'processing', processing_at = picked_at
        WHERE order_status = 'picked' AND picked_at IS NOT NULL
    """)
    op.execute("""
        UPDATE orders 
        SET order_status = 'processing'
        WHERE order_status = 'picked' AND picked_at IS NULL
    """)
    
    # OUT_FOR_DELIVERY -> SHIPPED
    op.execute("""
        UPDATE orders 
        SET order_status = 'shipped', shipped_at = out_for_delivery_at
        WHERE order_status = 'out_for_delivery' AND out_for_delivery_at IS NOT NULL
    """)
    op.execute("""
        UPDATE orders 
        SET order_status = 'shipped'
        WHERE order_status = 'out_for_delivery' AND out_for_delivery_at IS NULL
    """)
    
    # Remove new columns
    op.drop_column('orders', 'out_for_delivery_at')
    op.drop_column('orders', 'packed_at')
    op.drop_column('orders', 'picked_at')
    
    # Note: We cannot remove enum values in PostgreSQL easily, so we leave them

