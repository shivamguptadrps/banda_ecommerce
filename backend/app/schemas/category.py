"""
Category Schemas
Pydantic models for category request/response validation
"""

import uuid
import re
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, field_validator


# ============== Helper Functions ==============

def generate_slug(name: str) -> str:
    """Generate URL-friendly slug from name."""
    slug = name.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug


# ============== Request Schemas ==============

class CategoryCreate(BaseModel):
    """Schema for creating a category."""
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)
    parent_id: Optional[uuid.UUID] = None
    display_order: int = Field(default=0, ge=0)
    
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate and clean category name."""
        return v.strip()


class CategoryUpdate(BaseModel):
    """Schema for updating a category."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)
    parent_id: Optional[uuid.UUID] = None
    display_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


# ============== Response Schemas ==============

class CategoryResponse(BaseModel):
    """Schema for category response."""
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class CategoryTreeNode(BaseModel):
    """Schema for category tree node with children."""
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    display_order: int
    is_active: bool
    children: List["CategoryTreeNode"] = []
    
    model_config = {"from_attributes": True}


class CategoryListResponse(BaseModel):
    """Schema for flat category list."""
    items: List[CategoryResponse]
    total: int


class CategoryTreeResponse(BaseModel):
    """Schema for category tree response."""
    items: List[CategoryTreeNode]
    total: int


# ============== Breadcrumb Schema ==============

class CategoryBreadcrumb(BaseModel):
    """Schema for category breadcrumb."""
    id: uuid.UUID
    name: str
    slug: str


class CategoryWithBreadcrumb(CategoryResponse):
    """Category with breadcrumb trail."""
    breadcrumb: List[CategoryBreadcrumb] = []

