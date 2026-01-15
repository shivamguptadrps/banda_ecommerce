"""
Coupon Service
Business logic for coupon validation and discount calculation
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.coupon import Coupon, CouponUsage
from app.models.cart import Cart
from app.models.enums import DiscountType
from app.schemas.coupon import CouponValidationResponse


class CouponService:
    """Service for coupon operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_coupon_by_code(self, code: str) -> Optional[Coupon]:
        """Get coupon by code."""
        return self.db.query(Coupon).filter(
            Coupon.code == code.upper().strip()
        ).first()
    
    def validate_coupon(
        self,
        coupon_code: str,
        cart: Cart,
    ) -> CouponValidationResponse:
        """
        Validate coupon and calculate discount amount.
        
        Returns:
            CouponValidationResponse with validation result and discount amount
        """
        # 1. Check coupon exists
        coupon = self.get_coupon_by_code(coupon_code)
        if not coupon:
            return CouponValidationResponse(
                valid=False,
                discount_amount=Decimal("0.00"),
                message="Invalid coupon code",
            )
        
        # 2. Check coupon is active
        if not coupon.is_active:
            return CouponValidationResponse(
                valid=False,
                discount_amount=Decimal("0.00"),
                message="This coupon is not active",
            )
        
        # 3. Check not expired
        if coupon.expiry_date and coupon.expiry_date < datetime.utcnow():
            return CouponValidationResponse(
                valid=False,
                discount_amount=Decimal("0.00"),
                message="This coupon has expired",
            )
        
        # 4. Check usage limit
        if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
            return CouponValidationResponse(
                valid=False,
                discount_amount=Decimal("0.00"),
                message="This coupon has reached its usage limit",
            )
        
        # 5. Check minimum order amount
        cart_subtotal = cart.subtotal
        if cart_subtotal < coupon.min_order_amount:
            return CouponValidationResponse(
                valid=False,
                discount_amount=Decimal("0.00"),
                message=f"Minimum order amount of ₹{coupon.min_order_amount} required",
            )
        
        # 6. Calculate discount
        discount_amount = self._calculate_discount(coupon, cart_subtotal)
        
        return CouponValidationResponse(
            valid=True,
            discount_amount=discount_amount,
            message="Coupon applied successfully",
            coupon=coupon,
        )
    
    def _calculate_discount(
        self,
        coupon: Coupon,
        cart_subtotal: Decimal,
    ) -> Decimal:
        """Calculate discount amount based on coupon type."""
        if coupon.discount_type == DiscountType.PERCENTAGE:
            # Percentage discount
            discount = (cart_subtotal * coupon.discount_value) / Decimal("100")
            # Apply max discount cap if set
            if coupon.max_discount:
                discount = min(discount, coupon.max_discount)
        else:
            # Fixed discount
            discount = coupon.discount_value
            # Don't exceed cart subtotal
            discount = min(discount, cart_subtotal)
        
        return discount.quantize(Decimal("0.01"))
    
    def apply_coupon_to_cart(
        self,
        cart: Cart,
        coupon_code: str,
    ) -> Cart:
        """
        Apply coupon to cart.
        - Remove existing coupon if any
        - Validate new coupon
        - Update cart with coupon and discount
        """
        # Remove existing coupon first
        if cart.coupon_id:
            cart.coupon_id = None
            cart.discount_amount = Decimal("0.00")
        
        # Validate and apply new coupon
        validation = self.validate_coupon(coupon_code, cart)
        
        if not validation.valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=validation.message,
            )
        
        # Apply coupon
        cart.coupon_id = validation.coupon.id
        cart.discount_amount = validation.discount_amount
        
        self.db.commit()
        self.db.refresh(cart)
        
        return cart
    
    def remove_coupon_from_cart(self, cart: Cart) -> Cart:
        """Remove coupon from cart."""
        cart.coupon_id = None
        cart.discount_amount = Decimal("0.00")
        
        self.db.commit()
        self.db.refresh(cart)
        
        return cart
    
    def record_coupon_usage(
        self,
        coupon: Coupon,
        user_id: uuid.UUID,
        order_id: uuid.UUID,
        discount_amount: Decimal,
    ) -> CouponUsage:
        """Record coupon usage for an order."""
        # Create usage record
        usage = CouponUsage(
            coupon_id=coupon.id,
            user_id=user_id,
            order_id=order_id,
            discount_amount=discount_amount,
        )
        self.db.add(usage)
        
        # Increment used count
        coupon.used_count += 1
        
        self.db.commit()
        self.db.refresh(usage)
        
        return usage

