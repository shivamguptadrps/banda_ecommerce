"""
Attribute Schemas
Pydantic models for category attributes, attribute segments, and product attribute values
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, List, Any, Union

from pydantic import BaseModel, Field, field_validator

from app.models.enums import AttributeType


# ============== Attribute Segment Schemas ==============

class AttributeSegmentBase(BaseModel):
    """Base schema for attribute segments."""
    name: str = Field(..., min_length=1, max_length=100, description="Segment name")
    description: Optional[str] = Field(None, description="Segment description")
    icon: Optional[str] = Field(None, max_length=50, description="Icon name (e.g., 'ruler', 'display')")
    display_order: int = Field(default=0, description="Display order")
    is_collapsible: bool = Field(default=True, description="Can this segment be collapsed?")


class AttributeSegmentCreate(AttributeSegmentBase):
    """Schema for creating an attribute segment."""
    category_id: uuid.UUID = Field(..., description="Category this segment belongs to")


class AttributeSegmentUpdate(BaseModel):
    """Schema for updating an attribute segment."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=50)
    display_order: Optional[int] = None
    is_collapsible: Optional[bool] = None
    is_active: Optional[bool] = None


class AttributeSegmentResponse(AttributeSegmentBase):
    """Schema for attribute segment responses."""
    id: uuid.UUID
    category_id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Include attribute count
    attribute_count: Optional[int] = None  # Populated in service
    
    class Config:
        from_attributes = True


class AttributeSegmentListResponse(BaseModel):
    """Paginated list of attribute segments."""
    items: List[AttributeSegmentResponse]
    total: int


# ============== Category Attribute Schemas ==============

class CategoryAttributeBase(BaseModel):
    """Base schema for category attributes."""
    name: str = Field(..., min_length=1, max_length=100, description="Attribute name")
    description: Optional[str] = Field(None, description="Attribute description")
    attribute_type: AttributeType = Field(default=AttributeType.TEXT, description="Type of attribute")
    options: Optional[List[str]] = Field(None, description="Options for SELECT/MULTI_SELECT types")
    unit: Optional[str] = Field(None, max_length=20, description="Unit for NUMBER type (e.g., GB, mAh)")
    is_required: bool = Field(default=False, description="Is this attribute required?")
    is_inherited: bool = Field(default=True, description="Should child categories inherit this?")
    is_filterable: bool = Field(default=True, description="Show in filter sidebar?")
    is_searchable: bool = Field(default=False, description="Include in search?")
    display_order: int = Field(default=0, description="Display order")
    show_in_listing: bool = Field(default=False, description="Show in product listing cards?")
    show_in_details: bool = Field(default=True, description="Show in product details page?")
    
    @field_validator("options")
    @classmethod
    def validate_options(cls, v, info):
        """Validate options for SELECT types."""
        if v is not None:
            # Ensure options are unique
            if len(v) != len(set(v)):
                raise ValueError("Options must be unique")
        return v


class CategoryAttributeCreate(CategoryAttributeBase):
    """Schema for creating a category attribute."""
    category_id: uuid.UUID = Field(..., description="Category this attribute belongs to")
    segment_id: Optional[uuid.UUID] = Field(None, description="Segment this attribute belongs to")


class CategoryAttributeUpdate(BaseModel):
    """Schema for updating a category attribute."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    attribute_type: Optional[AttributeType] = None
    options: Optional[List[str]] = None
    unit: Optional[str] = None
    is_required: Optional[bool] = None
    is_inherited: Optional[bool] = None
    is_filterable: Optional[bool] = None
    is_searchable: Optional[bool] = None
    display_order: Optional[int] = None
    show_in_listing: Optional[bool] = None
    show_in_details: Optional[bool] = None
    is_active: Optional[bool] = None
    segment_id: Optional[uuid.UUID] = Field(None, description="Segment this attribute belongs to")


class CategoryAttributeResponse(CategoryAttributeBase):
    """Schema for category attribute responses."""
    id: uuid.UUID
    category_id: uuid.UUID
    slug: str
    segment_id: Optional[uuid.UUID] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Additional info
    category_name: Optional[str] = None  # Populated in service
    segment_name: Optional[str] = None  # Populated in service
    is_own: bool = True  # True if belongs to current category, False if inherited
    
    class Config:
        from_attributes = True


class CategoryAttributeListResponse(BaseModel):
    """Paginated list of category attributes."""
    items: List[CategoryAttributeResponse]
    total: int


# ============== Attribute Segment With Attributes (defined after CategoryAttributeResponse) ==============

class AttributeSegmentWithAttributes(AttributeSegmentResponse):
    """Segment with its attributes."""
    attributes: List[CategoryAttributeResponse] = Field(default_factory=list)
    
    class Config:
        from_attributes = True


# ============== Product Attribute Value Schemas ==============

class ProductAttributeValueBase(BaseModel):
    """Base schema for product attribute values."""
    attribute_id: uuid.UUID = Field(..., description="ID of the category attribute")
    value: str = Field(..., description="Value for the attribute")
    value_json: Optional[List[str]] = Field(None, description="JSON value for MULTI_SELECT")


class ProductAttributeValueCreate(ProductAttributeValueBase):
    """Schema for creating a product attribute value."""
    pass


class ProductAttributeValueUpdate(BaseModel):
    """Schema for updating a product attribute value."""
    value: Optional[str] = None
    value_json: Optional[List[str]] = None


class ProductAttributeValueResponse(ProductAttributeValueBase):
    """Schema for product attribute value responses."""
    id: uuid.UUID
    product_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Include attribute details for display
    attribute_name: Optional[str] = None
    attribute_type: Optional[AttributeType] = None
    attribute_unit: Optional[str] = None
    
    class Config:
        from_attributes = True


class ProductAttributeValueWithDetails(BaseModel):
    """Attribute value with full attribute details for product display."""
    id: uuid.UUID
    attribute_id: uuid.UUID
    attribute_name: str
    attribute_slug: str
    attribute_type: AttributeType
    value: str
    value_display: str  # Formatted value (e.g., "8 GB" instead of "8")
    unit: Optional[str] = None
    segment_id: Optional[uuid.UUID] = None  # Segment this attribute belongs to
    segment_name: Optional[str] = None  # Segment name for grouping
    
    class Config:
        from_attributes = True


# ============== Bulk Operations ==============

class BulkProductAttributeValues(BaseModel):
    """Schema for setting multiple attribute values at once."""
    product_id: uuid.UUID
    attributes: List[ProductAttributeValueCreate]


class AttributeFilter(BaseModel):
    """Schema for filtering products by attributes."""
    attribute_id: uuid.UUID
    values: List[str]  # Filter by these values (OR logic within, AND logic between attributes)


class AttributeFilterRequest(BaseModel):
    """Request schema for attribute-based product filtering."""
    category_id: uuid.UUID
    filters: List[AttributeFilter]
    
    
# ============== Aggregation for Filters ==============

class AttributeFilterOption(BaseModel):
    """An option in the filter with count."""
    value: str
    count: int  # Number of products with this value


class AttributeFilterGroup(BaseModel):
    """Group of filter options for an attribute."""
    attribute_id: uuid.UUID
    attribute_name: str
    attribute_slug: str
    attribute_type: AttributeType
    options: List[AttributeFilterOption]


class CategoryFilterOptions(BaseModel):
    """All available filter options for a category."""
    category_id: uuid.UUID
    category_name: str
    attributes: List[AttributeFilterGroup]
