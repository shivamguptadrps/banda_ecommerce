"""
Return Request Model
Handles product return requests from buyers
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, DateTime, ForeignKey, Text, Numeric, Enum, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import GUID
from app.models.enums import ReturnStatus, ReturnReason


class ReturnRequest(Base):
    """Return request model for product returns."""
    
    __tablename__ = "return_requests"
    
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
    order_item_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("order_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Return details
    reason: Mapped[ReturnReason] = mapped_column(
        Enum(ReturnReason, native_enum=False, length=50),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    images: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )  # Array of image URLs
    
    # Status and processing
    status: Mapped[ReturnStatus] = mapped_column(
        Enum(ReturnStatus, native_enum=False, length=50),
        default=ReturnStatus.REQUESTED,
        nullable=False,
        index=True,
    )
    refund_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.00"),
        nullable=False,
    )
    
    # Admin/Vendor notes
    admin_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    vendor_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    
    # Relationships
    order: Mapped["Order"] = relationship(
        "Order",
        back_populates="return_requests",
    )
    order_item: Mapped["OrderItem"] = relationship(
        "OrderItem",
        back_populates="return_requests",
    )
    buyer: Mapped["User"] = relationship(
        "User",
    )
    refund: Mapped[Optional["Refund"]] = relationship(
        "Refund",
        back_populates="return_request",
        uselist=False,
    )
    
    def __repr__(self) -> str:
        return f"<ReturnRequest {self.id} - Order {self.order_id} - {self.status}>"
    
    @property
    def is_approved(self) -> bool:
        """Check if return is approved."""
        return self.status == ReturnStatus.APPROVED
    
    @property
    def is_completed(self) -> bool:
        """Check if return is completed."""
        return self.status == ReturnStatus.COMPLETED

