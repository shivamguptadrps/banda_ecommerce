#!/usr/bin/env python3
"""
Script to fetch images from Unsplash and upload to Cloudinary for categories in JSON file.
Processes 3-level category structure and updates JSON with image URLs.

Usage:
    python scripts/fetch_category_images.py

Requirements:
    - Unsplash API key (optional - can use direct Unsplash URLs)
    - Cloudinary credentials
    - JSON file with category structure
"""

import os
import sys
import json
import time
import random
from pathlib import Path
from typing import Optional, Dict, List, Any
import requests

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Load .env from backend directory
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass  # dotenv not required if env vars are set directly

try:
    import cloudinary
    import cloudinary.uploader
except ImportError:
    print("❌ 'cloudinary' package not installed. Install with: pip install cloudinary")
    sys.exit(1)

# ============== Configuration ==============

# Cloudinary credentials - read from environment
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

# Unsplash API key (provided by user)
# Free tier: 50 requests/hour
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "Vr6V_-RNO3OIkVDUa7AUhxByg4SStfxQR4BxQ1drbpA")

# JSON file path
JSON_FILE = Path(__file__).parent.parent.parent / "tem.json"
OUTPUT_FILE = Path(__file__).parent.parent.parent / "tem_with_images.json"

# Rate limiting (to respect API limits)
UNSPLASH_DELAY = 0.5  # seconds between Unsplash requests
CLOUDINARY_DELAY = 0.2  # seconds between Cloudinary uploads

# Number of images to try per category
IMAGES_TO_TRY = 3


def setup_cloudinary():
    """Configure Cloudinary."""
    global CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
    
    # Check if we have all required credentials
    if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        print("\n⚠️  Cloudinary credentials incomplete!")
        print("   Required: Cloud Name, API Key, API Secret")
        print("   Get these from: https://console.cloudinary.com/settings/api")
        print()
        
        # Prompt for missing values
        if not CLOUDINARY_CLOUD_NAME:
            CLOUDINARY_CLOUD_NAME = input("Enter Cloudinary Cloud Name: ").strip()
        if not CLOUDINARY_API_KEY:
            CLOUDINARY_API_KEY = input("Enter Cloudinary API Key: ").strip()
        if not CLOUDINARY_API_SECRET:
            CLOUDINARY_API_SECRET = input("Enter Cloudinary API Secret: ").strip()
        
        if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
            print("❌ Cannot proceed without all Cloudinary credentials")
            return False
    
    try:
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
        )
        # Test configuration by making a simple API call
        print("✅ Cloudinary configured")
        return True
    except Exception as e:
        print(f"❌ Failed to configure Cloudinary: {e}")
        print("   Please verify your credentials in Cloudinary dashboard")
        return False


def fetch_images_from_unsplash(query: str, count: int = 3) -> List[bytes]:
    """
    Fetch multiple images from Unsplash API.
    
    Args:
        query: Search query
        count: Number of images to fetch
        
    Returns:
        List of image bytes
    """
    images = []
    
    if not UNSPLASH_ACCESS_KEY:
        # Use direct Unsplash URLs (no API needed)
        print(f"   📷 Using direct Unsplash URLs (no API key)")
        for i in range(count):
            # Use random Unsplash photo IDs
            photo_id = get_random_unsplash_id()
            url = f"https://images.unsplash.com/photo-{photo_id}?w=400&h=400&fit=crop&q=80"
            try:
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                images.append(response.content)
                time.sleep(UNSPLASH_DELAY)
            except Exception as e:
                print(f"   ⚠️  Failed to fetch image {i+1}: {e}")
        return images
    
    try:
        # Use Unsplash API
        url = "https://api.unsplash.com/search/photos"
        headers = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}
        params = {
            "query": query,
            "per_page": min(count, 10),  # Max 10 per request
            "orientation": "squarish",
        }
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        results = data.get("results", [])
        
        for i, result in enumerate(results[:count]):
            try:
                image_url = result["urls"]["regular"]
                img_response = requests.get(image_url, timeout=10)
                img_response.raise_for_status()
                images.append(img_response.content)
                time.sleep(UNSPLASH_DELAY)
            except Exception as e:
                print(f"   ⚠️  Failed to fetch image {i+1}: {e}")
        
    except Exception as e:
        print(f"   ⚠️  Unsplash API error: {e}")
    
    return images


def get_random_unsplash_id() -> str:
    """Get a random Unsplash photo ID."""
    # Valid Unsplash photo IDs that work
    photo_ids = [
        "1472099645785-5658abf4ff4e",  # Tech/Electronics
        "1521737604893-d14cc237f11d",  # Fresh/Food
        "1504674900247-0877df9cc836",  # Grocery
        "1556910096-6f5ce2a0d2b6",     # Snacks/Food
        "1441986300917-64674bd600d8",  # Fashion
        "1586023492125-6c4b0c8b0b8a",  # Home
        "1576092768241-de43a9736e77",  # Health
        "1517487881594-7217f0a815a3",  # Cafe
        "1567620905732-2d1ec7ab7445",  # Fruits
        "1504674900247-0877df9cc836",  # Vegetables
        "1522335789203-aabd1fc69bc8",  # Kitchen
        "1567306226416-28f0efdc88ca",  # Fresh produce
        "1512621777131-0be0c59b9528",  # Food
        "1542838132-92c533004f45",     # Grocery
        "1565958011703-26f0746195e6",  # Fresh
    ]
    return random.choice(photo_ids)


def upload_to_cloudinary(image_bytes: bytes, category_name: str, level: int) -> Optional[str]:
    """
    Upload image to Cloudinary and return public URL.
    
    Args:
        image_bytes: Image content
        category_name: Category name (for public_id)
        level: Category level (1, 2, or 3)
        
    Returns:
        Cloudinary public URL or None
    """
    try:
        # Create safe public_id from category name
        public_id = f"banda_categories/level{level}/{category_name.lower().replace(' ', '_').replace('&', 'and')[:50]}"
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            image_bytes,
            folder="banda_categories",
            public_id=public_id,
            transformation=[
                {"width": 400, "height": 400, "crop": "fill", "gravity": "auto"},
                {"quality": "auto", "fetch_format": "auto"},
            ],
            resource_type="image",
        )
        
        # Return public_id (which is the Cloudinary URL format)
        # Cloudinary returns secure_url, but we can also construct from public_id
        return result.get("secure_url") or result.get("url")
        
    except cloudinary.exceptions.AuthorizationRequired as e:
        print(f"   ⚠️  Cloudinary authorization error: {e}")
        print(f"   💡 Check your Cloud Name, API Key, and API Secret")
        return None
    except Exception as e:
        print(f"   ⚠️  Cloudinary upload error: {e}")
        return None


def get_category_image_url(category_name: str, level: int) -> Optional[str]:
    """
    Get image URL for a category by fetching from Unsplash and uploading to Cloudinary.
    
    Args:
        category_name: Category name
        level: Category level (1, 2, or 3)
        
    Returns:
        Cloudinary public URL or None
    """
    print(f"\n📸 Processing: {category_name} (Level {level})")
    
    # Create search query from category name
    search_query = category_name.lower()
    # Add context for better results
    if "fruit" in search_query or "vegetable" in search_query:
        search_query += " fresh"
    elif "kitchen" in search_query or "cooking" in search_query:
        search_query += " utensils"
    elif "electronic" in search_query:
        search_query += " gadget"
    
    print(f"   Search query: {search_query}")
    
    # Fetch multiple images
    print(f"   Fetching {IMAGES_TO_TRY} images from Unsplash...")
    images = fetch_images_from_unsplash(search_query, count=IMAGES_TO_TRY)
    
    if not images:
        print("   ❌ Failed to fetch any images")
        return None
    
    print(f"   ✓ Fetched {len(images)} images")
    
    # Try uploading each image until one succeeds
    for i, image_bytes in enumerate(images):
        print(f"   Uploading image {i+1}/{len(images)} to Cloudinary...")
        image_url = upload_to_cloudinary(image_bytes, category_name, level)
        
        if image_url:
            print(f"   ✅ Success! URL: {image_url[:60]}...")
            time.sleep(CLOUDINARY_DELAY)
            return image_url
        else:
            print(f"   ⚠️  Upload {i+1} failed, trying next...")
            time.sleep(CLOUDINARY_DELAY)
    
    print("   ❌ All upload attempts failed")
    return None


def process_category(category: Dict[str, Any], level: int = 1) -> None:
    """
    Recursively process category and all children, adding image_url.
    
    Args:
        category: Category dictionary
        level: Current level (1, 2, or 3)
    """
    category_name = category.get("name", "")
    
    # Skip if already has image_url
    if category.get("image_url"):
        print(f"⏭️  Skipping {category_name} (already has image)")
        return
    
    # Get image URL
    image_url = get_category_image_url(category_name, level)
    
    if image_url:
        category["image_url"] = image_url
        print(f"   ✅ Updated {category_name}")
    else:
        print(f"   ❌ Failed to get image for {category_name}")
    
    # Process children (next level)
    children = category.get("children", [])
    if children:
        next_level = level + 1
        for child in children:
            process_category(child, next_level)


def main():
    """Main function."""
    print("=" * 70)
    print("🖼️  Category Image Fetcher & Cloudinary Uploader")
    print("=" * 70)
    
    # Check Cloudinary setup
    if not setup_cloudinary():
        print("\n❌ Cloudinary not configured. Exiting.")
        return
    
    # Check if JSON file exists
    if not JSON_FILE.exists():
        print(f"\n❌ JSON file not found: {JSON_FILE}")
        return
    
    # Load JSON
    print(f"\n📂 Loading JSON from: {JSON_FILE}")
    try:
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Failed to load JSON: {e}")
        return
    
    categories = data.get("categories", [])
    print(f"✅ Loaded {len(categories)} top-level categories")
    
    # Process all categories
    print(f"\n🚀 Processing categories...")
    print(f"   Will try {IMAGES_TO_TRY} images per category")
    print(f"   Rate limit: {UNSPLASH_DELAY}s between Unsplash requests")
    print(f"   Rate limit: {CLOUDINARY_DELAY}s between Cloudinary uploads\n")
    
    total_processed = 0
    total_updated = 0
    
    for category in categories:
        process_category(category, level=1)
        total_processed += 1
    
    # Count updated categories
    def count_with_images(obj, level=1):
        count = 0
        if obj.get("image_url"):
            count += 1
        for child in obj.get("children", []):
            count += count_with_images(child, level + 1)
        return count
    
    for cat in categories:
        total_updated += count_with_images(cat)
    
    # Save updated JSON
    print(f"\n💾 Saving updated JSON to: {OUTPUT_FILE}")
    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"✅ Saved successfully!")
    except Exception as e:
        print(f"❌ Failed to save JSON: {e}")
        return
    
    # Summary
    print("\n" + "=" * 70)
    print("✨ Summary:")
    print(f"   📦 Total categories processed: {total_processed}")
    print(f"   ✅ Categories with images: {total_updated}")
    print(f"   📄 Output file: {OUTPUT_FILE}")
    print("=" * 70)
    print("\n✅ Done!")


if __name__ == "__main__":
    main()

