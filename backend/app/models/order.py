"""
Order, OrderItem, and StockReservation Models
Order management and stock reservation system
"""

import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import String, DateTime, ForeignKey, Text, Numeric, Integer, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import GUID
from app.models.enums import OrderStatus, PaymentStatus, PaymentMode


class Order(Base):
    """Order model for purchases."""
    
    __tablename__ = "orders"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    order_number: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
    )
    
    # Parties involved
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("vendors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    delivery_partner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("delivery_partners.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Delivery address (snapshot)
    delivery_address_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("delivery_addresses.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Address snapshot for historical record
    delivery_address_snapshot: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    delivery_latitude: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 8),
        nullable=True,
    )
    delivery_longitude: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(11, 8),
        nullable=True,
    )
    delivery_distance_km: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
        nullable=True,
    )
    
    # Amounts
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    delivery_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.00"),
        nullable=False,
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.00"),
        nullable=False,
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.00"),
        nullable=False,
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    
    # Payment info
    payment_mode: Mapped[PaymentMode] = mapped_column(
        Enum(PaymentMode, native_enum=False, length=20),
        default=PaymentMode.ONLINE,
        nullable=False,
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, native_enum=False, length=20),
        default=PaymentStatus.PENDING,
        nullable=False,
    )
    
    # Order status
    order_status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, native_enum=False, length=50),
        default=OrderStatus.PLACED,
        nullable=False,
        index=True,
    )
    
    # Notes
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    cancellation_reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Delivery OTP (for delivery confirmation)
    delivery_otp: Mapped[Optional[str]] = mapped_column(
        String(6),
        nullable=True,
        index=True,
    )  # 6-digit OTP for delivery confirmation
    
    # Status timestamps
    placed_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    picked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    packed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    out_for_delivery_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    # Legacy timestamps (for backward compatibility)
    processing_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    shipped_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
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
    buyer: Mapped[Optional["User"]] = relationship(
        "User",
        backref="orders",
    )
    vendor: Mapped[Optional["Vendor"]] = relationship(
        "Vendor",
        backref="orders",
    )
    delivery_partner: Mapped[Optional["DeliveryPartner"]] = relationship(
        "DeliveryPartner",
        back_populates="orders",
    )
    delivery_address: Mapped[Optional["DeliveryAddress"]] = relationship(
        "DeliveryAddress",
    )
    items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    stock_reservations: Mapped[List["StockReservation"]] = relationship(
        "StockReservation",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    payments: Mapped[List["Payment"]] = relationship(
        "Payment",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    return_requests: Mapped[List["ReturnRequest"]] = relationship(
        "ReturnRequest",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    refunds: Mapped[List["Refund"]] = relationship(
        "Refund",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<Order {self.order_number}>"
    
    @property
    def is_cancellable(self) -> bool:
        """Check if order can be cancelled."""
        return self.order_status in [OrderStatus.PENDING, OrderStatus.CONFIRMED]
    
    @property
    def total_items(self) -> int:
        """Get total number of items."""
        return sum(item.quantity for item in self.items)


class OrderItem(Base):
    """Order item model with price snapshot."""
    
    __tablename__ = "order_items"
    
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
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )
    sell_unit_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("sell_units.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    # Snapshots (preserve historical data)
    product_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    sell_unit_label: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    unit_value: Mapped[Decimal] = mapped_column(
        Numeric(10, 3),
        nullable=False,
    )
    
    # Quantity and pricing
    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    price_per_unit: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    total_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    
    # Return Policy Snapshot (from product at order time)
    return_eligible: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    return_window_days: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,  # NULL if not returnable
    )
    return_deadline: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,  # Calculated: delivered_at + return_window_days
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    
    # Relationships
    order: Mapped["Order"] = relationship(
        "Order",
        back_populates="items",
    )
    product: Mapped[Optional["Product"]] = relationship(
        "Product",
    )
    sell_unit: Mapped[Optional["SellUnit"]] = relationship(
        "SellUnit",
    )
    return_requests: Mapped[List["ReturnRequest"]] = relationship(
        "ReturnRequest",
        back_populates="order_item",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<OrderItem {self.product_name} x {self.quantity}>"
    
    @property
    def stock_quantity_used(self) -> Decimal:
        """Calculate stock quantity used (in stock_unit)."""
        return self.unit_value * self.quantity


class StockReservation(Base):
    """
    Stock reservation model for pending orders.
    
    Flow:
    1. Order placed → Stock reserved (ACTIVE)
    2. Payment success → Reservation confirmed (CONFIRMED), stock deducted
    3. Payment failed / Timeout → Reservation released (RELEASED)
    """
    
    __tablename__ = "stock_reservations"
    
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
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Reservation details
    reserved_quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 3),
        nullable=False,
    )
    
    # Expiration (default 10 minutes for payment)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )
    
    # Status
    status: Mapped[str] = mapped_column(
        String(20),
        default="active",
        nullable=False,
        index=True,
    )  # active, confirmed, released
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    released_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    
    # Relationships
    order: Mapped["Order"] = relationship(
        "Order",
        back_populates="stock_reservations",
    )
    product: Mapped["Product"] = relationship(
        "Product",
    )
    
    def __repr__(self) -> str:
        return f"<StockReservation {self.order_id} - {self.product_id}>"
    
    @property
    def is_expired(self) -> bool:
        """Check if reservation has expired."""
        return datetime.utcnow() > self.expires_at and self.status == "active"
    
    @classmethod
    def create_expiration(cls, minutes: int = 10) -> datetime:
        """Create expiration timestamp."""
        return datetime.utcnow() + timedelta(minutes=minutes)

