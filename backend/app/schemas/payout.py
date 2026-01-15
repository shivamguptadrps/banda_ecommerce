"""
Vendor Payout Schemas
Pydantic models for vendor payout operations
"""

import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict

from app.models.payout import PayoutStatus


# ============== Request Schemas ==============

class PayoutGenerateRequest(BaseModel):
    """Schema for generating payout batch."""
    vendor_id: Optional[uuid.UUID] = Field(None, description="Specific vendor (optional, for single vendor payout)")
    period_start: date = Field(..., description="Period start date")
    period_end: date = Field(..., description="Period end date")
    
    model_config = ConfigDict(from_attributes=True)


class PayoutProcessRequest(BaseModel):
    """Schema for processing payout."""
    transaction_id: Optional[str] = Field(None, max_length=100, description="External transaction ID")
    notes: Optional[str] = Field(None, max_length=500, description="Processing notes")
    
    model_config = ConfigDict(from_attributes=True)


# ============== Response Schemas ==============

class VendorPayoutItemResponse(BaseModel):
    """Schema for payout item response."""
    id: uuid.UUID
    payout_id: uuid.UUID
    order_id: Optional[uuid.UUID]
    order_amount: Decimal
    commission: Decimal
    net_amount: Decimal
    created_at: datetime
    
    # Related data
    order_number: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class VendorPayoutResponse(BaseModel):
    """Schema for vendor payout response."""
    id: uuid.UUID
    vendor_id: uuid.UUID
    period_start: date
    period_end: date
    total_orders: int
    gross_amount: Decimal
    commission_amount: Decimal
    refund_deductions: Decimal
    net_amount: Decimal
    status: PayoutStatus
    transaction_id: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]
    
    # Related data
    vendor_name: Optional[str] = None
    items: Optional[List[VendorPayoutItemResponse]] = None
    
    model_config = ConfigDict(from_attributes=True)


class VendorPayoutListResponse(BaseModel):
    """Schema for paginated payout list."""
    items: List[VendorPayoutResponse]
    total: int
    page: int
    size: int
    pages: int
    
    model_config = ConfigDict(from_attributes=True)


class VendorEarningsSummary(BaseModel):
    """Schema for vendor earnings summary."""
    total_earnings: Decimal = Field(..., description="Total earnings (all time)")
    pending_payouts: Decimal = Field(..., description="Pending payout amount")
    processed_payouts: Decimal = Field(..., description="Total processed payouts")
    current_period_earnings: Decimal = Field(..., description="Earnings in current period")
    total_orders: int = Field(..., description="Total orders")
    commission_rate: Decimal = Field(..., description="Commission percentage")
    
    model_config = ConfigDict(from_attributes=True)

