"""
User and Authentication Schemas
Pydantic models for request/response validation
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import UserRole


# ============== Base Schemas ==============

class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^[6-9]\d{9}$")


# ============== Request Schemas ==============

class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=8, max_length=100)
    role: UserRole = UserRole.BUYER
    
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


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^[6-9]\d{9}$")


class PasswordChange(BaseModel):
    """Schema for changing password."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)
    
    @field_validator("new_password")
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


class RefreshTokenRequest(BaseModel):
    """Schema for refreshing access token."""
    refresh_token: str


# ============== Response Schemas ==============

class UserResponse(BaseModel):
    """Schema for user response."""
    id: uuid.UUID
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    is_email_verified: bool
    is_mobile_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenWithUser(Token):
    """Schema for JWT token response with user data."""
    user: UserResponse


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""
    sub: str  # user_id
    role: UserRole
    exp: datetime
    iat: datetime
    type: str  # "access" or "refresh"


# ============== Common Response Schemas ==============

class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Error response schema."""
    detail: str
    error_code: Optional[str] = None


class PaginationParams(BaseModel):
    """Pagination parameters."""
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size
