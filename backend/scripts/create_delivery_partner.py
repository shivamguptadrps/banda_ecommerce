"""
Script to create a delivery partner for testing
Usage: python scripts/create_delivery_partner.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import User
from app.models.delivery_partner import DeliveryPartner
from app.models.enums import UserRole
from app.services.auth_service import AuthService

def create_delivery_partner():
    """Create a test delivery partner."""
    db = SessionLocal()
    
    try:
        # Check if delivery partner already exists
        phone = "9876543210"
        existing = db.query(DeliveryPartner).filter(DeliveryPartner.phone == phone).first()
        if existing:
            print(f"Delivery partner with phone {phone} already exists!")
            return
        
        # Create user
        auth_service = AuthService(db)
        from app.schemas.user import UserCreate
        
        # Create user with delivery_partner role
        user_create = UserCreate(
            email=f"delivery_{phone}@banda.com",
            password="Delivery@123",
            name="Test Delivery Partner",
            phone=phone,
            role=UserRole.DELIVERY_PARTNER,  # Pydantic will handle enum serialization
        )
        user = auth_service.create_user(user_create)
        
        # Create delivery partner
        delivery_partner = DeliveryPartner(
            user_id=user.id,
            name="Test Delivery Partner",
            phone=phone,
            vehicle_type="bike",
            vehicle_number="MH12AB1234",
            is_active=True,
            is_available=True,
        )
        db.add(delivery_partner)
        db.commit()
        
        print(f"✅ Delivery partner created successfully!")
        print(f"   Phone: {phone}")
        print(f"   OTP: 1234")
        print(f"   Email: {user.email}")
        print(f"   Password: Delivery@123")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating delivery partner: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_delivery_partner()

