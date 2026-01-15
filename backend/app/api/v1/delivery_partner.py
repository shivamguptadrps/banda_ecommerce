"""
Delivery Partner API Routes
Authentication and order management for delivery partners
"""

import uuid
import math
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, require_role, CurrentUser
from app.models.user import User
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.enums import UserRole, OrderStatus
from app.schemas.delivery_partner import (
    DeliveryPartnerLogin,
    DeliveryPartnerResponse,
    DeliveryPartnerOrderResponse,
    DeliveryPartnerOrderListResponse,
    DeliveryFailureRequest,
    CODCollectionRequest,
    DeliveryOTPRequest,
    DeliveryStatsResponse,
)
from app.services.auth_service import AuthService
from app.services.order_service import OrderService
from app.services.delivery_service import DeliveryService
from app.models.delivery_history import DeliveryFailureReason, DeliveryAttemptStatus

router = APIRouter(prefix="/delivery-partner", tags=["Delivery Partner"])


# Hardcoded OTP for testing (will be replaced with real OTP API later)
VALID_OTP = "1234"


def get_delivery_partner_for_user(db: Session, user: User) -> DeliveryPartner:
    """Get delivery partner record for a user."""
    delivery_partner = db.query(DeliveryPartner).filter(
        DeliveryPartner.user_id == user.id
    ).first()
    
    if not delivery_partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery partner profile not found",
        )
    
    return delivery_partner


# ============== Authentication ==============

@router.post(
    "/login",
    response_model=dict,
    summary="Delivery partner login",
    description="Login with phone number and OTP. Use OTP 1234 for testing.",
)
def login(
    login_data: DeliveryPartnerLogin,
    db: Session = Depends(get_db),
):
    """
    Authenticate delivery partner with phone and OTP.
    
    For testing, use OTP: 1234
    """
    # Validate OTP (hardcoded for now)
    if login_data.otp != VALID_OTP:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP",
        )
    
    # Find delivery partner by phone
    delivery_partner = db.query(DeliveryPartner).filter(
        DeliveryPartner.phone == login_data.phone,
        DeliveryPartner.is_active == True,
    ).first()
    
    if not delivery_partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery partner not found with this phone number",
        )
    
    # Get user
    user = db.query(User).filter(User.id == delivery_partner.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    
    # Create tokens
    auth_service = AuthService(db)
    tokens = auth_service.create_tokens(user)
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return {
        "access_token": tokens.access_token,
        "refresh_token": tokens.refresh_token,
        "token_type": tokens.token_type,
        "expires_in": tokens.expires_in,
        "delivery_partner": DeliveryPartnerResponse.model_validate(delivery_partner),
    }


# ============== Profile ==============

@router.get(
    "/profile",
    response_model=DeliveryPartnerResponse,
    summary="Get delivery partner profile",
    description="Get current delivery partner profile.",
)
def get_profile(
    current_user: User = Depends(require_role([UserRole.DELIVERY_PARTNER])),
    db: Session = Depends(get_db),
):
    """Get delivery partner profile."""
    delivery_partner = get_delivery_partner_for_user(db, current_user)
    return DeliveryPartnerResponse.model_validate(delivery_partner)


# ============== Orders ==============

def _build_delivery_order_response(order: Order) -> DeliveryPartnerOrderResponse:
    """Build order response for delivery partner with full product details."""
    # Build items with product images and details
    items_list = []
    for item in order.items:
        item_data = {
            "product_name": item.product_name,
            "quantity": item.quantity,
            "sell_unit_label": item.sell_unit_label,
            "total_price": float(item.total_price),
            "price_per_unit": float(item.price_per_unit),
        }
        
        # Add product images if available
        if item.product and hasattr(item.product, 'images') and item.product.images:
            # Get primary image or first image
            primary_image = next((img for img in item.product.images if img.is_primary), None)
            if primary_image:
                item_data["product_image"] = primary_image.image_url
            elif item.product.images:
                item_data["product_image"] = item.product.images[0].image_url
            
            # Include all images
            item_data["product_images"] = [img.image_url for img in item.product.images[:5]]  # Limit to 5 images
        
        # Add product description if available
        if item.product and hasattr(item.product, 'description'):
            item_data["product_description"] = item.product.description
        
        items_list.append(item_data)
    
    # Get vendor/sender info
    vendor_info = None
    if order.vendor:
        vendor_info = {
            "id": str(order.vendor.id),
            "shop_name": order.vendor.shop_name,
            "phone": order.vendor.phone,
            "email": order.vendor.email if hasattr(order.vendor, 'email') else None,
        }
    
    return DeliveryPartnerOrderResponse(
        id=order.id,
        order_number=order.order_number,
        buyer_name=order.buyer.name if order.buyer else None,
        buyer_phone=order.buyer.phone if order.buyer else None,
        delivery_address_snapshot=order.delivery_address_snapshot,
        delivery_latitude=float(order.delivery_latitude) if order.delivery_latitude else None,
        delivery_longitude=float(order.delivery_longitude) if order.delivery_longitude else None,
        total_amount=float(order.total_amount),
        payment_mode=order.payment_mode.value,
        payment_status=order.payment_status.value,
        order_status=order.order_status.value,
        placed_at=order.placed_at.isoformat() if order.placed_at else "",
        confirmed_at=order.confirmed_at.isoformat() if order.confirmed_at else None,
        picked_at=order.picked_at.isoformat() if order.picked_at else None,
        packed_at=order.packed_at.isoformat() if order.packed_at else None,
        out_for_delivery_at=order.out_for_delivery_at.isoformat() if order.out_for_delivery_at else None,
        delivered_at=order.delivered_at.isoformat() if order.delivered_at else None,
        total_items=len(order.items) if order.items else 0,
        items=items_list,
        vendor_info=vendor_info,
        delivery_otp=order.delivery_otp,
    )


@router.get(
    "/orders",
    response_model=DeliveryPartnerOrderListResponse,
    summary="List assigned orders",
    description="Get all orders assigned to the delivery partner.",
)
def list_orders(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    status_filter: Optional[OrderStatus] = Query(None, alias="status"),
    current_user: User = Depends(require_role([UserRole.DELIVERY_PARTNER])),
    db: Session = Depends(get_db),
):
    """List orders assigned to the delivery partner."""
    delivery_partner = get_delivery_partner_for_user(db, current_user)
    
    # Build query with product images and vendor info
    query = db.query(Order).options(
        joinedload(Order.buyer),
        joinedload(Order.vendor),
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.images),
    ).filter(
        Order.delivery_partner_id == delivery_partner.id,
    )
    
    # Filter by status
    if status_filter:
        query = query.filter(Order.order_status == status_filter)
    
    # Get total count
    total = query.count()
    
    # Paginate
    orders = query.order_by(Order.out_for_delivery_at.desc().nullslast(), Order.placed_at.desc()).offset(
        (page - 1) * size
    ).limit(size).all()
    
    items = [_build_delivery_order_response(order) for order in orders]
    
    return DeliveryPartnerOrderListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get(
    "/orders/{order_id}",
    response_model=DeliveryPartnerOrderResponse,
    summary="Get order details",
    description="Get details of a specific order.",
)
def get_order(
    order_id: uuid.UUID,
    current_user: User = Depends(require_role([UserRole.DELIVERY_PARTNER])),
    db: Session = Depends(get_db),
):
    """Get order details."""
    delivery_partner = get_delivery_partner_for_user(db, current_user)
    
    order = db.query(Order).options(
        joinedload(Order.buyer),
        joinedload(Order.vendor),
        joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.images),
    ).filter(
        Order.id == order_id,
        Order.delivery_partner_id == delivery_partner.id,
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found or not assigned to you",
        )
    
    return _build_delivery_order_response(order)


@router.post(
    "/orders/{order_id}/deliver",
    response_model=DeliveryPartnerOrderResponse,
    summary="Mark order as delivered",
    description="Mark an order as delivered. Requires delivery OTP from customer. This updates order status and payment (for COD).",
)
def mark_delivered(
    order_id: uuid.UUID,
    otp_data: DeliveryOTPRequest,
    current_user: User = Depends(require_role([UserRole.DELIVERY_PARTNER])),
    db: Session = Depends(get_db),
):
    """Mark order as delivered with OTP verification."""
    delivery_partner = get_delivery_partner_for_user(db, current_user)
    
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.delivery_partner_id == delivery_partner.id,
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found or not assigned to you",
        )
    
    # Validate order status
    if order.order_status != OrderStatus.OUT_FOR_DELIVERY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order must be OUT_FOR_DELIVERY to mark as delivered. Current status: {order.order_status.value}",
        )
    
    # Get COD collection status
    cod_collected = None
    if order.payment_mode == PaymentMode.COD:
        cod_collected = otp_data.cod_collected if otp_data.cod_collected is not None else True
    
    # Update order status with OTP validation
    order_service = OrderService(db)
    order = order_service.mark_order_delivered(
        order_id,
        delivery_partner.id,
        cod_collected=cod_collected,
        delivery_otp=otp_data.delivery_otp,
    )
    
    db.refresh(order)
    order = db.query(Order).options(
        joinedload(Order.buyer),
        joinedload(Order.items),
    ).filter(Order.id == order_id).first()
    
    return _build_delivery_order_response(order)


@router.post(
    "/orders/{order_id}/fail",
    response_model=dict,
    summary="Mark delivery as failed",
    description="Mark a delivery attempt as failed with reason.",
)
def mark_delivery_failed(
    order_id: uuid.UUID,
    failure_data: DeliveryFailureRequest,
    current_user: User = Depends(require_role([UserRole.DELIVERY_PARTNER])),
    db: Session = Depends(get_db),
):
    """Mark delivery as failed."""
    delivery_partner = get_delivery_partner_for_user(db, current_user)
    
    # Map failure reason string to enum
    reason_map = {
        "customer_not_available": DeliveryFailureReason.CUSTOMER_NOT_AVAILABLE,
        "wrong_address": DeliveryFailureReason.WRONG_ADDRESS,
        "customer_refused": DeliveryFailureReason.CUSTOMER_REFUSED,
        "damaged_package": DeliveryFailureReason.DAMAGED_PACKAGE,
        "other": DeliveryFailureReason.OTHER,
    }
    
    failure_reason = reason_map.get(failure_data.failure_reason)
    if not failure_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid failure reason. Valid reasons: {list(reason_map.keys())}",
        )
    
    delivery_service = DeliveryService(db)
    delivery_history = delivery_service.mark_delivery_failed(
        order_id,
        delivery_partner.id,
        failure_reason,
        failure_data.failure_notes,
    )
    
    return {
        "message": "Delivery marked as failed",
        "delivery_history_id": str(delivery_history.id),
        "attempt_number": delivery_history.attempt_number,
    }


@router.post(
    "/orders/{order_id}/retry",
    response_model=dict,
    summary="Retry failed delivery",
    description="Create a retry attempt for a failed delivery.",
)
def retry_delivery(
    order_id: uuid.UUID,
    current_user: User = Depends(require_role([UserRole.DELIVERY_PARTNER])),
    db: Session = Depends(get_db),
):
    """Retry failed delivery."""
    delivery_partner = get_delivery_partner_for_user(db, current_user)
    
    delivery_service = DeliveryService(db)
    
    try:
        delivery_history = delivery_service.retry_delivery(order_id, delivery_partner.id)
        return {
            "message": "Delivery retry created",
            "delivery_history_id": str(delivery_history.id),
            "attempt_number": delivery_history.attempt_number,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/orders/{order_id}/return",
    response_model=dict,
    summary="Return order to vendor",
    description="Return order to vendor after failed delivery attempts.",
)
def return_order_to_vendor(
    order_id: uuid.UUID,
    return_reason: Optional[str] = None,
    current_user: User = Depends(require_role([UserRole.DELIVERY_PARTNER])),
    db: Session = Depends(get_db),
):
    """Return order to vendor."""
    delivery_partner = get_delivery_partner_for_user(db, current_user)
    
    delivery_service = DeliveryService(db)
    
    try:
        order = delivery_service.return_order_to_vendor(
            order_id,
            delivery_partner.id,
            return_reason,
        )
        return {
            "message": "Order returned to vendor",
            "order_id": str(order.id),
            "order_status": order.order_status.value,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/stats",
    response_model=DeliveryStatsResponse,
    summary="Get delivery statistics",
    description="Get delivery statistics for the current delivery partner.",
)
def get_delivery_stats(
    current_user: User = Depends(require_role([UserRole.DELIVERY_PARTNER])),
    db: Session = Depends(get_db),
):
    """Get delivery statistics."""
    delivery_partner = get_delivery_partner_for_user(db, current_user)
    
    delivery_service = DeliveryService(db)
    stats = delivery_service.get_delivery_stats(delivery_partner.id)
    
    return DeliveryStatsResponse(**stats)

