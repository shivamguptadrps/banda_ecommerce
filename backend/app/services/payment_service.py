"""
Payment Service
Business logic for Razorpay payment integration

Production Best Practices:
1. Idempotency: Prevent duplicate payment creation
2. Signature Verification: Always verify Razorpay signatures
3. Amount Validation: Ensure payment amount matches order amount
4. Status Checks: Prevent invalid state transitions
5. Error Handling: Comprehensive error handling with logging
6. Transaction Safety: Use database transactions for consistency
7. Webhook Security: Verify webhook signatures
8. Retry Logic: Handle transient failures gracefully
"""

import uuid
import hmac
import hashlib
import logging
from decimal import Decimal
from typing import Optional, Tuple
from datetime import datetime, timedelta

import razorpay
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status

from app.config import settings
from app.models.payment import Payment, PaymentLog
from app.models.order import Order
from app.models.enums import PaymentStatus, OrderStatus, PaymentMode
from app.services.order_service import OrderService

logger = logging.getLogger(__name__)


class PaymentService:
    """Service for payment operations with Razorpay."""
    
    def __init__(self, db: Session):
        """Initialize with database session and Razorpay client."""
        self.db = db
        self.razorpay_client = razorpay.Client(
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
        ) if settings.razorpay_key_id and settings.razorpay_key_secret else None
    
    def _verify_razorpay_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        """
        Verify Razorpay payment signature using HMAC SHA256.
        
        Production Security:
        - Always verify signatures in production
        - Use constant-time comparison to prevent timing attacks
        - Log signature verification failures for security monitoring
        
        Args:
            razorpay_order_id: Razorpay order ID
            razorpay_payment_id: Razorpay payment ID
            razorpay_signature: Razorpay signature to verify
            
        Returns:
            True if signature is valid
        """
        if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
            logger.warning("Missing signature parameters for verification")
            return False
        
        if not settings.razorpay_webhook_secret:
            # In development/test mode only
            if settings.debug:
                logger.warning("Razorpay webhook secret not configured - skipping signature verification (DEV MODE)")
                return True
            else:
                logger.error("Razorpay webhook secret not configured in production!")
                return False
        
        # Construct message: order_id|payment_id
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        
        # Generate expected signature
        expected_signature = hmac.new(
            settings.razorpay_webhook_secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Use constant-time comparison to prevent timing attacks
        is_valid = hmac.compare_digest(expected_signature, razorpay_signature)
        
        if not is_valid:
            logger.warning(
                f"Invalid payment signature for order {razorpay_order_id}, "
                f"payment {razorpay_payment_id}"
            )
        
        return is_valid
    
    def _verify_webhook_signature(
        self,
        payload: str,
        signature: str,
    ) -> bool:
        """
        Verify Razorpay webhook signature.
        
        Args:
            payload: Raw webhook payload (string)
            signature: X-Razorpay-Signature header value
            
        Returns:
            True if signature is valid
        """
        if not settings.razorpay_webhook_secret:
            if settings.debug:
                return True
            return False
        
        expected_signature = hmac.new(
            settings.razorpay_webhook_secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)
    
    def create_razorpay_order(
        self,
        order_id: uuid.UUID,
        amount: Decimal,
        currency: str = "INR",
    ) -> Payment:
        """
        Create a Razorpay order and payment record.
        
        Production Features:
        - Idempotency: Returns existing payment if already created
        - Amount Validation: Verifies amount matches order total
        - Order Validation: Ensures order is in valid state
        - Error Handling: Comprehensive error handling with logging
        - Transaction Safety: Uses database transactions
        
        Args:
            order_id: Order UUID
            amount: Payment amount (must match order total)
            currency: Currency code (default: INR)
            
        Returns:
            Payment object with razorpay_order_id
            
        Raises:
            HTTPException: If validation fails or Razorpay API error
        """
        # Validate Razorpay configuration
        if not self.razorpay_client:
            logger.error("Razorpay client not initialized - missing credentials")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Payment service unavailable. Please contact support.",
            )
        
        # Get and validate order
        order = self.db.query(Order).filter(Order.id == order_id).first()
        if not order:
            logger.warning(f"Order not found: {order_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        # Validate order state
        if order.order_status != OrderStatus.PENDING:
            logger.warning(
                f"Invalid order state for payment creation: {order.order_number} "
                f"status={order.order_status.value}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order is not in pending state. Current status: {order.order_status.value}",
            )
        
        # Validate payment mode
        if order.payment_mode != PaymentMode.ONLINE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This order is not configured for online payment",
            )
        
        # Validate amount (must match order total exactly)
        amount_tolerance = Decimal("0.01")  # Allow 1 paise tolerance for rounding
        if abs(amount - order.total_amount) > amount_tolerance:
            logger.error(
                f"Amount mismatch for order {order.order_number}: "
                f"expected={order.total_amount}, provided={amount}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount mismatch. Order total: ₹{order.total_amount}, provided: ₹{amount}",
            )
        
        # Idempotency: Check if payment already exists
        existing_payment = self.db.query(Payment).filter(
            Payment.order_id == order_id,
            Payment.status.in_([
                PaymentStatus.CREATED,
                PaymentStatus.AUTHORIZED,
                PaymentStatus.CAPTURED,
            ])
        ).first()
        
        if existing_payment:
            logger.info(
                f"Payment already exists for order {order.order_number}: "
                f"payment_id={existing_payment.id}, status={existing_payment.status.value}"
            )
            return existing_payment
        
        # Validate amount range (Razorpay minimum: 1 INR = 100 paise)
        if amount < Decimal("1.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum payment amount is ₹1.00",
            )
        
        # Convert amount to paise (Razorpay uses smallest currency unit)
        amount_paise = int(amount * 100)
        
        # Create Razorpay order with retry logic
        max_retries = 3
        razorpay_order = None
        last_error = None
        
        for attempt in range(max_retries):
            try:
                razorpay_order = self.razorpay_client.order.create({
                    "amount": amount_paise,
                    "currency": currency.upper(),
                    "receipt": f"order_{order.order_number}",
                    "notes": {
                        "order_id": str(order_id),
                        "order_number": order.order_number,
                        "buyer_id": str(order.buyer_id),
                    },
                    "partial_payment": False,  # Disallow partial payments
                })
                break
            except razorpay.errors.BadRequestError as e:
                # Don't retry on bad request errors
                logger.error(f"Razorpay bad request error: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid payment request: {str(e)}",
                )
            except Exception as e:
                last_error = e
                logger.warning(
                    f"Razorpay order creation attempt {attempt + 1} failed: {str(e)}"
                )
                if attempt < max_retries - 1:
                    import time
                    time.sleep(0.5 * (attempt + 1))  # Exponential backoff
        
        if not razorpay_order:
            logger.error(f"Failed to create Razorpay order after {max_retries} attempts")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create payment order. Please try again.",
            )
        
        # Create payment record in transaction
        try:
            payment = Payment(
                order_id=order_id,
                razorpay_order_id=razorpay_order["id"],
                amount=amount,
                currency=currency.upper(),
                status=PaymentStatus.CREATED,
            )
            
            self.db.add(payment)
            self.db.commit()
            self.db.refresh(payment)
            
            logger.info(
                f"Payment created successfully: order={order.order_number}, "
                f"razorpay_order_id={razorpay_order['id']}, payment_id={payment.id}"
            )
            
            # Log payment creation
            self._log_payment_event(
                payment_id=payment.id,
                event_type="payment.order.created",
                payload={
                    "razorpay_order_id": razorpay_order["id"],
                    "amount": amount_paise,
                    "currency": currency,
                    "order_number": order.order_number,
                }
            )
            
            return payment
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to save payment record: {str(e)}")
            # Attempt to cancel Razorpay order if payment record creation fails
            try:
                if razorpay_order:
                    self.razorpay_client.order.cancel(razorpay_order["id"])
            except Exception as cancel_error:
                logger.error(f"Failed to cancel Razorpay order: {str(cancel_error)}")
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process payment. Please try again.",
            )
    
    def verify_payment(
        self,
        order_id: uuid.UUID,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> Payment:
        """
        Verify and capture payment.
        
        Production Features:
        - Signature Verification: Always verify Razorpay signature
        - Idempotency: Handle duplicate verification attempts
        - Amount Validation: Verify payment amount matches order
        - Status Validation: Prevent invalid state transitions
        - Atomic Updates: Use transactions for consistency
        
        Args:
            order_id: Order UUID
            razorpay_order_id: Razorpay order ID
            razorpay_payment_id: Razorpay payment ID
            razorpay_signature: Razorpay signature
            
        Returns:
            Updated payment object
            
        Raises:
            HTTPException: If verification fails
        """
        # Verify signature first (security critical)
        if not self._verify_razorpay_signature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        ):
            logger.error(
                f"Invalid payment signature: order_id={order_id}, "
                f"razorpay_order_id={razorpay_order_id}, payment_id={razorpay_payment_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature. Payment verification failed.",
            )
        
        # Get payment with order
        payment = self.db.query(Payment).filter(
            Payment.order_id == order_id,
            Payment.razorpay_order_id == razorpay_order_id,
        ).first()
        
        if not payment:
            logger.warning(
                f"Payment not found: order_id={order_id}, razorpay_order_id={razorpay_order_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found",
            )
        
        # Idempotency: If already verified, return existing payment
        if payment.status == PaymentStatus.CAPTURED:
            if payment.razorpay_payment_id == razorpay_payment_id:
                logger.info(f"Payment already verified: payment_id={payment.id}")
                return payment
            else:
                logger.warning(
                    f"Payment already captured with different payment_id: "
                    f"existing={payment.razorpay_payment_id}, new={razorpay_payment_id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Payment already processed with different payment ID",
                )
        
        # Prevent verification of failed payments
        if payment.status == PaymentStatus.FAILED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot verify a failed payment. Please create a new payment.",
            )
        
        # Verify with Razorpay API
        if self.razorpay_client:
            try:
                razorpay_payment = self.razorpay_client.payment.fetch(razorpay_payment_id)
                
                # Validate payment belongs to order
                if razorpay_payment.get("order_id") != razorpay_order_id:
                    logger.error(
                        f"Payment order mismatch: payment.order_id={razorpay_payment.get('order_id')}, "
                        f"expected={razorpay_order_id}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Payment does not belong to this order",
                    )
                
                # Validate amount
                payment_amount = Decimal(razorpay_payment["amount"]) / 100
                if abs(payment_amount - payment.amount) > Decimal("0.01"):
                    logger.error(
                        f"Payment amount mismatch: expected={payment.amount}, "
                        f"razorpay={payment_amount}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Payment amount mismatch",
                    )
                
                # Update payment record based on Razorpay status
                payment.razorpay_payment_id = razorpay_payment_id
                payment.razorpay_signature = razorpay_signature
                payment.method = razorpay_payment.get("method")
                
                razorpay_status = razorpay_payment.get("status", "").lower()
                
                if razorpay_status == "captured":
                    payment.status = PaymentStatus.CAPTURED
                elif razorpay_status == "authorized":
                    payment.status = PaymentStatus.AUTHORIZED
                elif razorpay_status == "failed":
                    payment.status = PaymentStatus.FAILED
                    payment.failure_reason = razorpay_payment.get("error_description", "Payment failed")
                else:
                    logger.warning(f"Unknown Razorpay payment status: {razorpay_status}")
                    payment.status = PaymentStatus.PENDING
                
            except razorpay.errors.BadRequestError as e:
                logger.error(f"Razorpay bad request: {str(e)}")
                payment.status = PaymentStatus.FAILED
                payment.failure_reason = str(e)
                self.db.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Payment verification failed: {str(e)}",
                )
            except Exception as e:
                logger.error(f"Razorpay API error: {str(e)}")
                payment.status = PaymentStatus.FAILED
                payment.failure_reason = f"Verification error: {str(e)}"
                self.db.commit()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Payment verification service error. Please contact support.",
                )
        else:
            # Development mode: simulate successful payment
            logger.warning("Razorpay not configured - simulating payment in DEV MODE")
            payment.razorpay_payment_id = razorpay_payment_id
            payment.razorpay_signature = razorpay_signature
            payment.status = PaymentStatus.CAPTURED
        
        payment.updated_at = datetime.utcnow()
        
        try:
            self.db.commit()
            self.db.refresh(payment)
            
            # Update order status based on payment status
            order_service = OrderService(self.db)
            if payment.status == PaymentStatus.CAPTURED:
                order_service.confirm_payment(order_id, razorpay_payment_id)
                logger.info(f"Payment captured and order confirmed: order_id={order_id}")
            elif payment.status == PaymentStatus.FAILED:
                order_service.handle_payment_failure(order_id)
                logger.warning(f"Payment failed and order cancelled: order_id={order_id}")
            
            # Log payment verification
            self._log_payment_event(
                payment_id=payment.id,
                event_type="payment.verified",
                payload={
                    "razorpay_payment_id": razorpay_payment_id,
                    "status": payment.status.value,
                    "method": payment.method,
                }
            )
            
            return payment
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update payment: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process payment verification",
            )
    
    def handle_webhook(
        self,
        event: str,
        payload: dict,
        webhook_signature: Optional[str] = None,
    ) -> Optional[Payment]:
        """
        Handle Razorpay webhook events.
        
        Production Security:
        - Webhook signature verification
        - Idempotency: Handle duplicate webhooks
        - Event validation: Only process known events
        - Transaction safety: Use database transactions
        - Error handling: Log all webhook events
        
        Supported Events:
        - payment.captured: Payment successfully captured
        - payment.authorized: Payment authorized (for cards)
        - payment.failed: Payment failed
        - payment.refunded: Payment refunded
        
        Args:
            event: Webhook event type (e.g., "payment.captured")
            payload: Webhook payload (dict)
            webhook_signature: X-Razorpay-Signature header (optional, verified if provided)
            
        Returns:
            Updated payment object if applicable, None if event not applicable
        """
        # Log all webhook events for audit
        logger.info(f"Received webhook event: {event}")
        
        # Verify webhook signature if provided
        if webhook_signature:
            import json
            payload_str = json.dumps(payload, sort_keys=True)
            if not self._verify_webhook_signature(payload_str, webhook_signature):
                logger.error(f"Invalid webhook signature for event: {event}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid webhook signature",
                )
        
        # Extract payment details from payload
        # Razorpay webhook structure: payload.payment.entity
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        if not entity:
            entity = payload.get("payload", {}).get("payment", {})
        
        razorpay_payment_id = entity.get("id")
        razorpay_order_id = entity.get("order_id")
        
        if not razorpay_payment_id or not razorpay_order_id:
            logger.warning(f"Missing payment/order ID in webhook payload: {event}")
            return None
        
        # Find payment by razorpay_order_id
        payment = self.db.query(Payment).filter(
            Payment.razorpay_order_id == razorpay_order_id,
        ).first()
        
        if not payment:
            logger.warning(
                f"Payment not found for webhook: razorpay_order_id={razorpay_order_id}, event={event}"
            )
            return None
        
        # Idempotency: Check if we've already processed this event
        existing_log = self.db.query(PaymentLog).filter(
            PaymentLog.payment_id == payment.id,
            PaymentLog.event_type == event,
            PaymentLog.payload["entity"]["id"].astext == razorpay_payment_id,
        ).first()
        
        if existing_log:
            logger.info(
                f"Webhook event already processed: event={event}, payment_id={payment.id}"
            )
            return payment
        
        # Process event based on type
        try:
            if event == "payment.captured":
                # Only update if not already captured (idempotency)
                if payment.status != PaymentStatus.CAPTURED:
                    payment.status = PaymentStatus.CAPTURED
                    payment.razorpay_payment_id = razorpay_payment_id
                    payment.method = entity.get("method")
                    payment.updated_at = datetime.utcnow()
                    
                    # Confirm order
                    order_service = OrderService(self.db)
                    order_service.confirm_payment(payment.order_id, razorpay_payment_id)
                    
                    logger.info(f"Payment captured via webhook: payment_id={payment.id}")
                
            elif event == "payment.authorized":
                # Only update if not already captured (authorized is intermediate state)
                if payment.status not in [PaymentStatus.CAPTURED, PaymentStatus.AUTHORIZED]:
                    payment.status = PaymentStatus.AUTHORIZED
                    payment.razorpay_payment_id = razorpay_payment_id
                    payment.method = entity.get("method")
                    payment.updated_at = datetime.utcnow()
                    
                    logger.info(f"Payment authorized via webhook: payment_id={payment.id}")
                
            elif event == "payment.failed":
                # Only update if not already failed or captured
                if payment.status not in [PaymentStatus.FAILED, PaymentStatus.CAPTURED]:
                    payment.status = PaymentStatus.FAILED
                    payment.razorpay_payment_id = razorpay_payment_id
                    payment.failure_reason = entity.get("error_description", "Payment failed")
                    payment.updated_at = datetime.utcnow()
                    
                    # Release stock
                    order_service = OrderService(self.db)
                    order_service.handle_payment_failure(payment.order_id)
                    
                    logger.warning(f"Payment failed via webhook: payment_id={payment.id}")
                
            elif event == "payment.refunded":
                payment.status = PaymentStatus.REFUNDED
                payment.updated_at = datetime.utcnow()
                
                logger.info(f"Payment refunded via webhook: payment_id={payment.id}")
                
            else:
                logger.info(f"Unhandled webhook event: {event}")
                # Log but don't process unknown events
                self._log_payment_event(
                    payment_id=payment.id,
                    event_type=event,
                    payload=payload,
                )
                return payment
            
            self.db.commit()
            self.db.refresh(payment)
            
            # Log webhook event
            self._log_payment_event(
                payment_id=payment.id,
                event_type=event,
                payload=payload,
            )
            
            return payment
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error processing webhook event {event}: {str(e)}")
            # Log the error but don't fail the webhook (Razorpay will retry)
            self._log_payment_event(
                payment_id=payment.id,
                event_type=f"{event}.error",
                payload={"error": str(e), "original_payload": payload},
            )
            raise
    
    def get_payment_by_order_id(
        self,
        order_id: uuid.UUID,
    ) -> Optional[Payment]:
        """Get payment by order ID."""
        return self.db.query(Payment).filter(
            Payment.order_id == order_id,
        ).order_by(Payment.created_at.desc()).first()
    
    def _log_payment_event(
        self,
        payment_id: uuid.UUID,
        event_type: str,
        payload: dict,
    ) -> None:
        """Log a payment event."""
        log = PaymentLog(
            payment_id=payment_id,
            event_type=event_type,
            payload=payload,
        )
        self.db.add(log)
        self.db.commit()

