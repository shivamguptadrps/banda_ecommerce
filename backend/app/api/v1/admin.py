"""
Admin Routes
Admin-only endpoints for platform management
"""

import math
import uuid
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.storage import upload_image, validate_image, MAX_FILE_SIZE
from app.schemas.vendor import (
    VendorAdminResponse,
    VendorApproval,
    VendorSuspend,
    VendorListResponse,
    VendorAdminListResponse,
    VendorResponse,
)
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryListResponse,
)
from app.schemas.service_zone import (
    ServiceZoneCreate,
    ServiceZoneUpdate,
    ServiceZoneResponse,
    ServiceZoneListResponse,
)
from app.schemas.order import (
    OrderResponse,
    OrderListResponse,
    OrderStatusUpdate,
)
from app.schemas.delivery_partner import (
    DeliveryPartnerCreate,
    DeliveryPartnerUpdate,
    DeliveryPartnerResponse,
    DeliveryPartnerListResponse,
    OrderAssignmentRequest,
)
from app.schemas.user import MessageResponse
from app.services.vendor_service import VendorService
from app.services.category_service import CategoryService
from app.services.service_zone_service import ServiceZoneService
from app.services.order_service import OrderService
from app.services.delivery_partner_service import DeliveryPartnerService
from app.services.analytics_service import AnalyticsService
from app.models.enums import OrderStatus
from app.api.deps import DbSession, AdminUser


router = APIRouter()


# ============== Vendor Management ==============

@router.get(
    "/vendors",
    response_model=VendorAdminListResponse,
    summary="List all vendors",
    description="Get all vendors with admin details.",
)
def list_all_vendors(
    current_user: AdminUser,
    db: DbSession,
    city: Optional[str] = Query(None),
    is_verified: Optional[bool] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """Get all vendors (admin view)."""
    vendor_service = VendorService(db)
    
    vendors, total = vendor_service.get_vendors(
        city=city,
        is_verified=is_verified,
        is_active=is_active,
        search=search,
        page=page,
        size=size,
    )
    
    return VendorAdminListResponse(
        items=[VendorAdminResponse.model_validate(v) for v in vendors],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get(
    "/vendors/pending",
    response_model=VendorAdminListResponse,
    summary="Get pending vendors",
    description="Get vendors awaiting approval.",
)
def get_pending_vendors(
    current_user: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """Get vendors pending approval."""
    vendor_service = VendorService(db)
    vendors, total = vendor_service.get_pending_vendors(page=page, size=size)
    
    return VendorAdminListResponse(
        items=[VendorAdminResponse.model_validate(v) for v in vendors],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get(
    "/vendors/{vendor_id}",
    response_model=VendorAdminResponse,
    summary="Get vendor details",
    description="Get full vendor details for admin.",
)
def get_vendor_admin(
    vendor_id: str,
    current_user: AdminUser,
    db: DbSession,
):
    """Get vendor details (admin view)."""
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
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )
    
    return vendor


@router.put(
    "/vendors/{vendor_id}/approve",
    response_model=VendorAdminResponse,
    summary="Approve/reject vendor",
    description="Approve or reject a vendor application.",
)
def approve_vendor(
    vendor_id: str,
    approval_data: VendorApproval,
    current_user: AdminUser,
    db: DbSession,
):
    """Approve or reject vendor."""
    import uuid
    try:
        vendor_uuid = uuid.UUID(vendor_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vendor ID",
        )
    
    vendor_service = VendorService(db)
    vendor = vendor_service.approve_vendor(vendor_uuid, approval_data)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )
    
    return vendor


@router.put(
    "/vendors/{vendor_id}/suspend",
    response_model=VendorAdminResponse,
    summary="Suspend/reactivate vendor",
    description="Suspend or reactivate a vendor.",
)
def suspend_vendor(
    vendor_id: str,
    suspend_data: VendorSuspend,
    current_user: AdminUser,
    db: DbSession,
):
    """Suspend or reactivate vendor."""
    import uuid
    try:
        vendor_uuid = uuid.UUID(vendor_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vendor ID",
        )
    
    vendor_service = VendorService(db)
    vendor = vendor_service.suspend_vendor(vendor_uuid, suspend_data.is_active)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )
    
    return vendor


# ============== Category Management ==============

@router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create category",
    description="Create a new category.",
)
def create_category(
    category_data: CategoryCreate,
    current_user: AdminUser,
    db: DbSession,
):
    """Create a new category."""
    category_service = CategoryService(db)
    
    try:
        category = category_service.create_category(category_data)
        return category
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/categories",
    response_model=CategoryListResponse,
    summary="List all categories",
    description="Get all categories including inactive ones.",
)
def list_all_categories(
    current_user: AdminUser,
    db: DbSession,
    include_inactive: bool = Query(True),
):
    """Get all categories (admin view)."""
    category_service = CategoryService(db)
    categories = category_service.get_all_categories(include_inactive=include_inactive)
    
    return CategoryListResponse(
        items=[CategoryResponse.model_validate(c) for c in categories],
        total=len(categories),
    )


@router.put(
    "/categories/{category_id}",
    response_model=CategoryResponse,
    summary="Update category",
    description="Update a category.",
)
def update_category(
    category_id: str,
    update_data: CategoryUpdate,
    current_user: AdminUser,
    db: DbSession,
):
    """Update category."""
    import uuid
    try:
        category_uuid = uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID",
        )
    
    category_service = CategoryService(db)
    
    try:
        category = category_service.update_category(category_uuid, update_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    
    return category


@router.post(
    "/categories/{category_id}/upload-image",
    response_model=CategoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload category image",
    description="Upload an image/logo for a category. Accepts: jpg, jpeg, png, webp. Max size: 5MB.",
)
async def upload_category_image(
    category_id: str,
    current_user: AdminUser,
    db: DbSession,
    file: UploadFile = File(...),
):
    """
    Upload category image/logo.
    
    - Accepts: jpg, jpeg, png, webp
    - Max size: 5MB
    - Automatically uploads to Cloudinary/S3 if configured
    """
    import uuid
    try:
        category_uuid = uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID",
        )
    
    category_service = CategoryService(db)
    category = category_service.get_category_by_id(category_uuid)
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: jpg, jpeg, png, webp",
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size and type
    is_valid, error_msg = validate_image(content, file.content_type)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )
    
    # Upload image
    image_url, upload_error = await upload_image(
        content=content,
        content_type=file.content_type,
        category="categories",
        entity_id=str(category.id),
        original_filename=file.filename or "category_image",
    )
    
    if upload_error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {upload_error}",
        )
    
    # Update category with image URL
    updated_category = category_service.update_category_image(category_uuid, image_url)
    
    if not updated_category:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update category",
        )
    
    return updated_category


@router.delete(
    "/categories/{category_id}",
    response_model=MessageResponse,
    summary="Delete category",
    description="Soft delete a category and its children.",
)
def delete_category(
    category_id: str,
    current_user: AdminUser,
    db: DbSession,
):
    """Delete (deactivate) category."""
    import uuid
    try:
        category_uuid = uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID",
        )
    
    category_service = CategoryService(db)
    success = category_service.delete_category(category_uuid)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    
    return MessageResponse(message="Category deactivated successfully")


# ============== Service Zone Management ==============

@router.post(
    "/service-zones",
    response_model=ServiceZoneResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create service zone",
    description="Create a new service/delivery zone.",
)
def create_service_zone(
    zone_data: ServiceZoneCreate,
    current_user: AdminUser,
    db: DbSession,
):
    """Create a new service zone."""
    zone_service = ServiceZoneService(db)
    zone = zone_service.create_zone(zone_data)
    return zone


@router.get(
    "/service-zones",
    response_model=ServiceZoneListResponse,
    summary="List service zones",
    description="Get all service zones.",
)
def list_service_zones(
    current_user: AdminUser,
    db: DbSession,
    city: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """Get all service zones."""
    zone_service = ServiceZoneService(db)
    zones, total = zone_service.get_zones(
        city=city,
        is_active=is_active,
        page=page,
        size=size,
    )
    
    return ServiceZoneListResponse(
        items=[ServiceZoneResponse.model_validate(z) for z in zones],
        total=total,
        page=page,
        size=size,
    )


@router.get(
    "/service-zones/{zone_id}",
    response_model=ServiceZoneResponse,
    summary="Get service zone",
    description="Get service zone details.",
)
def get_service_zone(
    zone_id: str,
    current_user: AdminUser,
    db: DbSession,
):
    """Get service zone details."""
    import uuid
    try:
        zone_uuid = uuid.UUID(zone_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid zone ID",
        )
    
    zone_service = ServiceZoneService(db)
    zone = zone_service.get_zone_by_id(zone_uuid)
    
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service zone not found",
        )
    
    return zone


@router.put(
    "/service-zones/{zone_id}",
    response_model=ServiceZoneResponse,
    summary="Update service zone",
    description="Update a service zone.",
)
def update_service_zone(
    zone_id: str,
    update_data: ServiceZoneUpdate,
    current_user: AdminUser,
    db: DbSession,
):
    """Update service zone."""
    import uuid
    try:
        zone_uuid = uuid.UUID(zone_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid zone ID",
        )
    
    zone_service = ServiceZoneService(db)
    zone = zone_service.update_zone(zone_uuid, update_data)
    
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service zone not found",
        )
    
    return zone


@router.delete(
    "/service-zones/{zone_id}",
    response_model=MessageResponse,
    summary="Delete service zone",
    description="Soft delete a service zone.",
)
def delete_service_zone(
    zone_id: str,
    current_user: AdminUser,
    db: DbSession,
):
    """Delete (deactivate) service zone."""
    import uuid
    try:
        zone_uuid = uuid.UUID(zone_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid zone ID",
        )
    
    zone_service = ServiceZoneService(db)
    success = zone_service.delete_zone(zone_uuid)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service zone not found",
        )
    
    return MessageResponse(message="Service zone deactivated successfully")


# ============== Order Management ==============

@router.get(
    "/orders",
    response_model=OrderListResponse,
    summary="List all orders",
    description="Get all orders with admin details.",
)
def list_all_orders(
    current_user: AdminUser,
    db: DbSession,
    status_filter: Optional[OrderStatus] = Query(None, alias="status"),
    vendor_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """Get all orders (admin view)."""
    order_service = OrderService(db)
    
    vendor_uuid = None
    if vendor_id:
        try:
            vendor_uuid = uuid.UUID(vendor_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid vendor ID",
            )
    
    orders, total = order_service.get_all_orders(
        status=status_filter,
        vendor_id=vendor_uuid,
        search=search,
        page=page,
        size=size,
    )
    
    return OrderListResponse(
        items=[OrderResponse.model_validate(o) for o in orders],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get(
    "/orders/stats",
    summary="Get order statistics",
    description="Get order statistics for dashboard.",
)
def get_order_stats(
    current_user: AdminUser,
    db: DbSession,
):
    """Get order statistics."""
    order_service = OrderService(db)
    stats = order_service.get_order_stats()
    return stats


@router.get(
    "/orders/{order_id}",
    response_model=OrderResponse,
    summary="Get order details",
    description="Get full order details for admin.",
)
def get_order_admin(
    order_id: str,
    current_user: AdminUser,
    db: DbSession,
):
    """Get order details (admin view)."""
    try:
        order_uuid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order ID",
        )
    
    order_service = OrderService(db)
    order = order_service.get_order_by_id(order_uuid)
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    return order


@router.put(
    "/orders/{order_id}/status",
    response_model=OrderResponse,
    summary="Update order status",
    description="Update order status (admin override).",
)
def update_order_status_admin(
    order_id: str,
    status_data: OrderStatusUpdate,
    current_user: AdminUser,
    db: DbSession,
):
    """Update order status (admin can override)."""
    try:
        order_uuid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order ID",
        )
    
    order_service = OrderService(db)
    
    try:
        order = order_service.update_order_status_admin(order_uuid, status_data.status)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    return order


@router.post(
    "/orders/{order_id}/assign-delivery-partner",
    response_model=OrderResponse,
    summary="Assign order to delivery partner",
    description="Assign a PACKED order to a delivery partner and mark as OUT_FOR_DELIVERY.",
)
def assign_order_to_delivery_partner(
    order_id: str,
    assignment_data: OrderAssignmentRequest,
    current_user: AdminUser,
    db: DbSession,
):
    """Assign order to delivery partner."""
    try:
        order_uuid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order ID",
        )
    
    order_service = OrderService(db)
    
    try:
        order = order_service.assign_order_to_delivery_partner(
            order_id=order_uuid,
            delivery_partner_id=assignment_data.delivery_partner_id,
        )
        return OrderResponse.model_validate(order)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign order: {str(e)}",
        )


# ============== Delivery Partner Management ==============

@router.post(
    "/delivery-partners",
    response_model=DeliveryPartnerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create delivery partner",
    description="Create a new delivery partner. Admin only.",
)
def create_delivery_partner(
    partner_data: DeliveryPartnerCreate,
    current_user: AdminUser,
    db: DbSession,
):
    """Create a new delivery partner."""
    service = DeliveryPartnerService(db)
    
    try:
        partner = service.create_delivery_partner(partner_data)
        return DeliveryPartnerResponse.model_validate(partner)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/delivery-partners",
    response_model=DeliveryPartnerListResponse,
    summary="List delivery partners",
    description="Get all delivery partners with filters.",
)
def list_delivery_partners(
    current_user: AdminUser,
    db: DbSession,
    is_active: Optional[bool] = Query(None),
    is_available: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """List all delivery partners."""
    service = DeliveryPartnerService(db)
    partners, total = service.list_delivery_partners(
        page=page,
        size=size,
        is_active=is_active,
        is_available=is_available,
        search=search,
    )
    
    return DeliveryPartnerListResponse(
        items=[DeliveryPartnerResponse.model_validate(p) for p in partners],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get(
    "/delivery-partners/{partner_id}",
    response_model=DeliveryPartnerResponse,
    summary="Get delivery partner",
    description="Get delivery partner details.",
)
def get_delivery_partner(
    partner_id: str,
    current_user: AdminUser,
    db: DbSession,
):
    """Get delivery partner details."""
    try:
        partner_uuid = uuid.UUID(partner_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid delivery partner ID",
        )
    
    service = DeliveryPartnerService(db)
    partner = service.get_delivery_partner(partner_uuid)
    
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery partner not found",
        )
    
    return DeliveryPartnerResponse.model_validate(partner)


@router.put(
    "/delivery-partners/{partner_id}",
    response_model=DeliveryPartnerResponse,
    summary="Update delivery partner",
    description="Update delivery partner details.",
)
def update_delivery_partner(
    partner_id: str,
    update_data: DeliveryPartnerUpdate,
    current_user: AdminUser,
    db: DbSession,
):
    """Update delivery partner."""
    try:
        partner_uuid = uuid.UUID(partner_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid delivery partner ID",
        )
    
    service = DeliveryPartnerService(db)
    
    try:
        partner = service.update_delivery_partner(partner_uuid, update_data)
        return DeliveryPartnerResponse.model_validate(partner)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update delivery partner: {str(e)}",
        )


@router.delete(
    "/delivery-partners/{partner_id}",
    response_model=MessageResponse,
    summary="Delete delivery partner",
    description="Deactivate a delivery partner.",
)
def delete_delivery_partner(
    partner_id: str,
    current_user: AdminUser,
    db: DbSession,
):
    """Delete (deactivate) delivery partner."""
    try:
        partner_uuid = uuid.UUID(partner_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid delivery partner ID",
        )
    
    service = DeliveryPartnerService(db)
    
    try:
        service.delete_delivery_partner(partner_uuid)
        return MessageResponse(message="Delivery partner deactivated successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete delivery partner: {str(e)}",
        )


# ============== Analytics Endpoints ==============

@router.get(
    "/analytics/vendors",
    summary="Get vendor analytics",
    description="Get comprehensive vendor analytics with filters.",
)
def get_vendor_analytics(
    current_user: AdminUser,
    db: DbSession,
    vendor_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    """Get vendor analytics."""
    analytics_service = AnalyticsService(db)
    
    # Parse dates
    start = None
    end = None
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD",
            )
    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD",
            )
    
    # Parse vendor ID
    vendor_uuid = None
    if vendor_id:
        try:
            vendor_uuid = uuid.UUID(vendor_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid vendor ID",
            )
    
    # Parse status
    status_filter = None
    if status:
        try:
            status_filter = OrderStatus(status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid order status: {status}",
            )
    
    analytics = analytics_service.get_admin_vendor_analytics(
        vendor_id=vendor_uuid,
        start_date=start,
        end_date=end,
        status_filter=status_filter,
    )
    
    return analytics


@router.get(
    "/analytics/vendors/list",
    summary="Get vendor list analytics",
    description="Get analytics for all vendors with search and filters.",
)
def get_vendor_list_analytics(
    current_user: AdminUser,
    db: DbSession,
    search: Optional[str] = Query(None),
    is_verified: Optional[bool] = Query(None),
    is_active: Optional[bool] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """Get vendor list analytics."""
    analytics_service = AnalyticsService(db)
    
    # Parse dates
    start = None
    end = None
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD",
            )
    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD",
            )
    
    analytics = analytics_service.get_admin_vendor_list_analytics(
        search=search,
        is_verified=is_verified,
        is_active=is_active,
        start_date=start,
        end_date=end,
    )
    
    return analytics


@router.get(
    "/analytics/delivery-partners",
    summary="Get delivery partner analytics",
    description="Get comprehensive delivery partner analytics with filters.",
)
def get_delivery_partner_analytics(
    current_user: AdminUser,
    db: DbSession,
    delivery_partner_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),  # Ignore limit parameter for now
):
    """Get delivery partner analytics."""
    analytics_service = AnalyticsService(db)
    
    # Parse dates
    start = None
    end = None
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD",
            )
    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD",
            )
    
    # Parse delivery partner ID
    dp_uuid = None
    if delivery_partner_id:
        try:
            dp_uuid = uuid.UUID(delivery_partner_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid delivery partner ID",
            )
    
    analytics = analytics_service.get_admin_delivery_partner_analytics(
        delivery_partner_id=dp_uuid,
        start_date=start,
        end_date=end,
    )
    
    return analytics


@router.get(
    "/analytics/delivery-partners/list",
    summary="Get delivery partner list analytics",
    description="Get analytics for all delivery partners with search and filters.",
)
def get_delivery_partner_list_analytics(
    current_user: AdminUser,
    db: DbSession,
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """Get delivery partner list analytics."""
    analytics_service = AnalyticsService(db)
    
    # Parse dates
    start = None
    end = None
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use YYYY-MM-DD",
            )
    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use YYYY-MM-DD",
            )
    
    analytics = analytics_service.get_admin_delivery_partner_list_analytics(
        search=search,
        is_active=is_active,
        start_date=start,
        end_date=end,
    )
    
    return analytics
