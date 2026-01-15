#!/usr/bin/env python3
"""
Script to add images/icons to categories.
Fetches images from Unsplash API and uploads to Cloudinary.

Usage:
    python scripts/add_category_images.py
    
Requirements:
    - Unsplash API key (free tier available at https://unsplash.com/developers)
    - Cloudinary credentials in environment variables
    - Categories already populated in database
"""

import os
import sys
import uuid
from pathlib import Path
from typing import Optional, Dict

# Load environment variables from .env file (only if not already set)
try:
    from dotenv import load_dotenv
    # Only load if Cloudinary vars are not already set
    if not os.getenv("CLOUDINARY_CLOUD_NAME"):
        load_dotenv()
except ImportError:
    pass  # dotenv not required if env vars are set directly

try:
    import requests
except ImportError:
    print("❌ 'requests' package not installed. Install with: pip install requests")
    sys.exit(1)

try:
    import cloudinary
    import cloudinary.uploader
except ImportError:
    print("❌ 'cloudinary' package not installed. Install with: pip install cloudinary")
    sys.exit(1)

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set minimal environment to avoid config parsing issues
os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost/db")
os.environ.setdefault("CORS_ORIGINS", "[]")

from app.database import SessionLocal
from app.models.category import Category


# ============== Configuration ==============

# Category to image search term mapping
# Maps category names to search queries for fetching relevant images
CATEGORY_IMAGE_MAPPING = {
    "Electronics": "electronics gadgets technology",
    "Mobile Phones": "smartphone mobile phone",
    "Laptops": "laptop computer",
    "Fresh": "fresh vegetables fruits",
    "Fruits": "fresh fruits",
    "Vegetables": "fresh vegetables",
    "Grocery": "grocery shopping food",
    "Snacks": "snacks chips food",
    "Beauty": "beauty cosmetics makeup",
    "Fashion": "fashion clothing style",
    "Home": "home decor furniture",
    "Health": "health wellness medicine",
    "Cafe": "coffee cafe beverage",
    "Dairy": "dairy milk cheese",
    "Beverages": "drinks beverages",
    "Bakery": "bakery bread pastries",
    "Meat & Seafood": "meat seafood",
    "Baby Care": "baby care products",
    "Pet Care": "pet care animals",
    "Sports": "sports fitness equipment",
    # Add more mappings as needed
    "All": "shopping store",
    "Grocery & Kitchen": "grocery kitchen",
    "Snacks & Drinks": "snacks drinks",
    "Beauty & Personal Care": "beauty personal care",
    "Fashion & Lifestyle": "fashion lifestyle",
    "Home & Kitchen": "home kitchen",
    "Health & Wellness": "health wellness",
}

# Cloudinary configuration
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

# Unsplash API (free tier - 50 requests/hour)
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "")

# Alternative: Use placeholder service if Unsplash not available
PLACEHOLDER_SERVICE = "https://source.unsplash.com/400x400/?"


def setup_cloudinary():
    """Configure Cloudinary."""
    if not all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET]):
        print("⚠️  Cloudinary credentials not found in environment variables.")
        print("   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET")
        return False
    
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
    )
    print("✓ Cloudinary configured")
    return True


def fetch_image_from_unsplash(query: str) -> Optional[bytes]:
    """Fetch image from Unsplash API."""
    if not UNSPLASH_ACCESS_KEY:
        return None
    
    try:
        url = "https://api.unsplash.com/search/photos"
        headers = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}
        params = {
            "query": query,
            "per_page": 1,
            "orientation": "squarish",  # Square images work better for icons
        }
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if data.get("results") and len(data["results"]) > 0:
            image_url = data["results"][0]["urls"]["regular"]
            img_response = requests.get(image_url, timeout=10)
            img_response.raise_for_status()
            return img_response.content
        
    except Exception as e:
        print(f"   ⚠️  Unsplash API error: {e}")
    
    return None


def fetch_image_from_placeholder(query: str) -> Optional[bytes]:
    """Fetch image from placeholder service (fallback)."""
    try:
        # Use direct Unsplash random image URLs (no API needed)
        # These are public URLs that work without authentication
        url = f"https://images.unsplash.com/photo-{get_random_unsplash_id()}?w=400&h=400&fit=crop&q=80"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"   ⚠️  Placeholder service error: {e}")
        # Try alternative: use placeholder.com
        try:
            url = f"https://via.placeholder.com/400/0c831f/ffffff?text={query.replace(' ', '+')[:20]}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response.content
        except:
            pass
    return None


def get_random_unsplash_id() -> str:
    """Get a random Unsplash photo ID for category images."""
    # These are real Unsplash photo IDs that work well for categories
    photo_ids = [
        "1472099645785-5658abf4ff4e",  # Electronics/tech
        "1521737604893-d14cc237f11d",  # Fresh/food
        "1504674900247-0877df9cc836",  # Grocery
        "1556910096-6f5ce2a0d2b6",     # Snacks
        "1522335789203-aabd1fc69bc8",  # Beauty
        "1441986300917-64674bd600d8",  # Fashion
        "1586023492125-6c4b0c8b0b8a",  # Home
        "1576092768241-de43a9736e77",  # Health
        "1517487881594-7217f0a815a3",  # Cafe
        "1556910096-6f5ce2a0d2b6",     # Dairy
        "1504674900247-0877df9cc836",  # Beverages
        "1556910096-6f5ce2a0d2b6",     # Bakery
    ]
    import random
    return random.choice(photo_ids)


def upload_to_cloudinary(image_bytes: bytes, category_name: str) -> Optional[str]:
    """Upload image to Cloudinary and return URL."""
    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            image_bytes,
            folder="banda_categories",
            public_id=f"category_{category_name.lower().replace(' ', '_')}",
            transformation=[
                {"width": 400, "height": 400, "crop": "fill", "gravity": "auto"},
                {"quality": "auto", "fetch_format": "auto"},
            ],
            resource_type="image",
        )
        return result.get("secure_url")
    except Exception as e:
        print(f"   ⚠️  Cloudinary upload error: {e}")
    return None


def get_category_image(category_name: str) -> Optional[str]:
    """Get image for a category by fetching and uploading."""
    print(f"\n📸 Processing: {category_name}")
    
    # Get search query
    search_query = CATEGORY_IMAGE_MAPPING.get(category_name, category_name.lower())
    print(f"   Search query: {search_query}")
    
    # Try to fetch from Unsplash API first
    image_bytes = None
    if UNSPLASH_ACCESS_KEY:
        print("   Fetching from Unsplash API...")
        image_bytes = fetch_image_from_unsplash(search_query)
    
    # Fallback to direct Unsplash URLs (no API needed)
    if not image_bytes:
        print("   Using direct Unsplash images...")
        image_bytes = fetch_image_from_placeholder(search_query)
    
    if not image_bytes:
        print("   ❌ Failed to fetch image")
        return None
    
    print(f"   ✓ Image fetched ({len(image_bytes)} bytes)")
    
    # Upload to Cloudinary
    print("   Uploading to Cloudinary...")
    image_url = upload_to_cloudinary(image_bytes, category_name)
    
    if image_url:
        print(f"   ✓ Uploaded: {image_url}")
        return image_url
    else:
        print("   ❌ Failed to upload")
        return None


def update_category_images():
    """Update categories with images."""
    db = SessionLocal()
    
    try:
        # Get all active categories
        categories = db.query(Category).filter(Category.is_active == True).all()
        
        print(f"\n📦 Found {len(categories)} active categories")
        
        # Filter to main categories (top-level or popular ones)
        main_categories = []
        for cat in categories:
            # Include top-level categories (no parent) or ones in our mapping
            if cat.parent_id is None:
                main_categories.append(cat)
            elif cat.name in CATEGORY_IMAGE_MAPPING:
                main_categories.append(cat)
        
        # Sort by display_order and limit to 20 categories
        main_categories.sort(key=lambda x: x.display_order)
        main_categories = main_categories[:20]
        
        print(f"🎯 Processing {len(main_categories)} main categories\n")
        
        updated_count = 0
        skipped_count = 0
        
        for category in main_categories:
            # Skip if already has an image
            if category.image_url:
                print(f"⏭️  Skipping {category.name} (already has image)")
                skipped_count += 1
                continue
            
            # Get image URL
            image_url = get_category_image(category.name)
            
            if image_url:
                # Update category
                category.image_url = image_url
                db.commit()
                updated_count += 1
                print(f"   ✅ Updated {category.name}")
            else:
                print(f"   ❌ Failed to update {category.name}")
        
        print(f"\n✨ Summary:")
        print(f"   ✅ Updated: {updated_count}")
        print(f"   ⏭️  Skipped: {skipped_count}")
        print(f"   📊 Total processed: {len(main_categories)}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def main():
    """Main function."""
    print("=" * 60)
    print("🖼️  Category Image Upload Script")
    print("=" * 60)
    
    # Check Cloudinary setup
    if not setup_cloudinary():
        print("\n❌ Cloudinary not configured. Exiting.")
        return
    
    # Check Unsplash API key
    if not UNSPLASH_ACCESS_KEY:
        print("\n⚠️  Unsplash API key not found.")
        print("   Will use placeholder service (lower quality)")
        print("   Get free API key at: https://unsplash.com/developers")
        response = input("\nContinue with placeholder service? (y/n): ")
        if response.lower() != "y":
            return
    
    # Update categories
    try:
        update_category_images()
        print("\n✅ Done!")
    except Exception as e:
        print(f"\n❌ Failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

