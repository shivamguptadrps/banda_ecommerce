"""
Vendor Product Routes
Product management for vendors (CRUD, images, sell units, inventory)
"""

import math
from decimal import Decimal
from typing import Optional
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductVendorListResponse,
    SellUnitCreate,
    SellUnitUpdate,
    SellUnitResponse,
    ProductImageResponse,
    ProductImageReorder,
    InventoryResponse,
    InventoryUpdate,
    StockAdjustment,
)
from app.schemas.attribute import (
    CategoryAttributeListResponse,
    ProductAttributeValueCreate,
    ProductAttributeValueResponse,
)
from app.schemas.user import MessageResponse
from app.services.product_service import ProductService
from app.services.vendor_service import VendorService
from app.services.attribute_service import AttributeService
from app.api.deps import DbSession, VendorUser


router = APIRouter()


def get_vendor_id(current_user: VendorUser, db: DbSession) -> uuid_lib.UUID:
    """Get vendor ID for current user."""
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_user_id(current_user.id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found. Please register your shop first.",
        )
    
    if not vendor.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor must be verified to manage products.",
        )
    
    return vendor.id


# ============== Product CRUD ==============

@router.post(
    "/",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create product",
    description="Create a new product with optional sell units.",
)
def create_product(
    product_data: ProductCreate,
    current_user: VendorUser,
    db: DbSession,
):
    """
    Create a new product.
    
    - Vendor must be verified
    - Can include initial stock and sell units
    """
    vendor_id = get_vendor_id(current_user, db)
    product_service = ProductService(db)
    
    try:
        product = product_service.create_product(vendor_id, product_data)
        return product
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "",
    response_model=ProductVendorListResponse,
    summary="List my products (no trailing slash)",
    description="Get paginated list of vendor's products.",
)
def list_my_products_no_slash(
    current_user: VendorUser,
    db: DbSession,
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """Get vendor's products (no trailing slash version)."""
    return list_my_products(current_user, db, is_active, search, category_id, page, size)


@router.get(
    "/",
    response_model=ProductVendorListResponse,
    summary="List my products",
    description="Get paginated list of vendor's products.",
)
def list_my_products(
    current_user: VendorUser,
    db: DbSession,
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    """Get vendor's products."""
    vendor_id = get_vendor_id(current_user, db)
    product_service = ProductService(db)
    
    cat_uuid = None
    if category_id:
        try:
            cat_uuid = uuid_lib.UUID(category_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category ID",
            )
    
    products, total = product_service.get_vendor_products(
        vendor_id=vendor_id,
        is_active=is_active,
        search=search,
        category_id=cat_uuid,
        page=page,
        size=size,
    )
    
    return ProductVendorListResponse(
        items=[ProductResponse.model_validate(p) for p in products],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get(
    "/low-stock",
    response_model=list[ProductResponse],
    summary="Get low stock products",
    description="Get products with low stock levels.",
)
def get_low_stock_products(
    current_user: VendorUser,
    db: DbSession,
):
    """Get products with low stock."""
    vendor_id = get_vendor_id(current_user, db)
    product_service = ProductService(db)
    
    products = product_service.get_low_stock_products(vendor_id)
    return [ProductResponse.model_validate(p) for p in products]


@router.get(
    "/out-of-stock",
    response_model=list[ProductResponse],
    summary="Get out of stock products",
    description="Get products that are out of stock.",
)
def get_out_of_stock_products(
    current_user: VendorUser,
    db: DbSession,
):
    """Get out of stock products."""
    vendor_id = get_vendor_id(current_user, db)
    product_service = ProductService(db)
    
    products = product_service.get_out_of_stock_products(vendor_id)
    return [ProductResponse.model_validate(p) for p in products]


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Get product details",
    description="Get detailed product information.",
)
def get_product(
    product_id: str,
    current_user: VendorUser,
    db: DbSession,
):
    """Get product details."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    product = product_service.get_product_by_id(product_uuid)
    
    if not product or product.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    return product


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Update product",
    description="Update product information.",
)
def update_product(
    product_id: str,
    update_data: ProductUpdate,
    current_user: VendorUser,
    db: DbSession,
):
    """Update product."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    
    try:
        product = product_service.update_product(product_uuid, vendor_id, update_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    return product


@router.delete(
    "/{product_id}",
    response_model=MessageResponse,
    summary="Delete product",
    description="Soft delete a product.",
)
def delete_product(
    product_id: str,
    current_user: VendorUser,
    db: DbSession,
):
    """Delete product."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    success = product_service.delete_product(product_uuid, vendor_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    return MessageResponse(message="Product deleted successfully")


# ============== Sell Units ==============

@router.post(
    "/{product_id}/sell-units",
    response_model=SellUnitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add sell unit",
    description="Add a pricing unit to product.",
)
def add_sell_unit(
    product_id: str,
    sell_unit_data: SellUnitCreate,
    current_user: VendorUser,
    db: DbSession,
):
    """Add sell unit to product."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    
    try:
        sell_unit = product_service.add_sell_unit(product_uuid, vendor_id, sell_unit_data)
        return sell_unit
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put(
    "/{product_id}/sell-units/{sell_unit_id}",
    response_model=SellUnitResponse,
    summary="Update sell unit",
    description="Update a pricing unit.",
)
def update_sell_unit(
    product_id: str,
    sell_unit_id: str,
    update_data: SellUnitUpdate,
    current_user: VendorUser,
    db: DbSession,
):
    """Update sell unit."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        sell_unit_uuid = uuid_lib.UUID(sell_unit_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sell unit ID",
        )
    
    product_service = ProductService(db)
    sell_unit = product_service.update_sell_unit(sell_unit_uuid, vendor_id, update_data)
    
    if not sell_unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sell unit not found",
        )
    
    return sell_unit


@router.delete(
    "/{product_id}/sell-units/{sell_unit_id}",
    response_model=MessageResponse,
    summary="Delete sell unit",
    description="Deactivate a pricing unit.",
)
def delete_sell_unit(
    product_id: str,
    sell_unit_id: str,
    current_user: VendorUser,
    db: DbSession,
):
    """Delete sell unit."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        sell_unit_uuid = uuid_lib.UUID(sell_unit_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sell unit ID",
        )
    
    product_service = ProductService(db)
    success = product_service.delete_sell_unit(sell_unit_uuid, vendor_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sell unit not found",
        )
    
    return MessageResponse(message="Sell unit deleted successfully")


# ============== Product Images ==============

@router.post(
    "/{product_id}/images",
    response_model=ProductImageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload product image",
    description="Upload an image for the product.",
)
async def upload_product_image(
    product_id: str,
    current_user: VendorUser,
    db: DbSession,
    file: UploadFile = File(...),
    is_primary: bool = Query(False),
):
    """Upload product image."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    # Validate file
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: jpg, png, webp",
        )
    
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 5MB",
        )
    
    # TODO: Upload to S3/Cloudinary
    image_url = f"/uploads/products/{product_id}/{file.filename}"
    
    product_service = ProductService(db)
    
    try:
        image = product_service.add_product_image(
            product_uuid, vendor_id, image_url, is_primary
        )
        return image
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


from app.schemas.product import ProductImageCreate


@router.post(
    "/{product_id}/images/url",
    response_model=ProductImageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add product image by URL",
    description="Add an image to the product using a URL (e.g., from Cloudinary).",
)
def add_product_image_by_url(
    product_id: str,
    image_data: ProductImageCreate,
    current_user: VendorUser,
    db: DbSession,
):
    """
    Add product image using an external URL.
    
    This is useful for images uploaded to services like Cloudinary.
    """
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    # Basic URL validation
    if not image_data.image_url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image URL. Must start with http:// or https://",
        )
    
    product_service = ProductService(db)
    
    try:
        image = product_service.add_product_image(
            product_uuid, 
            vendor_id, 
            image_data.image_url, 
            image_data.is_primary,
            image_data.display_order
        )
        return image
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/{product_id}/images/bulk",
    response_model=list[ProductImageResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add multiple product images",
    description="Add multiple images to the product at once.",
)
def add_product_images_bulk(
    product_id: str,
    images: list[ProductImageCreate],
    current_user: VendorUser,
    db: DbSession,
):
    """
    Add multiple product images at once.
    
    Useful for uploading all product images in one API call.
    Only one image can be marked as primary.
    """
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    # Validate all URLs
    for img in images:
        if not img.image_url.startswith(("http://", "https://")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image URL: {img.image_url}",
            )
    
    # Ensure only one primary image
    primary_count = sum(1 for img in images if img.is_primary)
    if primary_count > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only one image can be marked as primary",
        )
    
    # If no primary set, make first one primary
    if primary_count == 0 and images:
        images[0].is_primary = True
    
    product_service = ProductService(db)
    results = []
    
    for i, img in enumerate(images):
        try:
            image = product_service.add_product_image(
                product_uuid,
                vendor_id,
                img.image_url,
                img.is_primary,
                img.display_order if img.display_order else i
            )
            results.append(image)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
    
    return results


@router.delete(
    "/{product_id}/images/{image_id}",
    response_model=MessageResponse,
    summary="Delete product image",
    description="Delete a product image.",
)
def delete_product_image(
    product_id: str,
    image_id: str,
    current_user: VendorUser,
    db: DbSession,
):
    """Delete product image."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        image_uuid = uuid_lib.UUID(image_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image ID",
        )
    
    product_service = ProductService(db)
    success = product_service.delete_product_image(image_uuid, vendor_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )
    
    return MessageResponse(message="Image deleted successfully")


@router.put(
    "/{product_id}/images/{image_id}/primary",
    response_model=MessageResponse,
    summary="Set primary image",
    description="Set an image as the primary product image.",
)
def set_primary_image(
    product_id: str,
    image_id: str,
    current_user: VendorUser,
    db: DbSession,
):
    """Set primary image."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        image_uuid = uuid_lib.UUID(image_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image ID",
        )
    
    product_service = ProductService(db)
    success = product_service.set_primary_image(image_uuid, vendor_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )
    
    return MessageResponse(message="Primary image updated")


@router.put(
    "/{product_id}/images/reorder",
    response_model=MessageResponse,
    summary="Reorder images",
    description="Reorder product images.",
)
def reorder_images(
    product_id: str,
    reorder_data: ProductImageReorder,
    current_user: VendorUser,
    db: DbSession,
):
    """Reorder product images."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    success = product_service.reorder_images(product_uuid, vendor_id, reorder_data.image_ids)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    return MessageResponse(message="Images reordered")


# ============== Inventory ==============

@router.get(
    "/{product_id}/inventory",
    response_model=InventoryResponse,
    summary="Get inventory",
    description="Get product inventory details.",
)
def get_inventory(
    product_id: str,
    current_user: VendorUser,
    db: DbSession,
):
    """Get product inventory."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    product = product_service.get_product_by_id(product_uuid)
    
    if not product or product.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    if not product.inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )
    
    return product.inventory


@router.put(
    "/{product_id}/inventory",
    response_model=InventoryResponse,
    summary="Update inventory",
    description="Update product inventory (available quantity and low stock threshold).",
)
def update_inventory(
    product_id: str,
    data: InventoryUpdate,
    current_user: VendorUser,
    db: DbSession,
):
    """Update product inventory."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    product = product_service.get_product_by_id(product_uuid)
    
    if not product or product.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    if not product.inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )
    
    inventory = product.inventory
    
    # Update available quantity if provided
    if data.available_quantity is not None:
        if data.available_quantity < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Available quantity cannot be negative",
            )
        inventory.available_quantity = data.available_quantity
    
    # Update low stock threshold if provided
    if data.low_stock_threshold is not None:
        if data.low_stock_threshold < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Low stock threshold cannot be negative",
            )
        inventory.low_stock_threshold = data.low_stock_threshold
    
    db.commit()
    db.refresh(inventory)
    
    return inventory


@router.put(
    "/{product_id}/stock",
    response_model=InventoryResponse,
    summary="Set stock",
    description="Set absolute stock quantity.",
)
def set_stock(
    product_id: str,
    current_user: VendorUser,
    db: DbSession,
    quantity: Decimal = Query(..., ge=0),
):
    """Set stock quantity."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    
    try:
        inventory = product_service.set_stock(product_uuid, vendor_id, quantity)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    return inventory


@router.post(
    "/{product_id}/stock/adjust",
    response_model=InventoryResponse,
    summary="Adjust stock",
    description="Add or subtract from stock quantity.",
)
def adjust_stock(
    product_id: str,
    adjustment: StockAdjustment,
    current_user: VendorUser,
    db: DbSession,
):
    """Adjust stock quantity."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    
    try:
        inventory = product_service.update_stock(
            product_uuid, vendor_id, adjustment.quantity, adjustment.reason
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    return inventory


# ============== Product Attributes ==============

@router.get(
    "/{product_id}/attributes/form",
    response_model=CategoryAttributeListResponse,
    summary="Get attribute form fields",
    description="Get all attributes to fill for this product's category.",
)
def get_product_attribute_form(
    product_id: str,
    current_user: VendorUser,
    db: DbSession,
):
    """Get attributes form fields for a product based on its category."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    product = product_service.get_product_by_id(product_uuid)
    
    if not product or product.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    if not product.category_id:
        return CategoryAttributeListResponse(items=[], total=0)
    
    attr_service = AttributeService(db)
    attributes = attr_service.get_attributes_for_product_form(product.category_id)
    
    return CategoryAttributeListResponse(items=attributes, total=len(attributes))


@router.get(
    "/{product_id}/attributes",
    summary="Get product attributes",
    description="Get all attribute values for a product.",
)
def get_product_attributes(
    product_id: str,
    current_user: VendorUser,
    db: DbSession,
):
    """Get product attribute values."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    product = product_service.get_product_by_id(product_uuid)
    
    if not product or product.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    attr_service = AttributeService(db)
    values = attr_service.get_product_attributes(product_uuid)
    
    return values


@router.post(
    "/{product_id}/attributes",
    summary="Set product attribute",
    description="Set or update a single attribute value for a product.",
)
def set_product_attribute(
    product_id: str,
    data: ProductAttributeValueCreate,
    current_user: VendorUser,
    db: DbSession,
):
    """Set product attribute value."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    product = product_service.get_product_by_id(product_uuid)
    
    if not product or product.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    attr_service = AttributeService(db)
    value = attr_service.set_product_attribute(product_uuid, data)
    
    return {
        "id": value.id,
        "attribute_id": value.attribute_id,
        "value": value.value,
        "value_json": value.value_json,
    }


@router.put(
    "/{product_id}/attributes/bulk",
    summary="Set product attributes in bulk",
    description="Set multiple attribute values at once.",
)
def set_product_attributes_bulk(
    product_id: str,
    attributes: list[ProductAttributeValueCreate],
    current_user: VendorUser,
    db: DbSession,
):
    """Set multiple product attribute values."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID",
        )
    
    product_service = ProductService(db)
    product = product_service.get_product_by_id(product_uuid)
    
    if not product or product.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    attr_service = AttributeService(db)
    values = attr_service.set_product_attributes_bulk(product_uuid, attributes)
    
    return [
        {
            "id": v.id,
            "attribute_id": v.attribute_id,
            "value": v.value,
            "value_json": v.value_json,
        }
        for v in values
    ]


@router.delete(
    "/{product_id}/attributes/{attribute_id}",
    response_model=MessageResponse,
    summary="Delete product attribute",
    description="Remove an attribute value from a product.",
)
def delete_product_attribute(
    product_id: str,
    attribute_id: str,
    current_user: VendorUser,
    db: DbSession,
):
    """Delete product attribute value."""
    vendor_id = get_vendor_id(current_user, db)
    
    try:
        product_uuid = uuid_lib.UUID(product_id)
        attr_uuid = uuid_lib.UUID(attribute_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ID",
        )
    
    product_service = ProductService(db)
    product = product_service.get_product_by_id(product_uuid)
    
    if not product or product.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    
    attr_service = AttributeService(db)
    success = attr_service.delete_product_attribute(product_uuid, attr_uuid)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attribute not found",
        )
    
    return MessageResponse(message="Attribute removed successfully")
