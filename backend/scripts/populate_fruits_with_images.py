#!/usr/bin/env python3
"""
Script to populate fresh fruits products with images from Unsplash.
Creates 10 products with images, sell units, and inventory.

Usage:
    python scripts/populate_fruits_with_images.py
"""

import os
import sys
import time
import random
import uuid
import re
from pathlib import Path
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
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
from app.utils.security import hash_password

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

# Product data based on Blinkit-style fresh fruits
FRUITS_DATA = [
    {
        "name": "Fresh Banana (Kela)",
        "description": "Sweet, ripe bananas. Rich in potassium and perfect for a healthy snack.",
        "stock_unit": StockUnit.PIECE,
        "sell_units": [
            {"label": "3 Pieces", "unit_value": 3.0, "price": 39.0, "compare_price": 50.0},
            {"label": "6 Pieces", "unit_value": 6.0, "price": 75.0, "compare_price": 95.0},
            {"label": "12 Pieces (Dozen)", "unit_value": 12.0, "price": 140.0, "compare_price": 180.0},
        ],
        "inventory": 150.0,
        "unsplash_query": "fresh yellow bananas",
    },
    {
        "name": "Fresh Apple (Seb)",
        "description": "Crisp, juicy apples. Kinnaur variety, perfect for snacking and cooking.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "500g (4-5 pieces)", "unit_value": 0.5, "price": 138.0, "compare_price": 170.0},
            {"label": "1 Kg", "unit_value": 1.0, "price": 260.0, "compare_price": 320.0},
        ],
        "inventory": 30.0,
        "unsplash_query": "fresh red apples",
    },
    {
        "name": "Fresh Orange (Santra)",
        "description": "Sweet, juicy Nagpur oranges. Rich in Vitamin C, perfect for fresh juice.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "500g (4-6 pieces)", "unit_value": 0.5, "price": 92.0, "compare_price": 115.0},
            {"label": "1 Kg", "unit_value": 1.0, "price": 175.0, "compare_price": 220.0},
        ],
        "inventory": 40.0,
        "unsplash_query": "fresh oranges",
    },
    {
        "name": "Fresh Kinnow Orange",
        "description": "Sweet and tangy Kinnow oranges. Easy to peel, perfect for snacking.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "500g (5-6 pieces)", "unit_value": 0.5, "price": 40.0, "compare_price": 50.0},
            {"label": "1 Kg", "unit_value": 1.0, "price": 75.0, "compare_price": 95.0},
        ],
        "inventory": 50.0,
        "unsplash_query": "fresh kinnow oranges",
    },
    {
        "name": "Fresh Mango (Aam)",
        "description": "Sweet, juicy mangoes. Perfect for eating fresh or making desserts.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "500g (2-3 pieces)", "unit_value": 0.5, "price": 80.0, "compare_price": 100.0},
            {"label": "1 Kg", "unit_value": 1.0, "price": 150.0, "compare_price": 190.0},
            {"label": "2 Kg", "unit_value": 2.0, "price": 280.0, "compare_price": 360.0},
        ],
        "inventory": 25.0,
        "unsplash_query": "fresh mangoes",
    },
    {
        "name": "Fresh Pomegranate (Anar)",
        "description": "Sweet, ruby-red pomegranate seeds. Rich in antioxidants and vitamins.",
        "stock_unit": StockUnit.PIECE,
        "sell_units": [
            {"label": "1 Piece", "unit_value": 1.0, "price": 60.0, "compare_price": 75.0},
            {"label": "2 Pieces", "unit_value": 2.0, "price": 110.0, "compare_price": 140.0},
            {"label": "4 Pieces", "unit_value": 4.0, "price": 200.0, "compare_price": 260.0},
        ],
        "inventory": 60.0,
        "unsplash_query": "fresh pomegranate",
    },
    {
        "name": "Fresh Grapes (Angur)",
        "description": "Sweet, seedless grapes. Perfect for snacking, salads, and desserts.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "500g", "unit_value": 0.5, "price": 120.0, "compare_price": 150.0},
            {"label": "1 Kg", "unit_value": 1.0, "price": 220.0, "compare_price": 280.0},
        ],
        "inventory": 35.0,
        "unsplash_query": "fresh grapes",
    },
    {
        "name": "Fresh Watermelon (Tarbuj)",
        "description": "Sweet, juicy watermelon. Perfect for hot days, rich in water and vitamins.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "1 Kg", "unit_value": 1.0, "price": 25.0, "compare_price": 32.0},
            {"label": "2 Kg", "unit_value": 2.0, "price": 45.0, "compare_price": 58.0},
            {"label": "5 Kg (Whole)", "unit_value": 5.0, "price": 100.0, "compare_price": 130.0},
        ],
        "inventory": 80.0,
        "unsplash_query": "fresh watermelon",
    },
    {
        "name": "Fresh Papaya (Papita)",
        "description": "Ripe, sweet papaya. Great for breakfast, smoothies, and digestive health.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "500g (Half)", "unit_value": 0.5, "price": 30.0, "compare_price": 40.0},
            {"label": "1 Kg (Whole)", "unit_value": 1.0, "price": 55.0, "compare_price": 70.0},
        ],
        "inventory": 45.0,
        "unsplash_query": "fresh papaya",
    },
    {
        "name": "Fresh Guava (Amrood)",
        "description": "Crisp, sweet guavas. Rich in Vitamin C, perfect for snacking.",
        "stock_unit": StockUnit.KG,
        "sell_units": [
            {"label": "500g (4-5 pieces)", "unit_value": 0.5, "price": 45.0, "compare_price": 60.0},
            {"label": "1 Kg", "unit_value": 1.0, "price": 85.0, "compare_price": 110.0},
        ],
        "inventory": 40.0,
        "unsplash_query": "fresh guava",
    },
]


def setup_cloudinary():
    """Configure Cloudinary."""
    if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        print("\n[WARNING] Cloudinary credentials incomplete!")
        print("   Will use direct Unsplash URLs (no upload).")
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


def fetch_image_from_unsplash(query: str) -> Tuple[Optional[bytes], Optional[str]]:
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
                "1567620905732-2d1ec7ab7445",  # Fruits
                "1567306226416-28f0efdc88ca",  # Fresh produce
                "1522335789203-aabd1fc69bc8",  # Vegetables/Fruits
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
    if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        return None
    
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
        email="test_vendor_fruits@banda.com",
        name="Test Fresh Fruits Vendor",
        role=UserRole.VENDOR,
        is_active=True,
        password_hash=hash_password("test123"),
    )
    db.add(user)
    db.flush()
    
    # Create vendor
    vendor = Vendor(
        id=uuid.uuid4(),
        user_id=user.id,
        shop_name="Fresh Fruits Store",
        description="Your trusted source for fresh fruits",
        address_line_1="123 Market Street",
        city="Banda",
        state="Uttar Pradesh",
        pincode="210001",
        phone="9876543211",
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
        return_conditions="Fresh fruits - return within 1 day if damaged or spoiled",
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
    print("  Fresh Fruits Product Populator with Unsplash Images")
    print("=" * 70)
    print()
    
    # Setup Cloudinary
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
        
        fresh_fruits = get_category_by_name(db, "Fresh Fruits", parent_id=fresh_fruits_veg.id)
        if not fresh_fruits:
            print("[ERROR] Category 'Fresh Fruits' not found!")
            print("   Please run category population script first.")
            return
        
        print(f"[SUCCESS] Found category: {fresh_fruits.name}")
        
        # Create products
        print(f"\n[INFO] Creating {len(FRUITS_DATA)} fresh fruits products...")
        print()
        
        created_count = 0
        failed_count = 0
        
        for i, product_data in enumerate(FRUITS_DATA, 1):
            print(f"[{i}/{len(FRUITS_DATA)}] Processing: {product_data['name']}")
            
            # Fetch image from Unsplash
            print(f"   Fetching image from Unsplash (query: {product_data['unsplash_query']})...")
            image_bytes, unsplash_url = fetch_image_from_unsplash(product_data['unsplash_query'])
            
            if not image_bytes or not unsplash_url:
                print(f"   [WARNING] Failed to fetch image, using fallback...")
                # Try generic fruit image
                image_bytes, unsplash_url = fetch_image_from_unsplash("fresh fruits")
            
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
                product = create_product(db, vendor, fresh_fruits, product_data, image_url)
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
        print(f"   [TOTAL] Processed: {len(FRUITS_DATA)}")
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
