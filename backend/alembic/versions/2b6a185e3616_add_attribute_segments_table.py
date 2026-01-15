"""add_attribute_segments_table

Revision ID: 2b6a185e3616
Revises: phase8_returns_refunds
Create Date: 2026-01-13 15:46:03.473804

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '2b6a185e3616'
down_revision: Union[str, None] = 'phase8_returns_refunds'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create attribute_segments table
    op.create_table(
        'attribute_segments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_collapsible', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f('ix_attribute_segments_category_id'),
        'attribute_segments',
        ['category_id'],
        unique=False
    )
    op.create_index(
        op.f('ix_attribute_segments_display_order'),
        'attribute_segments',
        ['display_order'],
        unique=False
    )
    
    # Add segment_id to category_attributes table
    op.add_column(
        'category_attributes',
        sa.Column('segment_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_category_attributes_segment_id',
        'category_attributes',
        'attribute_segments',
        ['segment_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index(
        op.f('ix_category_attributes_segment_id'),
        'category_attributes',
        ['segment_id'],
        unique=False
    )


def downgrade() -> None:
    # Remove segment_id from category_attributes
    op.drop_index(op.f('ix_category_attributes_segment_id'), table_name='category_attributes')
    op.drop_constraint('fk_category_attributes_segment_id', 'category_attributes', type_='foreignkey')
    op.drop_column('category_attributes', 'segment_id')
    
    # Drop attribute_segments table
    op.drop_index(op.f('ix_attribute_segments_display_order'), table_name='attribute_segments')
    op.drop_index(op.f('ix_attribute_segments_category_id'), table_name='attribute_segments')
    op.drop_table('attribute_segments')

