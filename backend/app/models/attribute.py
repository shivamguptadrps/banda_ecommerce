"""
Category Attribute and Product Attribute Value Models
Dynamic attribute system with inheritance support
"""

import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Integer, Enum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import GUID
from app.models.enums import AttributeType


class CategoryAttribute(Base):
    """
    Defines attributes that products in a category should have.
    
    Example:
    - Category: Mobile Phones
      - Attribute: RAM (type: SELECT, options: ["4GB", "6GB", "8GB", "12GB"])
      - Attribute: Processor (type: TEXT)
      - Attribute: 5G Support (type: BOOLEAN)
    
    Inheritance:
    - If is_inherited = True, all child categories also get this attribute
    - Electronics → Brand (inherited) → Mobile inherits Brand
    """
    
    __tablename__ = "category_attributes"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Which category this attribute belongs to
    category_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Attribute details
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    slug: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Attribute type
    attribute_type: Mapped[AttributeType] = mapped_column(
        Enum(AttributeType),
        default=AttributeType.TEXT,
        nullable=False,
    )
    
    # Options for SELECT and MULTI_SELECT types
    # Stored as JSON array: ["Option 1", "Option 2", "Option 3"]
    options: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True,
    )
    
    # Unit suffix for NUMBER type (e.g., "GB", "mAh", "MP")
    unit: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )
    
    # Validation
    is_required: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    
    # Inheritance - if True, child categories inherit this attribute
    is_inherited: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    
    # Search & Filter
    is_filterable: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    is_searchable: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    
    # Segment grouping
    segment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("attribute_segments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Display
    display_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    show_in_listing: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    show_in_details: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    
    # Status
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        onupdate=datetime.utcnow,
        nullable=True,
    )
    
    # Relationships
    category: Mapped["Category"] = relationship(
        "Category",
        backref="attributes",
    )
    segment: Mapped[Optional["AttributeSegment"]] = relationship(
        "AttributeSegment",
        back_populates="attributes",
    )
    values: Mapped[List["ProductAttributeValue"]] = relationship(
        "ProductAttributeValue",
        back_populates="attribute",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<CategoryAttribute {self.name} ({self.attribute_type})>"


class ProductAttributeValue(Base):
    """
    Stores the actual attribute values for a product.
    
    Example:
    - Product: iPhone 15 Pro
      - Attribute: RAM → Value: "8GB"
      - Attribute: Processor → Value: "A17 Pro"
      - Attribute: 5G Support → Value: "true"
    """
    
    __tablename__ = "product_attribute_values"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    attribute_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("category_attributes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Value storage (stored as string, parsed based on attribute_type)
    # - TEXT: "Apple A17 Pro"
    # - NUMBER: "4500" (stored as string, unit from attribute)
    # - SELECT: "8GB"
    # - MULTI_SELECT: JSON string '["4G", "5G", "WiFi"]'
    # - BOOLEAN: "true" or "false"
    value: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    
    # For MULTI_SELECT, also store as JSON for easier querying
    value_json: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True,
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        onupdate=datetime.utcnow,
        nullable=True,
    )
    
    # Relationships
    product: Mapped["Product"] = relationship(
        "Product",
        backref="attribute_values",
    )
    attribute: Mapped["CategoryAttribute"] = relationship(
        "CategoryAttribute",
        back_populates="values",
    )
    
    def __repr__(self) -> str:
        return f"<ProductAttributeValue {self.attribute_id}: {self.value}>"
    
    @property
    def parsed_value(self):
        """Parse value based on attribute type."""
        if not self.attribute:
            return self.value
        
        attr_type = self.attribute.attribute_type
        
        if attr_type == AttributeType.NUMBER:
            try:
                return float(self.value)
            except ValueError:
                return self.value
        elif attr_type == AttributeType.BOOLEAN:
            return self.value.lower() in ("true", "1", "yes")
        elif attr_type == AttributeType.MULTI_SELECT:
            return self.value_json or []
        else:
            return self.value

