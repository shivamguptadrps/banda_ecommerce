"""
Shopping Cart API Routes
Buyer cart management
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.cart import (
    CartItemAdd,
    CartItemUpdate,
    CartResponse,
    CartItemResponse,
    CartSummary,
)
from app.schemas.coupon import CouponApplyRequest
from app.schemas.user import MessageResponse
from app.services.cart_service import CartService
from app.services.coupon_service import CouponService

router = APIRouter(prefix="/cart", tags=["Shopping Cart"])


@router.get("", response_model=CartResponse)
def get_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Get the current user's shopping cart."""
    service = CartService(db)
    cart = service.get_cart(current_user)
    
    if not cart:
        # Return empty cart response
        cart = service.get_or_create_cart(current_user)
    
    # Build response with product details
    items_response = []
    for item in cart.items:
        product_info = None
        if item.product:
            primary_image = None
            if hasattr(item.product, 'images') and item.product.images:
                primary = next((img for img in item.product.images if img.is_primary), None)
                if primary:
                    primary_image = primary.image_url
                elif item.product.images:
                    primary_image = item.product.images[0].image_url
            
            vendor_name = None
            if hasattr(item.product, 'vendor') and item.product.vendor:
                vendor_name = item.product.vendor.shop_name
            
            product_info = {
                "id": item.product.id,
                "name": item.product.name,
                "slug": item.product.slug,
                "primary_image": primary_image,
                "vendor_id": item.product.vendor_id,
                "vendor_name": vendor_name,
                "is_active": item.product.is_active,
                "is_in_stock": item.product.is_in_stock if hasattr(item.product, 'is_in_stock') else True,
            }
        
        items_response.append(
            CartItemResponse(
                id=item.id,
                cart_id=item.cart_id,
                product_id=item.product_id,
                sell_unit_id=item.sell_unit_id,
                quantity=item.quantity,
                line_total=item.line_total,
                stock_quantity_needed=item.stock_quantity_needed,
                created_at=item.created_at,
                updated_at=item.updated_at,
                product=product_info,
                sell_unit=item.sell_unit,
            )
        )
    
    coupon_code = cart.coupon.code if cart.coupon else None
    
    return CartResponse(
        id=cart.id,
        buyer_id=cart.buyer_id,
        total_items=cart.total_items,
        subtotal=cart.subtotal,
        discount_amount=cart.discount_amount,
        coupon_code=coupon_code,
        is_empty=cart.is_empty,
        items=items_response,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


@router.post("/items", response_model=CartResponse)
def add_to_cart(
    data: CartItemAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Add an item to the cart."""
    service = CartService(db)
    cart = service.add_item(current_user, data)
    
    # Build response similar to get_cart
    items_response = []
    for item in cart.items:
        items_response.append(
            CartItemResponse(
                id=item.id,
                cart_id=item.cart_id,
                product_id=item.product_id,
                sell_unit_id=item.sell_unit_id,
                quantity=item.quantity,
                line_total=item.line_total,
                stock_quantity_needed=item.stock_quantity_needed,
                created_at=item.created_at,
                updated_at=item.updated_at,
                sell_unit=item.sell_unit,
            )
        )
    
    coupon_code = cart.coupon.code if cart.coupon else None
    
    return CartResponse(
        id=cart.id,
        buyer_id=cart.buyer_id,
        total_items=cart.total_items,
        subtotal=cart.subtotal,
        discount_amount=cart.discount_amount,
        coupon_code=coupon_code,
        is_empty=cart.is_empty,
        items=items_response,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


@router.post("/apply-coupon", response_model=CartResponse)
def apply_coupon(
    data: CouponApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Apply a coupon to the cart."""
    cart_service = CartService(db)
    coupon_service = CouponService(db)
    
    # Get cart
    cart = cart_service.get_cart(current_user)
    if not cart:
        cart = cart_service.get_or_create_cart(current_user)
    
    # Apply coupon
    cart = coupon_service.apply_coupon_to_cart(cart, data.coupon_code)
    
    # Build response
    items_response = []
    for item in cart.items:
        product_info = None
        if item.product:
            primary_image = None
            if hasattr(item.product, 'images') and item.product.images:
                primary = next((img for img in item.product.images if img.is_primary), None)
                if primary:
                    primary_image = primary.image_url
                elif item.product.images:
                    primary_image = item.product.images[0].image_url
            
            vendor_name = None
            if hasattr(item.product, 'vendor') and item.product.vendor:
                vendor_name = item.product.vendor.shop_name
            
            product_info = {
                "id": item.product.id,
                "name": item.product.name,
                "slug": item.product.slug,
                "primary_image": primary_image,
                "vendor_id": item.product.vendor_id,
                "vendor_name": vendor_name,
                "is_active": item.product.is_active,
                "is_in_stock": item.product.is_in_stock if hasattr(item.product, 'is_in_stock') else True,
            }
        
        items_response.append(
            CartItemResponse(
                id=item.id,
                cart_id=item.cart_id,
                product_id=item.product_id,
                sell_unit_id=item.sell_unit_id,
                quantity=item.quantity,
                line_total=item.line_total,
                stock_quantity_needed=item.stock_quantity_needed,
                created_at=item.created_at,
                updated_at=item.updated_at,
                product=product_info,
                sell_unit=item.sell_unit,
            )
        )
    
    return CartResponse(
        id=cart.id,
        buyer_id=cart.buyer_id,
        total_items=cart.total_items,
        subtotal=cart.subtotal,
        discount_amount=cart.discount_amount,
        coupon_code=cart.coupon.code if cart.coupon else None,
        is_empty=cart.is_empty,
        items=items_response,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


@router.delete("/remove-coupon", response_model=CartResponse)
def remove_coupon(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Remove coupon from the cart."""
    cart_service = CartService(db)
    coupon_service = CouponService(db)
    
    # Get cart
    cart = cart_service.get_cart(current_user)
    if not cart:
        cart = cart_service.get_or_create_cart(current_user)
    
    # Remove coupon
    cart = coupon_service.remove_coupon_from_cart(cart)
    
    # Build response
    items_response = []
    for item in cart.items:
        product_info = None
        if item.product:
            primary_image = None
            if hasattr(item.product, 'images') and item.product.images:
                primary = next((img for img in item.product.images if img.is_primary), None)
                if primary:
                    primary_image = primary.image_url
                elif item.product.images:
                    primary_image = item.product.images[0].image_url
            
            vendor_name = None
            if hasattr(item.product, 'vendor') and item.product.vendor:
                vendor_name = item.product.vendor.shop_name
            
            product_info = {
                "id": item.product.id,
                "name": item.product.name,
                "slug": item.product.slug,
                "primary_image": primary_image,
                "vendor_id": item.product.vendor_id,
                "vendor_name": vendor_name,
                "is_active": item.product.is_active,
                "is_in_stock": item.product.is_in_stock if hasattr(item.product, 'is_in_stock') else True,
            }
        
        items_response.append(
            CartItemResponse(
                id=item.id,
                cart_id=item.cart_id,
                product_id=item.product_id,
                sell_unit_id=item.sell_unit_id,
                quantity=item.quantity,
                line_total=item.line_total,
                stock_quantity_needed=item.stock_quantity_needed,
                created_at=item.created_at,
                updated_at=item.updated_at,
                product=product_info,
                sell_unit=item.sell_unit,
            )
        )
    
    return CartResponse(
        id=cart.id,
        buyer_id=cart.buyer_id,
        total_items=cart.total_items,
        subtotal=cart.subtotal,
        discount_amount=cart.discount_amount,
        coupon_code=None,
        is_empty=cart.is_empty,
        items=items_response,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


@router.put("/items/{item_id}", response_model=CartResponse)
def update_cart_item(
    item_id: uuid.UUID,
    data: CartItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Update cart item quantity."""
    service = CartService(db)
    cart = service.update_item(current_user, item_id, data)
    
    items_response = []
    for item in cart.items:
        items_response.append(
            CartItemResponse(
                id=item.id,
                cart_id=item.cart_id,
                product_id=item.product_id,
                sell_unit_id=item.sell_unit_id,
                quantity=item.quantity,
                line_total=item.line_total,
                stock_quantity_needed=item.stock_quantity_needed,
                created_at=item.created_at,
                updated_at=item.updated_at,
                sell_unit=item.sell_unit,
            )
        )
    
    coupon_code = cart.coupon.code if cart.coupon else None
    
    return CartResponse(
        id=cart.id,
        buyer_id=cart.buyer_id,
        total_items=cart.total_items,
        subtotal=cart.subtotal,
        discount_amount=cart.discount_amount,
        coupon_code=coupon_code,
        is_empty=cart.is_empty,
        items=items_response,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


@router.delete("/items/{item_id}", response_model=CartResponse)
def remove_cart_item(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Remove an item from the cart."""
    service = CartService(db)
    cart = service.remove_item(current_user, item_id)
    
    items_response = []
    for item in cart.items:
        items_response.append(
            CartItemResponse(
                id=item.id,
                cart_id=item.cart_id,
                product_id=item.product_id,
                sell_unit_id=item.sell_unit_id,
                quantity=item.quantity,
                line_total=item.line_total,
                stock_quantity_needed=item.stock_quantity_needed,
                created_at=item.created_at,
                updated_at=item.updated_at,
                sell_unit=item.sell_unit,
            )
        )
    
    coupon_code = cart.coupon.code if cart.coupon else None
    
    return CartResponse(
        id=cart.id,
        buyer_id=cart.buyer_id,
        total_items=cart.total_items,
        subtotal=cart.subtotal,
        discount_amount=cart.discount_amount,
        coupon_code=coupon_code,
        is_empty=cart.is_empty,
        items=items_response,
        created_at=cart.created_at,
        updated_at=cart.updated_at,
    )


@router.delete("", response_model=MessageResponse)
def clear_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Clear all items from the cart."""
    service = CartService(db)
    service.clear_cart(current_user)
    return MessageResponse(message="Cart cleared successfully")


@router.get("/summary", response_model=CartSummary)
def get_cart_summary(
    delivery_address_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """
    Get cart summary with delivery calculation.
    
    Provide delivery_address_id to calculate delivery fees.
    """
    service = CartService(db)
    summary = service.get_cart_summary(current_user, delivery_address_id)
    return summary
