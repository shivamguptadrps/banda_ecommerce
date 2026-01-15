"""
Product, ProductImage, SellUnit, and Inventory Models
Core models for product catalog and stock management
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Integer, Numeric, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import GUID
from app.models.enums import StockUnit


class Product(Base):
    """Product model for items sold by vendors."""
    
    __tablename__ = "products"
    
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
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Basic info
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    slug: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Stock configuration
    stock_unit: Mapped[StockUnit] = mapped_column(
        Enum(StockUnit),
        default=StockUnit.PIECE,
        nullable=False,
    )
    
    # Status
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    
    # Return Policy (Mandatory - vendor must set during product creation)
    return_eligible: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,  # REQUIRED - no default, vendor must choose
    )
    return_window_days: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,  # NULL if return_eligible = False, required if True
    )
    return_conditions: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,  # Optional notes/conditions
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
    vendor: Mapped["Vendor"] = relationship(
        "Vendor",
        backref="products",
    )
    category: Mapped[Optional["Category"]] = relationship(
        "Category",
        backref="products",
    )
    images: Mapped[List["ProductImage"]] = relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.display_order",
    )
    sell_units: Mapped[List["SellUnit"]] = relationship(
        "SellUnit",
        back_populates="product",
        cascade="all, delete-orphan",
    )
    inventory: Mapped[Optional["Inventory"]] = relationship(
        "Inventory",
        back_populates="product",
        uselist=False,
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<Product {self.name}>"
    
    @property
    def primary_image(self) -> Optional[str]:
        """Get primary image URL."""
        for img in self.images:
            if img.is_primary:
                return img.image_url
        return self.images[0].image_url if self.images else None
    
    @property
    def min_price(self) -> Optional[Decimal]:
        """Get minimum price from sell units."""
        active_units = [u for u in self.sell_units if u.is_active]
        if not active_units:
            return None
        return min(u.price for u in active_units)
    
    @property
    def max_price(self) -> Optional[Decimal]:
        """Get maximum price from sell units."""
        active_units = [u for u in self.sell_units if u.is_active]
        if not active_units:
            return None
        return max(u.price for u in active_units)
    
    @property
    def is_in_stock(self) -> bool:
        """Check if product has available stock."""
        if not self.inventory:
            return False
        return self.inventory.available_quantity > 0


class ProductImage(Base):
    """Product image model for multiple images per product."""
    
    __tablename__ = "product_images"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    image_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    display_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    
    # Relationships
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="images",
    )
    
    def __repr__(self) -> str:
        return f"<ProductImage {self.id}>"


class SellUnit(Base):
    """
    Sell unit model for flexible product pricing.
    
    Examples:
    - Product: Apples (stock_unit: KG)
      - Sell Unit 1: "500g" (unit_value: 0.5, price: 60)
      - Sell Unit 2: "1 Kg" (unit_value: 1.0, price: 110)
      - Sell Unit 3: "5 Kg Box" (unit_value: 5.0, price: 500)
    
    - Product: Eggs (stock_unit: PIECE)
      - Sell Unit 1: "6 Eggs" (unit_value: 6, price: 60)
      - Sell Unit 2: "12 Eggs" (unit_value: 12, price: 110)
      - Sell Unit 3: "30 Eggs Tray" (unit_value: 30, price: 250)
    """
    
    __tablename__ = "sell_units"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Display label (e.g., "500g", "1 Dozen", "Pack of 6")
    label: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    
    # Quantity in terms of product's stock_unit
    # If stock_unit is KG and label is "500g", unit_value = 0.5
    unit_value: Mapped[Decimal] = mapped_column(
        Numeric(10, 3),
        nullable=False,
    )
    
    # Price for this sell unit
    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    
    # Compare at price (for showing discounts)
    compare_price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
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
    
    # Relationships
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="sell_units",
    )
    
    def __repr__(self) -> str:
        return f"<SellUnit {self.label} @ {self.price}>"
    
    @property
    def discount_percent(self) -> Optional[int]:
        """Calculate discount percentage if compare_price exists."""
        if self.compare_price and self.compare_price > self.price:
            discount = ((self.compare_price - self.price) / self.compare_price) * 100
            return int(discount)
        return None


class Inventory(Base):
    """
    Inventory model for stock tracking.
    
    - available_quantity: Stock available for purchase
    - reserved_quantity: Stock reserved by pending orders
    
    Total stock = available_quantity + reserved_quantity
    """
    
    __tablename__ = "inventory"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    
    # Stock quantities (in product's stock_unit)
    available_quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 3),
        default=Decimal("0"),
        nullable=False,
    )
    reserved_quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 3),
        default=Decimal("0"),
        nullable=False,
    )
    
    # Low stock alert threshold
    low_stock_threshold: Mapped[Decimal] = mapped_column(
        Numeric(10, 3),
        default=Decimal("10"),
        nullable=False,
    )
    
    # Timestamps
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    
    # Relationships
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="inventory",
    )
    
    def __repr__(self) -> str:
        return f"<Inventory {self.product_id}: {self.available_quantity}>"
    
    @property
    def total_quantity(self) -> Decimal:
        """Total stock including reserved."""
        return self.available_quantity + self.reserved_quantity
    
    @property
    def is_low_stock(self) -> bool:
        """Check if stock is below threshold."""
        return self.available_quantity <= self.low_stock_threshold
    
    @property
    def is_out_of_stock(self) -> bool:
        """Check if out of stock."""
        return self.available_quantity <= 0
