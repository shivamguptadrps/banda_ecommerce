"""
Vendor Schemas
Pydantic models for vendor request/response validation
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field, field_validator


# ============== Base Schemas ==============

class VendorBase(BaseModel):
    """Base vendor schema with common fields."""
    shop_name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    address_line_1: str = Field(..., min_length=5, max_length=255)
    address_line_2: Optional[str] = Field(None, max_length=255)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^\d{6}$")
    phone: Optional[str] = Field(None, pattern=r"^[6-9]\d{9}$")


# ============== Request Schemas ==============

class VendorCreate(VendorBase):
    """Schema for vendor registration."""
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    delivery_radius_km: Decimal = Field(default=Decimal("5.0"), ge=1, le=50)


class VendorUpdate(BaseModel):
    """Schema for updating vendor profile."""
    shop_name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    address_line_1: Optional[str] = Field(None, min_length=5, max_length=255)
    address_line_2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    phone: Optional[str] = Field(None, pattern=r"^[6-9]\d{9}$")
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    delivery_radius_km: Optional[Decimal] = Field(None, ge=1, le=50)
    cod_enabled: Optional[bool] = None


# ============== Response Schemas ==============

class VendorResponse(BaseModel):
    """Schema for vendor response."""
    id: uuid.UUID
    user_id: uuid.UUID
    shop_name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    address_line_1: str
    address_line_2: Optional[str] = None
    city: str
    state: str
    pincode: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    delivery_radius_km: Decimal
    phone: Optional[str] = None
    is_verified: bool
    is_active: bool
    rating: Decimal
    total_orders: int
    total_reviews: int
    cod_enabled: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class VendorPublicResponse(BaseModel):
    """Public vendor information (for buyers)."""
    id: uuid.UUID
    shop_name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    city: str
    state: str
    rating: Decimal
    total_orders: int
    total_reviews: int
    is_verified: bool
    cod_enabled: bool
    delivery_radius_km: Decimal
    address_line_1: Optional[str] = None  # For display purposes
    
    model_config = {"from_attributes": True}


class VendorStoreStatsResponse(BaseModel):
    """Store statistics for public view."""
    total_products: int
    active_products: int
    categories_count: int
    total_orders: int
    total_reviews: int
    rating: Decimal
    joined_date: datetime


class VendorListResponse(BaseModel):
    """Schema for paginated vendor list."""
    items: List[VendorPublicResponse]
    total: int
    page: int
    size: int
    pages: int


# ============== Admin Schemas ==============

class VendorAdminResponse(VendorResponse):
    """Full vendor details for admin."""
    commission_percent: Decimal
    verified_at: Optional[datetime] = None


class VendorAdminListResponse(BaseModel):
    """Schema for paginated admin vendor list (includes is_active)."""
    items: List[VendorAdminResponse]
    total: int
    page: int
    size: int
    pages: int


class VendorApproval(BaseModel):
    """Schema for vendor approval/rejection."""
    is_verified: bool
    commission_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    notes: Optional[str] = None


class VendorSuspend(BaseModel):
    """Schema for suspending a vendor."""
    is_active: bool
    reason: Optional[str] = None

