"""
Return Request Schemas
Pydantic models for return request operations
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict

from app.models.enums import ReturnStatus, ReturnReason


# ============== Request Schemas ==============

class ReturnRequestCreate(BaseModel):
    """Schema for creating a return request."""
    order_item_id: uuid.UUID = Field(..., description="Order item ID to return")
    reason: ReturnReason = Field(..., description="Reason for return")
    description: Optional[str] = Field(None, max_length=1000, description="Additional details")
    images: Optional[List[str]] = Field(None, description="Array of image URLs (max 5)")
    
    model_config = ConfigDict(from_attributes=True)


class ReturnRequestUpdate(BaseModel):
    """Schema for updating return request (vendor/admin)."""
    status: Optional[ReturnStatus] = Field(None, description="New status")
    admin_notes: Optional[str] = Field(None, max_length=1000, description="Admin notes")
    vendor_notes: Optional[str] = Field(None, max_length=1000, description="Vendor notes")
    refund_amount: Optional[Decimal] = Field(None, ge=0, description="Refund amount")
    
    model_config = ConfigDict(from_attributes=True)


# ============== Response Schemas ==============

class ReturnRequestResponse(BaseModel):
    """Schema for return request response."""
    id: uuid.UUID
    order_id: uuid.UUID
    order_item_id: uuid.UUID
    buyer_id: Optional[uuid.UUID]
    reason: ReturnReason
    description: Optional[str]
    images: Optional[List[str]]
    status: ReturnStatus
    refund_amount: Decimal
    admin_notes: Optional[str]
    vendor_notes: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]
    
    # Related data
    order_number: Optional[str] = None
    product_name: Optional[str] = None
    order_item_quantity: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class ReturnRequestListResponse(BaseModel):
    """Schema for paginated return request list."""
    items: List[ReturnRequestResponse]
    total: int
    page: int
    size: int
    pages: int
    
    model_config = ConfigDict(from_attributes=True)

