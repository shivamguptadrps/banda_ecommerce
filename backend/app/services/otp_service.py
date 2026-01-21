"""
OTP Service
Handles OTP generation, verification, and rate limiting
"""

import random
import string
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.otp import OTP


class OTPService:
    """Service for OTP operations."""
    
    OTP_LENGTH = 6
    OTP_EXPIRY_MINUTES = 5
    MAX_OTP_PER_MOBILE_PER_HOUR = 3
    MAX_ATTEMPTS = 3
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_otp(self) -> str:
        """Generate a random 6-digit OTP."""
        return ''.join(random.choices(string.digits, k=self.OTP_LENGTH))
    
    def can_send_otp(self, mobile_number: str, purpose: str = "login") -> tuple[bool, Optional[str]]:
        """
        Check if OTP can be sent to mobile number (rate limiting).
        Returns (can_send, error_message)
        """
        # Count OTPs sent in last hour
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_otps = self.db.query(OTP).filter(
            and_(
                OTP.mobile_number == mobile_number,
                OTP.purpose == purpose,
                OTP.created_at >= one_hour_ago,
            )
        ).count()
        
        if recent_otps >= self.MAX_OTP_PER_MOBILE_PER_HOUR:
            return False, f"Too many OTP requests. Please try again after some time."
        
        return True, None
    
    def create_otp(self, mobile_number: str, purpose: str = "login") -> tuple[Optional[OTP], Optional[str]]:
        """
        Create and save a new OTP.
        Returns (otp_object, error_message)
        """
        # Check rate limiting
        can_send, error = self.can_send_otp(mobile_number, purpose)
        if not can_send:
            return None, error
        
        # Invalidate previous unverified OTPs for this mobile and purpose
        self.db.query(OTP).filter(
            and_(
                OTP.mobile_number == mobile_number,
                OTP.purpose == purpose,
                OTP.is_verified == False,
            )
        ).update({"is_verified": True})  # Mark as used
        
        # Generate new OTP
        otp_code = self.generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=self.OTP_EXPIRY_MINUTES)
        
        otp = OTP(
            mobile_number=mobile_number,
            otp_code=otp_code,
            purpose=purpose,
            expires_at=expires_at,
            max_attempts=self.MAX_ATTEMPTS,
        )
        
        self.db.add(otp)
        self.db.commit()
        self.db.refresh(otp)
        
        return otp, None
    
    def verify_otp(self, mobile_number: str, otp_code: str, purpose: str = "login") -> tuple[bool, Optional[str], Optional[OTP]]:
        """
        Verify OTP code.
        Returns (is_valid, error_message, otp_object)
        """
        # Find latest unverified OTP for this mobile and purpose
        otp = self.db.query(OTP).filter(
            and_(
                OTP.mobile_number == mobile_number,
                OTP.purpose == purpose,
                OTP.is_verified == False,
            )
        ).order_by(OTP.created_at.desc()).first()
        
        if not otp:
            return False, "No OTP found. Please request a new OTP.", None
        
        if otp.is_expired():
            return False, "OTP has expired. Please request a new OTP.", None
        
        if otp.attempts >= otp.max_attempts:
            return False, "Maximum verification attempts exceeded. Please request a new OTP.", None
        
        # Increment attempt counter
        otp.increment_attempt()
        self.db.commit()
        
        # Verify OTP code
        if otp.otp_code != otp_code:
            return False, "Invalid OTP. Please check and try again.", otp
        
        # Mark as verified
        otp.verify()
        self.db.commit()
        
        return True, None, otp
    
    def get_latest_otp(self, mobile_number: str, purpose: str = "login") -> Optional[OTP]:
        """Get the latest OTP for a mobile number."""
        return self.db.query(OTP).filter(
            and_(
                OTP.mobile_number == mobile_number,
                OTP.purpose == purpose,
            )
        ).order_by(OTP.created_at.desc()).first()
