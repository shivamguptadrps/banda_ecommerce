"""
Notification Schemas
Pydantic models for notification operations
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
import uuid

from app.models.notification import NotificationType, NotificationPriority


class NotificationResponse(BaseModel):
    """Notification response schema."""
    id: uuid.UUID
    type: NotificationType
    priority: NotificationPriority
    title: str
    message: str
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[uuid.UUID] = None
    metadata: Optional[dict] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """List of notifications."""
    items: list[NotificationResponse]
    total: int
    unread_count: int
    page: int
    size: int
    pages: int


class NotificationUnreadCountResponse(BaseModel):
    """Unread notification count."""
    unread_count: int


