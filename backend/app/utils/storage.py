"""
File Storage Utilities
S3 and Cloudinary upload helpers
"""

import os
import uuid
from datetime import datetime
from typing import Optional, Tuple
import mimetypes

from app.config import settings


# Allowed file types and their extensions
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "image/gif": [".gif"],
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB (increased for high-res screenshots)


def validate_image(content: bytes, content_type: str):

    if not content:
        return False, "Empty file"

    if len(content) > MAX_FILE_SIZE:
        return False, "File too large"

    if content_type not in ALLOWED_IMAGE_TYPES:
        return False, "Invalid mime type"

    # PNG
    if content_type == "image/png":
        if content[:8] != b'\x89PNG\r\n\x1a\n':
            return False, "Corrupted PNG file"

    # JPEG
    if content_type in ["image/jpeg", "image/jpg"]:
        if content[:3] != b'\xff\xd8\xff':
            return False, "Corrupted JPEG file"

    # WEBP
    if content_type == "image/webp":
        if content[:4] != b'RIFF' or b'WEBP' not in content[:12]:
            return False, "Corrupted WebP file"

    # GIF
    if content_type == "image/gif":
        if content[:6] not in [b'GIF87a', b'GIF89a']:
            return False, "Corrupted GIF file"

    return True, None



def generate_filename(
    original_filename: str,
    prefix: str = "",
    include_timestamp: bool = True,
) -> str:
    """
    Generate unique filename.
    
    Args:
        original_filename: Original file name
        prefix: Optional prefix (e.g., 'vendor', 'product')
        include_timestamp: Include timestamp in filename
        
    Returns:
        Generated unique filename
    """
    # Get extension
    ext = os.path.splitext(original_filename)[1].lower()
    if not ext:
        ext = ".jpg"  # Default
    
    # Generate unique ID
    unique_id = str(uuid.uuid4())[:8]
    
    # Build filename
    parts = []
    if prefix:
        parts.append(prefix)
    if include_timestamp:
        parts.append(datetime.utcnow().strftime("%Y%m%d_%H%M%S"))
    parts.append(unique_id)
    
    return "_".join(parts) + ext


def get_upload_path(
    category: str,
    entity_id: str,
    filename: str,
) -> str:
    """
    Generate upload path.
    
    Args:
        category: Category (e.g., 'vendors', 'products')
        entity_id: Entity UUID
        filename: File name
        
    Returns:
        Full upload path
    """
    return f"{category}/{entity_id}/{filename}"


# ============== S3 Upload (Placeholder) ==============

async def upload_to_s3(
    content: bytes,
    path: str,
    content_type: str,
) -> Optional[str]:
    """
    Upload file to S3.
    
    Args:
        content: File content
        path: S3 object path
        content_type: MIME type
        
    Returns:
        Public URL if successful, None otherwise
    """
    # TODO: Implement actual S3 upload
    # import boto3
    # s3_client = boto3.client(
    #     's3',
    #     aws_access_key_id=settings.aws_access_key_id,
    #     aws_secret_access_key=settings.aws_secret_access_key,
    #     region_name=settings.aws_region,
    # )
    # 
    # s3_client.put_object(
    #     Bucket=settings.s3_bucket_name,
    #     Key=path,
    #     Body=content,
    #     ContentType=content_type,
    #     ACL='public-read',
    # )
    # 
    # return f"https://{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com/{path}"
    
    # Placeholder - return local path
    return f"/uploads/{path}"


async def delete_from_s3(path: str) -> bool:
    """
    Delete file from S3.
    
    Args:
        path: S3 object path
        
    Returns:
        True if successful
    """
    # TODO: Implement actual S3 delete
    return True


# ============== Cloudinary Upload (Placeholder) ==============

def fix_png_header(content: bytes) -> bytes:
    """
    Fix PNG files that have encoding issues (BOM/replacement characters).
    
    The issue: When byte 0x89 (invalid UTF-8) is read as text, it becomes \xef\xbf\xbd (UTF-8 replacement).
    We need to restore the original byte sequence.
    
    Args:
        content: File content that may have corrupted PNG header
        
    Returns:
        Fixed content with proper PNG header
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Check if file starts with replacement character followed by PNG
    # Pattern: \xef\xbf\xbd followed by PNG\r\n
    if len(content) >= 8 and content[0:3] == b'\xef\xbf\xbd' and content[3:7] == b'PNG\r':
        # The original byte was 0x89, which got corrupted to \xef\xbf\xbd
        # Replace the first 3 bytes (UTF-8 replacement) with proper PNG header start
        # PNG header should be: 89 50 4E 47 0D 0A 1A 0A
        fixed_content = b'\x89PNG\r\n\x1a\n' + content[8:]
        logger.info("Fixed PNG header: replaced UTF-8 replacement character (\\xef\\xbf\\xbd) with 0x89")
        return fixed_content
    
    # Also check for PNG signature at offset 3 (after replacement chars)
    if len(content) >= 11 and content[3:7] == b'PNG\r':
        # Found PNG at offset 3, reconstruct header
        fixed_content = b'\x89PNG\r\n\x1a\n' + content[8:]
        logger.info("Fixed PNG header: found PNG signature at offset 3, reconstructed header")
        return fixed_content
    
    return content


async def upload_to_cloudinary(
    content: bytes,
    folder: str,
    public_id: str,
) -> Tuple[Optional[str], Optional[str], Optional[dict]]:
    """
    Upload file to Cloudinary with proper error handling and logging.
    
    Args:
        content: File content (bytes)
        folder: Cloudinary folder path
        public_id: Public ID for the file (without extension)
        
    Returns:
        Tuple of (url, error_message, cloudinary_result)
        - url: Secure URL if successful, None otherwise
        - error_message: Error message if failed, None otherwise
        - cloudinary_result: Full Cloudinary response dict if successful
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        import cloudinary
        import cloudinary.uploader
    except ImportError:
        return None, "Cloudinary package not installed. Run: pip install cloudinary", None
    
    # Validate Cloudinary configuration
    if not settings.cloudinary_cloud_name:
        return None, "Cloudinary cloud_name not configured", None
    if not settings.cloudinary_api_key:
        return None, "Cloudinary API key not configured", None
    if not settings.cloudinary_api_secret:
        return None, "Cloudinary API secret not configured", None
    
    try:
        # Configure Cloudinary (reconfigure on each call to ensure fresh config)
        # Debug: Log what we're actually using
        logger.info(f"Configuring Cloudinary with: cloud_name={settings.cloudinary_cloud_name}, api_key={settings.cloudinary_api_key}")
        
        # CRITICAL: Check if Unsplash key is accidentally being used
        if 'Vr6V_' in str(settings.cloudinary_api_key):
            error_msg = f"❌ CRITICAL ERROR: Unsplash key found in Cloudinary API key! This should never happen. Check .env file."
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Reset any existing config first to clear any cached values
        try:
            cloudinary.config(cloud_name=None, api_key=None, api_secret=None)
        except:
            pass
        
        # Configure Cloudinary with correct credentials
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
        )
        
        # Verify the config was set correctly
        import cloudinary
        if hasattr(cloudinary, 'config'):
            actual_key = getattr(cloudinary.config(), 'api_key', None)
            if actual_key and 'Vr6V_' in str(actual_key):
                logger.error(f"❌ ERROR: Cloudinary config has wrong API key! Expected: {settings.cloudinary_api_key}, Got: {actual_key}")
                raise ValueError("Cloudinary API key is incorrect - Unsplash key detected!")
            logger.info(f"✅ Cloudinary config verified: api_key={actual_key[:10] if actual_key else 'None'}...")
        
        # Fix PNG header if corrupted (BOM/replacement character issue)
        original_content = content
        content = fix_png_header(content)
        if content != original_content:
            logger.info("PNG header was fixed before upload")
            # Verify the fix worked
            if len(content) >= 8:
                if content[:8] == b'\x89PNG\r\n\x1a\n':
                    logger.info("✅ PNG header fix verified - header is now correct")
                else:
                    logger.warning(f"⚠️ PNG header fix may have failed. First 8 bytes: {repr(content[:8])}")
        
        # Log upload attempt with file details for debugging
        logger.info(f"Uploading to Cloudinary: folder={folder}, public_id={public_id}, size={len(content)} bytes")
        logger.debug(f"File first 50 bytes (hex): {content[:50].hex()}")
        logger.debug(f"File first 50 bytes (repr): {repr(content[:50])}")
        
        # Try multiple upload methods for maximum compatibility
        # Method 1: Try BytesIO first (most common)
        import io
        file_obj = io.BytesIO(content)
        file_obj.seek(0)  # CRITICAL: Reset pointer to beginning
        
        result = None
        upload_method = "BytesIO"
        
        try:
            # Upload using file-like object
            # Using authenticated upload (API key/secret)
            result = cloudinary.uploader.upload(
                file_obj,
                folder=folder,
                public_id=public_id,
                resource_type="image",
                overwrite=False,
                invalidate=True,
                transformation=[
                    {"quality": "auto", "fetch_format": "auto"},
                ],
            )
            logger.debug("Successfully uploaded using BytesIO method")
        except cloudinary.exceptions.BadRequest as e:
            # If BytesIO fails with "Invalid image file", try temporary file approach
            if "Invalid image file" in str(e):
                logger.warning(f"BytesIO upload failed with 'Invalid image file', trying temporary file approach: {e}")
                import tempfile
                import os
                
                # Determine file extension from content
                ext = ".jpg"
                if content[:8] == b'\x89PNG\r\n\x1a\n':
                    ext = ".png"
                elif content[:4] == b'RIFF' and b'WEBP' in content[:12]:
                    ext = ".webp"
                elif content[:3] == b'\xff\xd8\xff':
                    ext = ".jpg"
                
                # Create temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_file:
                    tmp_file.write(content)
                    tmp_path = tmp_file.name
                
                try:
                    # Upload from temporary file
                    upload_method = "TemporaryFile"
                    result = cloudinary.uploader.upload(
                        tmp_path,
                        folder=folder,
                        public_id=public_id,
                        resource_type="image",
                        overwrite=False,
                        invalidate=True,
                        transformation=[
                            {"quality": "auto", "fetch_format": "auto"},
                        ],
                    )
                    logger.info(f"Successfully uploaded using {upload_method} method")
                finally:
                    # Clean up temporary file
                    try:
                        os.unlink(tmp_path)
                    except Exception:
                        pass
            else:
                # Re-raise if it's a different BadRequest error
                raise
        
        if result is None:
            raise Exception("Upload failed with both BytesIO and temporary file methods")
        
        # Extract secure URL
        url = result.get("secure_url")
        if not url:
            error_msg = "Cloudinary upload succeeded but no secure_url in response"
            logger.error(f"{error_msg}. Response: {result}")
            return None, error_msg, None
        
        # Log success
        logger.info(f"Successfully uploaded to Cloudinary: {url}")
        
        return url, None, result
        
    except cloudinary.exceptions.Error as e:
        # Cloudinary-specific errors
        error_msg = f"Cloudinary API error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return None, error_msg, None
    except Exception as e:
        # Generic errors
        error_msg = f"Cloudinary upload failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return None, error_msg, None


# ============== Main Upload Function ==============

async def upload_image(
    content: bytes,
    content_type: str,
    category: str,
    entity_id: str,
    original_filename: str,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Upload image to configured storage.
    
    Args:
        content: File content
        content_type: MIME type
        category: Category (vendors, products, etc.)
        entity_id: Entity UUID
        original_filename: Original filename
        
    Returns:
        Tuple of (url, error_message)
    """
    # Validate
    is_valid, error = validate_image(content, content_type)
    if not is_valid:
        return None, error
    
    # Generate filename and path
    filename = generate_filename(original_filename, prefix=category[:-1])
    path = get_upload_path(category, entity_id, filename)
    
    # Upload based on configuration (Cloudinary takes priority)
    if settings.cloudinary_cloud_name and settings.cloudinary_api_key:
        url, error, cloudinary_result = await upload_to_cloudinary(content, category, f"{entity_id}/{filename}")
        if url:
            return url, None
        # If Cloudinary fails, fall back to local storage with warning
        import logging
        logger = logging.getLogger(__name__)
        if error:
            logger.warning(f"Cloudinary upload failed, using local storage: {error}")
        else:
            logger.warning("Cloudinary upload failed with unknown error, using local storage")
        # Fall through to local storage
    elif settings.aws_access_key_id and settings.s3_bucket_name:
        url = await upload_to_s3(content, path, content_type)
        if url:
            return url, None
        # If S3 fails, fall back to local storage
        import logging
        logger = logging.getLogger(__name__)
        logger.warning("S3 upload failed, using local storage")
        # Fall through to local storage
    
    # Local storage fallback (returns placeholder URL)
    # Note: In production, configure Cloudinary or S3 for actual file storage
    url = f"/uploads/{path}"
    return url, None

