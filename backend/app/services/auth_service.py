"""
Authentication Service
Handles user registration, login, and token management
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.user import User, RefreshToken
from app.models.enums import UserRole
from app.schemas.user import UserCreate, UserLogin, Token, UserUpdate
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_token_expiry,
)
from app.config import settings


class AuthService:
    """Service class for authentication operations."""
    
    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
    
    # ============== User Registration ==============
    
    def create_user(self, user_data: UserCreate) -> User:
        """
        Create a new user.
        
        Args:
            user_data: User registration data
            
        Returns:
            Created user object
            
        Raises:
            ValueError: If email or phone already exists
        """
        # Check if email already exists
        if self.get_user_by_email(user_data.email):
            raise ValueError("Email already registered")
        
        # Check if phone already exists (if provided)
        if user_data.phone and self.get_user_by_phone(user_data.phone):
            raise ValueError("Phone number already registered")
        
        # Create user
        user = User(
            email=user_data.email,
            phone=user_data.phone,
            password_hash=hash_password(user_data.password),
            name=user_data.name,
            role=user_data.role,
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    # ============== User Authentication ==============
    
    def authenticate_user(self, login_data: UserLogin) -> Optional[User]:
        """
        Authenticate a user with email and password.
        
        Args:
            login_data: Login credentials
            
        Returns:
            User object if authentication successful, None otherwise
        """
        user = self.get_user_by_email(login_data.email)
        
        if not user:
            return None
        
        if not verify_password(login_data.password, user.password_hash):
            return None
        
        if not user.is_active:
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        self.db.commit()
        
        return user
    
    def create_tokens(self, user: User) -> Token:
        """
        Create access and refresh tokens for a user.
        
        Args:
            user: User object
            
        Returns:
            Token object with access and refresh tokens
        """
        # Create tokens
        access_token = create_access_token(user.id, user.role)
        refresh_token = create_refresh_token(user.id, user.role)
        
        # Store refresh token in database
        refresh_token_obj = RefreshToken(
            user_id=user.id,
            token=refresh_token,
            expires_at=get_token_expiry("refresh"),
        )
        self.db.add(refresh_token_obj)
        self.db.commit()
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )
    
    def refresh_access_token(self, refresh_token: str) -> Optional[Token]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Refresh token string
            
        Returns:
            New Token object if successful, None otherwise
        """
        try:
            # Decode and validate refresh token
            payload = decode_token(refresh_token)
            
            if payload.get("type") != "refresh":
                return None
            
            user_id = uuid.UUID(payload.get("sub"))
            
            # Check if refresh token exists and is valid
            token_obj = self.db.query(RefreshToken).filter(
                RefreshToken.token == refresh_token,
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.utcnow(),
            ).first()
            
            if not token_obj:
                return None
            
            # Get user
            user = self.get_user_by_id(user_id)
            if not user or not user.is_active:
                return None
            
            # Revoke old refresh token
            token_obj.is_revoked = True
            self.db.commit()
            
            # Create new tokens
            return self.create_tokens(user)
            
        except Exception:
            return None
    
    def logout(self, refresh_token: str) -> bool:
        """
        Logout user by revoking refresh token.
        
        Args:
            refresh_token: Refresh token to revoke
            
        Returns:
            True if successful, False otherwise
        """
        try:
            token_obj = self.db.query(RefreshToken).filter(
                RefreshToken.token == refresh_token,
            ).first()
            
            if token_obj:
                token_obj.is_revoked = True
                self.db.commit()
                return True
            
            return False
            
        except Exception:
            return False
    
    def revoke_all_tokens(self, user_id: uuid.UUID) -> bool:
        """
        Revoke all refresh tokens for a user.
        
        Args:
            user_id: User's UUID
            
        Returns:
            True if successful
        """
        self.db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
        ).update({"is_revoked": True})
        self.db.commit()
        return True
    
    # ============== User Queries ==============
    
    def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Get user by ID."""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        return self.db.query(User).filter(User.email == email).first()
    
    def get_user_by_phone(self, phone: str) -> Optional[User]:
        """Get user by phone number."""
        return self.db.query(User).filter(User.phone == phone).first()
    
    # ============== User Updates ==============
    
    def update_user(self, user_id: uuid.UUID, update_data: UserUpdate) -> Optional[User]:
        """
        Update user profile.
        
        Args:
            user_id: User's UUID
            update_data: Fields to update
            
        Returns:
            Updated user object
        """
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        for field, value in update_dict.items():
            setattr(user, field, value)
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def change_password(
        self,
        user_id: uuid.UUID,
        current_password: str,
        new_password: str,
    ) -> bool:
        """
        Change user password.
        
        Args:
            user_id: User's UUID
            current_password: Current password for verification
            new_password: New password to set
            
        Returns:
            True if successful, False otherwise
        """
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        if not verify_password(current_password, user.password_hash):
            return False
        
        user.password_hash = hash_password(new_password)
        self.db.commit()
        
        # Revoke all refresh tokens for security
        self.revoke_all_tokens(user_id)
        
        return True
    
    # ============== Token Cleanup ==============
    
    def cleanup_expired_tokens(self) -> int:
        """
        Remove expired refresh tokens from database.
        
        Returns:
            Number of tokens deleted
        """
        result = self.db.query(RefreshToken).filter(
            or_(
                RefreshToken.expires_at < datetime.utcnow(),
                RefreshToken.is_revoked == True,
            )
        ).delete()
        self.db.commit()
        return result

