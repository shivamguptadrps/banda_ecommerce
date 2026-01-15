"""
Product, SellUnit, and Inventory Schemas
Pydantic models for product management
"""

import uuid
import re
from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.enums import StockUnit
from app.schemas.attribute import ProductAttributeValueWithDetails


# ============== Sell Unit Schemas ==============

class SellUnitBase(BaseModel):
    """Base sell unit schema."""
    label: str = Field(..., min_length=1, max_length=50)
    unit_value: Decimal = Field(..., gt=0)
    price: Decimal = Field(..., gt=0)
    compare_price: Optional[Decimal] = Field(None, gt=0)


class SellUnitCreate(SellUnitBase):
    """Schema for creating a sell unit."""
    pass


class SellUnitUpdate(BaseModel):
    """Schema for updating a sell unit."""
    label: Optional[str] = Field(None, min_length=1, max_length=50)
    unit_value: Optional[Decimal] = Field(None, gt=0)
    price: Optional[Decimal] = Field(None, gt=0)
    compare_price: Optional[Decimal] = None
    is_active: Optional[bool] = None


class SellUnitResponse(SellUnitBase):
    """Schema for sell unit response."""
    id: uuid.UUID
    product_id: uuid.UUID
    is_active: bool
    discount_percent: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


# ============== Product Image Schemas ==============

class ProductImageCreate(BaseModel):
    """Schema for creating a product image."""
    image_url: str = Field(..., max_length=500)
    display_order: int = Field(default=0, ge=0)
    is_primary: bool = False


class ProductImageResponse(BaseModel):
    """Schema for product image response."""
    id: uuid.UUID
    product_id: uuid.UUID
    image_url: str
    display_order: int
    is_primary: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}


class ProductImageReorder(BaseModel):
    """Schema for reordering product images."""
    image_ids: List[uuid.UUID] = Field(..., min_length=1)


# ============== Inventory Schemas ==============

class InventoryCreate(BaseModel):
    """Schema for creating inventory."""
    available_quantity: Decimal = Field(..., ge=0)
    low_stock_threshold: Decimal = Field(default=Decimal("10"), ge=0)


class InventoryUpdate(BaseModel):
    """Schema for updating inventory."""
    available_quantity: Optional[Decimal] = Field(None, ge=0)
    low_stock_threshold: Optional[Decimal] = Field(None, ge=0)


class InventoryResponse(BaseModel):
    """Schema for inventory response."""
    id: uuid.UUID
    product_id: uuid.UUID
    available_quantity: Decimal
    reserved_quantity: Decimal
    low_stock_threshold: Decimal
    total_quantity: Decimal
    is_low_stock: bool
    is_out_of_stock: bool
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class StockAdjustment(BaseModel):
    """Schema for stock adjustment."""
    quantity: Decimal = Field(..., description="Positive to add, negative to subtract")
    reason: Optional[str] = Field(None, max_length=255)


# ============== Product Schemas ==============

class ProductBase(BaseModel):
    """Base product schema."""
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    stock_unit: StockUnit = StockUnit.PIECE
    category_id: Optional[uuid.UUID] = None


class ProductCreate(ProductBase):
    """Schema for creating a product."""
    initial_stock: Decimal = Field(default=Decimal("0"), ge=0)
    low_stock_threshold: Decimal = Field(default=Decimal("10"), ge=0)
    sell_units: List[SellUnitCreate] = Field(default=[], min_length=0)
    
    # Return Policy (Mandatory - vendor must set)
    return_eligible: bool = Field(..., description="Whether product is returnable (REQUIRED)")
    return_window_days: Optional[int] = Field(None, ge=1, le=365, description="Return window in days (required if return_eligible=True)")
    return_conditions: Optional[str] = Field(None, max_length=500, description="Optional return conditions/notes")
    
    @model_validator(mode='after')
    def validate_return_policy(self):
        """Validate return policy fields."""
        if self.return_eligible is None:
            raise ValueError("return_eligible is required and cannot be null")
        
        if self.return_eligible is True:
            if not self.return_window_days or self.return_window_days <= 0:
                raise ValueError("return_window_days is required and must be greater than 0 when return_eligible is True")
        else:
            # If not returnable, return_window_days should be None
            if self.return_window_days is not None:
                self.return_window_days = None
        
        return self
    
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return v.strip()


class ProductUpdate(BaseModel):
    """Schema for updating a product."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    stock_unit: Optional[StockUnit] = None
    category_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    """Schema for product response (vendor view)."""
    id: uuid.UUID
    vendor_id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    name: str
    slug: str
    description: Optional[str] = None
    stock_unit: StockUnit
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Computed fields
    primary_image: Optional[str] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    is_in_stock: bool = False
    
    # Related data
    images: List[ProductImageResponse] = []
    sell_units: List[SellUnitResponse] = []
    inventory: Optional[InventoryResponse] = None
    
    model_config = {"from_attributes": True}


class ProductPublicResponse(BaseModel):
    """Schema for public product response (buyer view)."""
    id: uuid.UUID
    vendor_id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    name: str
    slug: str
    description: Optional[str] = None
    stock_unit: StockUnit
    
    # Computed fields
    primary_image: Optional[str] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    is_in_stock: bool = False
    
    # Related data
    images: List[ProductImageResponse] = []
    sell_units: List[SellUnitResponse] = []
    inventory: Optional[InventoryResponse] = None
    attribute_values: Optional[List[ProductAttributeValueWithDetails]] = []
    
    # Vendor info (minimal)
    vendor_name: Optional[str] = None
    vendor_rating: Optional[Decimal] = None
    
    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    """Schema for paginated product list."""
    items: List[ProductPublicResponse]
    total: int
    page: int
    size: int
    pages: int


class ProductVendorListResponse(BaseModel):
    """Schema for vendor's product list."""
    items: List[ProductResponse]
    total: int
    page: int
    size: int
    pages: int


# ============== Product Card (Minimal) ==============

class ProductCard(BaseModel):
    """Minimal product info for listings."""
    id: uuid.UUID
    name: str
    slug: str
    primary_image: Optional[str] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    is_in_stock: bool = False
    vendor_name: Optional[str] = None
    
    model_config = {"from_attributes": True}


# ============== Filter Schemas ==============

class ProductFilters(BaseModel):
    """Schema for product filters."""
    category_id: Optional[uuid.UUID] = None
    vendor_id: Optional[uuid.UUID] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    in_stock_only: bool = False
    search: Optional[str] = None

