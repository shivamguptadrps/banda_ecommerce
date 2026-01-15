#!/usr/bin/env python3
"""
Test Cloudinary Upload Script
Tests if Cloudinary upload is working correctly from Python backend
"""

import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from app.utils.storage import upload_image, upload_to_cloudinary


async def test_cloudinary_config():
    """Test if Cloudinary is configured."""
    print("=" * 60)
    print("Testing Cloudinary Configuration")
    print("=" * 60)
    
    cloud_name = settings.cloudinary_cloud_name
    api_key = settings.cloudinary_api_key
    api_secret = settings.cloudinary_api_secret
    
    print(f"Cloud Name: {cloud_name if cloud_name else '❌ NOT SET'}")
    print(f"API Key: {api_key[:10] + '...' if api_key else '❌ NOT SET'}")
    print(f"API Secret: {'***' + api_secret[-4:] if api_secret else '❌ NOT SET'}")
    print()
    
    if not cloud_name or not api_key or not api_secret:
        print("❌ Cloudinary is NOT configured!")
        print("\nTo configure Cloudinary:")
        print("1. Create account at https://cloudinary.com")
        print("2. Get credentials from dashboard")
        print("3. Add to .env file:")
        print("   CLOUDINARY_CLOUD_NAME=your_cloud_name")
        print("   CLOUDINARY_API_KEY=your_api_key")
        print("   CLOUDINARY_API_SECRET=your_api_secret")
        return False
    
    print("✅ Cloudinary credentials are configured")
    return True


async def test_cloudinary_upload():
    """Test direct Cloudinary upload."""
    print("\n" + "=" * 60)
    print("Testing Direct Cloudinary Upload")
    print("=" * 60)
    
    # Create a simple test image (1x1 pixel PNG)
    # PNG header + minimal image data
    test_image_data = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54,  # IDAT chunk
        0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00,
        0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,  # IEND chunk
        0xAE, 0x42, 0x60, 0x82
    ])
    
    try:
        print("Uploading test image to Cloudinary...")
        url, error = await upload_to_cloudinary(
            content=test_image_data,
            folder="test_uploads",
            public_id="test_image_python"
        )
        
        if error:
            print(f"❌ Upload failed: {error}")
            return False
        
        if url:
            print(f"✅ Upload successful!")
            print(f"   URL: {url}")
            return True
        else:
            print("❌ Upload returned no URL")
            return False
            
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_upload_image_function():
    """Test the main upload_image function."""
    print("\n" + "=" * 60)
    print("Testing upload_image Function (Main Entry Point)")
    print("=" * 60)
    
    # Create a simple test image
    test_image_data = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54,
        0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00,
        0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
        0xAE, 0x42, 0x60, 0x82
    ])
    
    try:
        print("Testing upload_image function...")
        url, error = await upload_image(
            content=test_image_data,
            content_type="image/png",
            category="products",
            entity_id="test_vendor/test_product",
            original_filename="test_image.png"
        )
        
        if error:
            print(f"❌ Upload failed: {error}")
            return False
        
        if url:
            print(f"✅ Upload successful!")
            print(f"   URL: {url}")
            if "cloudinary.com" in url:
                print("   ✅ Confirmed: Uploaded to Cloudinary")
            elif "s3" in url or "amazonaws.com" in url:
                print("   ✅ Confirmed: Uploaded to S3")
            else:
                print("   ⚠️  Using local storage fallback")
            return True
        else:
            print("❌ Upload returned no URL")
            return False
            
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_with_real_image():
    """Test with a real image file if provided."""
    print("\n" + "=" * 60)
    print("Testing with Real Image File (Optional)")
    print("=" * 60)
    
    # Check if test image path is provided
    test_image_path = os.environ.get("TEST_IMAGE_PATH")
    
    if not test_image_path:
        print("ℹ️  No TEST_IMAGE_PATH provided, skipping real image test")
        print("   To test with a real image, set: export TEST_IMAGE_PATH=/path/to/image.jpg")
        return True
    
    if not os.path.exists(test_image_path):
        print(f"❌ Test image not found: {test_image_path}")
        return False
    
    try:
        print(f"Reading image from: {test_image_path}")
        with open(test_image_path, "rb") as f:
            image_data = f.read()
        
        print(f"Image size: {len(image_data)} bytes ({len(image_data) / 1024:.2f} KB)")
        
        # Detect content type
        content_type = "image/jpeg"
        if test_image_path.lower().endswith(".png"):
            content_type = "image/png"
        elif test_image_path.lower().endswith(".webp"):
            content_type = "image/webp"
        
        print(f"Content type: {content_type}")
        print("Uploading to Cloudinary...")
        
        url, error = await upload_image(
            content=image_data,
            content_type=content_type,
            category="products",
            entity_id="test_vendor/real_test",
            original_filename=os.path.basename(test_image_path)
        )
        
        if error:
            print(f"❌ Upload failed: {error}")
            return False
        
        if url:
            print(f"✅ Upload successful!")
            print(f"   URL: {url}")
            print(f"\n   You can view the image at: {url}")
            return True
        else:
            print("❌ Upload returned no URL")
            return False
            
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests."""
    print("\n" + "🚀 Cloudinary Upload Test Script" + "\n")
    
    # Test 1: Configuration
    config_ok = await test_cloudinary_config()
    if not config_ok:
        print("\n" + "=" * 60)
        print("❌ Tests stopped: Cloudinary not configured")
        print("=" * 60)
        sys.exit(1)
    
    # Test 2: Direct Cloudinary upload
    direct_upload_ok = await test_cloudinary_upload()
    
    # Test 3: Main upload_image function
    upload_function_ok = await test_upload_image_function()
    
    # Test 4: Real image (optional)
    real_image_ok = await test_with_real_image()
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"Configuration:        {'✅ PASS' if config_ok else '❌ FAIL'}")
    print(f"Direct Upload:        {'✅ PASS' if direct_upload_ok else '❌ FAIL'}")
    print(f"Upload Function:      {'✅ PASS' if upload_function_ok else '❌ FAIL'}")
    print(f"Real Image Test:      {'✅ PASS' if real_image_ok else '⚠️  SKIPPED'}")
    print("=" * 60)
    
    if config_ok and direct_upload_ok and upload_function_ok:
        print("\n✅ All critical tests passed! Cloudinary upload is working.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())


