"""
API Dependencies
Reusable dependencies for route handlers
"""

import uuid
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

from app.database import get_db
from app.models.user import User
from app.models.enums import UserRole
from app.config import settings


# Security scheme for JWT Bearer tokens
security = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Session = Depends(get_db),
) -> User:
    """
    Get the current authenticated user from JWT token.
    
    Args:
        credentials: Bearer token from Authorization header
        db: Database session
        
    Returns:
        Current user object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        
        # Check token type
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        
        user_id = uuid.UUID(payload.get("sub"))
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    
    return user


def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Get current active user.
    
    Args:
        current_user: User from get_current_user dependency
        
    Returns:
        Current active user
    """
    return current_user


# ============== Role-Based Access Dependencies ==============

def require_role(allowed_roles):
    """
    Dependency factory for role-based access control.
    
    Args:
        allowed_roles: Single role, list of roles, or multiple roles as arguments
        
    Returns:
        Dependency function that validates user role
    """
    # Handle both list and single role
    if isinstance(allowed_roles, (list, tuple)):
        roles = allowed_roles
    else:
        roles = [allowed_roles]
    
    def role_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this resource",
            )
        return current_user
    
    return role_checker


# Convenience dependencies for common role requirements
require_admin = require_role([UserRole.ADMIN])
require_vendor = require_role([UserRole.VENDOR, UserRole.ADMIN])
require_buyer = require_role([UserRole.BUYER, UserRole.ADMIN])


# Type aliases for cleaner route signatures
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
VendorUser = Annotated[User, Depends(require_vendor)]
BuyerUser = Annotated[User, Depends(require_buyer)]
DbSession = Annotated[Session, Depends(get_db)]

