"""
Notification Model
In-app notifications for users, vendors, admins, and delivery partners
"""

import uuid
from datetime import datetime
from typing import Optional

from enum import Enum as PyEnum
from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import GUID


class NotificationType(str, PyEnum):
    """Notification type enumeration."""
    # Order notifications
    ORDER_PLACED = "order_placed"
    ORDER_CONFIRMED = "order_confirmed"
    ORDER_PICKED = "order_picked"
    ORDER_PACKED = "order_packed"
    ORDER_OUT_FOR_DELIVERY = "order_out_for_delivery"
    ORDER_DELIVERED = "order_delivered"
    ORDER_CANCELLED = "order_cancelled"
    ORDER_RETURNED = "order_returned"
    
    # Payment notifications
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_REFUNDED = "payment_refunded"
    
    # Vendor notifications
    NEW_ORDER = "new_order"
    LOW_STOCK = "low_stock"
    PRODUCT_APPROVED = "product_approved"
    PRODUCT_REJECTED = "product_rejected"
    
    # Admin notifications
    NEW_VENDOR_REGISTRATION = "new_vendor_registration"
    HIGH_VALUE_ORDER = "high_value_order"
    PAYMENT_FAILURE = "payment_failure"
    
    # Delivery partner notifications
    ORDER_ASSIGNED = "order_assigned"
    DELIVERY_REMINDER = "delivery_reminder"


class NotificationPriority(str, PyEnum):
    """Notification priority enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Notification(Base):
    """Notification model for in-app notifications."""
    
    __tablename__ = "notifications"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Recipient
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Notification details
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, native_enum=False, length=50),
        nullable=False,
        index=True,
    )
    priority: Mapped[NotificationPriority] = mapped_column(
        Enum(NotificationPriority, native_enum=False, length=20),
        default=NotificationPriority.MEDIUM,
        nullable=False,
    )
    
    # Content
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    
    # Action link (optional)
    action_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    action_label: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    
    # Related entity (e.g., order_id, product_id)
    related_entity_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )  # e.g., "order", "product", "vendor"
    related_entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        nullable=True,
        index=True,
    )
    
    # Extra data (JSON data for additional context)
    extra_data: Mapped[Optional[dict]] = mapped_column(
        Text,
        nullable=True,
    )  # Stored as JSON string (renamed from metadata to avoid SQLAlchemy conflict)
    
    # Status
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        backref="notifications",
    )
    
    def __repr__(self) -> str:
        return f"<Notification {self.type.value} for user {self.user_id} - {self.title}>"

