"""
Public Product Routes
Product browsing for buyers
"""

import math
from decimal import Decimal
from typing import Optional
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.product import (
    ProductPublicResponse,
    ProductListResponse,
    ProductCard,
    SellUnitResponse,
    ProductImageResponse,
    InventoryResponse,
)
from app.schemas.attribute import ProductAttributeValueWithDetails
from app.services.product_service import ProductService
from app.api.deps import DbSession
from app.models.enums import AttributeType


router = APIRouter()


def product_to_public_response(product) -> ProductPublicResponse:
    """Convert product to public response with vendor info and attribute values."""
    # Format attribute values
    attribute_values = []
    if product.attribute_values:
        for attr_value in product.attribute_values:
            attr = attr_value.attribute
            if not attr or not attr.is_active or not attr.show_in_details:
                continue
            
            # Format display value
            display_value = attr_value.value
            if attr.attribute_type == AttributeType.NUMBER and attr.unit:
                display_value = f"{attr_value.value} {attr.unit}"
            elif attr.attribute_type == AttributeType.BOOLEAN:
                display_value = "Yes" if attr_value.value.lower() in ("true", "1", "yes") else "No"
            elif attr.attribute_type == AttributeType.MULTI_SELECT and attr_value.value_json:
                display_value = ", ".join(attr_value.value_json)
            
            attribute_values.append(ProductAttributeValueWithDetails(
                id=attr_value.id,
                attribute_id=attr.id,
                attribute_name=attr.name,
                attribute_slug=attr.slug,
                attribute_type=attr.attribute_type,
                value=attr_value.value,
                value_display=display_value,
                unit=attr.unit,
                segment_id=attr.segment_id,
                segment_name=attr.segment.name if attr.segment else None,
            ))
    
    return ProductPublicResponse(
        id=product.id,
        vendor_id=product.vendor_id,
        category_id=product.category_id,
        name=product.name,
        slug=product.slug,
        description=product.description,
        stock_unit=product.stock_unit,
        primary_image=product.primary_image,
        min_price=product.min_price,
        max_price=product.max_price,
        is_in_stock=product.is_in_stock,
        images=[ProductImageResponse.model_validate(img) for img in product.images],
        sell_units=[SellUnitResponse.model_validate(su) for su in product.sell_units if su.is_active],
        inventory=InventoryResponse.model_validate(product.inventory) if product.inventory else None,
        attribute_values=attribute_values,
        vendor_name=product.vendor.shop_name if product.vendor else None,
        vendor_rating=product.vendor.rating if product.vendor else None,
    )


# ============== Product Browsing ==============

@router.get(
    "/",
    response_model=ProductListResponse,
    summary="Browse products",
    description="Browse all available products with filters.",
)
def browse_products(
    db: DbSession,
    category_id: Optional[str] = Query(None, description="Filter by category"),
    vendor_id: Optional[str] = Query(None, description="Filter by vendor"),
    search: Optional[str] = Query(None, description="Search in name/description"),
    min_price: Optional[Decimal] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[Decimal] = Query(None, ge=0, description="Maximum price"),
    in_stock_only: bool = Query(False, description="Show only in-stock products"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """
    Browse products with filtering.
    
    - Only shows active products from verified vendors
    - Can filter by category, vendor, price range
    - Can search in product name and description
    """
    product_service = ProductService(db)
    
    # Parse UUIDs
    cat_uuid = None
    if category_id:
        try:
            cat_uuid = uuid_lib.UUID(category_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category ID",
            )
    
    vendor_uuid = None
    if vendor_id:
        try:
            vendor_uuid = uuid_lib.UUID(vendor_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid vendor ID",
            )
    
    products, total = product_service.browse_products(
        category_id=cat_uuid,
        vendor_id=vendor_uuid,
        search=search,
        min_price=min_price,
        max_price=max_price,
        in_stock_only=in_stock_only,
        page=page,
        size=size,
    )
    
    return ProductListResponse(
        items=[product_to_public_response(p) for p in products],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get(
    "/search",
    response_model=ProductListResponse,
    summary="Search products",
    description="Search products by keyword.",
)
def search_products(
    db: DbSession,
    q: str = Query(..., min_length=2, description="Search query"),
    category_id: Optional[str] = Query(None),
    in_stock_only: bool = Query(False),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """Search products by keyword."""
    product_service = ProductService(db)
    
    cat_uuid = None
    if category_id:
        try:
            cat_uuid = uuid_lib.UUID(category_id)
        except ValueError:
            pass
    
    products, total = product_service.browse_products(
        search=q,
        category_id=cat_uuid,
        in_stock_only=in_stock_only,
        page=page,
        size=size,
    )
    
    return ProductListResponse(
        items=[product_to_public_response(p) for p in products],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get(
    "/search/suggestions",
    summary="Get search suggestions",
    description="Get autocomplete suggestions for product search.",
)
def get_search_suggestions(
    db: DbSession,
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(10, ge=1, le=20, description="Maximum number of suggestions"),
):
    """
    Get search suggestions for autocomplete.
    
    Returns product names, categories, and basic info for search suggestions.
    """
    product_service = ProductService(db)
    suggestions = product_service.search_suggestions(query=q, limit=limit)
    
    return {"suggestions": suggestions}


@router.get(
    "/category/{category_id}",
    response_model=ProductListResponse,
    summary="Products by category",
    description="Get products in a category.",
)
def get_products_by_category(
    category_id: str,
    db: DbSession,
    in_stock_only: bool = Query(False),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """Get products by category."""
    try:
        cat_uuid = uuid_lib.UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID",
        )
    
    product_service = ProductService(db)
    
    products, total = product_service.browse_products(
        category_id=cat_uuid,
        in_stock_only=in_stock_only,
        page=page,
        size=size,
    )
    
    return ProductListResponse(
        items=[product_to_public_response(p) for p in products],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get(
    "/vendor/{vendor_id}",
    response_model=ProductListResponse,
    summary="Products by vendor",
    description="Get products from a vendor.",
)
def get_products_by_vendor(
    vendor_id: str,
    db: DbSession,
    category_id: Optional[str] = Query(None),
    in_stock_only: bool = Query(False),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """Get products by vendor."""
    try:
        vendor_uuid = uuid_lib.UUID(vendor_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vendor ID",
        )
    
    cat_uuid = None
    if category_id:
        try:
            cat_uuid = uuid_lib.UUID(category_id)
        except ValueError:
            pass
    
    product_service = ProductService(db)
    
    products, total = product_service.browse_products(
        vendor_id=vendor_uuid,
        category_id=cat_uuid,
        in_stock_only=in_stock_only,
        page=page,
        size=size,
    )
    
    return ProductListResponse(
        items=[product_to_public_response(p) for p in products],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


# IMPORTANT: /slug/{slug} must come BEFORE /{product_id} to avoid route conflicts
@router.get(
    "/slug/{slug}",
    response_model=ProductPublicResponse,
    summary="Get product by slug",
    description="Get product details by slug.",
)
def get_product_by_slug(
    slug: str,
    db: DbSession,
):
    """Get product by slug."""
    product_service = ProductService(db)
    product = product_service.get_product_by_slug_public(slug)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    return product_to_public_response(product)


@router.get(
    "/{product_id}",
    response_model=ProductPublicResponse,
    summary="Get product details",
    description="Get detailed product information.",
)
def get_product(
    product_id: str,
    db: DbSession,
):
    """Get product details."""
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    product = product_service.get_product_by_id(product_uuid)
    
    if not product or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    # Check vendor is active
    if not product.vendor or not product.vendor.is_active or not product.vendor.is_verified:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    return product_to_public_response(product)


@router.get(
    "/{product_id}/sell-units",
    response_model=list[SellUnitResponse],
    summary="Get sell units",
    description="Get available pricing units for a product.",
)
def get_product_sell_units(
    product_id: str,
    db: DbSession,
):
    """Get product sell units."""
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    product = product_service.get_product_by_id(product_uuid)
    
    if not product or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    return [
        SellUnitResponse.model_validate(su)
        for su in product.sell_units
        if su.is_active
    ]

