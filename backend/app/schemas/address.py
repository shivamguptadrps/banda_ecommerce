"""
Delivery Address Schemas
Pydantic models for delivery address management
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field


# ============== Request Schemas ==============

class AddressCreate(BaseModel):
    """Schema for creating a delivery address."""
    label: str = Field(default="Home", max_length=50)
    recipient_name: str = Field(..., min_length=2, max_length=100)
    recipient_phone: str = Field(..., pattern=r"^[6-9]\d{9}$")
    address_line_1: str = Field(..., min_length=5, max_length=255)
    address_line_2: Optional[str] = Field(None, max_length=255)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^\d{6}$")
    landmark: Optional[str] = Field(None, max_length=255)
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    is_default: bool = False


class AddressUpdate(BaseModel):
    """Schema for updating a delivery address."""
    label: Optional[str] = Field(None, max_length=50)
    recipient_name: Optional[str] = Field(None, min_length=2, max_length=100)
    recipient_phone: Optional[str] = Field(None, pattern=r"^[6-9]\d{9}$")
    address_line_1: Optional[str] = Field(None, min_length=5, max_length=255)
    address_line_2: Optional[str] = None
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    landmark: Optional[str] = None
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)


# ============== Response Schemas ==============

class AddressResponse(BaseModel):
    """Schema for delivery address response."""
    id: uuid.UUID
    buyer_id: uuid.UUID
    label: str
    recipient_name: str
    recipient_phone: str
    address_line_1: str
    address_line_2: Optional[str] = None
    city: str
    state: str
    pincode: str
    landmark: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    is_default: bool
    is_active: bool
    full_address: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class AddressListResponse(BaseModel):
    """Schema for address list."""
    items: List[AddressResponse]
    total: int

