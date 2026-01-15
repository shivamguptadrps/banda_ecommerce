"""
Notification API Routes
In-app notification management
"""

import json
import math
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role, CurrentUser
from app.models.user import User
from app.models.enums import UserRole
from app.models.notification import NotificationType
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    NotificationUnreadCountResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="List notifications",
    description="Get paginated list of notifications for the current user.",
)
def list_notifications(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    type_filter: Optional[NotificationType] = Query(None, alias="type"),
    current_user: User = Depends(require_role([UserRole.BUYER, UserRole.VENDOR, UserRole.ADMIN, UserRole.DELIVERY_PARTNER])),
    db: Session = Depends(get_db),
):
    """Get notifications for the current user."""
    service = NotificationService(db)
    notifications, total = service.get_user_notifications(
        user_id=current_user.id,
        page=page,
        size=size,
        unread_only=unread_only,
        type_filter=type_filter,
    )
    
    unread_count = service.get_unread_count(current_user.id)
    
    items = [
        NotificationResponse(
            id=n.id,
            type=n.type,
            priority=n.priority,
            title=n.title,
            message=n.message,
            action_url=n.action_url,
            action_label=n.action_label,
            related_entity_type=n.related_entity_type,
            related_entity_id=n.related_entity_id,
            metadata=json.loads(n.extra_data) if n.extra_data else None,
            is_read=n.is_read,
            read_at=n.read_at,
            created_at=n.created_at,
        )
        for n in notifications
    ]
    
    return NotificationListResponse(
        items=items,
        total=total,
        unread_count=unread_count,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get(
    "/unread-count",
    response_model=NotificationUnreadCountResponse,
    summary="Get unread count",
    description="Get count of unread notifications.",
)
def get_unread_count(
    current_user: User = Depends(require_role([UserRole.BUYER, UserRole.VENDOR, UserRole.ADMIN, UserRole.DELIVERY_PARTNER])),
    db: Session = Depends(get_db),
):
    """Get unread notification count."""
    service = NotificationService(db)
    unread_count = service.get_unread_count(current_user.id)
    
    return NotificationUnreadCountResponse(unread_count=unread_count)


@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark notification as read",
    description="Mark a specific notification as read.",
)
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(require_role([UserRole.BUYER, UserRole.VENDOR, UserRole.ADMIN, UserRole.DELIVERY_PARTNER])),
    db: Session = Depends(get_db),
):
    """Mark notification as read."""
    try:
        notif_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID",
        )
    
    service = NotificationService(db)
    notification = service.mark_as_read(notif_uuid, current_user.id)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    
    return NotificationResponse(
        id=notification.id,
        type=notification.type,
        priority=notification.priority,
        title=notification.title,
        message=notification.message,
        action_url=notification.action_url,
        action_label=notification.action_label,
        related_entity_type=notification.related_entity_type,
        related_entity_id=notification.related_entity_id,
        metadata=json.loads(notification.extra_data) if notification.extra_data else None,
        is_read=notification.is_read,
        read_at=notification.read_at,
        created_at=notification.created_at,
    )


@router.put(
    "/mark-all-read",
    response_model=dict,
    summary="Mark all notifications as read",
    description="Mark all notifications as read for the current user.",
)
def mark_all_read(
    current_user: User = Depends(require_role([UserRole.BUYER, UserRole.VENDOR, UserRole.ADMIN, UserRole.DELIVERY_PARTNER])),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    service = NotificationService(db)
    count = service.mark_all_as_read(current_user.id)
    
    return {"message": f"Marked {count} notifications as read", "count": count}


@router.delete(
    "/{notification_id}",
    response_model=dict,
    summary="Delete notification",
    description="Delete a notification.",
)
def delete_notification(
    notification_id: str,
    current_user: User = Depends(require_role([UserRole.BUYER, UserRole.VENDOR, UserRole.ADMIN, UserRole.DELIVERY_PARTNER])),
    db: Session = Depends(get_db),
):
    """Delete a notification."""
    try:
        notif_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID",
        )
    
    service = NotificationService(db)
    deleted = service.delete_notification(notif_uuid, current_user.id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    
    return {"message": "Notification deleted successfully"}

