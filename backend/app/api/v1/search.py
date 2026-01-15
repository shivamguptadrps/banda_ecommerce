"""
Search API Routes
Enhanced search functionality with full-text search
"""

import math
import uuid as uuid_lib
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.api.deps import DbSession
from app.schemas.product import ProductListResponse, ProductPublicResponse
from app.schemas.search import SearchSuggestionsResponse, SearchSuggestion
from app.services.search_service import SearchService
from app.api.v1.product import product_to_public_response

router = APIRouter()


@router.get(
    "",
    response_model=ProductListResponse,
    summary="Search products",
    description="Enhanced product search with full-text search, filters, and sorting.",
)
def search_products(
    db: DbSession,
    q: str = Query(..., min_length=2, description="Search query"),
    category_id: Optional[str] = Query(None, description="Filter by category"),
    vendor_id: Optional[str] = Query(None, description="Filter by vendor"),
    min_price: Optional[Decimal] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[Decimal] = Query(None, ge=0, description="Maximum price"),
    in_stock_only: bool = Query(False, description="Show only in-stock products"),
    sort_by: str = Query("relevance", description="Sort: relevance, price_asc, price_desc, newest, rating"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """
    Search products with enhanced full-text search.
    
    - Supports multi-field search (name, description, category, vendor)
    - Multiple sorting options
    - Price and stock filters
    - Category and vendor filters
    """
    search_service = SearchService(db)
    
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
    
    # Validate sort_by
    valid_sorts = ["relevance", "price_asc", "price_desc", "newest", "rating"]
    if sort_by not in valid_sorts:
        sort_by = "relevance"
    
    products, total = search_service.search_products(
        query=q,
        category_id=cat_uuid,
        vendor_id=vendor_uuid,
        min_price=min_price,
        max_price=max_price,
        in_stock_only=in_stock_only,
        sort_by=sort_by,
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
    "/suggestions",
    response_model=SearchSuggestionsResponse,
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
    search_service = SearchService(db)
    suggestions = search_service.get_search_suggestions(query=q, limit=limit)
    
    return SearchSuggestionsResponse(suggestions=suggestions)

