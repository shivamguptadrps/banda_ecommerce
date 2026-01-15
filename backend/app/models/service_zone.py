"""
Service Zone Model
Defines delivery areas and associated fees
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import GUID


class ServiceZone(Base):
    """Service zone model for delivery area configuration."""
    
    __tablename__ = "service_zones"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Zone identification
    zone_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    city: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    
    # Geographic center of the zone
    center_latitude: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 8),
        nullable=True,
    )
    center_longitude: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(11, 8),
        nullable=True,
    )
    
    # Zone boundary (circular)
    radius_km: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        default=Decimal("5.0"),
        nullable=False,
    )
    
    # Delivery settings
    delivery_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.0"),
        nullable=False,
    )
    min_order_value: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.0"),
        nullable=False,
    )
    estimated_time_mins: Mapped[int] = mapped_column(
        Integer,
        default=30,
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
    
    def __repr__(self) -> str:
        return f"<ServiceZone {self.zone_name} - {self.city}>"
