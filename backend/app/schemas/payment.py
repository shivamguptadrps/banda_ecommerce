"""
Payment Schemas
Request/Response models for payment operations
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import PaymentStatus


# ============== Payment Schemas ==============

class PaymentBase(BaseModel):
    """Base payment schema."""
    order_id: uuid.UUID
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    currency: str = Field(default="INR", max_length=10)


class PaymentCreate(PaymentBase):
    """Schema for creating a payment."""
    pass


class PaymentResponse(BaseModel):
    """Schema for payment response."""
    id: uuid.UUID
    order_id: uuid.UUID
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    amount: Decimal
    currency: str
    status: PaymentStatus
    method: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class PaymentVerify(BaseModel):
    """Schema for payment verification."""
    razorpay_order_id: str = Field(..., description="Razorpay order ID")
    razorpay_payment_id: str = Field(..., description="Razorpay payment ID")
    razorpay_signature: str = Field(..., description="Razorpay signature")


class PaymentCreateOrderResponse(BaseModel):
    """Response for creating Razorpay order."""
    razorpay_order_id: str
    amount: Decimal
    currency: str
    order_id: uuid.UUID
    key_id: str = Field(..., description="Razorpay key ID for frontend")


class PaymentStatusResponse(BaseModel):
    """Response for payment status check."""
    payment: Optional[PaymentResponse] = None
    order_status: str
    payment_status: str


# ============== Payment Log Schemas ==============

class PaymentLogResponse(BaseModel):
    """Schema for payment log response."""
    id: uuid.UUID
    payment_id: uuid.UUID
    event_type: str
    payload: dict
    created_at: datetime
    
    model_config = {"from_attributes": True}


# ============== Admin Payment Schemas ==============

class PaymentListResponse(BaseModel):
    """Schema for paginated payment list."""
    items: list[PaymentResponse]
    total: int
    page: int
    size: int
    pages: int


class PaymentRefundRequest(BaseModel):
    """Schema for refund request."""
    amount: Optional[Decimal] = Field(None, gt=0, description="Partial refund amount (if not provided, full refund)")
    reason: Optional[str] = Field(None, max_length=500, description="Refund reason")


class PaymentRefundResponse(BaseModel):
    """Schema for refund response."""
    refund_id: str
    payment_id: uuid.UUID
    amount: Decimal
    status: str
    created_at: datetime


class PaymentLogListResponse(BaseModel):
    """Schema for paginated payment log list."""
    items: list[PaymentLogResponse]
    total: int
    page: int
    size: int
    pages: int


class PaymentWithLogsResponse(PaymentResponse):
    """Payment response with logs."""
    logs: list[PaymentLogResponse] = []


class DuplicatePaymentDetection(BaseModel):
    """Schema for duplicate payment detection."""
    order_id: uuid.UUID
    duplicate_payments: list[PaymentResponse]
    total_amount: Decimal
    status: str  # "duplicate_detected", "no_duplicate", "requires_review"

