"""
Order API Routes
Buyer order management
"""

import uuid
from typing import Optional
import math

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.user import User
from app.models.enums import UserRole, OrderStatus
from app.schemas.order import (
    OrderCreate,
    OrderCancel,
    OrderResponse,
    OrderListResponse,
    OrderItemResponse,
)
from app.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["Orders"])


def _build_order_response(order) -> OrderResponse:
    """Helper to build order response."""
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
            return_eligible=item.return_eligible,
            return_window_days=item.return_window_days,
            return_deadline=item.return_deadline,
            created_at=item.created_at,
        )
        for item in order.items
    ]
    
    vendor_info = None
    if order.vendor:
        vendor_info = {
            "id": order.vendor.id,
            "shop_name": order.vendor.shop_name,
            "phone": order.vendor.phone,
        }
    
    # Get payment info for online orders
    razorpay_order_id = None
    if order.payment_mode.value == "online" and order.payments:
        latest_payment = sorted(order.payments, key=lambda p: p.created_at, reverse=True)[0]
        if latest_payment.razorpay_order_id:
            razorpay_order_id = latest_payment.razorpay_order_id
    
    return OrderResponse(
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
        delivery_otp=order.delivery_otp,  # Include OTP for buyer to see
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
        vendor=vendor_info,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """
    Create a new order from the current cart.
    
    This will:
    1. Validate cart contents and stock availability
    2. Create the order with items
    3. Reserve stock for the order
    4. Clear the cart
    5. If payment_mode is COD, order is confirmed immediately
    6. If payment_mode is ONLINE:
       - Order is created in PENDING status
       - Stock is reserved
       - Payment must be created separately via /payments/create-order
       - Order is confirmed when payment is verified
    """
    from app.models.enums import PaymentMode
    
    service = OrderService(db)
    order = service.create_order(current_user, data)
    
    # For ONLINE payments, automatically create Razorpay order
    if data.payment_mode == PaymentMode.ONLINE:
        from app.services.payment_service import PaymentService
        payment_service = PaymentService(db)
        
        try:
            payment = payment_service.create_razorpay_order(
                order_id=order.id,
                amount=order.total_amount,
                currency="INR",
            )
            # Payment creation is logged, order response will include payment info if needed
        except HTTPException:
            # If payment creation fails, order is still created with stock reserved
            # User can retry payment creation
            pass
        except Exception as e:
            # Log error but don't fail order creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create payment for order {order.id}: {str(e)}")
    
    return _build_order_response(order)


@router.get("", response_model=OrderListResponse)
def list_orders(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    status: Optional[OrderStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """List orders for the current buyer."""
    service = OrderService(db)
    orders, total = service.get_buyer_orders(
        current_user.id,
        page=page,
        size=size,
        status_filter=status,
    )
    
    items = [_build_order_response(order) for order in orders]
    
    return OrderListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Get order details."""
    service = OrderService(db)
    order = service.get_order(order_id, current_user.id)
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    return _build_order_response(order)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: uuid.UUID,
    data: OrderCancel,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Cancel an order."""
    service = OrderService(db)
    order = service.cancel_order(order_id, current_user.id, data)
    return _build_order_response(order)


@router.get("/track/{order_number}", response_model=OrderResponse)
def track_order(
    order_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Track order by order number."""
    service = OrderService(db)
    order = service.get_order_by_number(order_number, current_user.id)
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    return _build_order_response(order)
