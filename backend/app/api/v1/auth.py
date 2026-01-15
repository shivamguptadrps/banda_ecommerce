"""
Authentication Routes
User registration, login, token refresh, and logout
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    Token,
    TokenWithUser,
    RefreshTokenRequest,
    PasswordChange,
    MessageResponse,
)
from app.services.auth_service import AuthService
from app.api.deps import CurrentUser, DbSession


router = APIRouter()


# ============== Registration ==============

@router.post(
    "/register",
    response_model=TokenWithUser,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account and return tokens. Default role is BUYER.",
)
def register(
    user_data: UserCreate,
    db: DbSession,
):
    """
    Register a new user with email and password.
    
    - **email**: Valid email address (unique)
    - **password**: Minimum 8 characters with uppercase, lowercase, and digit
    - **name**: User's full name
    - **phone**: Optional phone number (Indian format: 10 digits starting with 6-9)
    - **role**: User role (buyer/vendor) - admin role cannot be self-assigned
    
    Returns JWT tokens and user data.
    """
    # Prevent self-registration as admin
    if user_data.role.value == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot register as admin",
        )
    
    auth_service = AuthService(db)
    
    try:
        user = auth_service.create_user(user_data)
        tokens = auth_service.create_tokens(user)
        
        # Return tokens with user data
        return TokenWithUser(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type=tokens.token_type,
            expires_in=tokens.expires_in,
            user=UserResponse.model_validate(user),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# ============== Login ==============

@router.post(
    "/login",
    response_model=TokenWithUser,
    summary="Login user",
    description="Authenticate user and return access/refresh tokens with user data.",
)
def login(
    login_data: UserLogin,
    db: DbSession,
):
    """
    Authenticate user with email and password.
    
    Returns JWT access token, refresh token, and user data.
    - Access token expires in 30 minutes
    - Refresh token expires in 7 days
    """
    auth_service = AuthService(db)
    
    user = auth_service.authenticate_user(login_data)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    tokens = auth_service.create_tokens(user)
    
    # Return tokens with user data
    return TokenWithUser(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        expires_in=tokens.expires_in,
        user=UserResponse.model_validate(user),
    )


# ============== Token Refresh ==============

@router.post(
    "/refresh",
    response_model=Token,
    summary="Refresh access token",
    description="Get new access token using refresh token.",
)
def refresh_token(
    request: RefreshTokenRequest,
    db: DbSession,
):
    """
    Refresh access token using a valid refresh token.
    
    The old refresh token will be revoked and a new one issued.
    """
    auth_service = AuthService(db)
    
    tokens = auth_service.refresh_access_token(request.refresh_token)
    
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    
    return tokens


# ============== Logout ==============

@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout user",
    description="Revoke refresh token to logout user.",
)
def logout(
    request: RefreshTokenRequest,
    db: DbSession,
):
    """
    Logout user by revoking their refresh token.
    
    The access token will remain valid until it expires.
    For immediate access revocation, implement token blacklisting.
    """
    auth_service = AuthService(db)
    
    success = auth_service.logout(request.refresh_token)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid refresh token",
        )
    
    return MessageResponse(message="Successfully logged out")


# ============== Current User Profile ==============

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="Get the profile of the currently authenticated user.",
)
def get_current_user_profile(
    current_user: CurrentUser,
):
    """
    Get the current authenticated user's profile.
    
    Requires valid access token in Authorization header.
    """
    return current_user


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
    description="Update the profile of the currently authenticated user.",
)
def update_current_user_profile(
    update_data: UserUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Update current user's profile.
    
    Only name and phone can be updated through this endpoint.
    """
    auth_service = AuthService(db)
    
    updated_user = auth_service.update_user(current_user.id, update_data)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return updated_user


# ============== Password Change ==============

@router.put(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password",
    description="Change the password of the currently authenticated user.",
)
def change_password(
    password_data: PasswordChange,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Change current user's password.
    
    Requires current password for verification.
    All refresh tokens will be revoked after password change.
    """
    auth_service = AuthService(db)
    
    success = auth_service.change_password(
        user_id=current_user.id,
        current_password=password_data.current_password,
        new_password=password_data.new_password,
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    
    return MessageResponse(message="Password changed successfully")

