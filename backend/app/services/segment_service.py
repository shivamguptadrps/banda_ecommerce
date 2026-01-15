"""
Attribute Segment Service
Business logic for attribute segment management
"""

import uuid
from typing import Optional, List

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.category import Category
from app.models.attribute_segment import AttributeSegment
from app.models.attribute import CategoryAttribute
from app.schemas.attribute import (
    AttributeSegmentCreate,
    AttributeSegmentUpdate,
    AttributeSegmentResponse,
    AttributeSegmentWithAttributes,
)


class SegmentService:
    """Service class for attribute segment operations."""
    
    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
    
    # ============== Segment CRUD ==============
    
    def create_segment(self, data: AttributeSegmentCreate) -> AttributeSegment:
        """
        Create a new attribute segment.
        
        Args:
            data: Segment creation data
            
        Returns:
            Created segment
            
        Raises:
            ValueError: If category doesn't exist
        """
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"[SegmentService.create_segment] Starting")
        logger.info(f"  Category ID: {data.category_id}")
        logger.info(f"  Name: {data.name}")
        
        # Validate category exists
        category = self.db.query(Category).filter(Category.id == data.category_id).first()
        if not category:
            logger.error(f"  Category not found: {data.category_id}")
            raise ValueError("Category not found")
        
        logger.info(f"  Category found: {category.name} (id: {category.id})")
        
        try:
            segment = AttributeSegment(
                category_id=data.category_id,
                name=data.name,
                description=data.description,
                icon=data.icon,
                display_order=data.display_order,
                is_collapsible=data.is_collapsible,
            )
            logger.info(f"  Created segment object: {segment}")
            
            self.db.add(segment)
            logger.info(f"  Added segment to session")
            
            self.db.commit()
            logger.info(f"  Committed to database")
            
            self.db.refresh(segment)
            logger.info(f"  Refreshed segment, ID: {segment.id}")
            
            return segment
        except Exception as e:
            logger.error(f"  [ERROR] Exception in create_segment: {type(e).__name__}: {e}")
            import traceback
            logger.error(f"  [ERROR] Traceback:\n{traceback.format_exc()}")
            self.db.rollback()
            raise
    
    def get_segment_by_id(self, segment_id: uuid.UUID) -> Optional[AttributeSegment]:
        """
        Get segment by ID.
        
        Args:
            segment_id: Segment UUID
            
        Returns:
            Segment or None if not found
        """
        return self.db.query(AttributeSegment).filter(
            AttributeSegment.id == segment_id,
            AttributeSegment.is_active == True
        ).first()
    
    def get_segments_by_category(
        self,
        category_id: uuid.UUID,
        include_inactive: bool = False
    ) -> List[AttributeSegment]:
        """
        Get all segments for a category.
        
        Args:
            category_id: Category UUID
            include_inactive: Include inactive segments
            
        Returns:
            List of segments ordered by display_order
        """
        query = self.db.query(AttributeSegment).filter(
            AttributeSegment.category_id == category_id
        )
        
        if not include_inactive:
            query = query.filter(AttributeSegment.is_active == True)
        
        return query.order_by(AttributeSegment.display_order).all()
    
    def get_segments_with_attributes(
        self,
        category_id: uuid.UUID,
        include_inactive: bool = False
    ) -> List[AttributeSegmentWithAttributes]:
        """
        Get all segments with their attributes for a category.
        
        Args:
            category_id: Category UUID
            include_inactive: Include inactive segments
            
        Returns:
            List of segments with attributes
        """
        segments = self.get_segments_by_category(category_id, include_inactive)
        
        result = []
        for segment in segments:
            # Get attributes for this segment
            attributes_query = self.db.query(CategoryAttribute).filter(
                CategoryAttribute.segment_id == segment.id,
                CategoryAttribute.is_active == True
            ).order_by(CategoryAttribute.display_order)
            
            attributes = attributes_query.all()
            
            # Build response
            segment_data = AttributeSegmentWithAttributes(
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
                ]
            )
            result.append(segment_data)
        
        return result
    
    def update_segment(
        self,
        segment_id: uuid.UUID,
        data: AttributeSegmentUpdate
    ) -> Optional[AttributeSegment]:
        """
        Update a segment.
        
        Args:
            segment_id: Segment UUID
            data: Update data
            
        Returns:
            Updated segment or None if not found
        """
        segment = self.get_segment_by_id(segment_id)
        if not segment:
            return None
        
        # Update fields
        if data.name is not None:
            segment.name = data.name
        if data.description is not None:
            segment.description = data.description
        if data.icon is not None:
            segment.icon = data.icon
        if data.display_order is not None:
            segment.display_order = data.display_order
        if data.is_collapsible is not None:
            segment.is_collapsible = data.is_collapsible
        if data.is_active is not None:
            segment.is_active = data.is_active
        
        self.db.commit()
        self.db.refresh(segment)
        
        return segment
    
    def delete_segment(self, segment_id: uuid.UUID) -> bool:
        """
        Soft delete a segment (set is_active=False).
        Also unassigns all attributes from this segment.
        
        Args:
            segment_id: Segment UUID
            
        Returns:
            True if deleted, False if not found
        """
        segment = self.get_segment_by_id(segment_id)
        if not segment:
            return False
        
        # Unassign all attributes from this segment
        self.db.query(CategoryAttribute).filter(
            CategoryAttribute.segment_id == segment_id
        ).update({"segment_id": None})
        
        # Soft delete segment
        segment.is_active = False
        
        self.db.commit()
        
        return True
    
    def reorder_segments(
        self,
        category_id: uuid.UUID,
        segment_orders: List[dict]
    ) -> bool:
        """
        Reorder segments for a category.
        
        Args:
            category_id: Category UUID
            segment_orders: List of {segment_id: UUID, display_order: int}
            
        Returns:
            True if successful
        """
        for item in segment_orders:
            segment_id = uuid.UUID(item["segment_id"])
            display_order = item["display_order"]
            
            self.db.query(AttributeSegment).filter(
                AttributeSegment.id == segment_id,
                AttributeSegment.category_id == category_id
            ).update({"display_order": display_order})
        
        self.db.commit()
        
        return True

