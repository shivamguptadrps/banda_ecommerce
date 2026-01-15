"""
Cart and CartItem Models
Shopping cart for buyers
"""

import uuid
from datetime import datetime
from typing import Optional, List
from decimal import Decimal

from sqlalchemy import Integer, DateTime, ForeignKey, UniqueConstraint, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import GUID


class Cart(Base):
    """Shopping cart model for buyers."""
    
    __tablename__ = "carts"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    
    # Coupon fields
    coupon_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("coupons.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.00"),
        nullable=False,
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    
    # Relationships
    buyer: Mapped["User"] = relationship(
        "User",
        backref="cart",
    )
    items: Mapped[List["CartItem"]] = relationship(
        "CartItem",
        back_populates="cart",
        cascade="all, delete-orphan",
    )
    coupon: Mapped[Optional["Coupon"]] = relationship(
        "Coupon",
    )
    
    def __repr__(self) -> str:
        return f"<Cart {self.buyer_id}>"
    
    @property
    def total_items(self) -> int:
        """Get total number of items in cart."""
        return sum(item.quantity for item in self.items)
    
    @property
    def subtotal(self) -> Decimal:
        """Calculate cart subtotal."""
        return sum(item.line_total for item in self.items)
    
    @property
    def is_empty(self) -> bool:
        """Check if cart is empty."""
        return len(self.items) == 0


class CartItem(Base):
    """Cart item model linking products to carts."""
    
    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint('cart_id', 'sell_unit_id', name='uq_cart_sell_unit'),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    cart_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("carts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sell_unit_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("sell_units.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Quantity (number of sell units)
    quantity: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    
    # Relationships
    cart: Mapped["Cart"] = relationship(
        "Cart",
        back_populates="items",
    )
    product: Mapped["Product"] = relationship(
        "Product",
    )
    sell_unit: Mapped["SellUnit"] = relationship(
        "SellUnit",
    )
    
    def __repr__(self) -> str:
        return f"<CartItem {self.product_id} x {self.quantity}>"
    
    @property
    def line_total(self) -> Decimal:
        """Calculate line total for this item."""
        return self.sell_unit.price * self.quantity
    
    @property
    def stock_quantity_needed(self) -> Decimal:
        """Calculate stock quantity needed (in stock_unit)."""
        return self.sell_unit.unit_value * self.quantity

