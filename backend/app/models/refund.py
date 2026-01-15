"""
Refund Model
Handles refund processing for returned orders
"""

import uuid
import enum
from datetime import datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, Text, Numeric, Enum

if TYPE_CHECKING:
    import importlib
    from app.models.order import Order
    from app.models.payment import Payment
    # Import return model dynamically since 'return' is a Python keyword
    _return_model = importlib.import_module("app.models.return")
    ReturnRequest = _return_model.ReturnRequest
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import GUID


class RefundStatus(str, enum.Enum):
    """Refund status enumeration."""
    INITIATED = "initiated"
    PROCESSED = "processed"
    FAILED = "failed"


class Refund(Base):
    """Refund model for processing refunds."""
    
    __tablename__ = "refunds"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    payment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("payments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    return_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("return_requests.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
        index=True,
    )
    
    # Refund details
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    razorpay_refund_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    
    # Status
    status: Mapped[RefundStatus] = mapped_column(
        Enum(RefundStatus, native_enum=False),
        default=RefundStatus.INITIATED,
        nullable=False,
        index=True,
    )
    failure_reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    
    # Relationships
    order: Mapped["Order"] = relationship(
        "Order",
        back_populates="refunds",
    )
    payment: Mapped[Optional["Payment"]] = relationship(
        "Payment",
        back_populates="refunds",
    )
    return_request: Mapped[Optional["ReturnRequest"]] = relationship(
        "ReturnRequest",
        back_populates="refund",
    )
    
    def __repr__(self) -> str:
        return f"<Refund {self.id} - Order {self.order_id} - {self.status}>"

