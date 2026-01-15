"""
Admin Coupon Management API Routes
Admin-only coupon CRUD operations
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.api.deps import get_db, require_role
from app.models.user import User
from app.models.enums import UserRole
from app.models.coupon import Coupon
from app.schemas.coupon import (
    CouponCreate,
    CouponUpdate,
    CouponResponse,
    CouponListResponse,
)
from app.schemas.user import MessageResponse

router = APIRouter(prefix="/admin/coupons", tags=["Admin - Coupons"])


@router.post("", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
def create_coupon(
    data: CouponCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Create a new coupon."""
    # Check if code already exists
    existing = db.query(Coupon).filter(
        Coupon.code == data.code.upper().strip()
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coupon code already exists",
        )
    
    # Create coupon
    coupon = Coupon(
        code=data.code.upper().strip(),
        description=data.description,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        min_order_amount=data.min_order_amount,
        max_discount=data.max_discount,
        expiry_date=data.expiry_date,
        usage_limit=data.usage_limit,
        used_count=0,
        is_active=True,
    )
    
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    
    return coupon


@router.get("", response_model=CouponListResponse)
def list_coupons(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """List all coupons with pagination."""
    query = db.query(Coupon)
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                Coupon.code.ilike(f"%{search}%"),
                Coupon.description.ilike(f"%{search}%") if Coupon.description else False,
            )
        )
    
    if is_active is not None:
        query = query.filter(Coupon.is_active == is_active)
    
    # Count total
    total = query.count()
    
    # Paginate
    offset = (page - 1) * size
    coupons = query.order_by(Coupon.created_at.desc()).offset(offset).limit(size).all()
    
    # Calculate pages
    pages = (total + size - 1) // size
    
    return CouponListResponse(
        items=coupons,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get("/{coupon_id}", response_model=CouponResponse)
def get_coupon(
    coupon_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Get coupon by ID."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found",
        )
    
    return coupon


@router.put("/{coupon_id}", response_model=CouponResponse)
def update_coupon(
    coupon_id: uuid.UUID,
    data: CouponUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Update a coupon."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found",
        )
    
    # Update fields
    if data.description is not None:
        coupon.description = data.description
    if data.discount_value is not None:
        coupon.discount_value = data.discount_value
    if data.min_order_amount is not None:
        coupon.min_order_amount = data.min_order_amount
    if data.max_discount is not None:
        coupon.max_discount = data.max_discount
    if data.expiry_date is not None:
        coupon.expiry_date = data.expiry_date
    if data.usage_limit is not None:
        coupon.usage_limit = data.usage_limit
    if data.is_active is not None:
        coupon.is_active = data.is_active
    
    db.commit()
    db.refresh(coupon)
    
    return coupon


@router.delete("/{coupon_id}", response_model=MessageResponse)
def delete_coupon(
    coupon_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Disable a coupon (soft delete)."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found",
        )
    
    # Soft delete - just mark as inactive
    coupon.is_active = False
    
    db.commit()
    
    return MessageResponse(message="Coupon disabled successfully")

