"""
Delivery Partner Schemas
Pydantic models for delivery partner operations
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import uuid


class DeliveryPartnerLogin(BaseModel):
    """Login request for delivery partner."""
    phone: str = Field(..., description="Phone number")
    otp: str = Field(..., description="OTP code (use 1234 for testing)")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Validate phone number format."""
        # Remove any spaces or dashes
        phone = v.replace(" ", "").replace("-", "")
        # Check if it's a valid Indian phone number (10 digits starting with 6-9)
        if not phone.isdigit() or len(phone) != 10 or phone[0] not in "6789":
            raise ValueError("Phone number must be 10 digits starting with 6, 7, 8, or 9")
        return phone

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        """Validate OTP format."""
        if not v.isdigit() or len(v) != 4:
            raise ValueError("OTP must be 4 digits")
        return v


class DeliveryPartnerCreate(BaseModel):
    """Create delivery partner request (admin only)."""
    name: str = Field(..., min_length=2, max_length=100, description="Delivery partner name")
    phone: str = Field(..., description="Phone number")
    vehicle_type: Optional[str] = Field(None, max_length=50, description="Vehicle type (bike, car, bicycle, etc.)")
    vehicle_number: Optional[str] = Field(None, max_length=20, description="Vehicle registration number")
    email: Optional[str] = Field(None, description="Email address (optional)")
    password: Optional[str] = Field(None, min_length=8, description="Password (auto-generated if not provided)")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Validate phone number format."""
        phone = v.replace(" ", "").replace("-", "")
        if not phone.isdigit() or len(phone) != 10 or phone[0] not in "6789":
            raise ValueError("Phone number must be 10 digits starting with 6, 7, 8, or 9")
        return phone


class DeliveryPartnerUpdate(BaseModel):
    """Update delivery partner request (admin only)."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = None
    vehicle_type: Optional[str] = Field(None, max_length=50)
    vehicle_number: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    is_available: Optional[bool] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Validate phone number format."""
        if v is None:
            return v
        phone = v.replace(" ", "").replace("-", "")
        if not phone.isdigit() or len(phone) != 10 or phone[0] not in "6789":
            raise ValueError("Phone number must be 10 digits starting with 6, 7, 8, or 9")
        return phone


class DeliveryPartnerResponse(BaseModel):
    """Delivery partner response."""
    id: uuid.UUID
    name: str
    phone: str
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    is_active: bool
    is_available: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DeliveryPartnerListResponse(BaseModel):
    """List of delivery partners."""
    items: list[DeliveryPartnerResponse]
    total: int
    page: int
    size: int
    pages: int


class DeliveryPartnerOrderResponse(BaseModel):
    """Order response for delivery partner with full product details."""
    id: uuid.UUID
    order_number: str
    buyer_name: Optional[str] = None
    buyer_phone: Optional[str] = None
    delivery_address_snapshot: Optional[str] = None
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None
    total_amount: float
    payment_mode: str
    payment_status: str
    order_status: str
    placed_at: str
    confirmed_at: Optional[str] = None
    picked_at: Optional[str] = None
    packed_at: Optional[str] = None
    out_for_delivery_at: Optional[str] = None
    delivered_at: Optional[str] = None
    total_items: int
    items: list[dict] = []  # Items with product images and details
    vendor_info: Optional[dict] = None  # Vendor/sender information
    delivery_otp: Optional[str] = None  # Delivery OTP for verification

    class Config:
        from_attributes = True


class DeliveryPartnerOrderListResponse(BaseModel):
    """List of orders for delivery partner."""
    items: list[DeliveryPartnerOrderResponse]
    total: int
    page: int
    size: int
    pages: int


class OrderAssignmentRequest(BaseModel):
    """Request to assign order to delivery partner."""
    delivery_partner_id: uuid.UUID = Field(..., description="Delivery partner ID to assign order to")


class DeliveryFailureRequest(BaseModel):
    """Request to mark delivery as failed."""
    failure_reason: str = Field(..., description="Reason for failure")
    failure_notes: Optional[str] = Field(None, max_length=500, description="Additional notes")


class CODCollectionRequest(BaseModel):
    """Request to update COD collection status."""
    cod_collected: bool = Field(..., description="Whether COD was collected")


class DeliveryOTPRequest(BaseModel):
    """Request to mark order as delivered with OTP verification."""
    delivery_otp: str = Field(..., min_length=6, max_length=6, description="6-digit delivery OTP")
    cod_collected: Optional[bool] = Field(None, description="Whether COD was collected (for COD orders)")


class DeliveryStatsResponse(BaseModel):
    """Delivery statistics response."""
    # All-time stats
    total_deliveries: int
    successful: int
    failed: int
    success_rate: float
    total_orders_assigned: int
    
    # Today's stats
    today_assigned: int
    today_delivered: int
    today_cod_revenue: float
    
    # Weekly stats
    week_delivered: int
    
    # Monthly stats
    month_delivered: int
    
    # Current status
    currently_assigned: int
    pending_deliveries: int
    
    # COD stats
    cod_total: int
    cod_collected: int
    cod_collection_rate: float
    cod_revenue: float
    
    # Performance
    avg_delivery_time_minutes: Optional[float] = None
