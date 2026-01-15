"""
Delivery Service
Business logic for delivery operations, COD collection, and failed delivery handling
"""

import uuid
from typing import Optional
from datetime import datetime

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.order import Order
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery_history import (
    DeliveryHistory,
    DeliveryAttemptStatus,
    DeliveryFailureReason,
)
from app.models.enums import OrderStatus, PaymentMode, PaymentStatus


class DeliveryService:
    """Service for delivery operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def mark_delivery_failed(
        self,
        order_id: uuid.UUID,
        delivery_partner_id: uuid.UUID,
        failure_reason: DeliveryFailureReason,
        failure_notes: Optional[str] = None,
    ) -> DeliveryHistory:
        """Mark a delivery attempt as failed."""
        order = self.db.query(Order).filter(Order.id == order_id).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        if order.delivery_partner_id != delivery_partner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this order",
            )
        
        if order.order_status != OrderStatus.OUT_FOR_DELIVERY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order must be OUT_FOR_DELIVERY. Current status: {order.order_status.value}",
            )
        
        # Get current delivery history
        delivery_history = self.db.query(DeliveryHistory).filter(
            DeliveryHistory.order_id == order_id,
            DeliveryHistory.delivery_partner_id == delivery_partner_id,
        ).order_by(DeliveryHistory.attempt_number.desc()).first()
        
        if not delivery_history:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Delivery history not found",
            )
        
        # Update delivery history
        delivery_history.status = DeliveryAttemptStatus.FAILED
        delivery_history.failure_reason = failure_reason
        delivery_history.failure_notes = failure_notes
        delivery_history.attempted_at = delivery_history.attempted_at or datetime.utcnow()
        delivery_history.completed_at = datetime.utcnow()
        
        # Calculate delivery time
        if delivery_history.assigned_at:
            time_diff = delivery_history.completed_at - delivery_history.assigned_at
            delivery_history.delivery_time_minutes = int(time_diff.total_seconds() / 60)
        
        # For COD orders, mark as not collected
        if order.payment_mode == PaymentMode.COD:
            delivery_history.cod_collected = False
        
        self.db.commit()
        self.db.refresh(delivery_history)
        
        return delivery_history
    
    def retry_delivery(
        self,
        order_id: uuid.UUID,
        delivery_partner_id: uuid.UUID,
    ) -> DeliveryHistory:
        """Create a retry attempt for a failed delivery."""
        order = self.db.query(Order).filter(Order.id == order_id).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        if order.delivery_partner_id != delivery_partner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this order",
            )
        
        # Get previous attempts
        previous_attempts = self.db.query(DeliveryHistory).filter(
            DeliveryHistory.order_id == order_id,
            DeliveryHistory.delivery_partner_id == delivery_partner_id,
        ).order_by(DeliveryHistory.attempt_number.desc()).all()
        
        if not previous_attempts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No previous delivery attempts found",
            )
        
        # Check if last attempt was failed
        last_attempt = previous_attempts[0]
        if last_attempt.status != DeliveryAttemptStatus.FAILED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only retry failed deliveries",
            )
        
        # Create new attempt
        new_attempt_number = last_attempt.attempt_number + 1
        
        # Check max retries (e.g., 3 attempts max)
        if new_attempt_number > 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum retry attempts (3) exceeded",
            )
        
        new_delivery_history = DeliveryHistory(
            order_id=order_id,
            delivery_partner_id=delivery_partner_id,
            attempt_number=new_attempt_number,
            status=DeliveryAttemptStatus.PENDING,
            is_cod=(order.payment_mode == PaymentMode.COD),
            cod_amount=order.total_amount if order.payment_mode == PaymentMode.COD else None,
            assigned_at=datetime.utcnow(),
        )
        
        self.db.add(new_delivery_history)
        self.db.commit()
        self.db.refresh(new_delivery_history)
        
        return new_delivery_history
    
    def return_order_to_vendor(
        self,
        order_id: uuid.UUID,
        delivery_partner_id: uuid.UUID,
        return_reason: Optional[str] = None,
    ) -> Order:
        """Return order to vendor after failed delivery attempts."""
        order = self.db.query(Order).filter(Order.id == order_id).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        if order.delivery_partner_id != delivery_partner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to return this order",
            )
        
        # Get all delivery attempts
        attempts = self.db.query(DeliveryHistory).filter(
            DeliveryHistory.order_id == order_id,
            DeliveryHistory.delivery_partner_id == delivery_partner_id,
        ).order_by(DeliveryHistory.attempt_number.desc()).all()
        
        if not attempts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No delivery attempts found",
            )
        
        # Check if all attempts failed
        all_failed = all(
            attempt.status == DeliveryAttemptStatus.FAILED
            for attempt in attempts
        )
        
        if not all_failed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only return orders with all failed delivery attempts",
            )
        
        # Update order status to RETURNED
        order.order_status = OrderStatus.RETURNED
        order.notes = (order.notes or "") + f"\n[Returned to vendor: {return_reason or 'Failed delivery attempts'}]"
        
        # Unassign delivery partner
        order.delivery_partner_id = None
        
        # Release stock reservations if needed
        from app.services.order_service import OrderService
        order_service = OrderService(self.db)
        order_service._release_reservations(order_id)
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def get_delivery_history(
        self,
        delivery_partner_id: Optional[uuid.UUID] = None,
        order_id: Optional[uuid.UUID] = None,
        status_filter: Optional[DeliveryAttemptStatus] = None,
    ) -> list[DeliveryHistory]:
        """Get delivery history with optional filters."""
        query = self.db.query(DeliveryHistory)
        
        if delivery_partner_id:
            query = query.filter(DeliveryHistory.delivery_partner_id == delivery_partner_id)
        
        if order_id:
            query = query.filter(DeliveryHistory.order_id == order_id)
        
        if status_filter:
            query = query.filter(DeliveryHistory.status == status_filter)
        
        return query.order_by(DeliveryHistory.created_at.desc()).all()
    
    def get_delivery_stats(
        self,
        delivery_partner_id: uuid.UUID,
    ) -> dict:
        """Get comprehensive delivery statistics for a delivery partner."""
        from datetime import datetime, timedelta
        
        # Get all delivery history
        all_history = self.db.query(DeliveryHistory).filter(
            DeliveryHistory.delivery_partner_id == delivery_partner_id,
        ).all()
        
        # Get all orders assigned to this delivery partner
        all_orders = self.db.query(Order).filter(
            Order.delivery_partner_id == delivery_partner_id,
        ).all()
        
        # Today's date range
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        # This week's date range
        week_start = today_start - timedelta(days=today_start.weekday())
        week_end = week_start + timedelta(days=7)
        
        # This month's date range
        month_start = today_start.replace(day=1)
        next_month = month_start + timedelta(days=32)
        month_end = next_month.replace(day=1)
        
        # Total stats (all time)
        total_deliveries = len(all_history)
        successful = len([h for h in all_history if h.status == DeliveryAttemptStatus.SUCCESS])
        failed = len([h for h in all_history if h.status == DeliveryAttemptStatus.FAILED])
        
        # Today's stats
        today_history = [
            h for h in all_history
            if h.assigned_at and today_start <= h.assigned_at < today_end
        ]
        today_delivered = len([
            h for h in today_history
            if h.status == DeliveryAttemptStatus.SUCCESS
        ])
        today_assigned = len(today_history)
        
        # This week's stats
        week_history = [
            h for h in all_history
            if h.assigned_at and week_start <= h.assigned_at < week_end
        ]
        week_delivered = len([
            h for h in week_history
            if h.status == DeliveryAttemptStatus.SUCCESS
        ])
        
        # This month's stats
        month_history = [
            h for h in all_history
            if h.assigned_at and month_start <= h.assigned_at < month_end
        ]
        month_delivered = len([
            h for h in month_history
            if h.status == DeliveryAttemptStatus.SUCCESS
        ])
        
        # Currently assigned orders (pending/out_for_delivery)
        current_orders = [
            o for o in all_orders
            if o.order_status in [OrderStatus.OUT_FOR_DELIVERY]
        ]
        currently_assigned = len(current_orders)
        
        # Total orders assigned (all time)
        total_orders_assigned = len(all_orders)
        
        # COD stats
        cod_deliveries = [h for h in all_history if h.is_cod and h.status == DeliveryAttemptStatus.SUCCESS]
        cod_collected = len([h for h in cod_deliveries if h.cod_collected])
        cod_total = len(cod_deliveries)
        
        # COD revenue
        cod_revenue = sum(
            float(h.cod_amount) for h in cod_deliveries
            if h.cod_collected and h.cod_amount
        )
        
        # Today's COD revenue
        today_cod_revenue = sum(
            float(h.cod_amount) for h in today_history
            if h.is_cod and h.status == DeliveryAttemptStatus.SUCCESS
            and h.cod_collected and h.cod_amount
        )
        
        # Average delivery time
        completed_deliveries = [
            h for h in all_history
            if h.status == DeliveryAttemptStatus.SUCCESS and h.delivery_time_minutes
        ]
        avg_delivery_time = (
            sum(h.delivery_time_minutes for h in completed_deliveries) / len(completed_deliveries)
            if completed_deliveries else None
        )
        
        # Pending deliveries (assigned but not yet delivered)
        pending_deliveries = len([
            h for h in all_history
            if h.status == DeliveryAttemptStatus.PENDING
        ])
        
        return {
            # All-time stats
            "total_deliveries": total_deliveries,
            "successful": successful,
            "failed": failed,
            "success_rate": (successful / total_deliveries * 100) if total_deliveries > 0 else 0,
            "total_orders_assigned": total_orders_assigned,
            
            # Today's stats
            "today_assigned": today_assigned,
            "today_delivered": today_delivered,
            "today_cod_revenue": today_cod_revenue,
            
            # Weekly stats
            "week_delivered": week_delivered,
            
            # Monthly stats
            "month_delivered": month_delivered,
            
            # Current status
            "currently_assigned": currently_assigned,
            "pending_deliveries": pending_deliveries,
            
            # COD stats
            "cod_total": cod_total,
            "cod_collected": cod_collected,
            "cod_collection_rate": (cod_collected / cod_total * 100) if cod_total > 0 else 0,
            "cod_revenue": cod_revenue,
            
            # Performance
            "avg_delivery_time_minutes": avg_delivery_time,
        }

