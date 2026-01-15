"""
Coupon Schemas
Pydantic models for coupon operations
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import DiscountType


# ============== Request Schemas ==============

class CouponCreate(BaseModel):
    """Schema for creating a coupon."""
    code: str = Field(..., min_length=3, max_length=50, description="Coupon code")
    description: Optional[str] = Field(None, description="Coupon description")
    discount_type: DiscountType = Field(..., description="PERCENTAGE or FLAT")
    discount_value: Decimal = Field(..., gt=0, description="Discount value (20 for 20% or 100 for ₹100)")
    min_order_amount: Decimal = Field(default=Decimal("0.00"), ge=0, description="Minimum order amount")
    max_discount: Optional[Decimal] = Field(None, gt=0, description="Max discount cap for percentage")
    expiry_date: Optional[datetime] = Field(None, description="Coupon expiry date")
    usage_limit: Optional[int] = Field(None, gt=0, description="Total usage limit")


class CouponUpdate(BaseModel):
    """Schema for updating a coupon."""
    description: Optional[str] = None
    discount_value: Optional[Decimal] = Field(None, gt=0)
    min_order_amount: Optional[Decimal] = Field(None, ge=0)
    max_discount: Optional[Decimal] = Field(None, gt=0)
    expiry_date: Optional[datetime] = None
    usage_limit: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None


class CouponApplyRequest(BaseModel):
    """Schema for applying coupon to cart."""
    coupon_code: str = Field(..., min_length=3, max_length=50)


# ============== Response Schemas ==============

class CouponResponse(BaseModel):
    """Schema for coupon response."""
    id: uuid.UUID
    code: str
    description: Optional[str] = None
    discount_type: DiscountType
    discount_value: Decimal
    min_order_amount: Decimal
    max_discount: Optional[Decimal] = None
    expiry_date: Optional[datetime] = None
    usage_limit: Optional[int] = None
    used_count: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class CouponUsageResponse(BaseModel):
    """Schema for coupon usage response."""
    id: uuid.UUID
    coupon_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    order_id: uuid.UUID
    discount_amount: Decimal
    created_at: datetime
    
    model_config = {"from_attributes": True}


class CouponListResponse(BaseModel):
    """Schema for paginated coupon list."""
    items: list[CouponResponse]
    total: int
    page: int
    size: int
    pages: int


class CouponValidationResponse(BaseModel):
    """Schema for coupon validation response."""
    valid: bool
    discount_amount: Decimal = Decimal("0.00")
    message: str
    coupon: Optional[CouponResponse] = None

