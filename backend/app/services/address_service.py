"""
Delivery Address Service
Business logic for managing delivery addresses
"""

import uuid
from typing import Optional, List

from sqlalchemy import select, update, and_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.address import DeliveryAddress
from app.models.user import User
from app.schemas.address import AddressCreate, AddressUpdate


class AddressService:
    """Service for delivery address operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_address(
        self,
        buyer: User,
        data: AddressCreate,
    ) -> DeliveryAddress:
        """Create a new delivery address."""
        # If this is set as default, unset other defaults
        if data.is_default:
            self._unset_default_addresses(buyer.id)
        
        # If this is the first address, make it default
        existing_count = self._count_buyer_addresses(buyer.id)
        is_default = data.is_default or existing_count == 0
        
        address = DeliveryAddress(
            buyer_id=buyer.id,
            label=data.label,
            recipient_name=data.recipient_name,
            recipient_phone=data.recipient_phone,
            address_line_1=data.address_line_1,
            address_line_2=data.address_line_2,
            city=data.city,
            state=data.state,
            pincode=data.pincode,
            landmark=data.landmark,
            latitude=data.latitude,
            longitude=data.longitude,
            is_default=is_default,
        )
        
        self.db.add(address)
        self.db.commit()
        self.db.refresh(address)
        
        return address
    
    def get_address(
        self,
        address_id: uuid.UUID,
        buyer_id: uuid.UUID,
    ) -> Optional[DeliveryAddress]:
        """Get a delivery address by ID."""
        return self.db.query(DeliveryAddress).filter(
            and_(
                DeliveryAddress.id == address_id,
                DeliveryAddress.buyer_id == buyer_id,
                DeliveryAddress.is_active == True,
            )
        ).first()
    
    def get_buyer_addresses(
        self,
        buyer_id: uuid.UUID,
    ) -> List[DeliveryAddress]:
        """Get all addresses for a buyer."""
        return self.db.query(DeliveryAddress).filter(
            and_(
                DeliveryAddress.buyer_id == buyer_id,
                DeliveryAddress.is_active == True,
            )
        ).order_by(
            DeliveryAddress.is_default.desc(),
            DeliveryAddress.created_at.desc()
        ).all()
    
    def update_address(
        self,
        address_id: uuid.UUID,
        buyer_id: uuid.UUID,
        data: AddressUpdate,
    ) -> Optional[DeliveryAddress]:
        """Update a delivery address."""
        address = self.get_address(address_id, buyer_id)
        if not address:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(address, field, value)
        
        self.db.commit()
        self.db.refresh(address)
        
        return address
    
    def delete_address(
        self,
        address_id: uuid.UUID,
        buyer_id: uuid.UUID,
    ) -> bool:
        """Soft delete a delivery address."""
        address = self.get_address(address_id, buyer_id)
        if not address:
            return False
        
        # Cannot delete default address if others exist
        if address.is_default:
            other_addresses = self.get_buyer_addresses(buyer_id)
            other_addresses = [a for a in other_addresses if a.id != address_id]
            if other_addresses:
                # Make the first other address default
                other_addresses[0].is_default = True
        
        address.is_active = False
        self.db.commit()
        
        return True
    
    def set_default_address(
        self,
        address_id: uuid.UUID,
        buyer_id: uuid.UUID,
    ) -> Optional[DeliveryAddress]:
        """Set an address as the default."""
        address = self.get_address(address_id, buyer_id)
        if not address:
            return None
        
        self._unset_default_addresses(buyer_id)
        
        address.is_default = True
        self.db.commit()
        self.db.refresh(address)
        
        return address
    
    def get_default_address(
        self,
        buyer_id: uuid.UUID,
    ) -> Optional[DeliveryAddress]:
        """Get the default delivery address for a buyer."""
        return self.db.query(DeliveryAddress).filter(
            and_(
                DeliveryAddress.buyer_id == buyer_id,
                DeliveryAddress.is_active == True,
                DeliveryAddress.is_default == True,
            )
        ).first()
    
    def _unset_default_addresses(self, buyer_id: uuid.UUID) -> None:
        """Unset all default addresses for a buyer."""
        self.db.query(DeliveryAddress).filter(
            and_(
                DeliveryAddress.buyer_id == buyer_id,
                DeliveryAddress.is_default == True,
            )
        ).update({"is_default": False})
    
    def _count_buyer_addresses(self, buyer_id: uuid.UUID) -> int:
        """Count active addresses for a buyer."""
        return self.db.query(DeliveryAddress).filter(
            and_(
                DeliveryAddress.buyer_id == buyer_id,
                DeliveryAddress.is_active == True,
            )
        ).count()
