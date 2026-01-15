"""
Delivery Address API Routes
Buyer address management
"""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_role
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.address import (
    AddressCreate,
    AddressUpdate,
    AddressResponse,
    AddressListResponse,
)
from app.services.address_service import AddressService

router = APIRouter(prefix="/addresses", tags=["Delivery Addresses"])


@router.post(
    "",
    response_model=AddressResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_address(
    data: AddressCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Create a new delivery address."""
    service = AddressService(db)
    address = service.create_address(current_user, data)
    return address


@router.get("", response_model=AddressListResponse)
def list_addresses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """List all delivery addresses for the current user."""
    service = AddressService(db)
    addresses = service.get_buyer_addresses(current_user.id)
    return AddressListResponse(
        items=addresses,
        total=len(addresses),
    )


@router.get("/{address_id}", response_model=AddressResponse)
def get_address(
    address_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Get a specific delivery address."""
    service = AddressService(db)
    address = service.get_address(address_id, current_user.id)
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found",
        )
    
    return address


@router.put("/{address_id}", response_model=AddressResponse)
def update_address(
    address_id: uuid.UUID,
    data: AddressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Update a delivery address."""
    service = AddressService(db)
    address = service.update_address(address_id, current_user.id, data)
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found",
        )
    
    return address


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    address_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Delete a delivery address."""
    service = AddressService(db)
    deleted = service.delete_address(address_id, current_user.id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found",
        )


@router.post(
    "/{address_id}/default",
    response_model=AddressResponse,
)
def set_default_address(
    address_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """Set an address as the default."""
    service = AddressService(db)
    address = service.set_default_address(address_id, current_user.id)
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found",
        )
    
    return address
