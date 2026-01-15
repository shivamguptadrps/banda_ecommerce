"""
Return Request API Routes
Handles return request operations for buyers, vendors, and admins
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

import importlib
# Import return schemas dynamically since 'return' is a Python keyword
_return_schema = importlib.import_module("app.schemas.return")
ReturnRequestCreate = _return_schema.ReturnRequestCreate
ReturnRequestResponse = _return_schema.ReturnRequestResponse
ReturnRequestListResponse = _return_schema.ReturnRequestListResponse
ReturnRequestUpdate = _return_schema.ReturnRequestUpdate

from app.api.deps import get_db, require_role, get_current_user
from app.models.user import User
from app.models.enums import UserRole, ReturnStatus
from app.services.return_service import ReturnService

router = APIRouter()


@router.post(
    "/orders/{order_id}/return",
    response_model=ReturnRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Request return",
    description="Create a return request for an order item.",
)
def create_return_request(
    order_id: uuid.UUID,
    data: ReturnRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Create a return request for a delivered order item."""
    return_service = ReturnService(db)
    return_request = return_service.create_return_request(
        buyer=current_user,
        order_id=order_id,
        data=data,
    )
    
    # Build response with related data
    response = ReturnRequestResponse.from_orm_with_images(return_request)
    if return_request.order:
        response.order_number = return_request.order.order_number
    if return_request.order_item:
        response.product_name = return_request.order_item.product_name
        response.order_item_quantity = return_request.order_item.quantity
    
    return response


@router.get(
    "/returns",
    response_model=ReturnRequestListResponse,
    summary="List return requests",
    description="Get list of return requests (buyer/vendor/admin view).",
)
def list_return_requests(
    order_id: Optional[uuid.UUID] = Query(None, description="Filter by order ID"),
    status_filter: Optional[ReturnStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List return requests with access control."""
    return_service = ReturnService(db)
    result = return_service.list_return_requests(
        user=current_user,
        order_id=order_id,
        status_filter=status_filter,
        page=page,
        size=size,
    )
    
    # Build response items with related data
    items = []
    for return_request in result["items"]:
        item = ReturnRequestResponse.from_orm_with_images(return_request)
        if return_request.order:
            item.order_number = return_request.order.order_number
        if return_request.order_item:
            item.product_name = return_request.order_item.product_name
            item.order_item_quantity = return_request.order_item.quantity
        items.append(item)
    
    return ReturnRequestListResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        size=result["size"],
        pages=result["pages"],
    )


@router.get(
    "/returns/{return_request_id}",
    response_model=ReturnRequestResponse,
    summary="Get return request",
    description="Get return request details.",
)
def get_return_request(
    return_request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get return request by ID."""
    return_service = ReturnService(db)
    return_request = return_service.get_return_request(
        return_request_id=return_request_id,
        user=current_user,
    )
    
    response = ReturnRequestResponse.from_orm_with_images(return_request)
    if return_request.order:
        response.order_number = return_request.order.order_number
    if return_request.order_item:
        response.product_name = return_request.order_item.product_name
        response.order_item_quantity = return_request.order_item.quantity
    
    return response


@router.put(
    "/vendor/returns/{return_request_id}",
    response_model=ReturnRequestResponse,
    summary="Vendor respond to return",
    description="Vendor can approve or reject return requests.",
)
def vendor_respond_to_return(
    return_request_id: uuid.UUID,
    data: ReturnRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """Vendor can approve or reject return requests."""
    return_service = ReturnService(db)
    
    if data.status == ReturnStatus.APPROVED:
        return_request = return_service.approve_return_request(
            return_request_id=return_request_id,
            approver=current_user,
            notes=data.vendor_notes,
        )
    elif data.status == ReturnStatus.REJECTED:
        if not data.vendor_notes or len(data.vendor_notes.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection reason must be at least 10 characters",
            )
        return_request = return_service.reject_return_request(
            return_request_id=return_request_id,
            rejector=current_user,
            notes=data.vendor_notes,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vendor can only approve or reject return requests",
        )
    
    response = ReturnRequestResponse.from_orm_with_images(return_request)
    if return_request.order:
        response.order_number = return_request.order.order_number
    if return_request.order_item:
        response.product_name = return_request.order_item.product_name
        response.order_item_quantity = return_request.order_item.quantity
    
    return response


@router.put(
    "/admin/returns/{return_request_id}/approve",
    response_model=ReturnRequestResponse,
    summary="Admin approve return",
    description="Admin can approve return requests.",
)
def admin_approve_return(
    return_request_id: uuid.UUID,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Admin can approve return requests."""
    return_service = ReturnService(db)
    return_request = return_service.approve_return_request(
        return_request_id=return_request_id,
        approver=current_user,
        notes=notes,
    )
    
    response = ReturnRequestResponse.from_orm_with_images(return_request)
    if return_request.order:
        response.order_number = return_request.order.order_number
    if return_request.order_item:
        response.product_name = return_request.order_item.product_name
        response.order_item_quantity = return_request.order_item.quantity
    
    return response


@router.put(
    "/admin/returns/{return_request_id}/reject",
    response_model=ReturnRequestResponse,
    summary="Admin reject return",
    description="Admin can reject return requests.",
)
def admin_reject_return(
    return_request_id: uuid.UUID,
    notes: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Admin can reject return requests."""
    if not notes or len(notes.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason must be at least 10 characters",
        )
    
    return_service = ReturnService(db)
    return_request = return_service.reject_return_request(
        return_request_id=return_request_id,
        rejector=current_user,
        notes=notes,
    )
    
    response = ReturnRequestResponse.from_orm_with_images(return_request)
    if return_request.order:
        response.order_number = return_request.order.order_number
    if return_request.order_item:
        response.product_name = return_request.order_item.product_name
        response.order_item_quantity = return_request.order_item.quantity
    
    return response

