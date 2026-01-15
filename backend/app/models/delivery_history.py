"""
Delivery History Model
Tracks delivery partner performance and history
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from enum import Enum as PyEnum
from sqlalchemy import String, DateTime, ForeignKey, Text, Numeric, Integer, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import GUID


class DeliveryAttemptStatus(str, PyEnum):
    """Delivery attempt status."""
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"


class DeliveryFailureReason(str, PyEnum):
    """Reasons for delivery failure."""
    CUSTOMER_NOT_AVAILABLE = "customer_not_available"
    WRONG_ADDRESS = "wrong_address"
    CUSTOMER_REFUSED = "customer_refused"
    DAMAGED_PACKAGE = "damaged_package"
    OTHER = "other"


class DeliveryHistory(Base):
    """Delivery history for tracking delivery partner performance."""
    
    __tablename__ = "delivery_history"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Relationships
    order_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    delivery_partner_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("delivery_partners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Delivery details
    attempt_number: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )  # 1 = first attempt, 2 = retry, etc.
    
    status: Mapped[DeliveryAttemptStatus] = mapped_column(
        Enum(DeliveryAttemptStatus, native_enum=False, length=20),
        default=DeliveryAttemptStatus.PENDING,
        nullable=False,
    )
    
    # COD Collection
    is_cod: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    cod_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
    )
    cod_collected: Mapped[Optional[bool]] = mapped_column(
        Boolean,
        nullable=True,
    )  # True = collected, False = not collected, None = not applicable
    cod_collected_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    
    # Failure details
    failure_reason: Mapped[Optional[DeliveryFailureReason]] = mapped_column(
        Enum(DeliveryFailureReason, native_enum=False, length=50),
        nullable=True,
    )
    failure_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Timestamps
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )  # When order was assigned to delivery partner
    attempted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )  # When delivery was attempted
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )  # When delivery was completed (success or final failure)
    
    # Performance metrics
    delivery_time_minutes: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )  # Time from assigned to completed (in minutes)
    
    # Relationships
    order: Mapped["Order"] = relationship(
        "Order",
        backref="delivery_history",
    )
    delivery_partner: Mapped["DeliveryPartner"] = relationship(
        "DeliveryPartner",
        backref="delivery_history",
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
        return f"<DeliveryHistory order={self.order_id} partner={self.delivery_partner_id} attempt={self.attempt_number}>"

