"""
Refund API Routes
Handles refund processing (Admin only)
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role, get_current_user
from app.models.user import User
from app.models.enums import UserRole
from app.models.refund import RefundStatus
from app.schemas.refund import (
    RefundCreate,
    RefundResponse,
    RefundListResponse,
)
from app.services.refund_service import RefundService

router = APIRouter()


@router.post(
    "/refunds",
    response_model=RefundResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Process refund",
    description="Create and process a refund for an approved return request.",
)
def create_refund(
    data: RefundCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Process refund for an approved return request."""
    refund_service = RefundService(db)
    refund = refund_service.create_refund(
        return_request_id=data.return_request_id,
        refund_amount=data.amount,
        reason=data.reason,
    )
    
    # Build response with related data
    response = RefundResponse.model_validate(refund)
    if refund.order:
        response.order_number = refund.order.order_number
    
    return response


@router.get(
    "/refunds",
    response_model=RefundListResponse,
    summary="List refunds",
    description="Get list of all refunds (Admin only).",
)
def list_refunds(
    order_id: Optional[uuid.UUID] = Query(None, description="Filter by order ID"),
    status_filter: Optional[RefundStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """List all refunds with optional filters."""
    refund_service = RefundService(db)
    result = refund_service.list_refunds(
        order_id=order_id,
        status_filter=status_filter,
        page=page,
        size=size,
    )
    
    # Build response items with related data
    items = []
    for refund in result["items"]:
        item = RefundResponse.model_validate(refund)
        if refund.order:
            item.order_number = refund.order.order_number
        items.append(item)
    
    return RefundListResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        size=result["size"],
        pages=result["pages"],
    )


@router.get(
    "/refunds/{refund_id}",
    response_model=RefundResponse,
    summary="Get refund",
    description="Get refund details (Admin only).",
)
def get_refund(
    refund_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Get refund by ID."""
    refund_service = RefundService(db)
    refund = refund_service.get_refund(refund_id=refund_id)
    
    response = RefundResponse.model_validate(refund)
    if refund.order:
        response.order_number = refund.order.order_number
    
    return response

