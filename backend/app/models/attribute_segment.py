"""
Attribute Segment Model
Groups attributes into logical segments for better organization
"""

import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import GUID


class AttributeSegment(Base):
    """
    Groups category attributes into logical segments.
    
    Example:
    - Category: Mobile Phones
      - Segment: "Dimensions"
        - Attributes: Width, Height, Depth, Weight
      - Segment: "Display Features"
        - Attributes: Display Size, Resolution, Refresh Rate
      - Segment: "Camera"
        - Attributes: Rear Camera, Front Camera, Video Recording
    """
    
    __tablename__ = "attribute_segments"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Which category this segment belongs to
    category_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Segment details
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    icon: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    
    # Display
    display_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        index=True,
    )
    is_collapsible: Mapped[bool] = mapped_column(
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
        backref="attribute_segments",
    )
    attributes: Mapped[List["CategoryAttribute"]] = relationship(
        "CategoryAttribute",
        back_populates="segment",
        cascade="all, delete-orphan",
        order_by="CategoryAttribute.display_order",
    )
    
    def __repr__(self) -> str:
        return f"<AttributeSegment {self.name} (Category: {self.category_id})>"


