"""
Vendor Model
Represents shop owners who sell products on the platform
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import GUID


class Vendor(Base):
    """Vendor/Shop model for sellers on the platform."""
    
    __tablename__ = "vendors"
    
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
    
    # Shop Information
    shop_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    logo_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    
    # Address
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
        index=True,
    )
    state: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    pincode: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )
    
    # Coordinates for location-based services
    latitude: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 8),
        nullable=True,
    )
    longitude: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(11, 8),
        nullable=True,
    )
    
    # Delivery settings
    delivery_radius_km: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        default=Decimal("5.0"),
        nullable=False,
    )
    
    # Contact
    phone: Mapped[Optional[str]] = mapped_column(
        String(15),
        nullable=True,
    )
    
    # Status and verification
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    
    # Ratings and stats
    rating: Mapped[Decimal] = mapped_column(
        Numeric(2, 1),
        default=Decimal("0.0"),
        nullable=False,
    )
    total_orders: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )
    total_reviews: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )
    
    # Commission and payment settings
    commission_percent: Mapped[Decimal] = mapped_column(
        Numeric(4, 2),
        default=Decimal("10.0"),
        nullable=False,
    )
    cod_enabled: Mapped[bool] = mapped_column(
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
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        backref="vendor",
    )
    payouts: Mapped[List["VendorPayout"]] = relationship(
        "VendorPayout",
        back_populates="vendor",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<Vendor {self.shop_name}>"
