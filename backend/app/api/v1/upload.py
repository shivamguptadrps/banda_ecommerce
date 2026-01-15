"""
Image Upload API Routes
Handles image uploads for return requests, products, and other entities
"""

import uuid
from typing import List, Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role, get_current_user
from app.models.user import User
from app.models.enums import UserRole
from app.utils.storage import upload_image, validate_image, MAX_FILE_SIZE
from app.config import settings

router = APIRouter()


class ImageUploadResponse(BaseModel):
    """Response model for single image upload."""
    url: str
    public_id: Optional[str] = None


class ImageUploadListResponse(BaseModel):
    """Response model for multiple image uploads."""
    images: List[ImageUploadResponse]


@router.post(
    "/upload/return-request-images",
    response_model=List[str],
    status_code=status.HTTP_201_CREATED,
    summary="Upload return request images",
    description="Upload images for return requests. Returns list of image URLs.",
)
async def upload_return_request_images(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER])),
):
    """
    Upload images for return requests.
    
    Validations:
    - Maximum 5 images
    - Each image max 10MB
    - Allowed types: jpg, png, webp
    """
    if len(files) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 images allowed",
        )
    
    uploaded_urls = []
    
    for file in files:
        # Validate file type
        if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type for {file.filename}. Allowed: jpg, png, webp",
            )
        
        # Read file content
        content = await file.read()
        
        # Validate size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} is too large. Maximum size is 10MB. Received: {len(content) / (1024 * 1024):.2f}MB",
            )
        
        # Validate image
        is_valid, error = validate_image(content, file.content_type)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error,
            )
        
        # Generate unique ID for this upload
        upload_id = str(uuid.uuid4())
        
        # Upload to storage (Cloudinary or S3)
        url, error = await upload_image(
            content=content,
            content_type=file.content_type,
            category="return_requests",
            entity_id=upload_id,
            original_filename=file.filename or "image.jpg",
        )
        
        if not url or error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload {file.filename}: {error or 'Unknown error'}",
            )
        
        uploaded_urls.append(url)
    
    return uploaded_urls


@router.post(
    "/upload/product-images",
    response_model=ImageUploadListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload product images",
    description="Upload images for products. Returns list of image URLs with public IDs. Vendor and Admin only.",
)
async def upload_product_images(
    current_user: User = Depends(require_role([UserRole.VENDOR, UserRole.ADMIN])),
    db: Session = Depends(get_db),
    files: List[UploadFile] = File(...),
):
    """
    Upload images for products.
    
    Validations:
    - Maximum 5 images per request
    - Each image max 10MB
    - Allowed types: jpg, jpeg, png, webp
    - Uploads to Cloudinary/S3 and returns public URLs
    
    Access: Vendor and Admin users
    """
    if len(files) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 images allowed per request",
        )
    
    # For vendors, verify vendor profile exists (admins can skip this)
    vendor_id = None
    if current_user.role == UserRole.VENDOR:
        from app.services.vendor_service import VendorService
        vendor_service = VendorService(db)
        vendor = vendor_service.get_vendor_by_user_id(current_user.id)
        
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor profile not found",
            )
        vendor_id = str(vendor.id)
    else:
        # For admins, use user ID as folder identifier
        vendor_id = str(current_user.id)
    
    uploaded_images = []
    
    import logging
    logger = logging.getLogger(__name__)
    
    for file in files:
        # Log incoming file info for debugging
        logger.info(f"Processing file upload: filename={file.filename}, content_type={file.content_type}, size={file.size if hasattr(file, 'size') else 'unknown'}")
        
        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if file.content_type not in allowed_types:
            logger.warning(f"Invalid file type rejected: {file.filename}, content_type={file.content_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type for {file.filename}. Allowed: jpg, jpeg, png, webp. Received: {file.content_type}",
            )
        
        # Read file content - ensure file pointer is at start
        await file.seek(0)
        content = await file.read()
        
        # Log file content info for debugging
        logger.info(f"Read file content: filename={file.filename}, size={len(content)} bytes")
        if len(content) >= 20:
            logger.info(f"First 20 bytes (hex): {content[:20].hex()}")
            logger.info(f"First 20 bytes (repr): {repr(content[:20])}")
            # Check PNG signature specifically
            if content[:8] == b'\x89PNG\r\n\x1a\n':
                logger.info("✅ PNG signature detected correctly")
            else:
                logger.warning(f"⚠️ PNG signature NOT detected. Got: {repr(content[:8])}")
        else:
            logger.warning(f"File too small: only {len(content)} bytes")
        
        # Validate that we actually got content
        if not content or len(content) == 0:
            logger.error(f"Empty file received: {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} is empty or could not be read",
            )
        
        # Validate size
        if len(content) > MAX_FILE_SIZE:
            logger.warning(f"File too large rejected: {file.filename}, size={len(content)} bytes")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} is too large. Maximum size is 10MB. Received: {len(content) / (1024 * 1024):.2f}MB",
            )
        
        # Validate image (checks both MIME type and actual file headers)
        is_valid, error = validate_image(content, file.content_type)
        if not is_valid:
            logger.warning(f"Image validation failed: {file.filename}, error={error}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image file {file.filename}: {error}",
            )
        
        logger.info(f"Image validation passed: {file.filename}")
        
        # Generate unique ID for this upload (use vendor/admin ID for folder structure)
        upload_id = str(uuid.uuid4())
        
        # Upload to storage (Cloudinary or S3)
        try:
            url, upload_error = await upload_image(
                content=content,
                content_type=file.content_type,
                category="products",
                entity_id=f"{vendor_id}/{upload_id}",
                original_filename=file.filename or "product_image.jpg",
            )
            
            if upload_error or not url:
                logger.error(f"Upload failed for {file.filename}: {upload_error or 'Unknown error'}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to upload {file.filename}: {upload_error or 'Unknown error'}",
                )
            
            logger.info(f"Successfully uploaded {file.filename} to {url}")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error uploading {file.filename}: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload {file.filename}: {str(e)}",
            )
        
        # Extract public_id from Cloudinary URL
        # Cloudinary response includes public_id in the result, but we extract from URL as fallback
        public_id = None
        if "cloudinary.com" in url:
            try:
                # Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{ext}
                # Or: https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}.{ext}
                parts = url.split("/image/upload/")
                if len(parts) > 1:
                    path_part = parts[1]
                    # Remove version prefix if present (v1234567890/)
                    if path_part.startswith("v") and "/" in path_part:
                        path_part = path_part.split("/", 1)[1]
                    # Remove file extension
                    public_id = path_part.rsplit(".", 1)[0] if "." in path_part else path_part
                    logger.debug(f"Extracted public_id from URL: {public_id}")
            except Exception as e:
                logger.warning(f"Could not extract public_id from URL {url}: {e}")
        
        uploaded_images.append(ImageUploadResponse(url=url, public_id=public_id))
    
    return ImageUploadListResponse(images=uploaded_images)

