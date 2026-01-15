"""
Category Routes
Public category browsing and admin category management
"""

from typing import Optional, List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryTreeNode,
    CategoryListResponse,
    CategoryTreeResponse,
    CategoryWithBreadcrumb,
)
from app.schemas.attribute import CategoryAttributeListResponse, CategoryAttributeResponse
from app.schemas.user import MessageResponse
from app.services.category_service import CategoryService
from app.services.attribute_service import AttributeService
from app.api.deps import DbSession, AdminUser


router = APIRouter()


# ============== Public Category APIs ==============

@router.get(
    "/",
    response_model=CategoryListResponse,
    summary="List all categories",
    description="Get flat list of all active categories.",
)
def list_categories(db: DbSession):
    """Get all active categories."""
    category_service = CategoryService(db)
    categories = category_service.get_all_categories(include_inactive=False)
    
    return CategoryListResponse(
        items=[CategoryResponse.model_validate(c) for c in categories],
        total=len(categories),
    )


@router.get(
    "/tree",
    response_model=CategoryTreeResponse,
    summary="Get category tree",
    description="Get hierarchical category tree structure.",
)
def get_category_tree(db: DbSession):
    """Get category tree structure."""
    category_service = CategoryService(db)
    tree = category_service.get_category_tree(include_inactive=False)
    
    # Count total categories
    def count_nodes(nodes):
        total = len(nodes)
        for node in nodes:
            total += count_nodes(node.get("children", []))
        return total
    
    return CategoryTreeResponse(
        items=[CategoryTreeNode.model_validate(node) for node in tree],
        total=count_nodes(tree),
    )


@router.get(
    "/root",
    response_model=List[CategoryResponse],
    summary="Get root categories",
    description="Get top-level categories (no parent).",
)
def get_root_categories(db: DbSession):
    """Get root categories."""
    category_service = CategoryService(db)
    categories = category_service.get_root_categories(include_inactive=False)
    
    return [CategoryResponse.model_validate(c) for c in categories]


@router.get(
    "/{category_id}",
    response_model=CategoryWithBreadcrumb,
    summary="Get category details",
    description="Get category details with breadcrumb trail.",
)
def get_category(
    category_id: str,
    db: DbSession,
):
    """Get category with breadcrumb."""
    try:
        category_uuid = uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID",
        )
    
    category_service = CategoryService(db)
    result = category_service.get_category_with_breadcrumb(category_uuid)
    
    if not result or not result["category"].is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    
    return CategoryWithBreadcrumb(
        **CategoryResponse.model_validate(result["category"]).model_dump(),
        breadcrumb=result["breadcrumb"],
    )


@router.get(
    "/slug/{slug}",
    response_model=CategoryWithBreadcrumb,
    summary="Get category by slug",
    description="Get category details by URL slug.",
)
def get_category_by_slug(
    slug: str,
    db: DbSession,
):
    """Get category by slug."""
    category_service = CategoryService(db)
    category = category_service.get_category_by_slug(slug)
    
    if not category or not category.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    
    result = category_service.get_category_with_breadcrumb(category.id)
    
    return CategoryWithBreadcrumb(
        **CategoryResponse.model_validate(result["category"]).model_dump(),
        breadcrumb=result["breadcrumb"],
    )


@router.get(
    "/{category_id}/children",
    response_model=List[CategoryResponse],
    summary="Get child categories",
    description="Get direct children of a category.",
)
def get_category_children(
    category_id: str,
    db: DbSession,
):
    """Get child categories."""
    try:
        category_uuid = uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID",
        )
    
    category_service = CategoryService(db)
    
    # Verify parent exists
    parent = category_service.get_category_by_id(category_uuid)
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    
    children = category_service.get_children(category_uuid, include_inactive=False)
    return [CategoryResponse.model_validate(c) for c in children]


@router.get(
    "/{category_id}/attributes",
    response_model=CategoryAttributeListResponse,
    summary="Get category attributes",
    description="Get all attributes for a category including inherited ones from parent categories. Public endpoint for vendors and product forms.",
)
def get_category_attributes(
    category_id: str,
    db: DbSession,
):
    """Get attributes for a category including inherited attributes from parents."""
    try:
        category_uuid = uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID",
        )
    
    # Verify category exists
    category_service = CategoryService(db)
    category = category_service.get_category_by_id(category_uuid)
    if not category or not category.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    
    attr_service = AttributeService(db)
    items = attr_service.get_attributes_for_product_form(category_uuid)
    
    return CategoryAttributeListResponse(items=items, total=len(items))

