"""add_delivery_partner_model_and_order_assignment

Revision ID: fb072af66e41
Revises: 747ddb9fe16e
Create Date: 2026-01-11 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'fb072af66e41'
down_revision: Union[str, None] = '747ddb9fe16e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add DELIVERY_PARTNER to UserRole enum
    # Note: Since we're using VARCHAR for enums now, we don't need to alter the enum type
    # But we should ensure the application handles the new role
    
    # Create delivery_partners table
    op.create_table(
        'delivery_partners',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('phone', sa.String(length=15), nullable=False),
        sa.Column('vehicle_type', sa.String(length=50), nullable=True),
        sa.Column('vehicle_number', sa.String(length=20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_available', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_delivery_partners_user_id', 'delivery_partners', ['user_id'], unique=True)
    op.create_index('ix_delivery_partners_phone', 'delivery_partners', ['phone'], unique=True)
    
    # Add delivery_partner_id to orders table
    op.add_column('orders', sa.Column('delivery_partner_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_orders_delivery_partner_id', 'orders', 'delivery_partners', ['delivery_partner_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_orders_delivery_partner_id', 'orders', ['delivery_partner_id'])


def downgrade() -> None:
    # Remove delivery_partner_id from orders
    op.drop_index('ix_orders_delivery_partner_id', table_name='orders')
    op.drop_constraint('fk_orders_delivery_partner_id', 'orders', type_='foreignkey')
    op.drop_column('orders', 'delivery_partner_id')
    
    # Drop delivery_partners table
    op.drop_index('ix_delivery_partners_phone', table_name='delivery_partners')
    op.drop_index('ix_delivery_partners_user_id', table_name='delivery_partners')
    op.drop_table('delivery_partners')
