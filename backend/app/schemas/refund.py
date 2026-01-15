"""
Refund Schemas
Pydantic models for refund operations
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict

from app.models.refund import RefundStatus


# ============== Request Schemas ==============

class RefundCreate(BaseModel):
    """Schema for creating a refund."""
    return_request_id: uuid.UUID = Field(..., description="Return request ID")
    amount: Optional[Decimal] = Field(None, ge=0, description="Refund amount (if different from return request)")
    reason: Optional[str] = Field(None, max_length=500, description="Refund reason")
    
    model_config = ConfigDict(from_attributes=True)


# ============== Response Schemas ==============

class RefundResponse(BaseModel):
    """Schema for refund response."""
    id: uuid.UUID
    order_id: uuid.UUID
    payment_id: Optional[uuid.UUID]
    return_request_id: Optional[uuid.UUID]
    amount: Decimal
    razorpay_refund_id: Optional[str]
    status: RefundStatus
    failure_reason: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]
    
    # Related data
    order_number: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class RefundListResponse(BaseModel):
    """Schema for paginated refund list."""
    items: List[RefundResponse]
    total: int
    page: int
    size: int
    pages: int
    
    model_config = ConfigDict(from_attributes=True)

