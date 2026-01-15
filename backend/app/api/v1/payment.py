"""
Payment Routes
Razorpay payment integration endpoints
"""

import uuid
import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from starlette.requests import Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import DbSession, require_role, get_current_user
from app.models.user import User, UserRole
from app.models.order import Order
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentVerify,
    PaymentCreateOrderResponse,
    PaymentStatusResponse,
    PaymentListResponse,
    PaymentRefundRequest,
    PaymentRefundResponse,
    PaymentLogResponse,
    PaymentLogListResponse,
    PaymentWithLogsResponse,
    DuplicatePaymentDetection,
)
from app.services.payment_service import PaymentService
from app.services.order_service import OrderService
from app.models.enums import PaymentStatus
from app.config import settings


router = APIRouter()


@router.post(
    "/create-order",
    response_model=PaymentCreateOrderResponse,
    summary="Create Razorpay order",
    description="Create a Razorpay order for payment.",
)
def create_payment_order(
    data: PaymentCreate,
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """
    Create a Razorpay order for payment.
    
    This endpoint:
    1. Validates the order belongs to the current user
    2. Creates a Razorpay order
    3. Creates a payment record
    4. Returns Razorpay order ID for frontend integration
    """
    # Verify order belongs to user
    order = db.query(Order).filter(
        Order.id == data.order_id,
        Order.buyer_id == current_user.id,
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    # Verify order amount matches
    if order.total_amount != data.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount mismatch. Order total: {order.total_amount}, provided: {data.amount}",
        )
    
    # Only allow payment for ONLINE orders
    if order.payment_mode.value != "online":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This order is not for online payment",
        )
    
    # Check if order is already paid
    if order.payment_status.value == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is already paid",
        )
    
    payment_service = PaymentService(db)
    payment = payment_service.create_razorpay_order(
        order_id=data.order_id,
        amount=data.amount,
        currency=data.currency,
    )
    
    return PaymentCreateOrderResponse(
        razorpay_order_id=payment.razorpay_order_id,
        amount=payment.amount,
        currency=payment.currency,
        order_id=payment.order_id,
        key_id=settings.razorpay_key_id or "",
    )


@router.post(
    "/verify",
    response_model=PaymentResponse,
    summary="Verify payment",
    description="Verify Razorpay payment signature and update order status.",
)
def verify_payment(
    data: PaymentVerify,
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """
    Verify Razorpay payment.
    
    This endpoint:
    1. Verifies the payment signature
    2. Confirms payment with Razorpay
    3. Updates payment and order status
    4. Confirms stock reservations
    """
    payment_service = PaymentService(db)
    
    # Get payment to find order_id
    payment = db.query(Payment).filter(
        Payment.razorpay_order_id == data.razorpay_order_id,
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )
    
    # Verify order belongs to user
    order = db.query(Order).filter(
        Order.id == payment.order_id,
        Order.buyer_id == current_user.id,
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to verify this payment",
        )
    
    # Verify payment
    payment = payment_service.verify_payment(
        order_id=payment.order_id,
        razorpay_order_id=data.razorpay_order_id,
        razorpay_payment_id=data.razorpay_payment_id,
        razorpay_signature=data.razorpay_signature,
    )
    
    return payment


@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
    summary="Razorpay webhook",
    description="Handle Razorpay webhook events (payment.captured, payment.failed, etc.).",
)
async def handle_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Handle Razorpay webhook events.
    
    Production Security:
    - Verifies webhook signature using X-Razorpay-Signature header
    - Processes events idempotently
    - Logs all webhook events for audit
    - Returns 200 OK even for ignored events (Razorpay requirement)
    
    Note: This endpoint is publicly accessible but secured via signature verification.
    """
    import json
    
    # Get raw body for signature verification
    body = await request.body()
    payload = json.loads(body.decode('utf-8'))
    
    # Get webhook signature from headers
    x_razorpay_signature = request.headers.get("X-Razorpay-Signature")
    
    # Extract event type
    event = payload.get("event")
    if not event:
        return {"status": "error", "message": "Missing event type"}
    
    payment_service = PaymentService(db)
    
    try:
        payment = payment_service.handle_webhook(
            event=event,
            payload=payload,
            webhook_signature=x_razorpay_signature,
        )
        
        if payment:
            return {"status": "success", "payment_id": str(payment.id), "event": event}
        else:
            # Return 200 OK even if ignored (Razorpay requirement)
            return {"status": "ignored", "message": "Payment not found or event not applicable"}
            
    except HTTPException as e:
        # Re-raise HTTP exceptions (like signature verification failure)
        raise
    except Exception as e:
        # Log error but return 200 OK (Razorpay will retry)
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Webhook processing error: {str(e)}")
        return {"status": "error", "message": "Internal error processing webhook"}


@router.get(
    "/{order_id}",
    response_model=PaymentStatusResponse,
    summary="Get payment status",
    description="Get payment status for an order.",
)
def get_payment_status(
    order_id: str,
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.BUYER, UserRole.VENDOR, UserRole.ADMIN])),
):
    """
    Get payment status for an order.
    
    Returns payment details and order status.
    """
    try:
        order_uuid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order ID",
        )
    
    # Get order
    order = db.query(Order).filter(Order.id == order_uuid).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    # Check permissions
    if current_user.role == UserRole.BUYER and order.buyer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this payment",
        )
    
    if current_user.role == UserRole.VENDOR and order.vendor_id != current_user.vendor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this payment",
        )
    
    # Get payment
    payment_service = PaymentService(db)
    payment = payment_service.get_payment_by_order_id(order_uuid)
    
    return PaymentStatusResponse(
        payment=PaymentResponse.model_validate(payment) if payment else None,
        order_status=order.order_status.value,
        payment_status=order.payment_status.value,
    )


# ============== Admin Payment Endpoints ==============

@router.get(
    "/admin/payments",
    response_model=PaymentListResponse,
    summary="List all payments (Admin) - Enhanced",
    description="Get paginated list of all payments with advanced filtering.",
)
def list_payments(
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    order_id: Optional[str] = Query(None, alias="order_id"),
    razorpay_order_id: Optional[str] = Query(None, alias="razorpay_order_id"),
    razorpay_payment_id: Optional[str] = Query(None, alias="razorpay_payment_id"),
    date_from: Optional[str] = Query(None, alias="date_from", description="YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, alias="date_to", description="YYYY-MM-DD"),
):
    """
    List all payments with advanced filtering (Admin).
    
    Filters:
    - status: Payment status
    - order_id: Filter by order ID
    - razorpay_order_id: Filter by Razorpay order ID
    - razorpay_payment_id: Filter by Razorpay payment ID
    - date_from: Payments from date (YYYY-MM-DD)
    - date_to: Payments to date (YYYY-MM-DD)
    """
    from app.models.payment import Payment
    from datetime import datetime
    
    query = db.query(Payment)
    
    # Apply status filter
    if status_filter:
        try:
            from app.models.enums import PaymentStatus
            status_enum = PaymentStatus(status_filter.upper())
            query = query.filter(Payment.status == status_enum)
        except ValueError:
            pass
    
    # Filter by order ID
    if order_id:
        try:
            order_uuid = uuid.UUID(order_id)
            query = query.filter(Payment.order_id == order_uuid)
        except ValueError:
            pass
    
    # Filter by Razorpay order ID
    if razorpay_order_id:
        query = query.filter(Payment.razorpay_order_id == razorpay_order_id)
    
    # Filter by Razorpay payment ID
    if razorpay_payment_id:
        query = query.filter(Payment.razorpay_payment_id == razorpay_payment_id)
    
    # Date filters
    if date_from:
        try:
            from_date = datetime.combine(
                datetime.strptime(date_from, "%Y-%m-%d").date(),
                datetime.min.time()
            )
            query = query.filter(Payment.created_at >= from_date)
        except ValueError:
            pass
    
    if date_to:
        try:
            to_date = datetime.combine(
                datetime.strptime(date_to, "%Y-%m-%d").date(),
                datetime.max.time()
            )
            query = query.filter(Payment.created_at <= to_date)
        except ValueError:
            pass
    
    # Get total count
    total = query.count()
    
    # Paginate
    payments = query.order_by(Payment.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    return PaymentListResponse(
        items=[PaymentResponse.model_validate(p) for p in payments],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.post(
    "/admin/payments/{payment_id}/refund",
    response_model=PaymentRefundResponse,
    summary="Initiate refund (Admin)",
    description="Initiate a refund for a payment.",
)
def initiate_refund(
    payment_id: str,
    data: PaymentRefundRequest,
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """
    Initiate a refund for a payment.
    
    Supports full or partial refunds.
    """
    try:
        payment_uuid = uuid.UUID(payment_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment ID",
        )
    
    from app.models.payment import Payment
    
    payment = db.query(Payment).filter(Payment.id == payment_uuid).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )
    
    if payment.status != PaymentStatus.CAPTURED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only captured payments can be refunded",
        )
    
    payment_service = PaymentService(db)
    
    # Determine refund amount
    refund_amount = data.amount if data.amount else payment.amount
    
    if refund_amount > payment.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refund amount cannot exceed payment amount",
        )
    
    # Create refund with Razorpay
    if payment_service.razorpay_client and payment.razorpay_payment_id:
        try:
            refund_data = {
                "amount": int(refund_amount * 100),  # Convert to paise
                "notes": {
                    "reason": data.reason or "Refund requested by admin",
                }
            }
            
            razorpay_refund = payment_service.razorpay_client.payment.refund(
                payment.razorpay_payment_id,
                refund_data
            )
            
            # Update payment status if full refund
            if refund_amount >= payment.amount:
                payment.status = PaymentStatus.REFUNDED
            
            payment.updated_at = datetime.utcnow()
            db.commit()
            
            # Log refund
            payment_service._log_payment_event(
                payment_id=payment.id,
                event_type="payment.refunded",
                payload={
                    "refund_id": razorpay_refund["id"],
                    "amount": refund_amount,
                    "reason": data.reason,
                }
            )
            
            return PaymentRefundResponse(
                refund_id=razorpay_refund["id"],
                payment_id=payment.id,
                amount=refund_amount,
                status=razorpay_refund["status"],
                created_at=datetime.utcnow(),
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process refund: {str(e)}",
            )
    else:
        # In development mode, simulate refund
        payment.status = PaymentStatus.REFUNDED
        payment.updated_at = datetime.utcnow()
        db.commit()
        
        return PaymentRefundResponse(
            refund_id=f"refund_{payment.id}",
            payment_id=payment.id,
            amount=refund_amount,
            status="processed",
            created_at=datetime.utcnow(),
        )


# ============== Vendor Payment Endpoints ==============

@router.get(
    "/vendor/orders/{order_id}/payments",
    response_model=PaymentListResponse,
    summary="Get payments for vendor order",
    description="Get all payment records for a vendor's order with logs.",
)
def get_vendor_order_payments(
    order_id: str,
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """
    Get payment records for a vendor's order.
    
    Vendors can view payment information for their orders to debug payment issues.
    """
    from app.models.payment import Payment
    from app.models.order import Order
    from app.models.vendor import Vendor
    
    try:
        order_uuid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order ID",
        )
    
    # Get vendor
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor account not found",
        )
    
    # Get order and verify it belongs to vendor
    order = db.query(Order).filter(Order.id == order_uuid).first()
    if not order or order.vendor_id != vendor.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    # Get all payments for this order
    payments = db.query(Payment).filter(Payment.order_id == order_uuid).order_by(
        Payment.created_at.desc()
    ).all()
    
    return PaymentListResponse(
        items=[PaymentResponse.model_validate(p) for p in payments],
        total=len(payments),
        page=1,
        size=len(payments),
        pages=1,
    )


@router.get(
    "/vendor/orders/{order_id}/payments/{payment_id}/logs",
    response_model=PaymentLogListResponse,
    summary="Get payment logs for vendor",
    description="Get detailed payment logs for debugging payment issues.",
)
def get_vendor_payment_logs(
    order_id: str,
    payment_id: str,
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.VENDOR])),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
):
    """
    Get payment logs for a specific payment.
    
    Vendors can view detailed payment logs to debug payment failures or issues.
    """
    from app.models.payment import Payment, PaymentLog
    from app.models.order import Order
    from app.models.vendor import Vendor
    
    try:
        order_uuid = uuid.UUID(order_id)
        payment_uuid = uuid.UUID(payment_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ID format",
        )
    
    # Get vendor
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor account not found",
        )
    
    # Verify order belongs to vendor
    order = db.query(Order).filter(Order.id == order_uuid).first()
    if not order or order.vendor_id != vendor.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    # Verify payment belongs to order
    payment = db.query(Payment).filter(
        Payment.id == payment_uuid,
        Payment.order_id == order_uuid,
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )
    
    # Get payment logs
    query = db.query(PaymentLog).filter(PaymentLog.payment_id == payment_uuid)
    total = query.count()
    logs = query.order_by(PaymentLog.created_at.desc()).offset(
        (page - 1) * size
    ).limit(size).all()
    
    return PaymentLogListResponse(
        items=[PaymentLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get(
    "/vendor/orders/{order_id}/payments/duplicate-check",
    response_model=DuplicatePaymentDetection,
    summary="Check for duplicate payments (Vendor)",
    description="Check if an order has duplicate payments.",
)
def check_duplicate_payments_vendor(
    order_id: str,
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.VENDOR])),
):
    """
    Check for duplicate payments on a vendor's order.
    
    Helps vendors identify if multiple payments were made for the same order.
    """
    from app.models.payment import Payment
    from app.models.order import Order
    from app.models.vendor import Vendor
    
    try:
        order_uuid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order ID",
        )
    
    # Get vendor
    vendor = db.query(Vendor).filter(Vendor.user_id == current_user.id).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor account not found",
        )
    
    # Verify order belongs to vendor
    order = db.query(Order).filter(Order.id == order_uuid).first()
    if not order or order.vendor_id != vendor.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    # Get all payments for this order
    payments = db.query(Payment).filter(Payment.order_id == order_uuid).all()
    
    # Check for duplicates (multiple captured payments)
    captured_payments = [p for p in payments if p.status == PaymentStatus.CAPTURED]
    duplicate_payments = captured_payments if len(captured_payments) > 1 else []
    
    total_amount = sum(p.amount for p in captured_payments)
    
    status = "duplicate_detected" if len(duplicate_payments) > 1 else (
        "requires_review" if len(captured_payments) == 1 and len(payments) > 1 else "no_duplicate"
    )
    
    return DuplicatePaymentDetection(
        order_id=order_uuid,
        duplicate_payments=[PaymentResponse.model_validate(p) for p in duplicate_payments],
        total_amount=total_amount,
        status=status,
    )


# ============== Enhanced Admin Payment Endpoints ==============

@router.get(
    "/admin/payments/{payment_id}/logs",
    response_model=PaymentLogListResponse,
    summary="Get payment logs (Admin)",
    description="Get detailed payment logs for debugging.",
)
def get_admin_payment_logs(
    payment_id: str,
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
):
    """Get payment logs for a specific payment (Admin)."""
    from app.models.payment import Payment, PaymentLog
    
    try:
        payment_uuid = uuid.UUID(payment_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment ID",
        )
    
    payment = db.query(Payment).filter(Payment.id == payment_uuid).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )
    
    query = db.query(PaymentLog).filter(PaymentLog.payment_id == payment_uuid)
    total = query.count()
    logs = query.order_by(PaymentLog.created_at.desc()).offset(
        (page - 1) * size
    ).limit(size).all()
    
    return PaymentLogListResponse(
        items=[PaymentLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get(
    "/admin/payments/{payment_id}",
    response_model=PaymentWithLogsResponse,
    summary="Get payment with logs (Admin)",
    description="Get payment details with all logs for debugging.",
)
def get_admin_payment_with_logs(
    payment_id: str,
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Get payment with all logs for debugging (Admin)."""
    from app.models.payment import Payment, PaymentLog
    
    try:
        payment_uuid = uuid.UUID(payment_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment ID",
        )
    
    payment = db.query(Payment).filter(Payment.id == payment_uuid).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )
    
    # Get all logs
    logs = db.query(PaymentLog).filter(
        PaymentLog.payment_id == payment_uuid
    ).order_by(PaymentLog.created_at.asc()).all()
    
    return PaymentWithLogsResponse(
        **PaymentResponse.model_validate(payment).model_dump(),
        logs=[PaymentLogResponse.model_validate(log) for log in logs],
    )


@router.get(
    "/admin/payments/duplicate-check",
    response_model=list[DuplicatePaymentDetection],
    summary="Check for duplicate payments (Admin)",
    description="Check all orders for duplicate payments.",
)
def check_all_duplicate_payments(
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    order_id: Optional[str] = Query(None, description="Specific order ID to check"),
):
    """
    Check for duplicate payments across all orders or a specific order.
    
    Helps admin identify orders with multiple successful payments.
    """
    from app.models.payment import Payment
    from app.models.order import Order
    from sqlalchemy import func
    
    if order_id:
        # Check specific order
        try:
            order_uuid = uuid.UUID(order_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid order ID",
            )
        
        order = db.query(Order).filter(Order.id == order_uuid).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        payments = db.query(Payment).filter(Payment.order_id == order_uuid).all()
        captured_payments = [p for p in payments if p.status == PaymentStatus.CAPTURED]
        
        if len(captured_payments) > 1:
            return [DuplicatePaymentDetection(
                order_id=order_uuid,
                duplicate_payments=[PaymentResponse.model_validate(p) for p in captured_payments],
                total_amount=sum(p.amount for p in captured_payments),
                status="duplicate_detected",
            )]
        return []
    
    # Check all orders with multiple captured payments
    # Find orders with more than one captured payment
    duplicate_orders = (
        db.query(Payment.order_id, func.count(Payment.id).label("payment_count"))
        .filter(Payment.status == PaymentStatus.CAPTURED)
        .group_by(Payment.order_id)
        .having(func.count(Payment.id) > 1)
        .all()
    )
    
    results = []
    for order_id_result, payment_count in duplicate_orders:
        payments = db.query(Payment).filter(
            Payment.order_id == order_id_result,
            Payment.status == PaymentStatus.CAPTURED,
        ).all()
        
        results.append(DuplicatePaymentDetection(
            order_id=order_id_result,
            duplicate_payments=[PaymentResponse.model_validate(p) for p in payments],
            total_amount=sum(p.amount for p in payments),
            status="duplicate_detected",
        ))
    
    return results



