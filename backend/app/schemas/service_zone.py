"""
Service Zone Schemas
Pydantic models for service zone request/response validation
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field


# ============== Request Schemas ==============

class ServiceZoneCreate(BaseModel):
    """Schema for creating a service zone."""
    zone_name: str = Field(..., min_length=2, max_length=100)
    city: str = Field(..., min_length=2, max_length=100)
    center_latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    center_longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    radius_km: Decimal = Field(default=Decimal("5.0"), ge=1, le=100)
    delivery_fee: Decimal = Field(default=Decimal("0.0"), ge=0)
    min_order_value: Decimal = Field(default=Decimal("0.0"), ge=0)
    estimated_time_mins: int = Field(default=30, ge=5, le=180)


class ServiceZoneUpdate(BaseModel):
    """Schema for updating a service zone."""
    zone_name: Optional[str] = Field(None, min_length=2, max_length=100)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    center_latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    center_longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    radius_km: Optional[Decimal] = Field(None, ge=1, le=100)
    delivery_fee: Optional[Decimal] = Field(None, ge=0)
    min_order_value: Optional[Decimal] = Field(None, ge=0)
    estimated_time_mins: Optional[int] = Field(None, ge=5, le=180)
    is_active: Optional[bool] = None


# ============== Response Schemas ==============

class ServiceZoneResponse(BaseModel):
    """Schema for service zone response."""
    id: uuid.UUID
    zone_name: str
    city: str
    center_latitude: Optional[Decimal] = None
    center_longitude: Optional[Decimal] = None
    radius_km: Decimal
    delivery_fee: Decimal
    min_order_value: Decimal
    estimated_time_mins: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class ServiceZoneListResponse(BaseModel):
    """Schema for paginated service zone list."""
    items: List[ServiceZoneResponse]
    total: int
    page: int
    size: int


# ============== Delivery Check Schemas ==============

class DeliveryCheckRequest(BaseModel):
    """Schema for checking delivery availability."""
    vendor_id: Optional[uuid.UUID] = None
    latitude: Decimal = Field(..., ge=-90, le=90)
    longitude: Decimal = Field(..., ge=-180, le=180)


class DeliveryCheckResponse(BaseModel):
    """Schema for delivery check response."""
    is_deliverable: bool
    distance_km: Optional[Decimal] = None
    delivery_fee: Decimal = Decimal("0.0")
    estimated_time_mins: Optional[int] = None
    message: str
    zone: Optional[ServiceZoneResponse] = None

