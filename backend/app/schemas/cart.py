"""
Cart Schemas
Pydantic models for shopping cart
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field

from app.schemas.product import SellUnitResponse


# ============== Request Schemas ==============

class CartItemAdd(BaseModel):
    """Schema for adding item to cart."""
    product_id: uuid.UUID
    sell_unit_id: uuid.UUID
    quantity: int = Field(..., ge=1, le=100)


class CartItemUpdate(BaseModel):
    """Schema for updating cart item quantity."""
    quantity: int = Field(..., ge=1, le=100)


# ============== Response Schemas ==============

class CartItemProduct(BaseModel):
    """Minimal product info for cart display."""
    id: uuid.UUID
    name: str
    slug: str
    primary_image: Optional[str] = None
    vendor_id: uuid.UUID
    vendor_name: Optional[str] = None
    is_active: bool
    is_in_stock: bool
    
    model_config = {"from_attributes": True}


class CartItemResponse(BaseModel):
    """Schema for cart item response."""
    id: uuid.UUID
    cart_id: uuid.UUID
    product_id: uuid.UUID
    sell_unit_id: uuid.UUID
    quantity: int
    line_total: Decimal
    stock_quantity_needed: Decimal
    created_at: datetime
    updated_at: datetime
    
    # Related data
    product: Optional[CartItemProduct] = None
    sell_unit: Optional[SellUnitResponse] = None
    
    model_config = {"from_attributes": True}


class CartResponse(BaseModel):
    """Schema for cart response."""
    id: uuid.UUID
    buyer_id: uuid.UUID
    total_items: int
    subtotal: Decimal
    discount_amount: Decimal = Decimal("0.00")
    coupon_code: Optional[str] = None
    is_empty: bool
    items: List[CartItemResponse]
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class CartSummary(BaseModel):
    """Schema for cart summary (checkout preview)."""
    subtotal: Decimal
    delivery_fee: Decimal
    discount_amount: Decimal = Decimal("0.00")
    tax_amount: Decimal = Decimal("0.00")
    total_amount: Decimal
    total_items: int
    
    # Delivery info
    delivery_address_id: Optional[uuid.UUID] = None
    estimated_delivery_mins: Optional[int] = None
    
    # Validation
    is_valid: bool = True
    validation_errors: List[str] = []

