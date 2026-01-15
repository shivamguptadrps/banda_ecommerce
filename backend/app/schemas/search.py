"""
Search Schemas
Pydantic models for search request/response validation
"""

from typing import Optional, List, Dict, Any
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.product import ProductPublicResponse


class SearchSuggestion(BaseModel):
    """Search suggestion response."""
    id: str
    name: str
    slug: str
    category: Optional[str] = None
    vendor: Optional[str] = None
    min_price: Optional[float] = None
    primary_image: Optional[str] = None
    
    model_config = {"from_attributes": True}


class SearchSuggestionsResponse(BaseModel):
    """Response for search suggestions."""
    suggestions: List[SearchSuggestion]


class SearchRequest(BaseModel):
    """Search request parameters."""
    query: str = Field(..., min_length=2, description="Search query")
    category_id: Optional[str] = Field(None, description="Filter by category")
    vendor_id: Optional[str] = Field(None, description="Filter by vendor")
    min_price: Optional[Decimal] = Field(None, ge=0, description="Minimum price")
    max_price: Optional[Decimal] = Field(None, ge=0, description="Maximum price")
    in_stock_only: bool = Field(False, description="Show only in-stock products")
    sort_by: str = Field("relevance", description="Sort option: relevance, price_asc, price_desc, newest, rating")
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")

