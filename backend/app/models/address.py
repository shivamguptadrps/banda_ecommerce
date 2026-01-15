"""
Delivery Address Model
Stores buyer delivery addresses with coordinates
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import GUID


class DeliveryAddress(Base):
    """Delivery address model for buyers."""
    
    __tablename__ = "delivery_addresses"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Address label
    label: Mapped[str] = mapped_column(
        String(50),
        default="Home",
        nullable=False,
    )
    
    # Recipient info
    recipient_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    recipient_phone: Mapped[str] = mapped_column(
        String(15),
        nullable=False,
    )
    
    # Address details
    address_line_1: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    address_line_2: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    city: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    state: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    pincode: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )
    landmark: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    
    # Coordinates
    latitude: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 8),
        nullable=True,
    )
    longitude: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(11, 8),
        nullable=True,
    )
    
    # Status
    is_default: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
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
    buyer: Mapped["User"] = relationship(
        "User",
        backref="delivery_addresses",
    )
    
    def __repr__(self) -> str:
        return f"<DeliveryAddress {self.label} - {self.city}>"
    
    @property
    def full_address(self) -> str:
        """Get formatted full address."""
        parts = [self.address_line_1]
        if self.address_line_2:
            parts.append(self.address_line_2)
        if self.landmark:
            parts.append(f"Near {self.landmark}")
        parts.append(f"{self.city}, {self.state} - {self.pincode}")
        return ", ".join(parts)

