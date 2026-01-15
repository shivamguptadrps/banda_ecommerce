"""
Order Schemas
Pydantic models for order management
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field

from app.models.enums import OrderStatus, PaymentStatus, PaymentMode


# ============== Request Schemas ==============

class OrderCreate(BaseModel):
    """Schema for placing an order."""
    delivery_address_id: uuid.UUID
    payment_mode: PaymentMode = PaymentMode.ONLINE
    notes: Optional[str] = Field(None, max_length=500)
    coupon_code: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    """Schema for updating order status (vendor)."""
    status: OrderStatus
    notes: Optional[str] = None


class OrderCancel(BaseModel):
    """Schema for cancelling an order."""
    reason: str = Field(..., min_length=10, max_length=500)


# ============== Response Schemas ==============

class OrderItemResponse(BaseModel):
    """Schema for order item response."""
    id: uuid.UUID
    order_id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    sell_unit_id: Optional[uuid.UUID] = None
    product_name: str
    sell_unit_label: str
    unit_value: Decimal
    quantity: int
    price_per_unit: Decimal
    total_price: Decimal
    stock_quantity_used: Decimal
    # Return policy snapshot
    return_eligible: bool = False
    return_window_days: Optional[int] = None
    return_deadline: Optional[datetime] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


class OrderVendorInfo(BaseModel):
    """Minimal vendor info for order."""
    id: uuid.UUID
    shop_name: str
    phone: Optional[str] = None
    
    model_config = {"from_attributes": True}


class OrderAddressSnapshot(BaseModel):
    """Delivery address snapshot."""
    full_address: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None


class OrderResponse(BaseModel):
    """Schema for order response."""
    id: uuid.UUID
    order_number: str
    buyer_id: Optional[uuid.UUID] = None
    vendor_id: Optional[uuid.UUID] = None
    
    # Amounts
    subtotal: Decimal
    delivery_fee: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    
    # Payment
    payment_mode: PaymentMode
    payment_status: PaymentStatus
    razorpay_order_id: Optional[str] = None  # For online payments - Razorpay order ID
    
    # Status
    order_status: OrderStatus
    
    # Delivery
    delivery_address_snapshot: Optional[str] = None
    delivery_distance_km: Optional[Decimal] = None
    delivery_otp: Optional[str] = None  # 6-digit OTP for delivery confirmation (visible to buyer)
    
    # Notes
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None
    
    # Status timestamps
    placed_at: datetime
    confirmed_at: Optional[datetime] = None
    processing_at: Optional[datetime] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    
    # Items
    items: List[OrderItemResponse] = []
    total_items: int
    is_cancellable: bool
    
    # Related
    vendor: Optional[OrderVendorInfo] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    """Schema for paginated order list."""
    items: List[OrderResponse]
    total: int
    page: int
    size: int
    pages: int


class OrderBriefResponse(BaseModel):
    """Brief order info for listings."""
    id: uuid.UUID
    order_number: str
    total_amount: Decimal
    total_items: int
    order_status: OrderStatus
    payment_status: PaymentStatus
    placed_at: datetime
    vendor_name: Optional[str] = None
    
    model_config = {"from_attributes": True}


# ============== Vendor Order Schemas ==============

class VendorOrderResponse(OrderResponse):
    """Order response with buyer info for vendor."""
    buyer_name: Optional[str] = None
    buyer_phone: Optional[str] = None
    # Payment info is inherited from OrderResponse (includes razorpay_order_id)


class VendorOrderListResponse(BaseModel):
    """Schema for vendor's order list."""
    items: List[VendorOrderResponse]
    total: int
    page: int
    size: int
    pages: int


# ============== Stock Reservation Schemas ==============

class StockReservationResponse(BaseModel):
    """Schema for stock reservation response."""
    id: uuid.UUID
    order_id: uuid.UUID
    product_id: uuid.UUID
    reserved_quantity: Decimal
    expires_at: datetime
    status: str
    is_expired: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}

