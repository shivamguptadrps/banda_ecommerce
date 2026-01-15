"""
Vendor Payout API Routes
Handles vendor earnings and payout operations
"""

import uuid
from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role, get_current_user
from app.models.user import User
from app.models.enums import UserRole
from app.models.payout import PayoutStatus
from app.schemas.payout import (
    PayoutGenerateRequest,
    PayoutProcessRequest,
    VendorPayoutResponse,
    VendorPayoutListResponse,
    VendorEarningsSummary,
)
from app.services.payout_service import PayoutService

router = APIRouter()


# ============== Vendor Endpoints ==============

@router.get(
    "/vendor/payouts",
    response_model=VendorPayoutListResponse,
    summary="List vendor payouts",
    description="Get list of payouts for the current vendor.",
)
def list_vendor_payouts(
    status_filter: Optional[PayoutStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """List payouts for the current vendor."""
    if not current_user.vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found",
        )
    
    payout_service = PayoutService(db)
    result = payout_service.list_payouts(
        vendor_id=current_user.vendor.id,
        status_filter=status_filter,
        page=page,
        size=size,
    )
    
    # Build response items with related data
    items = []
    for payout in result["items"]:
        item = VendorPayoutResponse.model_validate(payout)
        if payout.vendor:
            item.vendor_name = payout.vendor.shop_name
        items.append(item)
    
    return VendorPayoutListResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        size=result["size"],
        pages=result["pages"],
    )


@router.get(
    "/vendor/payouts/{payout_id}",
    response_model=VendorPayoutResponse,
    summary="Get payout details",
    description="Get payout details with items for the current vendor.",
)
def get_vendor_payout(
    payout_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """Get payout details for the current vendor."""
    if not current_user.vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found",
        )
    
    payout_service = PayoutService(db)
    payout = payout_service.get_payout(
        payout_id=payout_id,
        vendor_id=current_user.vendor.id,
    )
    
    response = VendorPayoutResponse.model_validate(payout)
    if payout.vendor:
        response.vendor_name = payout.vendor.shop_name
    
    # Include payout items
    from app.schemas.payout import VendorPayoutItemResponse
    response.items = [
        VendorPayoutItemResponse.model_validate(item) for item in payout.items
    ]
    
    # Add order numbers to items
    for i, item in enumerate(payout.items):
        if item.order:
            response.items[i].order_number = item.order.order_number
    
    return response


@router.get(
    "/vendor/earnings",
    response_model=VendorEarningsSummary,
    summary="Get earnings summary",
    description="Get earnings summary for the current vendor.",
)
def get_vendor_earnings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """Get earnings summary for the current vendor."""
    if not current_user.vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found",
        )
    
    payout_service = PayoutService(db)
    summary = payout_service.get_vendor_earnings_summary(
        vendor_id=current_user.vendor.id,
    )
    
    return VendorEarningsSummary(**summary)


# ============== Admin Endpoints ==============

@router.get(
    "/admin/payouts",
    response_model=VendorPayoutListResponse,
    summary="List all payouts",
    description="Get list of all payouts (Admin only).",
)
def list_all_payouts(
    vendor_id: Optional[uuid.UUID] = Query(None, description="Filter by vendor ID"),
    status_filter: Optional[PayoutStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """List all payouts with optional filters."""
    payout_service = PayoutService(db)
    result = payout_service.list_payouts(
        vendor_id=vendor_id,
        status_filter=status_filter,
        page=page,
        size=size,
    )
    
    # Build response items with related data
    items = []
    for payout in result["items"]:
        item = VendorPayoutResponse.model_validate(payout)
        if payout.vendor:
            item.vendor_name = payout.vendor.shop_name
        items.append(item)
    
    return VendorPayoutListResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        size=result["size"],
        pages=result["pages"],
    )


@router.get(
    "/admin/payouts/{payout_id}",
    response_model=VendorPayoutResponse,
    summary="Get payout details",
    description="Get payout details with items (Admin only).",
)
def get_payout(
    payout_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Get payout details by ID."""
    payout_service = PayoutService(db)
    payout = payout_service.get_payout(payout_id=payout_id)
    
    response = VendorPayoutResponse.model_validate(payout)
    if payout.vendor:
        response.vendor_name = payout.vendor.shop_name
    
    # Include payout items
    from app.schemas.payout import VendorPayoutItemResponse
    response.items = [
        VendorPayoutItemResponse.model_validate(item) for item in payout.items
    ]
    
    # Add order numbers to items
    for i, item in enumerate(payout.items):
        if item.order:
            response.items[i].order_number = item.order.order_number
    
    return response


@router.post(
    "/admin/payouts/generate",
    response_model=list[VendorPayoutResponse],
    summary="Generate payout batch",
    description="Generate payout batch for vendors (Admin only).",
)
def generate_payout_batch(
    data: PayoutGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Generate payout batch for vendors."""
    payout_service = PayoutService(db)
    payouts = payout_service.generate_payout_batch(
        period_start=data.period_start,
        period_end=data.period_end,
        vendor_id=data.vendor_id,
    )
    
    # Build response items
    items = []
    for payout in payouts:
        item = VendorPayoutResponse.model_validate(payout)
        if payout.vendor:
            item.vendor_name = payout.vendor.shop_name
        items.append(item)
    
    return items


@router.put(
    "/admin/payouts/{payout_id}/process",
    response_model=VendorPayoutResponse,
    summary="Process payout",
    description="Mark payout as processed after external transfer (Admin only).",
)
def process_payout(
    payout_id: uuid.UUID,
    data: PayoutProcessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Process payout (mark as processed after money transfer)."""
    payout_service = PayoutService(db)
    payout = payout_service.process_payout(
        payout_id=payout_id,
        transaction_id=data.transaction_id,
        notes=data.notes,
    )
    
    response = VendorPayoutResponse.model_validate(payout)
    if payout.vendor:
        response.vendor_name = payout.vendor.shop_name
    
    return response

