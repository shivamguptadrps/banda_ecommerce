"""
OTP Model for Mobile Authentication
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, Integer, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import GUID


class OTP(Base):
    """OTP model for mobile number verification."""
    
    __tablename__ = "otps"
    
    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    mobile_number: Mapped[str] = mapped_column(
        String(15),
        nullable=False,
        index=True,
    )
    otp_code: Mapped[str] = mapped_column(
        String(6),
        nullable=False,
    )
    purpose: Mapped[str] = mapped_column(
        String(50),
        default="login",
        nullable=False,
    )  # 'login', 'register', 'reset_password'
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )
    attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    max_attempts: Mapped[int] = mapped_column(
        Integer,
        default=3,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    
    # Index for faster lookups
    __table_args__ = (
        Index('idx_mobile_purpose', 'mobile_number', 'purpose'),
    )
    
    def is_expired(self) -> bool:
        """Check if OTP has expired."""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if OTP is valid (not expired and not verified)."""
        return not self.is_expired() and not self.is_verified and self.attempts < self.max_attempts
    
    def verify(self) -> bool:
        """Mark OTP as verified."""
        if not self.is_valid():
            return False
        self.is_verified = True
        return True
    
    def increment_attempt(self):
        """Increment verification attempt counter."""
        self.attempts += 1
