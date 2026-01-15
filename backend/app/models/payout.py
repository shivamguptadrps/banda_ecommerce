"""
Vendor Payout Models
Handles vendor earnings and payout processing
"""

import uuid
import enum
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import String, DateTime, ForeignKey, Numeric, Integer, Enum, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import GUID


class PayoutStatus(str, enum.Enum):
    """Payout status enumeration."""
    PENDING = "pending"
    PROCESSED = "processed"
    FAILED = "failed"


class VendorPayout(Base):
    """Vendor payout model for payment settlements."""
    
    __tablename__ = "vendor_payouts"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("vendors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Period
    period_start: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    period_end: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    
    # Summary
    total_orders: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    gross_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.00"),
        nullable=False,
    )
    commission_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.00"),
        nullable=False,
    )
    refund_deductions: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.00"),
        nullable=False,
    )
    net_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    
    # Status
    status: Mapped[PayoutStatus] = mapped_column(
        Enum(PayoutStatus, native_enum=False),
        default=PayoutStatus.PENDING,
        nullable=False,
        index=True,
    )
    transaction_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
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
    vendor: Mapped["Vendor"] = relationship(
        "Vendor",
        back_populates="payouts",
    )
    items: Mapped[List["VendorPayoutItem"]] = relationship(
        "VendorPayoutItem",
        back_populates="payout",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<VendorPayout {self.id} - Vendor {self.vendor_id} - {self.status}>"


class VendorPayoutItem(Base):
    """Individual order item in a vendor payout."""
    
    __tablename__ = "vendor_payout_items"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    payout_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("vendor_payouts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Amounts
    order_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    commission: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    net_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    
    # Relationships
    payout: Mapped["VendorPayout"] = relationship(
        "VendorPayout",
        back_populates="items",
    )
    order: Mapped["Order"] = relationship(
        "Order",
    )
    
    def __repr__(self) -> str:
        return f"<VendorPayoutItem {self.id} - Payout {self.payout_id}>"

