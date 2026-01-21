"""
OTP Schemas
Pydantic models for OTP requests and responses
"""

from pydantic import BaseModel, Field, field_validator


class SendOTPRequest(BaseModel):
    """Schema for sending OTP."""
    mobile_number: str = Field(..., pattern=r"^[6-9]\d{9}$", description="10-digit Indian mobile number")
    purpose: str = Field(default="login", description="OTP purpose: login, register, reset_password")
    
    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        """Validate mobile number format."""
        if len(v) != 10:
            raise ValueError("Mobile number must be 10 digits")
        if not v.startswith(("6", "7", "8", "9")):
            raise ValueError("Mobile number must start with 6, 7, 8, or 9")
        return v


class SendOTPResponse(BaseModel):
    """Schema for OTP send response."""
    message: str
    expires_in: int = Field(..., description="OTP expiry time in seconds")
    mobile_number: str = Field(..., description="Masked mobile number")
    otp_code: str = Field(..., description="OTP code (for development/testing only)")


class VerifyOTPRequest(BaseModel):
    """Schema for verifying OTP."""
    mobile_number: str = Field(..., pattern=r"^[6-9]\d{9}$")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")
    purpose: str = Field(default="login", description="OTP purpose")
    
    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        """Validate OTP is numeric."""
        if not v.isdigit():
            raise ValueError("OTP must contain only digits")
        return v


class MobileLoginRequest(BaseModel):
    """Schema for mobile number login (alternative to username/password)."""
    mobile_number: str = Field(..., pattern=r"^[6-9]\d{9}$")
    password: str = Field(..., min_length=8)


class RegisterWithPasswordRequest(BaseModel):
    """Schema for registering with mobile + password (after OTP verification)."""
    mobile_number: str = Field(..., pattern=r"^[6-9]\d{9}$")
    username: str = Field(..., min_length=3, max_length=50, description="Username for login")
    password: str = Field(..., min_length=8, max_length=100)
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(None, description="Optional email address")
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v
