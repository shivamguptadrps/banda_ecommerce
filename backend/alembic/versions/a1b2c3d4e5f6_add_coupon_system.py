"""add_coupon_system

Revision ID: a1b2c3d4e5f6
Revises: 824e0cac6523
Create Date: 2024-01-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '824e0cac6523'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create coupons table
    op.create_table(
        'coupons',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('discount_type', sa.String(length=20), nullable=False),
        sa.Column('discount_value', sa.Numeric(10, 2), nullable=False),
        sa.Column('min_order_amount', sa.Numeric(10, 2), nullable=False, server_default='0.00'),
        sa.Column('max_discount', sa.Numeric(10, 2), nullable=True),
        sa.Column('expiry_date', sa.DateTime(), nullable=True),
        sa.Column('usage_limit', sa.Integer(), nullable=True),
        sa.Column('used_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_coupons_code'), 'coupons', ['code'], unique=True)
    op.create_index(op.f('ix_coupons_is_active'), 'coupons', ['is_active'], unique=False)
    
    # Create coupon_usages table
    op.create_table(
        'coupon_usages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('coupon_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('discount_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['coupon_id'], ['coupons.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_coupon_usages_coupon_id'), 'coupon_usages', ['coupon_id'], unique=False)
    op.create_index(op.f('ix_coupon_usages_user_id'), 'coupon_usages', ['user_id'], unique=False)
    op.create_index(op.f('ix_coupon_usages_order_id'), 'coupon_usages', ['order_id'], unique=False)
    
    # Add coupon fields to carts table
    op.add_column('carts', sa.Column('coupon_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('carts', sa.Column('discount_amount', sa.Numeric(10, 2), nullable=False, server_default='0.00'))
    op.create_index(op.f('ix_carts_coupon_id'), 'carts', ['coupon_id'], unique=False)
    op.create_foreign_key('fk_carts_coupon', 'carts', 'coupons', ['coupon_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    # Remove foreign key and columns from carts
    op.drop_constraint('fk_carts_coupon', 'carts', type_='foreignkey')
    op.drop_index(op.f('ix_carts_coupon_id'), table_name='carts')
    op.drop_column('carts', 'discount_amount')
    op.drop_column('carts', 'coupon_id')
    
    # Drop coupon_usages table
    op.drop_index(op.f('ix_coupon_usages_order_id'), table_name='coupon_usages')
    op.drop_index(op.f('ix_coupon_usages_user_id'), table_name='coupon_usages')
    op.drop_index(op.f('ix_coupon_usages_coupon_id'), table_name='coupon_usages')
    op.drop_table('coupon_usages')
    
    # Drop coupons table
    op.drop_index(op.f('ix_coupons_is_active'), table_name='coupons')
    op.drop_index(op.f('ix_coupons_code'), table_name='coupons')
    op.drop_table('coupons')

