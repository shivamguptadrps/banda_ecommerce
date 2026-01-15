"""
Delivery Partner Model
Represents delivery partners who deliver orders
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import GUID


class DeliveryPartner(Base):
    """Delivery Partner model for order delivery."""
    
    __tablename__ = "delivery_partners"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    
    # Personal Information
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    phone: Mapped[str] = mapped_column(
        String(15),
        unique=True,
        nullable=False,
        index=True,
    )
    
    # Vehicle Information
    vehicle_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )  # bike, car, bicycle, etc.
    vehicle_number: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )
    
    # Status
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    is_available: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )  # Available to accept new deliveries
    
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
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
    )
    orders: Mapped[list["Order"]] = relationship(
        "Order",
        back_populates="delivery_partner",
        foreign_keys="Order.delivery_partner_id",
    )
    
    def __repr__(self) -> str:
        return f"<DeliveryPartner {self.name} ({self.phone})>"

