#!/usr/bin/env python3
"""
Script to populate products with images from Unsplash for Fresh Vegetables category.
Creates 10 products with images, sell units, and inventory.

Usage:
    python scripts/populate_products_with_images.py

Requirements:
    - Cloudinary credentials in .env
    - Unsplash API key (optional - can use direct URLs)
    - Database connection configured
"""

import os
import sys
import time
import random
import uuid
import re
from pathlib import Path
from decimal import Decimal
from typing import Optional, List, Dict, Any
import requests

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.category import Category
from app.models.vendor import Vendor
from app.models.user import User
from app.models.product import Product, ProductImage, SellUnit, Inventory
from app.models.enums import StockUnit, UserRole
from app.config import settings

try:
    import cloudinary
    import cloudinary.uploader
except ImportError:
    print("[ERROR] 'cloudinary' package not installed. Install with: pip install cloudinary")
    sys.exit(1)

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

# ============== Configuration ==============

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "Vr6V_-RNO3OIkVDUa7AUhxByg4SStfxQR4BxQ1drbpA")

UNSPLASH_DELAY = 0.5
CLOUDINARY_DELAY = 0.3

# Product data based on Blinkit-style fresh vegetables
PRODUCTS_DATA = [
    {
        "name": "Fresh Onion (Pyaz)",
        "description": "Premium quality fresh onions, perfect for daily cooking. Clean, firm, and full of flavor.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "500g", "unit_value": 0.5, "price": 16.0, "compare_price": 20.0},
            {"label": "1 Kg", "unit_value": 1.0, "price": 32.0, "compare_price": 40.0},
            {"label": "2 Kg", "unit_value": 2.0, "price": 60.0, "compare_price": 75.0},
        ],
        "inventory": 50.0,
        "unsplash_query": "fresh onion vegetables",
    },
    {
        "name": "Fresh Tomato",
        "description": "Ripe, red, and juicy tomatoes. Perfect for salads, curries, and cooking.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "500g", "unit_value": 0.5, "price": 25.0, "compare_price": 30.0},
            {"label": "1 Kg", "unit_value": 1.0, "price": 48.0, "compare_price": 60.0},
        ],
        "inventory": 40.0,
        "unsplash_query": "fresh red tomatoes",
    },
    {
        "name": "Fresh Potato",
        "description": "Fresh, firm potatoes ideal for all cooking needs. Clean and ready to use.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "500g", "unit_value": 0.5, "price": 20.0, "compare_price": 25.0},
            {"label": "1 Kg", "unit_value": 1.0, "price": 38.0, "compare_price": 48.0},
            {"label": "2.5 Kg", "unit_value": 2.5, "price": 90.0, "compare_price": 110.0},
        ],
        "inventory": 60.0,
        "unsplash_query": "fresh potatoes vegetables",
    },
    {
        "name": "Fresh Green Chilli (Hari Mirch)",
        "description": "Spicy green chillies, fresh and crisp. Perfect for adding heat to your dishes.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "100g", "unit_value": 0.1, "price": 9.0, "compare_price": 12.0},
            {"label": "250g", "unit_value": 0.25, "price": 20.0, "compare_price": 25.0},
        ],
        "inventory": 15.0,
        "unsplash_query": "fresh green chillies",
    },
    {
        "name": "Fresh Ginger (Adrak)",
        "description": "Fresh, aromatic ginger root. Great for cooking and health benefits.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "100g", "unit_value": 0.1, "price": 20.0, "compare_price": 25.0},
            {"label": "250g", "unit_value": 0.25, "price": 45.0, "compare_price": 55.0},
        ],
        "inventory": 20.0,
        "unsplash_query": "fresh ginger root",
    },
    {
        "name": "Fresh Coriander Bunch (Dhaniya Patta)",
        "description": "Fresh coriander leaves, perfect for garnishing and flavoring dishes.",
        "stock_unit": StockUnit.PIECE,
        "sell_units": [
            {"label": "1 Bunch", "unit_value": 1.0, "price": 5.0, "compare_price": 8.0},
            {"label": "3 Bunches", "unit_value": 3.0, "price": 12.0, "compare_price": 18.0},
        ],
        "inventory": 100.0,
        "unsplash_query": "fresh coriander leaves",
    },
    {
        "name": "Fresh Lemon",
        "description": "Juicy, fresh lemons. Rich in Vitamin C, perfect for drinks and cooking.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "250g (4-5 pieces)", "unit_value": 0.25, "price": 19.0, "compare_price": 25.0},
            {"label": "500g", "unit_value": 0.5, "price": 35.0, "compare_price": 45.0},
        ],
        "inventory": 30.0,
        "unsplash_query": "fresh yellow lemons",
    },
    {
        "name": "Fresh Cucumber (Kheera)",
        "description": "Crisp, fresh cucumbers. Perfect for salads, raita, and healthy snacking.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "500g (2-3 pieces)", "unit_value": 0.5, "price": 25.0, "compare_price": 32.0},
            {"label": "1 Kg", "unit_value": 1.0, "price": 45.0, "compare_price": 58.0},
        ],
        "inventory": 35.0,
        "unsplash_query": "fresh green cucumber",
    },
    {
        "name": "Fresh Bell Pepper (Capsicum)",
        "description": "Colorful, crisp bell peppers. Great for salads, stir-fries, and stuffing.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "250g (2-3 pieces)", "unit_value": 0.25, "price": 40.0, "compare_price": 50.0},
            {"label": "500g", "unit_value": 0.5, "price": 75.0, "compare_price": 95.0},
        ],
        "inventory": 25.0,
        "unsplash_query": "fresh bell peppers colorful",
    },
    {
        "name": "Fresh Sweet Corn",
        "description": "Sweet, tender corn. Perfect for boiling, grilling, or making corn recipes.",
        "stock_unit": StockUnit.PIECE,
        "sell_units": [
            {"label": "2 Pieces", "unit_value": 2.0, "price": 18.0, "compare_price": 24.0},
            {"label": "4 Pieces", "unit_value": 4.0, "price": 32.0, "compare_price": 42.0},
            {"label": "6 Pieces", "unit_value": 6.0, "price": 45.0, "compare_price": 60.0},
        ],
        "inventory": 80.0,
        "unsplash_query": "fresh sweet corn",
    },
]


def setup_cloudinary():
    """Configure Cloudinary."""
    if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        print("\n[WARNING] Cloudinary credentials incomplete!")
        print("   Required: Cloudinary Cloud Name, API Key, API Secret")
        print("   Get these from: https://console.cloudinary.com/settings/api")
        return False
    
    try:
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
        )
        print("[SUCCESS] Cloudinary configured")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to configure Cloudinary: {e}")
        return False


def fetch_image_from_unsplash(query: str) -> tuple[Optional[bytes], Optional[str]]:
    """
    Fetch image from Unsplash.
    Returns: (image_bytes, image_url)
    """
    try:
        if UNSPLASH_ACCESS_KEY:
            # Use Unsplash API
            url = "https://api.unsplash.com/search/photos"
            headers = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}
            params = {
                "query": query,
                "per_page": 5,
                "orientation": "squarish",
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            results = data.get("results", [])
            
            if results:
                # Get the best quality URL
                image_url = results[0]["urls"].get("regular") or results[0]["urls"].get("small")
                # Download image bytes for Cloudinary upload
                img_response = requests.get(image_url, timeout=10)
                img_response.raise_for_status()
                time.sleep(UNSPLASH_DELAY)
                return img_response.content, image_url
        else:
            # Use direct Unsplash URLs (no API key needed)
            photo_ids = [
                "1567306226416-28f0efdc88ca",  # Fresh produce
                "1522335789203-aabd1fc69bc8",  # Vegetables
                "1567620905732-2d1ec7ab7445",  # Fruits
                "1504674900247-0877df9cc836",  # Grocery
                "1512621777131-0be0c59b9528",  # Food
            ]
            photo_id = random.choice(photo_ids)
            image_url = f"https://images.unsplash.com/photo-{photo_id}?w=600&h=600&fit=crop&q=80"
            # Download for potential Cloudinary upload
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            time.sleep(UNSPLASH_DELAY)
            return response.content, image_url
            
    except Exception as e:
        print(f"   [WARNING] Unsplash error: {e}")
    
    return None, None


def upload_to_cloudinary(image_bytes: bytes, product_name: str) -> Optional[str]:
    """Upload image to Cloudinary or return direct Unsplash URL."""
    # If Cloudinary is not configured, use direct Unsplash URLs
    if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        # Return a direct Unsplash URL (we'll use the image we fetched)
        # For now, we'll use a placeholder approach - store the image bytes and return a URL
        # Actually, let's use Unsplash Source API for direct URLs
        print("   [INFO] Cloudinary not configured, using direct Unsplash URLs")
        # We'll generate a direct Unsplash URL based on the query
        return None  # Will be handled in the calling function
    
    try:
        # Create safe public_id from product name
        safe_name = re.sub(r'[^a-zA-Z0-9]', '_', product_name.lower())[:50]
        public_id = f"banda_products/{safe_name}"
        
        result = cloudinary.uploader.upload(
            image_bytes,
            folder="banda_products",
            public_id=public_id,
            transformation=[
                {"width": 600, "height": 600, "crop": "fill", "gravity": "auto"},
                {"quality": "auto", "fetch_format": "auto"},
            ],
            resource_type="image",
        )
        
        time.sleep(CLOUDINARY_DELAY)
        return result.get("secure_url") or result.get("url")
        
    except Exception as e:
        print(f"   [WARNING] Cloudinary upload error: {e}")
        return None




def get_or_create_vendor(db: Session) -> Vendor:
    """Get existing vendor or create a test vendor."""
    # Try to get first active vendor
    vendor = db.query(Vendor).filter(Vendor.is_active == True).first()
    
    if vendor:
        print(f"[INFO] Using existing vendor: {vendor.shop_name}")
        return vendor
    
    # Create a test vendor user and vendor
    print("[INFO] Creating test vendor...")
    
    # Create user
    user = User(
        id=uuid.uuid4(),
        email="test_vendor@banda.com",
        name="Test Fresh Vegetables Vendor",
        role=UserRole.VENDOR,
        is_active=True,
    )
    from app.utils.security import hash_password
    user.password_hash = hash_password("test123")
    db.add(user)
    db.flush()
    
    # Create vendor
    vendor = Vendor(
        id=uuid.uuid4(),
        user_id=user.id,
        shop_name="Fresh Vegetables Store",
        description="Your trusted source for fresh vegetables",
        address_line_1="123 Market Street",
        city="Banda",
        state="Uttar Pradesh",
        pincode="210001",
        phone="9876543210",
        is_active=True,
        is_verified=True,
        delivery_radius_km=Decimal("10.0"),
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    
    print(f"[SUCCESS] Created vendor: {vendor.shop_name}")
    return vendor


def get_category_by_name(db: Session, name: str, parent_id: Optional[uuid.UUID] = None) -> Optional[Category]:
    """Get category by name."""
    query = db.query(Category).filter(Category.name == name, Category.is_active == True)
    if parent_id:
        query = query.filter(Category.parent_id == parent_id)
    else:
        query = query.filter(Category.parent_id.is_(None))
    return query.first()


def create_slug(name: str) -> str:
    """Create URL-friendly slug from name."""
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', name.lower())
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')


def create_product(
    db: Session,
    vendor: Vendor,
    category: Category,
    product_data: Dict[str, Any],
    image_url: str,
) -> Product:
    """Create a product with all related data."""
    # Create product
    product = Product(
        id=uuid.uuid4(),
        vendor_id=vendor.id,
        category_id=category.id,
        name=product_data["name"],
        slug=f"{create_slug(product_data['name'])}-{uuid.uuid4().hex[:8]}",
        description=product_data["description"],
        stock_unit=product_data["stock_unit"],
        return_eligible=True,
        return_window_days=1,
        return_conditions="Fresh vegetables - return within 1 day if damaged or spoiled",
        is_active=True,
        is_deleted=False,
    )
    db.add(product)
    db.flush()
    
    # Create primary product image
    product_image = ProductImage(
        id=uuid.uuid4(),
        product_id=product.id,
        image_url=image_url,
        display_order=0,
        is_primary=True,
    )
    db.add(product_image)
    
    # Create sell units
    for unit_data in product_data["sell_units"]:
        sell_unit = SellUnit(
            id=uuid.uuid4(),
            product_id=product.id,
            label=unit_data["label"],
            unit_value=Decimal(str(unit_data["unit_value"])),
            price=Decimal(str(unit_data["price"])),
            compare_price=Decimal(str(unit_data["compare_price"])) if unit_data.get("compare_price") else None,
            is_active=True,
        )
        db.add(sell_unit)
    
    # Create inventory
    inventory = Inventory(
        id=uuid.uuid4(),
        product_id=product.id,
        available_quantity=Decimal(str(product_data["inventory"])),
        reserved_quantity=Decimal("0"),
        low_stock_threshold=Decimal("5"),
    )
    db.add(inventory)
    
    db.commit()
    db.refresh(product)
    
    return product


def main():
    """Main function."""
    print("=" * 70)
    print("  Product Populator with Unsplash Images")
    print("=" * 70)
    print()
    
    # Setup Cloudinary (optional - will use direct URLs if not configured)
    cloudinary_configured = setup_cloudinary()
    if not cloudinary_configured:
        print("\n[WARNING] Cloudinary not configured. Will use direct Unsplash URLs.")
        print("   Images will be linked directly from Unsplash (no upload).")
        print()
    
    # Database session
    db = SessionLocal()
    
    try:
        # Get or create vendor
        vendor = get_or_create_vendor(db)
        
        # Get categories
        print("\n[INFO] Finding categories...")
        fresh_fruits_veg = get_category_by_name(db, "Fresh Fruits & Vegetables")
        if not fresh_fruits_veg:
            print("[ERROR] Category 'Fresh Fruits & Vegetables' not found!")
            print("   Please run category population script first.")
            return
        
        fresh_vegetables = get_category_by_name(db, "Fresh Vegetables", parent_id=fresh_fruits_veg.id)
        if not fresh_vegetables:
            print("[ERROR] Category 'Fresh Vegetables' not found!")
            print("   Please run category population script first.")
            return
        
        print(f"[SUCCESS] Found category: {fresh_vegetables.name}")
        
        # Create products
        print(f"\n[INFO] Creating {len(PRODUCTS_DATA)} products...")
        print()
        
        created_count = 0
        failed_count = 0
        
        for i, product_data in enumerate(PRODUCTS_DATA, 1):
            print(f"[{i}/{len(PRODUCTS_DATA)}] Processing: {product_data['name']}")
            
            # Fetch image from Unsplash
            print(f"   Fetching image from Unsplash (query: {product_data['unsplash_query']})...")
            image_bytes, unsplash_url = fetch_image_from_unsplash(product_data['unsplash_query'])
            
            if not image_bytes or not unsplash_url:
                print(f"   [WARNING] Failed to fetch image, using fallback...")
                # Try generic vegetable image
                image_bytes, unsplash_url = fetch_image_from_unsplash("fresh vegetables")
            
            if not image_bytes or not unsplash_url:
                print(f"   [ERROR] Could not fetch image. Skipping product.")
                failed_count += 1
                continue
            
            # Upload to Cloudinary or use direct URL
            image_url = None
            if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
                print(f"   Uploading to Cloudinary...")
                image_url = upload_to_cloudinary(image_bytes, product_data['name'])
                if image_url:
                    print(f"   [SUCCESS] Image uploaded: {image_url[:60]}...")
            
            # Fallback to direct Unsplash URL if Cloudinary upload failed or not configured
            if not image_url:
                print(f"   Using direct Unsplash URL...")
                image_url = unsplash_url
                print(f"   [SUCCESS] Using image URL: {image_url[:60]}...")
            
            if not image_url:
                print(f"   [ERROR] Failed to get image URL. Skipping product.")
                failed_count += 1
                continue
            
            # Create product
            print(f"   Creating product in database...")
            try:
                product = create_product(db, vendor, fresh_vegetables, product_data, image_url)
                print(f"   [SUCCESS] Product created: {product.name} (ID: {product.id})")
                created_count += 1
            except Exception as e:
                print(f"   [ERROR] Failed to create product: {e}")
                failed_count += 1
                db.rollback()
                continue
            
            print()
            time.sleep(0.5)  # Small delay between products
        
        # Summary
        print("=" * 70)
        print("  Summary:")
        print(f"   [SUCCESS] Products created: {created_count}")
        print(f"   [FAILED] Products failed: {failed_count}")
        print(f"   [TOTAL] Processed: {len(PRODUCTS_DATA)}")
        print("=" * 70)
        print("\n[SUCCESS] Done!")
        
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
