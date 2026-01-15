#!/usr/bin/env python3
"""
Script to delete all existing categories and insert fresh categories from JSON file.

This script:
1. Safely deletes all categories (handles foreign key constraints)
2. Inserts new categories from JSON file with 3-level hierarchy
3. Preserves image URLs from the JSON

Usage:
    python scripts/reset_and_insert_categories.py [json_file_path]

Default JSON file: category.json or tem_with_images.json
"""

import os
import sys
import json
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass  # dotenv not required if env vars are set directly

from app.database import SessionLocal
from app.models.category import Category
from app.models.product import Product
from app.models.attribute import CategoryAttribute
from app.models.attribute_segment import AttributeSegment
from app.services.category_service import CategoryService
from app.schemas.category import CategoryCreate


def delete_all_categories(db):
    """
    Safely delete all categories from database.
    Handles foreign key constraints by:
    1. Setting product.category_id to NULL
    2. Deleting category attributes (CASCADE)
    3. Deleting attribute segments (CASCADE)
    4. Deleting all categories
    """
    print("=" * 70)
    print("🗑️  Deleting All Categories")
    print("=" * 70)
    
    try:
        # Step 1: Count existing data
        category_count = db.query(Category).count()
        product_count = db.query(Product).filter(Product.category_id.isnot(None)).count()
        attribute_count = db.query(CategoryAttribute).count()
        segment_count = db.query(AttributeSegment).count()
        
        print(f"\n📊 Current Database State:")
        print(f"   Categories: {category_count}")
        print(f"   Products with categories: {product_count}")
        print(f"   Category Attributes: {attribute_count}")
        print(f"   Attribute Segments: {segment_count}")
        
        if category_count == 0:
            print("\n✅ No categories to delete. Database is already empty.")
            return
        
        # Step 2: Set product.category_id to NULL (safe - ondelete="SET NULL" but we do it explicitly)
        print(f"\n🔄 Step 1: Setting product.category_id to NULL...")
        products_updated = db.query(Product).filter(Product.category_id.isnot(None)).update(
            {Product.category_id: None},
            synchronize_session=False
        )
        db.commit()
        print(f"   ✅ Updated {products_updated} products (category_id set to NULL)")
        
        # Step 3: Delete attribute segments (they have CASCADE but we delete explicitly for clarity)
        print(f"\n🔄 Step 2: Deleting attribute segments...")
        segments_deleted = db.query(AttributeSegment).delete()
        db.commit()
        print(f"   ✅ Deleted {segments_deleted} attribute segments")
        
        # Step 4: Delete category attributes (they have CASCADE but we delete explicitly)
        print(f"\n🔄 Step 3: Deleting category attributes...")
        attributes_deleted = db.query(CategoryAttribute).delete()
        db.commit()
        print(f"   ✅ Deleted {attributes_deleted} category attributes")
        
        # Step 5: Delete all categories (parent_id will be set to NULL automatically due to ondelete="SET NULL")
        print(f"\n🔄 Step 4: Deleting all categories...")
        categories_deleted = db.query(Category).delete()
        db.commit()
        print(f"   ✅ Deleted {categories_deleted} categories")
        
        print("\n✅ All categories deleted successfully!")
        print("=" * 70)
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error deleting categories: {e}")
        raise


def create_category_from_json(
    db: SessionLocal,
    category_service: CategoryService,
    category_data: Dict[str, Any],
    parent_id: Optional[uuid.UUID] = None,
    level: int = 1
) -> uuid.UUID:
    """
    Recursively create category from JSON data.
    
    Args:
        db: Database session
        category_service: Category service instance
        category_data: Category data from JSON
        parent_id: Parent category ID (None for root)
        level: Current level (1, 2, or 3)
        
    Returns:
        Created category ID
    """
    # Create category
    category_create = CategoryCreate(
        name=category_data["name"],
        description=category_data.get("description"),
        image_url=category_data.get("image_url"),
        parent_id=parent_id,
        display_order=category_data.get("display_order", 0),
    )
    
    category = category_service.create_category(
        category_create,
        max_depth=3,
        enforce_depth_limit=True
    )
    
    print(f"   {'  ' * (level - 1)}✅ Created Level {level}: {category.name}")
    
    # Process children recursively
    children = category_data.get("children", [])
    if children:
        next_level = level + 1
        for child_data in children:
            create_category_from_json(
                db,
                category_service,
                child_data,
                parent_id=category.id,
                level=next_level
            )
    
    return category.id


def insert_categories_from_json(db: SessionLocal, json_file_path: Path):
    """
    Insert categories from JSON file into database.
    
    Args:
        db: Database session
        json_file_path: Path to JSON file
    """
    print("\n" + "=" * 70)
    print("📥 Inserting Categories from JSON")
    print("=" * 70)
    
    # Load JSON
    print(f"\n📂 Loading JSON from: {json_file_path}")
    try:
        with open(json_file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ JSON file not found: {json_file_path}")
        return
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        return
    
    categories_data = data.get("categories", [])
    if not categories_data:
        print("❌ No categories found in JSON file")
        return
    
    print(f"✅ Loaded {len(categories_data)} top-level categories")
    
    # Create category service
    category_service = CategoryService(db)
    
    # Insert categories
    print(f"\n🚀 Inserting categories...")
    total_inserted = 0
    
    try:
        for category_data in categories_data:
            create_category_from_json(
                db,
                category_service,
                category_data,
                parent_id=None,
                level=1
            )
            total_inserted += 1
        
        db.commit()
        
        # Count total categories inserted (including children)
        total_categories = db.query(Category).count()
        
        print(f"\n✅ Successfully inserted categories!")
        print(f"   Top-level categories: {total_inserted}")
        print(f"   Total categories (including children): {total_categories}")
        print("=" * 70)
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error inserting categories: {e}")
        raise


def main():
    """Main function."""
    print("=" * 70)
    print("🔄 Category Reset & Insert Script")
    print("=" * 70)
    
    # Determine JSON file path
    if len(sys.argv) > 1:
        json_file = Path(sys.argv[1])
    else:
        # Try to find JSON file in project root
        project_root = Path(__file__).parent.parent.parent
        json_file = project_root / "tem_with_images.json"
        if not json_file.exists():
            json_file = project_root / "category.json"
        if not json_file.exists():
            json_file = project_root / "tem.json"
    
    if not json_file.exists():
        print(f"\n❌ JSON file not found: {json_file}")
        print("   Usage: python scripts/reset_and_insert_categories.py [json_file_path]")
        return
    
    print(f"\n📄 Using JSON file: {json_file}")
    
    # Confirm action
    print("\n⚠️  WARNING: This will DELETE ALL existing categories!")
    print("   - All products will have category_id set to NULL")
    print("   - All category attributes will be deleted")
    print("   - All attribute segments will be deleted")
    print("   - All categories will be deleted")
    print("   - New categories will be inserted from JSON file")
    
    response = input("\nAre you sure you want to continue? (yes/no): ").strip().lower()
    if response not in ["yes", "y"]:
        print("❌ Operation cancelled.")
        return
    
    # Connect to database
    db = SessionLocal()
    
    try:
        # Step 1: Delete all categories
        delete_all_categories(db)
        
        # Step 2: Insert new categories
        insert_categories_from_json(db, json_file)
        
        print("\n" + "=" * 70)
        print("✨ Operation Complete!")
        print("=" * 70)
        print("\n✅ Categories have been reset and new categories inserted successfully!")
        
    except Exception as e:
        print(f"\n❌ Operation failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()

