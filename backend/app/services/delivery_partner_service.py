"""
Delivery Partner Service
Business logic for delivery partner management
"""

import uuid
import secrets
import string
from typing import Optional
from datetime import datetime

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.delivery_partner import DeliveryPartner
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.delivery_partner import DeliveryPartnerCreate, DeliveryPartnerUpdate
from app.services.auth_service import AuthService
from app.utils.security import hash_password


def generate_random_password(length: int = 12) -> str:
    """Generate a random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    # Ensure password has at least one uppercase, lowercase, and digit
    if not any(c.isupper() for c in password):
        password = password[0].upper() + password[1:]
    if not any(c.islower() for c in password):
        password = password[0].lower() + password[1:]
    if not any(c.isdigit() for c in password):
        password = password[:-1] + '1'
    return password


class DeliveryPartnerService:
    """Service for delivery partner operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_delivery_partner(
        self,
        data: DeliveryPartnerCreate,
    ) -> DeliveryPartner:
        """Create a new delivery partner."""
        # Check if phone already exists
        existing = self.db.query(DeliveryPartner).filter(
            DeliveryPartner.phone == data.phone
        ).first()
        
        if existing:
            raise ValueError("Delivery partner with this phone number already exists")
        
        # Check if user with this phone exists
        existing_user = self.db.query(User).filter(
            User.phone == data.phone
        ).first()
        
        if existing_user:
            raise ValueError("User with this phone number already exists")
        
        # Generate email if not provided
        email = data.email or f"delivery_{data.phone}@banda.com"
        
        # Check if email exists
        existing_email = self.db.query(User).filter(User.email == email).first()
        if existing_email:
            raise ValueError("Email already registered")
        
        # Generate password if not provided
        password = data.password or generate_random_password()
        
        # Create user
        auth_service = AuthService(self.db)
        from app.schemas.user import UserCreate
        
        user_create = UserCreate(
            email=email,
            password=password,
            name=data.name,
            phone=data.phone,
            role=UserRole.DELIVERY_PARTNER.value,
        )
        user = auth_service.create_user(user_create)
        
        # Create delivery partner
        delivery_partner = DeliveryPartner(
            user_id=user.id,
            name=data.name,
            phone=data.phone,
            vehicle_type=data.vehicle_type,
            vehicle_number=data.vehicle_number,
            is_active=True,
            is_available=True,
        )
        
        self.db.add(delivery_partner)
        self.db.commit()
        self.db.refresh(delivery_partner)
        
        return delivery_partner
    
    def get_delivery_partner(self, partner_id: uuid.UUID) -> Optional[DeliveryPartner]:
        """Get delivery partner by ID."""
        return self.db.query(DeliveryPartner).filter(
            DeliveryPartner.id == partner_id
        ).first()
    
    def list_delivery_partners(
        self,
        page: int = 1,
        size: int = 20,
        is_active: Optional[bool] = None,
        is_available: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> tuple[list[DeliveryPartner], int]:
        """List delivery partners with filters."""
        query = self.db.query(DeliveryPartner)
        
        # Apply filters
        if is_active is not None:
            query = query.filter(DeliveryPartner.is_active == is_active)
        
        if is_available is not None:
            query = query.filter(DeliveryPartner.is_available == is_available)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (DeliveryPartner.name.ilike(search_term)) |
                (DeliveryPartner.phone.ilike(search_term)) |
                (DeliveryPartner.vehicle_number.ilike(search_term))
            )
        
        # Get total count
        total = query.count()
        
        # Paginate
        partners = query.order_by(
            DeliveryPartner.created_at.desc()
        ).offset((page - 1) * size).limit(size).all()
        
        return partners, total
    
    def update_delivery_partner(
        self,
        partner_id: uuid.UUID,
        data: DeliveryPartnerUpdate,
    ) -> DeliveryPartner:
        """Update delivery partner."""
        partner = self.get_delivery_partner(partner_id)
        
        if not partner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Delivery partner not found",
            )
        
        # Check phone uniqueness if changing
        if data.phone and data.phone != partner.phone:
            existing = self.db.query(DeliveryPartner).filter(
                DeliveryPartner.phone == data.phone,
                DeliveryPartner.id != partner_id
            ).first()
            if existing:
                raise ValueError("Phone number already in use")
            
            # Update user phone
            user = self.db.query(User).filter(User.id == partner.user_id).first()
            if user:
                user.phone = data.phone
                self.db.flush()
        
        # Update fields
        if data.name is not None:
            partner.name = data.name
        if data.phone is not None:
            partner.phone = data.phone
        if data.vehicle_type is not None:
            partner.vehicle_type = data.vehicle_type
        if data.vehicle_number is not None:
            partner.vehicle_number = data.vehicle_number
        if data.is_active is not None:
            partner.is_active = data.is_active
        if data.is_available is not None:
            partner.is_available = data.is_available
        
        partner.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(partner)
        
        return partner
    
    def delete_delivery_partner(self, partner_id: uuid.UUID) -> None:
        """Delete (deactivate) delivery partner."""
        partner = self.get_delivery_partner(partner_id)
        
        if not partner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Delivery partner not found",
            )
        
        # Soft delete - deactivate
        partner.is_active = False
        partner.is_available = False
        partner.updated_at = datetime.utcnow()
        
        # Also deactivate user
        user = self.db.query(User).filter(User.id == partner.user_id).first()
        if user:
            user.is_active = False
        
        self.db.commit()


