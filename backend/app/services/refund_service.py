"""
Refund Service
Business logic for processing refunds via Razorpay
"""

import uuid
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, List

import razorpay
from sqlalchemy import and_, desc
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

import importlib
# Import return model dynamically since 'return' is a Python keyword
_return_model = importlib.import_module("app.models.return")
ReturnRequest = _return_model.ReturnRequest

from app.config import settings
from app.models.refund import Refund, RefundStatus
from app.models.payment import Payment
from app.models.order import Order
from app.models.enums import PaymentStatus, PaymentMode, ReturnStatus
from app.schemas.refund import RefundCreate
from app.services.return_service import ReturnService
from app.services.notification_service import NotificationService


class RefundService:
    """Service for refund operations with Razorpay."""
    
    def __init__(self, db: Session):
        """Initialize with database session and Razorpay client."""
        self.db = db
        self.razorpay_client = razorpay.Client(
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
        ) if settings.razorpay_key_id and settings.razorpay_key_secret else None
    
    def create_refund(
        self,
        return_request_id: uuid.UUID,
        refund_amount: Optional[Decimal] = None,
        reason: Optional[str] = None,
    ) -> Refund:
        """
        Create and process a refund for an approved return request.
        
        Validations:
        1. Return request must be APPROVED
        2. Order must have online payment
        3. Payment must be CAPTURED/PAID
        4. Refund amount cannot exceed payment amount
        5. No existing refund for this return request
        
        Actions:
        1. Create refund record
        2. Process refund via Razorpay
        3. Update payment status
        4. Mark return request as COMPLETED
        5. Create notifications
        """
        # Get return request with order and payment
        return_request = self.db.query(ReturnRequest).options(
            joinedload(ReturnRequest.order).joinedload(Order.payments),
        ).filter(
            ReturnRequest.id == return_request_id
        ).first()
        
        if not return_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Return request not found",
            )
        
        # Check return request status
        if return_request.status != ReturnStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Return request must be approved before refund. Current status: {return_request.status.value}",
            )
        
        # Check if refund already exists
        existing_refund = self.db.query(Refund).filter(
            Refund.return_request_id == return_request_id
        ).first()
        
        if existing_refund:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refund already exists for this return request",
            )
        
        order = return_request.order
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        # Check payment mode
        if order.payment_mode != PaymentMode.ONLINE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refunds are only available for online payments. COD orders do not require refunds.",
            )
        
        # Get payment
        payment = self.db.query(Payment).filter(
            and_(
                Payment.order_id == order.id,
                Payment.status.in_([PaymentStatus.CAPTURED, PaymentStatus.PAID]),
            )
        ).order_by(desc(Payment.created_at)).first()
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No captured payment found for this order",
            )
        
        # Determine refund amount
        if refund_amount is None:
            refund_amount = return_request.refund_amount
        else:
            # Validate refund amount
            if refund_amount > payment.amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Refund amount ({refund_amount}) cannot exceed payment amount ({payment.amount})",
                )
            if refund_amount <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Refund amount must be greater than 0",
                )
        
        # Create refund record
        refund = Refund(
            order_id=order.id,
            payment_id=payment.id,
            return_request_id=return_request_id,
            amount=refund_amount,
            status=RefundStatus.INITIATED,
        )
        
        self.db.add(refund)
        self.db.flush()  # Get refund.id
        
        # Process refund via Razorpay
        try:
            razorpay_refund = self._process_razorpay_refund(
                payment=payment,
                refund_amount=refund_amount,
                reason=reason,
            )
            
            if razorpay_refund:
                refund.razorpay_refund_id = razorpay_refund.get("id")
                refund.status = RefundStatus.PROCESSED
                refund.processed_at = datetime.utcnow()
                
                # Update payment status
                payment.status = PaymentStatus.REFUNDED
                
                # Mark return request as completed
                return_service = ReturnService(self.db)
                return_service.complete_return_request(return_request_id)
                
                logger.info(f"Refund processed successfully: {refund.id} for return {return_request_id}")
            else:
                # In dev mode without Razorpay
                refund.status = RefundStatus.PROCESSED
                refund.processed_at = datetime.utcnow()
                payment.status = PaymentStatus.REFUNDED
                return_service = ReturnService(self.db)
                return_service.complete_return_request(return_request_id)
                logger.warning(f"Refund processed in DEV MODE (Razorpay not configured): {refund.id}")
        
        except Exception as e:
            # Mark refund as failed
            refund.status = RefundStatus.FAILED
            refund.failure_reason = str(e)
            logger.error(f"Refund processing failed: {refund.id}, error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process refund: {str(e)}",
            )
        
        self.db.commit()
        self.db.refresh(refund)
        
        # Create notification for buyer
        notification_service = NotificationService(self.db)
        if return_request.buyer_id:
            notification_service.create_notification(
                user_id=return_request.buyer_id,
                notification_type="REFUND_PROCESSED",
                title="Refund Processed",
                message=f"Refund of ₹{refund_amount} has been processed for order #{order.order_number}",
                data={
                    "refund_id": str(refund.id),
                    "order_id": str(order.id),
                    "amount": float(refund_amount),
                },
            )
        
        return refund
    
    def _process_razorpay_refund(
        self,
        payment: Payment,
        refund_amount: Decimal,
        reason: Optional[str] = None,
    ) -> Optional[Dict]:
        """
        Process refund via Razorpay API.
        
        Returns:
            Razorpay refund response dict or None if not configured
        """
        if not self.razorpay_client:
            if settings.debug:
                logger.warning("Razorpay not configured - skipping refund in DEV MODE")
                return None
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Razorpay not configured",
                )
        
        if not payment.razorpay_payment_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment does not have Razorpay payment ID",
            )
        
        # Convert amount to paise
        amount_paise = int(refund_amount * 100)
        
        # Prepare refund data
        refund_data = {
            "amount": amount_paise,
            "speed": "normal",  # or "optimum" for faster processing
        }
        
        if reason:
            refund_data["notes"] = {
                "reason": reason[:500],  # Razorpay limit
            }
        
        try:
            # Create refund via Razorpay
            razorpay_refund = self.razorpay_client.payment.refund(
                payment.razorpay_payment_id,
                refund_data
            )
            
            logger.info(
                f"Razorpay refund created: {razorpay_refund.get('id')} "
                f"for payment {payment.razorpay_payment_id}, amount: {refund_amount}"
            )
            
            return razorpay_refund
        
        except razorpay.errors.BadRequestError as e:
            error_msg = str(e)
            logger.error(f"Razorpay refund bad request: {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Razorpay refund failed: {error_msg}",
            )
        except razorpay.errors.ServerError as e:
            error_msg = str(e)
            logger.error(f"Razorpay server error: {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Razorpay service error: {error_msg}",
            )
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Unexpected Razorpay error: {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Refund processing error: {error_msg}",
            )
    
    def get_refund(
        self,
        refund_id: uuid.UUID,
    ) -> Refund:
        """Get refund by ID."""
        refund = self.db.query(Refund).options(
            joinedload(Refund.order),
            joinedload(Refund.payment),
            joinedload(Refund.return_request),
        ).filter(
            Refund.id == refund_id
        ).first()
        
        if not refund:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Refund not found",
            )
        
        return refund
    
    def list_refunds(
        self,
        order_id: Optional[uuid.UUID] = None,
        status_filter: Optional[RefundStatus] = None,
        page: int = 1,
        size: int = 20,
    ) -> Dict:
        """List refunds with optional filters."""
        from sqlalchemy import func
        
        query = self.db.query(Refund).options(
            joinedload(Refund.order),
            joinedload(Refund.payment),
            joinedload(Refund.return_request),
        )
        
        if order_id:
            query = query.filter(Refund.order_id == order_id)
        
        if status_filter:
            query = query.filter(Refund.status == status_filter)
        
        # Count total
        total = query.count()
        
        # Paginate
        items = query.order_by(desc(Refund.created_at)).offset(
            (page - 1) * size
        ).limit(size).all()
        
        pages = (total + size - 1) // size if total > 0 else 0
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        }

