"""
Notification Service
Business logic for creating and managing notifications
"""

import uuid
import json
from typing import Optional, List, Tuple
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from app.models.notification import Notification, NotificationType, NotificationPriority
from app.models.user import User
from app.models.enums import UserRole


class NotificationService:
    """Service for notification operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_notification(
        self,
        user_id: uuid.UUID,
        type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[uuid.UUID] = None,
        metadata: Optional[dict] = None,
    ) -> Notification:
        """Create a new notification."""
        notification = Notification(
            user_id=user_id,
            type=type,
            priority=priority,
            title=title,
            message=message,
            action_url=action_url,
            action_label=action_label,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            extra_data=json.dumps(metadata) if metadata else None,
            is_read=False,
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        
        return notification
    
    def create_order_notification(
        self,
        user_id: uuid.UUID,
        order_id: uuid.UUID,
        order_number: str,
        notification_type: NotificationType,
        priority: NotificationPriority = NotificationPriority.HIGH,
        additional_data: Optional[dict] = None,
    ) -> Notification:
        """Create an order-related notification with standardized format."""
        notifications_map = {
            NotificationType.ORDER_PLACED: {
                "title": "Order Placed Successfully",
                "message": f"Your order #{order_number} has been placed successfully. We'll notify you once the vendor confirms.",
                "action_label": "View Order",
            },
            NotificationType.ORDER_CONFIRMED: {
                "title": "Order Confirmed",
                "message": f"Order #{order_number} has been confirmed by the vendor. Your items are being prepared.",
                "action_label": "Track Order",
            },
            NotificationType.ORDER_PICKED: {
                "title": "Order Picked",
                "message": f"Items for order #{order_number} have been picked from inventory.",
                "action_label": "Track Order",
            },
            NotificationType.ORDER_PACKED: {
                "title": "Order Packed",
                "message": f"Order #{order_number} has been packed and is ready for dispatch.",
                "action_label": "Track Order",
            },
            NotificationType.ORDER_OUT_FOR_DELIVERY: {
                "title": "Out for Delivery",
                "message": f"Order #{order_number} is out for delivery. Please keep your delivery OTP ready.",
                "action_label": "View OTP",
            },
            NotificationType.ORDER_DELIVERED: {
                "title": "Order Delivered",
                "message": f"Your order #{order_number} has been delivered successfully. Thank you for shopping with us!",
                "action_label": "View Order",
            },
            NotificationType.ORDER_CANCELLED: {
                "title": "Order Cancelled",
                "message": f"Order #{order_number} has been cancelled. {additional_data.get('reason', '') if additional_data else ''}",
                "action_label": "View Details",
            },
            NotificationType.NEW_ORDER: {
                "title": "New Order Received",
                "message": f"You have received a new order #{order_number}. Please confirm within 15 minutes.",
                "action_label": "View Order",
                "priority": NotificationPriority.CRITICAL,
            },
        }
        
        config = notifications_map.get(notification_type, {
            "title": "Order Update",
            "message": f"Your order #{order_number} has been updated.",
            "action_label": "View Order",
        })
        
        # Determine action URL based on user role
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            if user.role.value == "buyer":
                action_url = f"/orders/{order_id}"
            elif user.role.value == "vendor":
                action_url = f"/vendor/orders/{order_id}"
            elif user.role.value == "admin":
                action_url = f"/admin/orders/{order_id}"
            elif user.role.value == "delivery_partner":
                action_url = f"/delivery-partner/orders/{order_id}"
            else:
                action_url = None
        else:
            action_url = None
        
        return self.create_notification(
            user_id=user_id,
            type=notification_type,
            title=config["title"],
            message=config["message"],
            priority=config.get("priority", priority),
            action_url=action_url,
            action_label=config["action_label"],
            related_entity_type="order",
            related_entity_id=order_id,
            metadata=additional_data,  # Use metadata parameter name
        )
    
    def create_payment_notification(
        self,
        user_id: uuid.UUID,
        order_id: uuid.UUID,
        order_number: str,
        notification_type: NotificationType,
        amount: Optional[float] = None,
        transaction_id: Optional[str] = None,
    ) -> Notification:
        """Create a payment-related notification."""
        notifications_map = {
            NotificationType.PAYMENT_SUCCESS: {
                "title": "Payment Successful",
                "message": f"Payment of ₹{amount:,.2f} for order #{order_number} has been processed successfully.",
                "priority": NotificationPriority.HIGH,
            },
            NotificationType.PAYMENT_FAILED: {
                "title": "Payment Failed",
                "message": f"Payment for order #{order_number} failed. Please try again or use a different payment method.",
                "priority": NotificationPriority.CRITICAL,
            },
            NotificationType.PAYMENT_REFUNDED: {
                "title": "Payment Refunded",
                "message": f"Payment of ₹{amount:,.2f} for order #{order_number} has been refunded to your account.",
                "priority": NotificationPriority.HIGH,
            },
        }
        
        config = notifications_map.get(notification_type, {
            "title": "Payment Update",
            "message": f"Payment status for order #{order_number} has been updated.",
        })
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if user and user.role.value == "buyer":
            action_url = f"/orders/{order_id}"
        else:
            action_url = None
        
        return self.create_notification(
            user_id=user_id,
            type=notification_type,
            title=config["title"],
            message=config["message"],
            priority=config.get("priority", NotificationPriority.HIGH),
            action_url=action_url,
            action_label="View Order",
            related_entity_type="order",
            related_entity_id=order_id,
            extra_data=json.dumps({
                "amount": amount,
                "transaction_id": transaction_id,
            }) if (amount or transaction_id) else None,
        )
    
    def get_user_notifications(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        size: int = 20,
        unread_only: bool = False,
        type_filter: Optional[NotificationType] = None,
    ) -> Tuple[List[Notification], int]:
        """Get paginated notifications for a user."""
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        if type_filter:
            query = query.filter(Notification.type == type_filter)
        
        # Get total count
        total = query.count()
        
        # Get paginated results (newest first)
        notifications = query.order_by(desc(Notification.created_at)).offset(
            (page - 1) * size
        ).limit(size).all()
        
        return notifications, total
    
    def get_unread_count(self, user_id: uuid.UUID) -> int:
        """Get count of unread notifications for a user."""
        return self.db.query(Notification).filter(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
        ).count()
    
    def mark_as_read(
        self,
        notification_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Optional[Notification]:
        """Mark a notification as read."""
        notification = self.db.query(Notification).filter(
            and_(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        ).first()
        
        if notification and not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(notification)
        
        return notification
    
    def mark_all_as_read(self, user_id: uuid.UUID) -> int:
        """Mark all notifications as read for a user."""
        count = self.db.query(Notification).filter(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
        ).update({
            "is_read": True,
            "read_at": datetime.utcnow(),
        })
        
        self.db.commit()
        return count
    
    def delete_notification(
        self,
        notification_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """Delete a notification (soft delete by marking as read and hiding)."""
        notification = self.db.query(Notification).filter(
            and_(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        ).first()
        
        if notification:
            self.db.delete(notification)
            self.db.commit()
            return True
        
        return False
    
    def create_bulk_notifications(
        self,
        user_ids: List[uuid.UUID],
        type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        **kwargs,
    ) -> List[Notification]:
        """Create notifications for multiple users."""
        notifications = []
        for user_id in user_ids:
            notification = self.create_notification(
                user_id=user_id,
                type=type,
                title=title,
                message=message,
                priority=priority,
                **kwargs,
            )
            notifications.append(notification)
        
        return notifications

