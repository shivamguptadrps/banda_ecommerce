"""
Attribute Routes
API endpoints for category attribute management (Admin) and public access
"""

import math
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import DbSession, AdminUser, CurrentUser
from app.services.attribute_service import AttributeService
from app.services.segment_service import SegmentService
from app.models.attribute import CategoryAttribute
from app.schemas.attribute import (
    CategoryAttributeCreate,
    CategoryAttributeUpdate,
    CategoryAttributeResponse,
    CategoryAttributeListResponse,
    ProductAttributeValueCreate,
    ProductAttributeValueResponse,
    CategoryFilterOptions,
    AttributeSegmentCreate,
    AttributeSegmentUpdate,
    AttributeSegmentResponse,
    AttributeSegmentListResponse,
    AttributeSegmentWithAttributes,
)
from app.schemas.user import MessageResponse


router = APIRouter()


# ============== Admin: Category Attribute Management ==============

@router.post(
    "/categories/{category_id}/attributes",
    response_model=CategoryAttributeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create category attribute",
    description="Create a new attribute for a category. Admin only.",
)
def create_category_attribute(
    category_id: str,
    data: CategoryAttributeCreate,
    current_user: AdminUser,
    db: DbSession,
):
    """Create a new attribute for a category."""
    try:
        category_uuid = uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID",
        )
    
    # Ensure category_id in path matches body
    if data.category_id != category_uuid:
        data.category_id = category_uuid
    
    attr_service = AttributeService(db)
    
    try:
        attribute = attr_service.create_attribute(data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    return CategoryAttributeResponse(
        id=attribute.id,
        category_id=attribute.category_id,
        segment_id=attribute.segment_id,
        name=attribute.name,
        slug=attribute.slug,
        description=attribute.description,
        attribute_type=attribute.attribute_type,
        options=attribute.options,
        unit=attribute.unit,
        is_required=attribute.is_required,
        is_inherited=attribute.is_inherited,
        is_filterable=attribute.is_filterable,
        is_searchable=attribute.is_searchable,
        display_order=attribute.display_order,
        show_in_listing=attribute.show_in_listing,
        show_in_details=attribute.show_in_details,
        is_active=attribute.is_active,
        created_at=attribute.created_at,
        updated_at=attribute.updated_at,
        category_name=attribute.category.name if attribute.category else None,
        segment_name=attribute.segment.name if attribute.segment else None,
        is_own=True,
    )


@router.get(
    "/categories/{category_id}/attributes",
    response_model=CategoryAttributeListResponse,
    summary="Get category attributes",
    description="Get all attributes for a category including inherited ones. Admin only.",
)
def get_category_attributes(
    category_id: str,
    current_user: AdminUser,
    db: DbSession,
    include_inactive: bool = Query(False),
    own_only: bool = Query(False, description="Only return attributes directly on this category"),
):
    """Get attributes for a category."""
    try:
        category_uuid = uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID",
        )
    
    attr_service = AttributeService(db)
    
    if own_only:
        attributes = attr_service.get_category_own_attributes(category_uuid, include_inactive)
        items = [
            CategoryAttributeResponse(
                id=attr.id,
                category_id=attr.category_id,
                segment_id=attr.segment_id,
                name=attr.name,
                slug=attr.slug,
                description=attr.description,
                attribute_type=attr.attribute_type,
                options=attr.options,
                unit=attr.unit,
                is_required=attr.is_required,
                is_inherited=attr.is_inherited,
                is_filterable=attr.is_filterable,
                is_searchable=attr.is_searchable,
                display_order=attr.display_order,
                show_in_listing=attr.show_in_listing,
                show_in_details=attr.show_in_details,
                is_active=attr.is_active,
                created_at=attr.created_at,
                updated_at=attr.updated_at,
                category_name=attr.category.name if attr.category else None,
                segment_name=attr.segment.name if attr.segment else None,
                is_own=True,
            )
            for attr in attributes
        ]
    else:
        items = attr_service.get_attributes_for_product_form(category_uuid)
    
    return CategoryAttributeListResponse(items=items, total=len(items))


@router.get(
    "/attributes/{attribute_id}",
    response_model=CategoryAttributeResponse,
    summary="Get attribute by ID",
    description="Get a single attribute by its ID. Admin only.",
)
def get_attribute(
    attribute_id: str,
    current_user: AdminUser,
    db: DbSession,
):
    """Get attribute by ID."""
    try:
        attr_uuid = uuid.UUID(attribute_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid attribute ID",
        )
    
    attr_service = AttributeService(db)
    attribute = attr_service.get_attribute_by_id(attr_uuid)
    
    if not attribute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attribute not found",
        )
    
    return CategoryAttributeResponse(
        id=attribute.id,
        category_id=attribute.category_id,
        segment_id=attribute.segment_id,
        name=attribute.name,
        slug=attribute.slug,
        description=attribute.description,
        attribute_type=attribute.attribute_type,
        options=attribute.options,
        unit=attribute.unit,
        is_required=attribute.is_required,
        is_inherited=attribute.is_inherited,
        is_filterable=attribute.is_filterable,
        is_searchable=attribute.is_searchable,
        display_order=attribute.display_order,
        show_in_listing=attribute.show_in_listing,
        show_in_details=attribute.show_in_details,
        is_active=attribute.is_active,
        created_at=attribute.created_at,
        updated_at=attribute.updated_at,
        category_name=attribute.category.name if attribute.category else None,
        segment_name=attribute.segment.name if attribute.segment else None,
        is_own=True,
    )


@router.put(
    "/attributes/{attribute_id}",
    response_model=CategoryAttributeResponse,
    summary="Update attribute",
    description="Update a category attribute. Admin only.",
)
def update_attribute(
    attribute_id: str,
    data: CategoryAttributeUpdate,
    current_user: AdminUser,
    db: DbSession,
):
    """Update an attribute."""
    try:
        attr_uuid = uuid.UUID(attribute_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid attribute ID",
        )
    
    attr_service = AttributeService(db)
    
    try:
        attribute = attr_service.update_attribute(attr_uuid, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    if not attribute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attribute not found",
        )
    
    return CategoryAttributeResponse(
        id=attribute.id,
        category_id=attribute.category_id,
        segment_id=attribute.segment_id,
        name=attribute.name,
        slug=attribute.slug,
        description=attribute.description,
        attribute_type=attribute.attribute_type,
        options=attribute.options,
        unit=attribute.unit,
        is_required=attribute.is_required,
        is_inherited=attribute.is_inherited,
        is_filterable=attribute.is_filterable,
        is_searchable=attribute.is_searchable,
        display_order=attribute.display_order,
        show_in_listing=attribute.show_in_listing,
        show_in_details=attribute.show_in_details,
        is_active=attribute.is_active,
        created_at=attribute.created_at,
        updated_at=attribute.updated_at,
        category_name=attribute.category.name if attribute.category else None,
        segment_name=attribute.segment.name if attribute.segment else None,
        is_own=True,
    )


# ============== Admin: Attribute Segment Management ==============

@router.post(
    "/categories/{category_id}/segments",
    response_model=AttributeSegmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create attribute segment",
    description="Create a new attribute segment for a category. Admin only.",
)
def create_segment(
    category_id: str,
    data: AttributeSegmentCreate,
    current_user: AdminUser,
    db: DbSession,
):
    """Create a new attribute segment."""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[CREATE_SEGMENT] Starting segment creation")
    logger.info(f"  Category ID: {category_id}")
    logger.info(f"  Request data: {data}")
    logger.info(f"  Current user: {current_user.id}")
    
    try:
        category_uuid = uuid.UUID(category_id)
        logger.info(f"  Parsed category UUID: {category_uuid}")
    except ValueError as e:
        logger.error(f"  Invalid category ID format: {category_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID",
        )
    
    # Ensure category_id in path matches body - use path parameter as source of truth
    # Create a new instance with the correct category_id
    # Pydantic will handle defaults automatically, so we can use data directly
    try:
        # Normalize description: empty string or whitespace -> None
        description = None
        if data.description:
            desc_stripped = data.description.strip()
            description = desc_stripped if desc_stripped else None
        
        # Use Pydantic's model_dump to get all fields with defaults, then override category_id
        segment_dict = data.model_dump(exclude={'category_id'})
        segment_dict['category_id'] = category_uuid
        if description is not None:
            segment_dict['description'] = description
        
        segment_data = AttributeSegmentCreate(**segment_dict)
        logger.info(f"  Created segment_data: {segment_data}")
    except Exception as e:
        logger.error(f"  Error creating segment_data: {e}")
        import traceback
        logger.error(f"  Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid segment data: {str(e)}",
        )
    
    segment_service = SegmentService(db)
    
    try:
        logger.info(f"  Calling segment_service.create_segment()")
        segment = segment_service.create_segment(segment_data)
        logger.info(f"  Segment created successfully: {segment.id}")
    except ValueError as e:
        logger.error(f"  ValueError from service: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        # Log the full error for debugging
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"  [ERROR] Exception creating segment: {type(e).__name__}: {e}")
        logger.error(f"  [ERROR] Traceback:\n{error_trace}")
        logger.error(f"  [ERROR] Request data: category_id={category_id}, data={data}")
        logger.error(f"  [ERROR] Segment data: {segment_data}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create segment: {str(e)}",
        )
    
    # Get attribute count
    from sqlalchemy import func
    attr_count = db.query(func.count(CategoryAttribute.id)).filter(
        CategoryAttribute.segment_id == segment.id,
        CategoryAttribute.is_active == True
    ).scalar() or 0
    
    return AttributeSegmentResponse(
        id=segment.id,
        category_id=segment.category_id,
        name=segment.name,
        description=segment.description,
        icon=segment.icon,
        display_order=segment.display_order,
        is_collapsible=segment.is_collapsible,
        is_active=segment.is_active,
        created_at=segment.created_at,
        updated_at=segment.updated_at,
        attribute_count=attr_count,
    )


@router.get(
    "/categories/{category_id}/segments",
    response_model=AttributeSegmentListResponse,
    summary="Get category segments",
    description="Get all segments for a category. Admin only.",
)
def get_category_segments(
    category_id: str,
    current_user: AdminUser,
    db: DbSession,
    include_inactive: bool = Query(False),
    with_attributes: bool = Query(False, description="Include attributes in response"),
):
    """Get segments for a category."""
    try:
        category_uuid = uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID",
        )
    
    segment_service = SegmentService(db)
    
    if with_attributes:
        segments = segment_service.get_segments_with_attributes(category_uuid, include_inactive)
        items = [
            AttributeSegmentResponse(
                id=seg.id,
                category_id=seg.category_id,
                name=seg.name,
                description=seg.description,
                icon=seg.icon,
                display_order=seg.display_order,
                is_collapsible=seg.is_collapsible,
                is_active=seg.is_active,
                created_at=seg.created_at,
                updated_at=seg.updated_at,
                attribute_count=seg.attribute_count,
            )
            for seg in segments
        ]
    else:
        segments = segment_service.get_segments_by_category(category_uuid, include_inactive)
        items = []
        for segment in segments:
            from sqlalchemy import func
            attr_count = db.query(func.count(CategoryAttribute.id)).filter(
                CategoryAttribute.segment_id == segment.id,
                CategoryAttribute.is_active == True
            ).scalar() or 0
            
            items.append(AttributeSegmentResponse(
                id=segment.id,
                category_id=segment.category_id,
                name=segment.name,
                description=segment.description,
                icon=segment.icon,
                display_order=segment.display_order,
                is_collapsible=segment.is_collapsible,
                is_active=segment.is_active,
                created_at=segment.created_at,
                updated_at=segment.updated_at,
                attribute_count=attr_count,
            ))
    
    return AttributeSegmentListResponse(items=items, total=len(items))


@router.get(
    "/segments/{segment_id}",
    response_model=AttributeSegmentWithAttributes,
    summary="Get segment by ID",
    description="Get a single segment with its attributes. Admin only.",
)
def get_segment(
    segment_id: str,
    current_user: AdminUser,
    db: DbSession,
):
    """Get segment by ID."""
    try:
        seg_uuid = uuid.UUID(segment_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid segment ID",
        )
    
    segment_service = SegmentService(db)
    segment = segment_service.get_segment_by_id(seg_uuid)
    
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Segment not found",
        )
    
    # Get attributes
    attributes = db.query(CategoryAttribute).filter(
        CategoryAttribute.segment_id == seg_uuid,
        CategoryAttribute.is_active == True
    ).order_by(CategoryAttribute.display_order).all()
    
    return AttributeSegmentWithAttributes(
        id=segment.id,
        category_id=segment.category_id,
        name=segment.name,
        description=segment.description,
        icon=segment.icon,
        display_order=segment.display_order,
        is_collapsible=segment.is_collapsible,
        is_active=segment.is_active,
        created_at=segment.created_at,
        updated_at=segment.updated_at,
        attribute_count=len(attributes),
        attributes=[
            CategoryAttributeResponse(
                id=attr.id,
                category_id=attr.category_id,
                segment_id=attr.segment_id,
                name=attr.name,
                slug=attr.slug,
                description=attr.description,
                attribute_type=attr.attribute_type,
                options=attr.options,
                unit=attr.unit,
                is_required=attr.is_required,
                is_inherited=attr.is_inherited,
                is_filterable=attr.is_filterable,
                is_searchable=attr.is_searchable,
                display_order=attr.display_order,
                show_in_listing=attr.show_in_listing,
                show_in_details=attr.show_in_details,
                is_active=attr.is_active,
                created_at=attr.created_at,
                updated_at=attr.updated_at,
                segment_name=segment.name,
            )
            for attr in attributes
        ],
    )


@router.put(
    "/segments/{segment_id}",
    response_model=AttributeSegmentResponse,
    summary="Update segment",
    description="Update an attribute segment. Admin only.",
)
def update_segment(
    segment_id: str,
    data: AttributeSegmentUpdate,
    current_user: AdminUser,
    db: DbSession,
):
    """Update a segment."""
    try:
        seg_uuid = uuid.UUID(segment_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid segment ID",
        )
    
    segment_service = SegmentService(db)
    
    try:
        segment = segment_service.update_segment(seg_uuid, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Segment not found",
        )
    
    from sqlalchemy import func
    attr_count = db.query(func.count(CategoryAttribute.id)).filter(
        CategoryAttribute.segment_id == seg_uuid,
        CategoryAttribute.is_active == True
    ).scalar() or 0
    
    return AttributeSegmentResponse(
        id=segment.id,
        category_id=segment.category_id,
        name=segment.name,
        description=segment.description,
        icon=segment.icon,
        display_order=segment.display_order,
        is_collapsible=segment.is_collapsible,
        is_active=segment.is_active,
        created_at=segment.created_at,
        updated_at=segment.updated_at,
        attribute_count=attr_count,
    )


@router.delete(
    "/segments/{segment_id}",
    response_model=MessageResponse,
    summary="Delete segment",
    description="Soft delete an attribute segment. Admin only.",
)
def delete_segment(
    segment_id: str,
    current_user: AdminUser,
    db: DbSession,
):
    """Delete a segment."""
    try:
        seg_uuid = uuid.UUID(segment_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid segment ID",
        )
    
    segment_service = SegmentService(db)
    success = segment_service.delete_segment(seg_uuid)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Segment not found",
        )
    
    return MessageResponse(message="Segment deleted successfully")


@router.post(
    "/categories/{category_id}/segments/reorder",
    response_model=MessageResponse,
    summary="Reorder segments",
    description="Reorder segments for a category. Admin only.",
)
def reorder_segments(
    category_id: str,
    segment_orders: List[dict],
    current_user: AdminUser,
    db: DbSession,
):
    """Reorder segments."""
    try:
        category_uuid = uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID",
        )
    
    segment_service = SegmentService(db)
    success = segment_service.reorder_segments(category_uuid, segment_orders)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reorder segments",
        )
    
    return MessageResponse(message="Segments reordered successfully")


@router.delete(
    "/attributes/{attribute_id}",
    response_model=MessageResponse,
    summary="Delete attribute",
    description="Soft delete an attribute. Admin only.",
)
def delete_attribute(
    attribute_id: str,
    current_user: AdminUser,
    db: DbSession,
    hard_delete: bool = Query(False, description="Permanently delete instead of soft delete"),
):
    """Delete an attribute."""
    try:
        attr_uuid = uuid.UUID(attribute_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid attribute ID",
        )
    
    attr_service = AttributeService(db)
    
    if hard_delete:
        success = attr_service.hard_delete_attribute(attr_uuid)
    else:
        success = attr_service.delete_attribute(attr_uuid)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attribute not found",
        )
    
    return MessageResponse(
        message="Attribute deleted successfully" if hard_delete else "Attribute deactivated successfully"
    )


# ============== Public: Filter Options ==============

@router.get(
    "/categories/{category_id}/filters",
    response_model=CategoryFilterOptions,
    summary="Get filter options",
    description="Get all available filter options for a category. Public.",
)
def get_category_filters(
    category_id: str,
    db: DbSession,
):
    """Get filter options for a category (for buyer filter sidebar)."""
    try:
        category_uuid = uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID",
        )
    
    attr_service = AttributeService(db)
    
    try:
        filters = attr_service.get_category_filter_options(category_uuid)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    
    return filters


