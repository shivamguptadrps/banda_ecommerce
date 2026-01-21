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
from app.schemas.otp import (
    SendOTPRequest,
    SendOTPResponse,
    VerifyOTPRequest,
    MobileLoginRequest,
    RegisterWithPasswordRequest,
)
from app.services.auth_service import AuthService
from app.services.otp_service import OTPService
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


# ============== Mobile OTP Authentication (End Users) ==============

@router.post(
    "/send-otp",
    response_model=SendOTPResponse,
    summary="Send OTP to mobile number",
    description="Send OTP to mobile number for login/registration. Rate limited to 3 per hour.",
)
def send_otp(
    request: SendOTPRequest,
    db: DbSession,
):
    """
    Send OTP to mobile number for authentication.
    
    - **mobile_number**: 10-digit Indian mobile number
    - **purpose**: 'login' (default), 'register', or 'reset_password'
    
    Returns OTP expiry time. OTP is valid for 5 minutes.
    """
    # Restrict this OTP flow to buyers only.
    # If a phone belongs to a vendor/admin/delivery_partner, they must use their role-specific login.
    from app.models.user import User
    from app.models.enums import UserRole
    existing_user = db.query(User).filter(User.phone == request.mobile_number).first()
    if existing_user and existing_user.role in {UserRole.ADMIN, UserRole.VENDOR, UserRole.DELIVERY_PARTNER}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This mobile is registered as '{existing_user.role.value}'. Please use the correct login option.",
        )

    otp_service = OTPService(db)
    
    otp, error = otp_service.create_otp(request.mobile_number, request.purpose)
    
    if not otp:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=error or "Failed to send OTP",
        )
    
    # In production, send OTP via SMS service (Twilio, AWS SNS, etc.)
    # For development/testing: Return OTP in response so it can be displayed to user
    print(f"🔐 OTP for {request.mobile_number}: {otp.otp_code} (Expires in 5 minutes)")
    
    # Mask mobile number for response
    masked_mobile = f"{request.mobile_number[:2]}****{request.mobile_number[-2:]}"
    
    return SendOTPResponse(
        message="OTP sent successfully",
        expires_in=300,  # 5 minutes
        mobile_number=masked_mobile,
        otp_code=otp.otp_code,  # Include OTP for development/testing
    )


@router.post(
    "/verify-otp",
    response_model=TokenWithUser,
    summary="Verify OTP and login/register",
    description="Verify OTP code and automatically login or register user.",
)
def verify_otp(
    request: VerifyOTPRequest,
    db: DbSession,
):
    """
    Verify OTP and authenticate user.
    
    - If user exists: Login and return tokens
    - If user doesn't exist: Auto-register as buyer and return tokens
    
    Mobile number will be marked as verified.
    """
    otp_service = OTPService(db)
    auth_service = AuthService(db)
    
    # Verify OTP
    is_valid, error, otp = otp_service.verify_otp(
        request.mobile_number,
        request.otp,
        request.purpose,
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Invalid OTP",
        )
    
    # Check if user exists with this mobile number
    from app.models.user import User
    from app.models.enums import UserRole
    user = db.query(User).filter(User.phone == request.mobile_number).first()
    
    if user:
        # Restrict this OTP flow to buyers only.
        if user.role in {UserRole.ADMIN, UserRole.VENDOR, UserRole.DELIVERY_PARTNER}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This mobile is registered as '{user.role.value}'. Please use the correct login option.",
            )
        # Existing user - login
        user.is_mobile_verified = True
        db.commit()
        
        tokens = auth_service.create_tokens(user)
        return TokenWithUser(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type=tokens.token_type,
            expires_in=tokens.expires_in,
            user=UserResponse.model_validate(user),
        )
    else:
        # New user - auto-register as buyer
        # Generate a temporary email and password
        import hashlib
        # Use a non-reserved domain; `.local` is rejected by email validators
        temp_email = f"{request.mobile_number}@banda.com"
        temp_password = hashlib.sha256(f"{request.mobile_number}_temp".encode()).hexdigest()[:16]
        
        # Create user
        from app.models.enums import UserRole
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        
        user = User(
            email=temp_email,
            phone=request.mobile_number,
            name=f"User {request.mobile_number}",  # User can update later
            password_hash=pwd_context.hash(temp_password),
            role=UserRole.BUYER,
            is_mobile_verified=True,
            is_email_verified=False,
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        tokens = auth_service.create_tokens(user)
        return TokenWithUser(
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type=tokens.token_type,
            expires_in=tokens.expires_in,
            user=UserResponse.model_validate(user),
        )


@router.post(
    "/register-with-password",
    response_model=TokenWithUser,
    status_code=status.HTTP_201_CREATED,
    summary="Register with mobile + password (after OTP verification)",
    description="Set username and password for mobile-verified user.",
)
def register_with_password(
    request: RegisterWithPasswordRequest,
    db: DbSession,
):
    """
    Register user with mobile number, username, and password.
    
    User must have verified mobile via OTP first.
    This allows users to set a password for faster future logins.
    """
    from app.models.user import User
    from app.models.enums import UserRole
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Check if mobile is verified (user should verify OTP first)
    # For now, we'll allow registration if mobile doesn't exist
    existing_user = db.query(User).filter(
        (User.phone == request.mobile_number) | (User.email == request.email)
    ).first()
    
    if existing_user:
        if existing_user.phone == request.mobile_number:
            # Update existing user with password
            existing_user.password_hash = pwd_context.hash(request.password)
            existing_user.name = request.name
            if request.email:
                existing_user.email = request.email
            existing_user.is_mobile_verified = True
            db.commit()
            db.refresh(existing_user)
            
            auth_service = AuthService(db)
            tokens = auth_service.create_tokens(existing_user)
            return TokenWithUser(
                access_token=tokens.access_token,
                refresh_token=tokens.refresh_token,
                token_type=tokens.token_type,
                expires_in=tokens.expires_in,
                user=UserResponse.model_validate(existing_user),
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
    
    # Create new user
    user = User(
        # Use a non-reserved domain; `.local` is rejected by email validators
        email=request.email or f"{request.mobile_number}@banda.com",
        phone=request.mobile_number,
        name=request.name,
        password_hash=pwd_context.hash(request.password),
        role=UserRole.BUYER,
        is_mobile_verified=True,
        is_email_verified=bool(request.email),
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    auth_service = AuthService(db)
    tokens = auth_service.create_tokens(user)
    return TokenWithUser(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        expires_in=tokens.expires_in,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/mobile-login",
    response_model=TokenWithUser,
    summary="Login with mobile number and password",
    description="Alternative login method for users who set password.",
)
def mobile_login(
    request: MobileLoginRequest,
    db: DbSession,
):
    """
    Login with mobile number and password.
    
    For users who have set a password after OTP verification.
    """
    from app.models.user import User
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    user = db.query(User).filter(User.phone == request.mobile_number).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password",
        )
    
    if not pwd_context.verify(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    
    auth_service = AuthService(db)
    tokens = auth_service.create_tokens(user)
    
    return TokenWithUser(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        expires_in=tokens.expires_in,
        user=UserResponse.model_validate(user),
    )

