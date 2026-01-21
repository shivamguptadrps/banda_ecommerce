"""
Order Service
Business logic for order management with stock reservation
"""

import uuid
import random
import string
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Tuple

from sqlalchemy import and_, func
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

from app.models.order import Order, OrderItem, StockReservation
from app.models.cart import Cart, CartItem
from app.models.product import Product, SellUnit, Inventory
from app.models.address import DeliveryAddress
from app.models.vendor import Vendor
from app.models.user import User
from app.models.coupon import Coupon, CouponUsage
from app.models.enums import OrderStatus, PaymentStatus, PaymentMode
from app.models.notification import NotificationType, NotificationPriority
from app.schemas.order import OrderCreate, OrderStatusUpdate, OrderCancel
from app.services.cart_service import CartService
from app.services.coupon_service import CouponService
from app.services.notification_service import NotificationService


# Stock reservation timeout in minutes
RESERVATION_TIMEOUT_MINUTES = 10


class OrderService:
    """Service for order operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_order(
        self,
        buyer: User,
        data: OrderCreate,
    ) -> Order:
        """
        Create an order from the buyer's cart.
        
        Flow:
        1. Validate cart and stock
        2. Create order with items
        3. Reserve stock (temporary reservation)
        4. Clear cart
        5. Set order status to PLACED (requires vendor acceptance)
        
        Note: All orders (COD and ONLINE) start as PLACED and require vendor acceptance.
        The difference is only in payment handling:
        - COD: No payment authorization, payment collected on delivery
        - ONLINE: Payment authorized on PLACED, captured on CONFIRMED
        """
        cart_service = CartService(self.db)
        
        # Get cart with summary
        summary = cart_service.get_cart_summary(buyer, data.delivery_address_id)
        
        if not summary.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="; ".join(summary.validation_errors),
            )
        
        cart = cart_service.get_cart(buyer)
        if not cart or cart.is_empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart is empty",
            )
        
        # Get delivery address
        address = self._get_delivery_address(data.delivery_address_id, buyer.id)
        
        # Group items by vendor (for multi-vendor support)
        vendor_items = self._group_items_by_vendor(cart)
        
        # For now, support single vendor orders
        if len(vendor_items) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart contains items from multiple vendors. Please checkout separately.",
            )
        
        vendor_id, items = list(vendor_items.items())[0]
        
        # Acquire locks and reserve stock (atomic operation)
        try:
            # Create order
            order = self._create_order_record(
                buyer=buyer,
                vendor_id=vendor_id,
                address=address,
                items=items,
                summary=summary,
                payment_mode=data.payment_mode,
                notes=data.notes,
            )
            
            # Reserve stock for each item (temporary reservation, expires if not confirmed)
            self._reserve_stock(order, items)
            
            # Record coupon usage if coupon was applied
            coupon_service = CouponService(self.db)
            if cart.coupon_id:
                coupon = coupon_service.get_coupon_by_code(cart.coupon.code) if cart.coupon else None
                if coupon:
                    coupon_service.record_coupon_usage(
                        coupon=coupon,
                        user_id=buyer.id,
                        order_id=order.id,
                        discount_amount=summary.discount_amount,
                    )
            
            # Clear cart
            cart_service.clear_cart(buyer)
            
            # All orders start as PLACED and require vendor acceptance
            # The difference between COD and ONLINE is only in payment handling:
            # - COD: No payment authorization needed, payment collected on delivery
            # - ONLINE: Payment authorized on PLACED, captured on CONFIRMED
            order.order_status = OrderStatus.PLACED
            order.payment_status = PaymentStatus.PENDING
            # Stock remains reserved until vendor accepts or order auto-cancels
            
            self.db.commit()
            self.db.refresh(order)
            
            # Create notifications
            self._create_order_notifications(order)
            
            return order
            
        except HTTPException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create order: {str(e)}",
            )
    
    def get_order(
        self,
        order_id: uuid.UUID,
        buyer_id: Optional[uuid.UUID] = None,
    ) -> Optional[Order]:
        """Get order by ID with full details."""
        from app.models.payment import Payment
        from app.models.product import Product, ProductImage
        query = self.db.query(Order).options(
            joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.images),
            joinedload(Order.payments).joinedload(Payment.logs),  # Eager load payment logs
            joinedload(Order.vendor),
            joinedload(Order.delivery_address),
            joinedload(Order.buyer),
        ).filter(Order.id == order_id)
        
        if buyer_id:
            query = query.filter(Order.buyer_id == buyer_id)
        
        return query.first()
    
    def get_order_by_number(
        self,
        order_number: str,
        buyer_id: Optional[uuid.UUID] = None,
    ) -> Optional[Order]:
        """Get order by order number."""
        from app.models.product import Product, ProductImage
        query = self.db.query(Order).options(
            joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.images),
            joinedload(Order.vendor),
        ).filter(Order.order_number == order_number)
        
        if buyer_id:
            query = query.filter(Order.buyer_id == buyer_id)
        
        return query.first()
    
    def get_buyer_orders(
        self,
        buyer_id: uuid.UUID,
        page: int = 1,
        size: int = 10,
        status_filter: Optional[OrderStatus] = None,
    ) -> Tuple[List[Order], int]:
        """Get paginated orders for a buyer."""
        from app.models.product import Product, ProductImage
        query = self.db.query(Order).options(
            joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.images),
            joinedload(Order.vendor),
        ).filter(Order.buyer_id == buyer_id)
        
        if status_filter:
            query = query.filter(Order.order_status == status_filter)
        
        # Count total
        total = query.count()
        
        # Get paginated results
        offset = (page - 1) * size
        orders = query.order_by(Order.created_at.desc()).offset(offset).limit(size).all()
        
        return orders, total
    
    def get_vendor_orders(
        self,
        vendor_id: uuid.UUID,
        page: int = 1,
        size: int = 10,
        status_filter: Optional[OrderStatus] = None,
    ) -> Tuple[List[Order], int]:
        """Get paginated orders for a vendor."""
        query = self.db.query(Order).options(
            joinedload(Order.items),
            joinedload(Order.buyer),
        ).filter(Order.vendor_id == vendor_id)
        
        if status_filter:
            query = query.filter(Order.order_status == status_filter)
        
        # Count total
        total = query.count()
        
        # Get paginated results
        offset = (page - 1) * size
        orders = query.order_by(Order.created_at.desc()).offset(offset).limit(size).all()
        
        return orders, total
    
    def accept_order(
        self,
        order_id: uuid.UUID,
        vendor_id: uuid.UUID,
    ) -> Order:
        """
        Vendor accepts a PLACED order.
        
        Flow:
        1. Validate order is PLACED and belongs to vendor
        2. If online payment: Capture payment (authorize → capture)
        3. Update status to CONFIRMED
        4. Confirm stock reservations (deduct from inventory)
        """
        order = self.get_order(order_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        if order.vendor_id != vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to accept this order",
            )
        
        if order.order_status != OrderStatus.PLACED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order is not in PLACED status. Current status: {order.order_status.value}",
            )
        
        # For online payments: Capture payment if authorized
        if order.payment_mode == PaymentMode.ONLINE:
            from app.services.payment_service import PaymentService
            payment_service = PaymentService(self.db)
            
            # Get the payment record
            payment = payment_service.get_payment_by_order_id(order_id)
            if payment:
                # If payment is authorized, capture it
                if payment.status == PaymentStatus.AUTHORIZED:
                    try:
                        payment_service.capture_payment(
                            order_id=order_id,
                            amount=order.total_amount,
                        )
                    except Exception as e:
                        logger.error(f"Failed to capture payment for order {order.order_number}: {str(e)}")
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to capture payment. Please try again.",
                        )
                elif payment.status == PaymentStatus.CREATED:
                    # Payment was created but not authorized yet - wait for user to complete payment
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Payment not yet authorized. Please wait for customer to complete payment.",
                    )
                elif payment.status == PaymentStatus.FAILED:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Payment failed. Cannot accept order with failed payment.",
                    )
        
        # Update order status to CONFIRMED
        order.order_status = OrderStatus.CONFIRMED
        order.confirmed_at = datetime.utcnow()
        
        # Confirm stock reservations and deduct from inventory
        self._confirm_reservations(order.id)
        
        self.db.commit()
        self.db.refresh(order)
        
        # Create notification
        self._create_order_status_notification(order, NotificationType.ORDER_CONFIRMED)
        
        return order
    
    def reject_order(
        self,
        order_id: uuid.UUID,
        vendor_id: uuid.UUID,
        reason: Optional[str] = None,
    ) -> Order:
        """
        Vendor rejects a PLACED order.
        
        Flow:
        1. Cancel order
        2. Release stock reservations
        3. If online payment: Release authorization (refund if captured)
        """
        order = self.get_order(order_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        if order.vendor_id != vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to reject this order",
            )
        
        if order.order_status != OrderStatus.PLACED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order is not in PLACED status. Current status: {order.order_status.value}",
            )
        
        # Cancel order
        order.order_status = OrderStatus.CANCELLED
        order.cancelled_at = datetime.utcnow()
        order.cancellation_reason = reason or "Rejected by vendor"
        
        # Release stock reservations
        self._release_reservations(order.id)
        
        # For online payments: Release authorization or refund if captured
        if order.payment_mode == PaymentMode.ONLINE:
            from app.services.payment_service import PaymentService
            payment_service = PaymentService(self.db)
            
            payment = payment_service.get_payment_by_order_id(order_id)
            if payment:
                if payment.status == PaymentStatus.AUTHORIZED:
                    # Release authorization (no refund needed, not captured)
                    logger.info(f"Releasing payment authorization for order {order.order_number}")
                elif payment.status == PaymentStatus.CAPTURED:
                    # Refund captured payment
                    try:
                        payment_service.initiate_refund(
                            order_id=order_id,
                            amount=order.total_amount,
                            reason="Order rejected by vendor",
                        )
                    except Exception as e:
                        logger.error(f"Failed to refund payment for order {order.order_number}: {str(e)}")
                        # Continue with cancellation even if refund fails
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def mark_order_picked(
        self,
        order_id: uuid.UUID,
        vendor_id: uuid.UUID,
    ) -> Order:
        """Mark order as picked (CONFIRMED → PICKED)."""
        order = self.get_order(order_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        if order.vendor_id != vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this order",
            )
        
        if order.order_status != OrderStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order must be CONFIRMED to mark as picked. Current status: {order.order_status.value}",
            )
        
        order.order_status = OrderStatus.PICKED
        order.picked_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(order)
        
        # Create notification
        self._create_order_status_notification(order, NotificationType.ORDER_PICKED)
        
        return order
    
    def mark_order_packed(
        self,
        order_id: uuid.UUID,
        vendor_id: uuid.UUID,
    ) -> Order:
        """Mark order as packed (PICKED → PACKED)."""
        order = self.get_order(order_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        if order.vendor_id != vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this order",
            )
        
        if order.order_status != OrderStatus.PICKED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order must be PICKED to mark as packed. Current status: {order.order_status.value}",
            )
        
        order.order_status = OrderStatus.PACKED
        order.packed_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(order)
        
        # Create notification
        self._create_order_status_notification(order, NotificationType.ORDER_PACKED)
        
        return order
    
    def mark_order_delivered(
        self,
        order_id: uuid.UUID,
        delivery_partner_id: uuid.UUID,
        cod_collected: Optional[bool] = None,
    ) -> Order:
        """Mark order as delivered (OUT_FOR_DELIVERY → DELIVERED)."""
        order = self.get_order(order_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        if order.delivery_partner_id != delivery_partner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to deliver this order",
            )
        
        if order.order_status != OrderStatus.OUT_FOR_DELIVERY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order must be OUT_FOR_DELIVERY to mark as delivered. Current status: {order.order_status.value}",
            )
        
        # Update delivery history
        from app.models.delivery_history import DeliveryHistory, DeliveryAttemptStatus
        delivery_history = self.db.query(DeliveryHistory).filter(
            DeliveryHistory.order_id == order_id,
            DeliveryHistory.delivery_partner_id == delivery_partner_id,
        ).order_by(DeliveryHistory.attempt_number.desc()).first()
        
        if delivery_history:
            delivery_history.status = DeliveryAttemptStatus.SUCCESS
            delivery_history.completed_at = datetime.utcnow()
            delivery_history.attempted_at = delivery_history.attempted_at or datetime.utcnow()
            
            # Calculate delivery time
            if delivery_history.assigned_at:
                time_diff = delivery_history.completed_at - delivery_history.assigned_at
                delivery_history.delivery_time_minutes = int(time_diff.total_seconds() / 60)
            
            # Update COD collection
            if order.payment_mode == PaymentMode.COD:
                if cod_collected is None:
                    # Default to True for COD (assume collected on successful delivery)
                    cod_collected = True
                delivery_history.cod_collected = cod_collected
                delivery_history.cod_collected_at = datetime.utcnow() if cod_collected else None
        
        order.order_status = OrderStatus.DELIVERED
        delivered_at = datetime.utcnow()
        order.delivered_at = delivered_at
        
        # Calculate return_deadline for order items
        for order_item in order.items:
            if order_item.return_eligible and order_item.return_window_days:
                from datetime import timedelta
                order_item.return_deadline = delivered_at + timedelta(days=order_item.return_window_days)
        
        # For COD orders, mark payment as paid only if collected
        if order.payment_mode == PaymentMode.COD:
            if cod_collected is True:
                order.payment_status = PaymentStatus.PAID
            elif cod_collected is False:
                # COD not collected - this is a problem, but we'll mark as delivered
                # Admin/vendor will need to handle this separately
                pass
        
        self.db.commit()
        self.db.refresh(order)
        
        # Create notification
        self._create_order_status_notification(order, NotificationType.ORDER_DELIVERED)
        
        return order
    
    def assign_order_to_delivery_partner(
        self,
        order_id: uuid.UUID,
        delivery_partner_id: uuid.UUID,
    ) -> Order:
        """Assign order to delivery partner and mark as OUT_FOR_DELIVERY."""
        order = self.get_order(order_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        # Validate order status - must be PACKED
        if order.order_status != OrderStatus.PACKED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order must be PACKED to assign to delivery partner. Current status: {order.order_status.value}",
            )
        
        # Check if delivery partner exists and is available
        from app.models.delivery_partner import DeliveryPartner
        delivery_partner = self.db.query(DeliveryPartner).filter(
            DeliveryPartner.id == delivery_partner_id,
            DeliveryPartner.is_active == True,
        ).first()
        
        if not delivery_partner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Delivery partner not found or inactive",
            )
        
        if not delivery_partner.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Delivery partner is not available",
            )
        
        # Assign order
        order.delivery_partner_id = delivery_partner_id
        order.order_status = OrderStatus.OUT_FOR_DELIVERY
        order.out_for_delivery_at = datetime.utcnow()
        
        # Create delivery history record
        from app.models.delivery_history import DeliveryHistory, DeliveryAttemptStatus
        delivery_history = DeliveryHistory(
            order_id=order.id,
            delivery_partner_id=delivery_partner_id,
            attempt_number=1,
            status=DeliveryAttemptStatus.PENDING,
            is_cod=(order.payment_mode == PaymentMode.COD),
            cod_amount=order.total_amount if order.payment_mode == PaymentMode.COD else None,
            assigned_at=datetime.utcnow(),
        )
        self.db.add(delivery_history)
        
        self.db.commit()
        self.db.refresh(order)
        
        # Create notification
        self._create_order_status_notification(order, NotificationType.ORDER_OUT_FOR_DELIVERY)
        
        return order
    
    def update_order_status(
        self,
        order_id: uuid.UUID,
        vendor_id: uuid.UUID,
        data: OrderStatusUpdate,
    ) -> Order:
        """Update order status (vendor action) - Legacy method for backward compatibility."""
        order = self.get_order(order_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        if order.vendor_id != vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this order",
            )
        
        # Validate status transition
        if not self._is_valid_status_transition(order.order_status, data.status):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from {order.order_status.value} to {data.status.value}",
            )
        
        # Update status
        order.order_status = data.status
        
        # Set timestamp based on status
        now = datetime.utcnow()
        if data.status == OrderStatus.CONFIRMED:
            order.confirmed_at = now
        elif data.status == OrderStatus.PICKED:
            order.picked_at = now
        elif data.status == OrderStatus.PACKED:
            order.packed_at = now
        elif data.status == OrderStatus.OUT_FOR_DELIVERY:
            order.out_for_delivery_at = now
        elif data.status == OrderStatus.DELIVERED:
            order.delivered_at = now
            if order.payment_mode == PaymentMode.COD:
                order.payment_status = PaymentStatus.PAID
        elif data.status == OrderStatus.CANCELLED:
            order.cancelled_at = now
            order.cancellation_reason = data.notes
            # Release reserved stock
            self._release_reservations(order.id)
        # Legacy statuses
        elif data.status == OrderStatus.PROCESSING:
            order.processing_at = now
            # Map to PICKED
            if order.order_status != OrderStatus.PICKED:
                order.order_status = OrderStatus.PICKED
                order.picked_at = now
        elif data.status == OrderStatus.SHIPPED:
            order.shipped_at = now
            # Map to OUT_FOR_DELIVERY
            if order.order_status != OrderStatus.OUT_FOR_DELIVERY:
                order.order_status = OrderStatus.OUT_FOR_DELIVERY
                order.out_for_delivery_at = now
        
        if data.notes:
            order.notes = data.notes
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def cancel_order(
        self,
        order_id: uuid.UUID,
        buyer_id: uuid.UUID,
        data: OrderCancel,
    ) -> Order:
        """Cancel an order (buyer action)."""
        order = self.get_order(order_id, buyer_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        if not order.is_cancellable:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order cannot be cancelled at this stage",
            )
        
        order.order_status = OrderStatus.CANCELLED
        order.cancelled_at = datetime.utcnow()
        order.cancellation_reason = data.reason
        
        # Release reserved stock
        self._release_reservations(order.id)
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def confirm_payment(
        self,
        order_id: uuid.UUID,
        payment_id: str,
    ) -> Order:
        """Confirm payment and finalize order."""
        order = self.get_order(order_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        if order.payment_status != PaymentStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment already processed",
            )
        
        # Update payment status
        order.payment_status = PaymentStatus.PAID
        order.order_status = OrderStatus.CONFIRMED
        order.confirmed_at = datetime.utcnow()
        
        # Confirm reservations and deduct stock
        self._confirm_reservations(order.id)
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def handle_payment_failure(
        self,
        order_id: uuid.UUID,
    ) -> Order:
        """Handle payment failure."""
        order = self.get_order(order_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        order.payment_status = PaymentStatus.FAILED
        order.order_status = OrderStatus.CANCELLED
        order.cancelled_at = datetime.utcnow()
        order.cancellation_reason = "Payment failed"
        
        # Release reserved stock
        self._release_reservations(order.id)
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def release_expired_reservations(self) -> int:
        """
        Release expired stock reservations.
        This should be called by a cron job.
        """
        now = datetime.utcnow()
        
        # Find expired active reservations
        expired_reservations = self.db.query(StockReservation).filter(
            and_(
                StockReservation.status == "active",
                StockReservation.expires_at < now,
            )
        ).all()
        
        count = 0
        for reservation in expired_reservations:
            self._release_single_reservation(reservation)
            
            # Cancel associated order
            order = self.get_order(reservation.order_id)
            if order and order.order_status == OrderStatus.PENDING:
                order.order_status = OrderStatus.CANCELLED
                order.cancelled_at = now
                order.cancellation_reason = "Payment timeout"
            
            count += 1
        
        if count > 0:
            self.db.commit()
        
        return count
    
    # ========== Helper Methods ==========
    
    def _get_delivery_address(
        self,
        address_id: uuid.UUID,
        buyer_id: uuid.UUID,
    ) -> DeliveryAddress:
        """Get and validate delivery address."""
        address = self.db.query(DeliveryAddress).filter(
            and_(
                DeliveryAddress.id == address_id,
                DeliveryAddress.buyer_id == buyer_id,
                DeliveryAddress.is_active == True,
            )
        ).first()
        
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Delivery address not found",
            )
        
        return address
    
    def _group_items_by_vendor(
        self,
        cart: Cart,
    ) -> dict:
        """Group cart items by vendor."""
        vendor_items = {}
        for item in cart.items:
            vendor_id = item.product.vendor_id
            if vendor_id not in vendor_items:
                vendor_items[vendor_id] = []
            vendor_items[vendor_id].append(item)
        return vendor_items
    
    def _generate_delivery_otp(self) -> str:
        """Generate a 6-digit OTP for delivery confirmation."""
        return ''.join(random.choices(string.digits, k=6))
    
    def _create_order_record(
        self,
        buyer: User,
        vendor_id: uuid.UUID,
        address: DeliveryAddress,
        items: List[CartItem],
        summary,
        payment_mode: PaymentMode,
        notes: Optional[str] = None,
    ) -> Order:
        """Create order and order items."""
        order_number = self._generate_order_number()
        delivery_otp = self._generate_delivery_otp()
        
        order = Order(
            order_number=order_number,
            buyer_id=buyer.id,
            vendor_id=vendor_id,
            delivery_address_id=address.id,
            delivery_address_snapshot=address.full_address,
            delivery_latitude=address.latitude,
            delivery_longitude=address.longitude,
            subtotal=summary.subtotal,
            delivery_fee=summary.delivery_fee,
            discount_amount=summary.discount_amount,
            tax_amount=summary.tax_amount,
            total_amount=summary.total_amount,
            payment_mode=payment_mode,
            payment_status=PaymentStatus.PENDING,
            order_status=OrderStatus.PLACED,  # Start with PLACED, vendor will accept
            notes=notes,
            delivery_otp=delivery_otp,  # Generate OTP for delivery confirmation
        )
        self.db.add(order)
        self.db.flush()
        
        # Create order items with return policy snapshot
        for cart_item in items:
            # Snapshot return policy from product
            product = cart_item.product
            return_eligible = product.return_eligible if product else False
            return_window_days = product.return_window_days if product and product.return_eligible else None
            
            order_item = OrderItem(
                order_id=order.id,
                product_id=cart_item.product_id,
                sell_unit_id=cart_item.sell_unit_id,
                product_name=cart_item.product.name,
                sell_unit_label=cart_item.sell_unit.label,
                unit_value=cart_item.sell_unit.unit_value,
                quantity=cart_item.quantity,
                price_per_unit=cart_item.sell_unit.price,
                total_price=cart_item.line_total,
                # Return policy snapshot
                return_eligible=return_eligible,
                return_window_days=return_window_days,
                # return_deadline will be calculated when order is delivered
                return_deadline=None,
            )
            self.db.add(order_item)
        
        return order
    
    def _reserve_stock(
        self,
        order: Order,
        items: List[CartItem],
    ) -> None:
        """Reserve stock for order items."""
        expires_at = datetime.utcnow() + timedelta(minutes=RESERVATION_TIMEOUT_MINUTES)
        
        for cart_item in items:
            stock_needed = cart_item.sell_unit.unit_value * cart_item.quantity
            
            # Get inventory with lock
            inventory = self.db.query(Inventory).filter(
                Inventory.product_id == cart_item.product_id
            ).with_for_update().first()
            
            if not inventory:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {cart_item.product.name} is out of stock",
                )
            
            available = inventory.available_quantity - inventory.reserved_quantity
            
            if stock_needed > available:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for {cart_item.product.name}",
                )
            
            # Reserve stock
            inventory.reserved_quantity += stock_needed
            
            # Create reservation record
            reservation = StockReservation(
                order_id=order.id,
                product_id=cart_item.product_id,
                reserved_quantity=stock_needed,
                expires_at=expires_at,
                status="active",
            )
            self.db.add(reservation)
    
    def _confirm_reservations(
        self,
        order_id: uuid.UUID,
    ) -> None:
        """Confirm reservations and deduct stock."""
        reservations = self.db.query(StockReservation).filter(
            and_(
                StockReservation.order_id == order_id,
                StockReservation.status == "active",
            )
        ).all()
        
        for reservation in reservations:
            # Get inventory
            inventory = self.db.query(Inventory).filter(
                Inventory.product_id == reservation.product_id
            ).with_for_update().first()
            
            if inventory:
                # Deduct from available and reserved
                inventory.available_quantity -= reservation.reserved_quantity
                inventory.reserved_quantity -= reservation.reserved_quantity
            
            # Update reservation status
            reservation.status = "confirmed"
            reservation.confirmed_at = datetime.utcnow()
    
    def _release_reservations(
        self,
        order_id: uuid.UUID,
    ) -> None:
        """Release all reservations for an order."""
        reservations = self.db.query(StockReservation).filter(
            and_(
                StockReservation.order_id == order_id,
                StockReservation.status == "active",
            )
        ).all()
        
        for reservation in reservations:
            self._release_single_reservation(reservation)
    
    def _release_single_reservation(
        self,
        reservation: StockReservation,
    ) -> None:
        """Release a single reservation."""
        # Get inventory
        inventory = self.db.query(Inventory).filter(
            Inventory.product_id == reservation.product_id
        ).with_for_update().first()
        
        if inventory:
            # Release reserved quantity
            inventory.reserved_quantity -= reservation.reserved_quantity
            if inventory.reserved_quantity < 0:
                inventory.reserved_quantity = Decimal("0")
        
        # Update reservation status
        reservation.status = "released"
        reservation.released_at = datetime.utcnow()
    
    def _generate_order_number(self) -> str:
        """Generate unique order number."""
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        return f"ORD{timestamp}{random_part}"
    
    def auto_cancel_placed_orders(
        self,
        timeout_minutes: int = 15,
    ) -> int:
        """
        Auto-cancel PLACED orders that haven't been accepted within timeout.
        
        Returns:
            Number of orders cancelled
        """
        timeout_threshold = datetime.utcnow() - timedelta(minutes=timeout_minutes)
        
        # Find PLACED orders older than timeout
        placed_orders = self.db.query(Order).filter(
            Order.order_status == OrderStatus.PLACED,
            Order.placed_at < timeout_threshold,
        ).all()
        
        cancelled_count = 0
        
        for order in placed_orders:
            try:
                logger.info(f"Auto-cancelling order {order.order_number} (placed at {order.placed_at})")
                
                # Cancel order
                order.order_status = OrderStatus.CANCELLED
                order.cancelled_at = datetime.utcnow()
                order.cancellation_reason = f"Auto-cancelled: Not accepted within {timeout_minutes} minutes"
                
                # Release stock reservations
                self._release_reservations(order.id)
                
                # For online payments: Release authorization
                if order.payment_mode == PaymentMode.ONLINE:
                    from app.services.payment_service import PaymentService
                    payment_service = PaymentService(self.db)
                    
                    payment = payment_service.get_payment_by_order_id(order.id)
                    if payment:
                        if payment.status == PaymentStatus.AUTHORIZED:
                            logger.info(f"Releasing payment authorization for auto-cancelled order {order.order_number}")
                        elif payment.status == PaymentStatus.CAPTURED:
                            # Refund if captured
                            try:
                                payment_service.initiate_refund(
                                    order_id=order.id,
                                    amount=order.total_amount,
                                    reason="Order auto-cancelled: Not accepted within timeout",
                                )
                            except Exception as e:
                                logger.error(f"Failed to refund payment for auto-cancelled order {order.order_number}: {str(e)}")
                
                cancelled_count += 1
                
            except Exception as e:
                logger.error(f"Error auto-cancelling order {order.order_number}: {str(e)}")
                continue
        
        if cancelled_count > 0:
            self.db.commit()
            logger.info(f"Auto-cancelled {cancelled_count} PLACED orders")
        
        return cancelled_count
    
    def _is_valid_status_transition(
        self,
        current: OrderStatus,
        new: OrderStatus,
    ) -> bool:
        """Check if status transition is valid."""
        valid_transitions = {
            # New flow
            OrderStatus.PLACED: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
            OrderStatus.CONFIRMED: [OrderStatus.PICKED, OrderStatus.CANCELLED],
            OrderStatus.PICKED: [OrderStatus.PACKED, OrderStatus.CANCELLED],
            OrderStatus.PACKED: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
            OrderStatus.OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
            OrderStatus.DELIVERED: [OrderStatus.RETURNED],
            OrderStatus.CANCELLED: [],
            OrderStatus.RETURNED: [],
            # Legacy statuses (for backward compatibility)
            OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],  # Maps to PLACED
            OrderStatus.PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],  # Maps to PICKED
            OrderStatus.SHIPPED: [OrderStatus.DELIVERED, OrderStatus.RETURNED],  # Maps to OUT_FOR_DELIVERY
        }
        
        return new in valid_transitions.get(current, [])
    
    # ============== Admin Methods ==============
    
    def get_all_orders(
        self,
        status: Optional[OrderStatus] = None,
        vendor_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[Order], int]:
        """Get all orders with filters (admin view)."""
        query = self.db.query(Order).options(
            joinedload(Order.buyer),
            joinedload(Order.vendor),
            joinedload(Order.items).joinedload(OrderItem.sell_unit),
        )
        
        if status:
            query = query.filter(Order.order_status == status)
        
        if vendor_id:
            query = query.filter(Order.vendor_id == vendor_id)
        
        if search:
            query = query.filter(
                Order.order_number.ilike(f"%{search}%")
            )
        
        # Get total count
        total = query.count()
        
        # Paginate and order
        orders = query.order_by(Order.created_at.desc()).offset((page - 1) * size).limit(size).all()
        
        return orders, total
    
    def get_order_stats(self) -> dict:
        """Get order statistics for dashboard."""
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Total orders
        total_orders = self.db.query(func.count(Order.id)).scalar() or 0
        
        # Pending orders
        pending_orders = self.db.query(func.count(Order.id)).filter(
            Order.order_status == OrderStatus.PENDING
        ).scalar() or 0
        
        # Processing orders (confirmed + processing + shipped)
        processing_orders = self.db.query(func.count(Order.id)).filter(
            Order.order_status.in_([OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED])
        ).scalar() or 0
        
        # Delivered today
        delivered_today = self.db.query(func.count(Order.id)).filter(
            and_(
                Order.order_status == OrderStatus.DELIVERED,
                Order.updated_at >= today_start,
            )
        ).scalar() or 0
        
        # Total revenue
        total_revenue = self.db.query(func.sum(Order.total_amount)).filter(
            Order.order_status == OrderStatus.DELIVERED
        ).scalar() or 0
        
        return {
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "processing_orders": processing_orders,
            "delivered_today": delivered_today,
            "total_revenue": float(total_revenue),
        }
    
    def update_order_status_admin(
        self,
        order_id: uuid.UUID,
        new_status: OrderStatus,
    ) -> Optional[Order]:
        """Admin can update order status (with fewer restrictions)."""
        order = self.db.query(Order).filter(Order.id == order_id).first()
        
        if not order:
            return None
        
        old_status = order.order_status
        
        # Admin can make most transitions except some invalid ones
        invalid_transitions = {
            OrderStatus.DELIVERED: [OrderStatus.PENDING, OrderStatus.CONFIRMED],
            OrderStatus.CANCELLED: [OrderStatus.DELIVERED],
        }
        
        if new_status in invalid_transitions.get(old_status, []):
            raise ValueError(f"Cannot transition from {old_status.value} to {new_status.value}")
        
        # Handle cancellation
        if new_status == OrderStatus.CANCELLED and old_status != OrderStatus.CANCELLED:
            self._release_reservations(order_id)
        
        # Handle confirmation (for COD or after payment)
        if new_status == OrderStatus.CONFIRMED and old_status == OrderStatus.PENDING:
            self._confirm_reservations(order_id)
        
        order.order_status = new_status
        order.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def _create_order_notifications(self, order: Order):
        """Create notifications when an order is placed."""
        notification_service = NotificationService(self.db)
        
        # Notify buyer (buyer is a User object directly)
        if order.buyer:
            notification_service.create_order_notification(
                user_id=order.buyer.id,
                order_id=order.id,
                order_number=order.order_number,
                notification_type=NotificationType.ORDER_PLACED,
            )
        
        # Notify vendor (vendor has a user relationship)
        if order.vendor and order.vendor.user:
            notification_service.create_order_notification(
                user_id=order.vendor.user.id,
                order_id=order.id,
                order_number=order.order_number,
                notification_type=NotificationType.NEW_ORDER,
            )
    
    def _create_order_status_notification(
        self,
        order: Order,
        notification_type: NotificationType,
        target_user: Optional[User] = None,
    ):
        """Create a notification for order status changes."""
        notification_service = NotificationService(self.db)
        
        # Determine target user(s)
        users = []
        
        if target_user:
            users = [target_user]
        elif notification_type == NotificationType.ORDER_CONFIRMED:
            # Notify buyer when order is confirmed (buyer is a User object directly)
            if order.buyer:
                users = [order.buyer]
        elif notification_type in [
            NotificationType.ORDER_PICKED,
            NotificationType.ORDER_PACKED,
            NotificationType.ORDER_OUT_FOR_DELIVERY,
            NotificationType.ORDER_DELIVERED,
        ]:
            # Notify buyer for these statuses (buyer is a User object directly)
            if order.buyer:
                users = [order.buyer]
            # Also notify vendor for delivered (vendor has a user relationship)
            if notification_type == NotificationType.ORDER_DELIVERED and order.vendor and order.vendor.user:
                users.append(order.vendor.user)
            # Also notify delivery partner if assigned (delivery_partner has a user relationship)
            if notification_type == NotificationType.ORDER_DELIVERED and order.delivery_partner and order.delivery_partner.user:
                users.append(order.delivery_partner.user)
        else:
            # Default to buyer (buyer is a User object directly)
            if order.buyer:
                users = [order.buyer]
        
        # Create notifications for all target users
        for user in users:
            notification_service.create_order_notification(
                user_id=user.id,
                order_id=order.id,
                order_number=order.order_number,
                notification_type=notification_type,
            )
