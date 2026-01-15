"""add_phase8_returns_refunds_payouts

Revision ID: phase8_returns_refunds
Revises: a1b2c3d4e5f6
Create Date: 2026-01-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'phase8_returns_refunds'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============== Add Return Policy to Products ==============
    op.add_column('products', sa.Column('return_eligible', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('products', sa.Column('return_window_days', sa.Integer(), nullable=True))
    op.add_column('products', sa.Column('return_conditions', sa.Text(), nullable=True))
    
    # ============== Add Return Policy Snapshot to Order Items ==============
    op.add_column('order_items', sa.Column('return_eligible', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('order_items', sa.Column('return_window_days', sa.Integer(), nullable=True))
    op.add_column('order_items', sa.Column('return_deadline', sa.DateTime(), nullable=True))
    
    # ============== Create Return Requests Table ==============
    op.create_table('return_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('order_item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('buyer_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reason', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('images', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='requested'),
        sa.Column('refund_amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('vendor_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['order_item_id'], ['order_items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['buyer_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_return_requests_order_id'), 'return_requests', ['order_id'], unique=False)
    op.create_index(op.f('ix_return_requests_order_item_id'), 'return_requests', ['order_item_id'], unique=False)
    op.create_index(op.f('ix_return_requests_buyer_id'), 'return_requests', ['buyer_id'], unique=False)
    op.create_index(op.f('ix_return_requests_status'), 'return_requests', ['status'], unique=False)
    
    # ============== Create Refunds Table ==============
    op.create_table('refunds',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('payment_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('return_request_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('razorpay_refund_id', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='initiated'),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['return_request_id'], ['return_requests.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('return_request_id')
    )
    op.create_index(op.f('ix_refunds_order_id'), 'refunds', ['order_id'], unique=False)
    op.create_index(op.f('ix_refunds_payment_id'), 'refunds', ['payment_id'], unique=False)
    op.create_index(op.f('ix_refunds_return_request_id'), 'refunds', ['return_request_id'], unique=False)
    op.create_index(op.f('ix_refunds_razorpay_refund_id'), 'refunds', ['razorpay_refund_id'], unique=False)
    op.create_index(op.f('ix_refunds_status'), 'refunds', ['status'], unique=False)
    
    # ============== Create Vendor Payouts Table ==============
    op.create_table('vendor_payouts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('vendor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('total_orders', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('gross_amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('commission_amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('refund_deductions', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('net_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('transaction_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vendor_payouts_vendor_id'), 'vendor_payouts', ['vendor_id'], unique=False)
    op.create_index(op.f('ix_vendor_payouts_status'), 'vendor_payouts', ['status'], unique=False)
    op.create_index(op.f('ix_vendor_payouts_transaction_id'), 'vendor_payouts', ['transaction_id'], unique=False)
    
    # ============== Create Vendor Payout Items Table ==============
    op.create_table('vendor_payout_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('payout_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('order_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('commission', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('net_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['payout_id'], ['vendor_payouts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vendor_payout_items_payout_id'), 'vendor_payout_items', ['payout_id'], unique=False)
    op.create_index(op.f('ix_vendor_payout_items_order_id'), 'vendor_payout_items', ['order_id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index(op.f('ix_vendor_payout_items_order_id'), table_name='vendor_payout_items')
    op.drop_index(op.f('ix_vendor_payout_items_payout_id'), table_name='vendor_payout_items')
    op.drop_table('vendor_payout_items')
    
    op.drop_index(op.f('ix_vendor_payouts_transaction_id'), table_name='vendor_payouts')
    op.drop_index(op.f('ix_vendor_payouts_status'), table_name='vendor_payouts')
    op.drop_index(op.f('ix_vendor_payouts_vendor_id'), table_name='vendor_payouts')
    op.drop_table('vendor_payouts')
    
    op.drop_index(op.f('ix_refunds_status'), table_name='refunds')
    op.drop_index(op.f('ix_refunds_razorpay_refund_id'), table_name='refunds')
    op.drop_index(op.f('ix_refunds_return_request_id'), table_name='refunds')
    op.drop_index(op.f('ix_refunds_payment_id'), table_name='refunds')
    op.drop_index(op.f('ix_refunds_order_id'), table_name='refunds')
    op.drop_table('refunds')
    
    op.drop_index(op.f('ix_return_requests_status'), table_name='return_requests')
    op.drop_index(op.f('ix_return_requests_buyer_id'), table_name='return_requests')
    op.drop_index(op.f('ix_return_requests_order_item_id'), table_name='return_requests')
    op.drop_index(op.f('ix_return_requests_order_id'), table_name='return_requests')
    op.drop_table('return_requests')
    
    # Remove columns from order_items
    op.drop_column('order_items', 'return_deadline')
    op.drop_column('order_items', 'return_window_days')
    op.drop_column('order_items', 'return_eligible')
    
    # Remove columns from products
    op.drop_column('products', 'return_conditions')
    op.drop_column('products', 'return_window_days')
    op.drop_column('products', 'return_eligible')

