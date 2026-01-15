"""
Vendor Routes
Vendor registration, profile management, and public vendor info
"""

import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session

from pydantic import BaseModel
from decimal import Decimal

from app.database import get_db
from app.schemas.vendor import (
    VendorCreate,
    VendorUpdate,
    VendorResponse,
    VendorPublicResponse,
    VendorListResponse,
    VendorStoreStatsResponse,
)
from app.schemas.user import MessageResponse
from app.services.vendor_service import VendorService
from app.api.deps import CurrentUser, DbSession, VendorUser


class VendorStatsResponse(BaseModel):
    """Vendor dashboard stats response."""
    total_revenue: Decimal
    total_orders: int
    total_products: int
    pending_orders: int
    today_orders: int
    today_revenue: Decimal
    this_week_orders: int
    this_week_revenue: Decimal


router = APIRouter()


# ============== Vendor Registration ==============

@router.post(
    "/register",
    response_model=VendorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register vendor shop",
    description="Create a vendor profile. User must have vendor role.",
)
def register_vendor(
    vendor_data: VendorCreate,
    current_user: VendorUser,
    db: DbSession,
):
    """
    Register a new vendor shop.
    
    - User must have already registered with vendor role
    - Shop will need admin approval before products can be added
    """
    vendor_service = VendorService(db)
    
    try:
        vendor = vendor_service.create_vendor(current_user.id, vendor_data)
        return vendor
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# ============== Vendor Profile ==============

@router.get(
    "/profile",
    response_model=VendorResponse,
    summary="Get vendor profile",
    description="Get current vendor's shop profile.",
)
def get_vendor_profile(
    current_user: VendorUser,
    db: DbSession,
):
    """Get current vendor's shop profile."""
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_user_id(current_user.id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found. Please register your shop first.",
        )
    
    return vendor


@router.put(
    "/profile",
    response_model=VendorResponse,
    summary="Update vendor profile",
    description="Update current vendor's shop profile.",
)
def update_vendor_profile(
    update_data: VendorUpdate,
    current_user: VendorUser,
    db: DbSession,
):
    """Update vendor shop profile."""
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_user_id(current_user.id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found",
        )
    
    updated_vendor = vendor_service.update_vendor(vendor.id, update_data)
    return updated_vendor


# ============== Vendor Stats ==============

@router.get(
    "/stats",
    response_model=VendorStatsResponse,
    summary="Get vendor stats",
    description="Get dashboard statistics for the vendor.",
)
def get_vendor_stats(
    current_user: VendorUser,
    db: DbSession,
):
    """Get vendor dashboard statistics."""
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_user_id(current_user.id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found",
        )
    
    stats = vendor_service.get_vendor_stats(vendor.id)
    return VendorStatsResponse(**stats)


# ============== Logo Upload ==============

@router.post(
    "/upload-logo",
    response_model=VendorResponse,
    summary="Upload shop logo",
    description="Upload a logo image for the shop.",
)
async def upload_vendor_logo(
    current_user: VendorUser,
    db: DbSession,
    file: UploadFile = File(...),
):
    """
    Upload shop logo.
    
    - Accepts: jpg, jpeg, png, webp
    - Max size: 5MB
    """
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_user_id(current_user.id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found",
        )
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: jpg, png, webp",
        )
    
    # Validate file size (5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 5MB",
        )
    
    # TODO: Upload to S3/Cloudinary and get URL
    # For now, we'll just return a placeholder
    logo_url = f"/uploads/vendors/{vendor.id}/logo.{file.filename.split('.')[-1]}"
    
    updated_vendor = vendor_service.update_logo(vendor.id, logo_url)
    return updated_vendor


# ============== Public Vendor APIs ==============

@router.get(
    "/",
    response_model=VendorListResponse,
    summary="List vendors",
    description="Get list of verified and active vendors.",
)
def list_vendors(
    db: DbSession,
    city: Optional[str] = Query(None, description="Filter by city"),
    search: Optional[str] = Query(None, description="Search by shop name"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
):
    """Get paginated list of vendors."""
    vendor_service = VendorService(db)
    
    vendors, total = vendor_service.get_vendors(
        city=city,
        is_verified=True,
        is_active=True,
        search=search,
        page=page,
        size=size,
    )
    
    return VendorListResponse(
        items=[VendorPublicResponse.model_validate(v) for v in vendors],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get(
    "/{vendor_id}",
    response_model=VendorPublicResponse,
    summary="Get vendor details",
    description="Get public details of a vendor.",
)
def get_vendor(
    vendor_id: str,
    db: DbSession,
):
    """Get public vendor details."""
    import uuid
    try:
        vendor_uuid = uuid.UUID(vendor_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vendor ID",
        )
    
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_id(vendor_uuid)
    
    if not vendor or not vendor.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )
    
    return vendor


@router.get(
    "/{vendor_id}/store/stats",
    response_model=VendorStoreStatsResponse,
    summary="Get store statistics",
    description="Get public store statistics (product count, categories, etc.).",
)
def get_vendor_store_stats(
    vendor_id: str,
    db: DbSession,
):
    """Get store statistics for public view."""
    import uuid
    from app.models.product import Product
    from app.models.category import Category
    from sqlalchemy import distinct, func
    
    try:
        vendor_uuid = uuid.UUID(vendor_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vendor ID",
        )
    
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_id(vendor_uuid)
    
    if not vendor or not vendor.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )
    
    # Get product counts
    total_products = db.query(Product).filter(
        Product.vendor_id == vendor_uuid,
        Product.is_deleted == False,
    ).count()
    
    active_products = db.query(Product).filter(
        Product.vendor_id == vendor_uuid,
        Product.is_deleted == False,
        Product.is_active == True,
    ).count()
    
    # Get unique categories count
    categories_count = db.query(func.count(distinct(Product.category_id))).filter(
        Product.vendor_id == vendor_uuid,
        Product.is_deleted == False,
        Product.is_active == True,
        Product.category_id.isnot(None),
    ).scalar() or 0
    
    # Get vendor stats
    stats = vendor_service.get_vendor_stats(vendor_uuid)
    
    return VendorStoreStatsResponse(
        total_products=total_products,
        active_products=active_products,
        categories_count=categories_count,
        total_orders=stats.get("total_orders", 0),
        total_reviews=stats.get("total_reviews", 0),
        rating=stats.get("rating", Decimal("0.0")),
        joined_date=vendor.created_at,
    )


# ============== Nearby Vendors ==============

@router.get(
    "/nearby/search",
    response_model=VendorListResponse,
    summary="Find nearby vendors",
    description="Get vendors within a radius of given coordinates.",
)
def get_nearby_vendors(
    db: DbSession,
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10.0, ge=1, le=50),
    city: Optional[str] = Query(None),
):
    """Find vendors near a location."""
    vendor_service = VendorService(db)
    
    nearby = vendor_service.get_nearby_vendors(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        city=city,
    )
    
    vendors = [vendor for vendor, _ in nearby]
    
    return VendorListResponse(
        items=[VendorPublicResponse.model_validate(v) for v in vendors],
        total=len(vendors),
        page=1,
        size=len(vendors),
        pages=1,
    )


# ============== Delivery Check ==============

@router.get(
    "/{vendor_id}/delivery-check",
    summary="Check delivery availability",
    description="Check if vendor can deliver to a location.",
)
def check_vendor_delivery(
    vendor_id: str,
    db: DbSession,
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    """Check if vendor delivers to a location."""
    import uuid
    try:
        vendor_uuid = uuid.UUID(vendor_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vendor ID",
        )
    
    vendor_service = VendorService(db)
    can_deliver, distance = vendor_service.can_deliver_to(
        vendor_uuid, latitude, longitude
    )
    
    if can_deliver:
        return {
            "can_deliver": True,
            "distance_km": round(distance, 2),
            "message": "Delivery available to your location",
        }
    
    return {
        "can_deliver": False,
        "distance_km": round(distance, 2) if distance else None,
        "message": "Sorry, this vendor doesn't deliver to your location",
    }

