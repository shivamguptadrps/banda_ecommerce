"""
Vendor Order Management API Routes
Vendor order management and status updates
"""

import uuid
from typing import Optional
import math

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.models.order import Order

from app.api.deps import get_db, require_role
from app.models.user import User
from app.models.vendor import Vendor
from app.models.enums import UserRole, OrderStatus
from app.schemas.order import (
    OrderStatusUpdate,
    VendorOrderResponse,
    VendorOrderListResponse,
    OrderItemResponse,
)
from app.services.order_service import OrderService

router = APIRouter(prefix="/vendor/orders", tags=["Vendor Orders"])


def get_vendor_for_user(db: Session, user: User) -> Vendor:
    """Get verified vendor profile for user."""
    vendor = db.query(Vendor).filter(Vendor.user_id == user.id).first()
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found",
        )
    
    if not vendor.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor account is not verified",
        )
    
    return vendor


def _build_vendor_order_response(order) -> VendorOrderResponse:
    """Helper to build vendor order response."""
    items_response = [
        OrderItemResponse(
            id=item.id,
            order_id=item.order_id,
            product_id=item.product_id,
            sell_unit_id=item.sell_unit_id,
            product_name=item.product_name,
            sell_unit_label=item.sell_unit_label,
            unit_value=item.unit_value,
            quantity=item.quantity,
            price_per_unit=item.price_per_unit,
            total_price=item.total_price,
            stock_quantity_used=item.stock_quantity_used,
            created_at=item.created_at,
        )
        for item in order.items
    ]
    
    buyer_name = None
    buyer_phone = None
    if order.buyer:
        buyer_name = order.buyer.name
        buyer_phone = order.buyer.phone
    
    # Get payment info for online orders
    razorpay_order_id = None
    payment_count = 0
    if order.payment_mode.value == "online" and hasattr(order, 'payments') and order.payments:
        latest_payment = sorted(order.payments, key=lambda p: p.created_at, reverse=True)[0]
        if latest_payment.razorpay_order_id:
            razorpay_order_id = latest_payment.razorpay_order_id
        payment_count = len(order.payments)
    
    return VendorOrderResponse(
        id=order.id,
        order_number=order.order_number,
        buyer_id=order.buyer_id,
        vendor_id=order.vendor_id,
        subtotal=order.subtotal,
        delivery_fee=order.delivery_fee,
        discount_amount=order.discount_amount,
        tax_amount=order.tax_amount,
        total_amount=order.total_amount,
        payment_mode=order.payment_mode,
        payment_status=order.payment_status,
        razorpay_order_id=razorpay_order_id,
        order_status=order.order_status,
        delivery_address_snapshot=order.delivery_address_snapshot,
        delivery_distance_km=order.delivery_distance_km,
        notes=order.notes,
        cancellation_reason=order.cancellation_reason,
        placed_at=order.placed_at,
        confirmed_at=order.confirmed_at,
        processing_at=order.processing_at,
        shipped_at=order.shipped_at,
        delivered_at=order.delivered_at,
        cancelled_at=order.cancelled_at,
        items=items_response,
        total_items=order.total_items,
        is_cancellable=order.is_cancellable,
        buyer_name=buyer_name,
        buyer_phone=buyer_phone,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


@router.get("", response_model=VendorOrderListResponse)
def list_vendor_orders(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    status_filter: Optional[OrderStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """List orders for the vendor."""
    vendor = get_vendor_for_user(db, current_user)
    
    service = OrderService(db)
    orders, total = service.get_vendor_orders(
        vendor.id,
        page=page,
        size=size,
        status_filter=status_filter,
    )
    
    items = [_build_vendor_order_response(order) for order in orders]
    
    return VendorOrderListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get("/{order_id}", response_model=VendorOrderResponse)
def get_vendor_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """Get order details for vendor."""
    vendor = get_vendor_for_user(db, current_user)
    
    # Eager load payments for vendor order view
    order = db.query(Order).options(
        joinedload(Order.items),
        joinedload(Order.payments),
        joinedload(Order.vendor),
        joinedload(Order.buyer),
    ).filter(Order.id == order_id).first()
    
    if not order or order.vendor_id != vendor.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    return _build_vendor_order_response(order)


@router.put("/{order_id}/status", response_model=VendorOrderResponse)
def update_order_status(
    order_id: uuid.UUID,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """
    Update order status.
    
    Valid transitions:
    - PENDING -> CONFIRMED, CANCELLED
    - CONFIRMED -> PROCESSING, CANCELLED
    - PROCESSING -> SHIPPED, CANCELLED
    - SHIPPED -> DELIVERED, RETURNED
    - DELIVERED -> RETURNED
    """
    vendor = get_vendor_for_user(db, current_user)
    
    service = OrderService(db)
    order = service.update_order_status(order_id, vendor.id, data)
    
    return _build_vendor_order_response(order)


@router.post("/{order_id}/accept", response_model=VendorOrderResponse)
def accept_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """
    Vendor accepts a PLACED order.
    
    This will:
    - Capture payment if online payment was authorized
    - Update status to CONFIRMED
    - Confirm stock reservations
    """
    vendor = get_vendor_for_user(db, current_user)
    
    service = OrderService(db)
    order = service.accept_order(order_id, vendor.id)
    
    return _build_vendor_order_response(order)


@router.post("/{order_id}/reject", response_model=VendorOrderResponse)
def reject_order(
    order_id: uuid.UUID,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """
    Vendor rejects a PLACED order.
    
    This will:
    - Cancel the order
    - Release stock reservations
    - Release/refund payment if applicable
    """
    vendor = get_vendor_for_user(db, current_user)
    
    service = OrderService(db)
    order = service.reject_order(order_id, vendor.id, reason)
    
    return _build_vendor_order_response(order)


@router.post("/{order_id}/confirm", response_model=VendorOrderResponse)
def confirm_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """Quick action to confirm an order (legacy endpoint, maps to accept)."""
    vendor = get_vendor_for_user(db, current_user)
    
    service = OrderService(db)
    # Try accept first (for PLACED orders), fallback to status update
    try:
        order = service.accept_order(order_id, vendor.id)
    except HTTPException:
        # If not PLACED, use legacy method
        order = service.update_order_status(
            order_id,
            vendor.id,
            OrderStatusUpdate(status=OrderStatus.CONFIRMED),
        )
    
    return _build_vendor_order_response(order)


@router.post("/{order_id}/pick", response_model=VendorOrderResponse)
def mark_picked(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """Mark order as picked (CONFIRMED → PICKED)."""
    vendor = get_vendor_for_user(db, current_user)
    
    service = OrderService(db)
    order = service.mark_order_picked(order_id, vendor.id)
    
    return _build_vendor_order_response(order)


@router.post("/{order_id}/pack", response_model=VendorOrderResponse)
def mark_packed(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """Mark order as packed (PICKED → PACKED)."""
    vendor = get_vendor_for_user(db, current_user)
    
    service = OrderService(db)
    order = service.mark_order_packed(order_id, vendor.id)
    
    return _build_vendor_order_response(order)


@router.post("/{order_id}/ship", response_model=VendorOrderResponse)
def ship_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """Quick action to mark order as shipped (legacy, maps to OUT_FOR_DELIVERY)."""
    vendor = get_vendor_for_user(db, current_user)
    
    service = OrderService(db)
    order = service.update_order_status(
        order_id,
        vendor.id,
        OrderStatusUpdate(status=OrderStatus.OUT_FOR_DELIVERY),
    )
    
    return _build_vendor_order_response(order)


@router.post("/{order_id}/deliver", response_model=VendorOrderResponse)
def mark_delivered(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """Quick action to mark order as delivered."""
    vendor = get_vendor_for_user(db, current_user)
    
    service = OrderService(db)
    order = service.update_order_status(
        order_id,
        vendor.id,
        OrderStatusUpdate(status=OrderStatus.DELIVERED),
    )
    
    return _build_vendor_order_response(order)
