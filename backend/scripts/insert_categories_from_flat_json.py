#!/usr/bin/env python3
"""
Script to insert categories from a flat JSON structure with parent_id references.

The JSON should have this structure:
{
  "categories": [
    {
      "id": "uuid",
      "parent_id": "uuid or null",
      "name": "Category Name",
      "slug": "category-slug",
      "description": "...",
      "image_url": "...",
      "display_order": 1,
      "is_active": true
    }
  ]
}

Usage:
    python scripts/insert_categories_from_flat_json.py [json_file_path]
"""

import sys
import json
import uuid
from pathlib import Path
from typing import Optional, Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

from app.database import SessionLocal
from app.models.category import Category
from app.services.category_service import CategoryService
from app.schemas.category import CategoryCreate


def insert_categories_from_flat_json(db: SessionLocal, json_file_path: Path):
    """
    Insert categories from flat JSON structure with parent_id references.
    
    Args:
        db: Database session
        json_file_path: Path to JSON file
    """
    print("=" * 70)
    print("[START] Insert Categories from Flat JSON")
    print("=" * 70)
    
    # Load JSON
    print(f"\n[INFO] Loading JSON from: {json_file_path}")
    try:
        with open(json_file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"[ERROR] JSON file not found: {json_file_path}")
        return
    except json.JSONDecodeError as e:
        print(f"[ERROR] Invalid JSON: {e}")
        return
    
    categories_data = data.get("categories", [])
    if not categories_data:
        print("[ERROR] No categories found in JSON file")
        return
    
    print(f"[OK] Loaded {len(categories_data)} categories from JSON")
    
    # Create category service
    category_service = CategoryService(db)
    
    # Create mapping from old UUIDs to new category objects
    uuid_to_category: Dict[str, Category] = {}
    created_categories: Dict[str, Category] = {}
    
    # Sort categories: root categories first (parent_id is None), then by depth
    def get_category_depth(cat_data: Dict[str, Any], all_cats: list) -> int:
        """Calculate depth of category in hierarchy."""
        if cat_data.get("parent_id") is None:
            return 0
        
        parent_id = cat_data.get("parent_id")
        parent = next((c for c in all_cats if c.get("id") == parent_id), None)
        if parent:
            return 1 + get_category_depth(parent, all_cats)
        return 0
    
    # Sort by depth (parents first)
    sorted_categories = sorted(categories_data, key=lambda x: get_category_depth(x, categories_data))
    
    print(f"\n[INFO] Inserting categories in order (parents first)...")
    print()
    
    inserted_count = 0
    skipped_count = 0
    error_count = 0
    
    try:
        for cat_data in sorted_categories:
            old_id = cat_data.get("id")
            name = cat_data.get("name")
            slug = cat_data.get("slug")
            parent_id_old = cat_data.get("parent_id")
            
            if not name:
                print(f"  [SKIP] Category with ID {old_id} has no name, skipping...")
                skipped_count += 1
                continue
            
            # Check if category already exists by slug
            existing = category_service.get_category_by_slug(slug)
            if existing:
                print(f"  [SKIP] Category '{name}' (slug: '{slug}') already exists, skipping...")
                created_categories[old_id] = existing
                skipped_count += 1
                continue
            
            # Map parent_id from old UUID to new category
            parent_id_new = None
            if parent_id_old:
                parent_category = created_categories.get(parent_id_old)
                if parent_category:
                    parent_id_new = parent_category.id
                else:
                    print(f"  [WARNING] Parent category with ID {parent_id_old} not found for '{name}'")
            
            try:
                # Create category
                category_create = CategoryCreate(
                    name=name,
                    description=cat_data.get("description"),
                    image_url=cat_data.get("image_url"),
                    parent_id=parent_id_new,
                    display_order=cat_data.get("display_order", 0),
                )
                
                category = category_service.create_category(
                    category_create,
                    max_depth=3,
                    enforce_depth_limit=True
                )
                
                created_categories[old_id] = category
                uuid_to_category[old_id] = category
                inserted_count += 1
                
                level = get_category_depth(cat_data, categories_data) + 1
                indent = "  " * level
                print(f"{indent}[OK] Level {level}: {category.name}")
                
            except Exception as e:
                print(f"  [ERROR] Failed to create category '{name}': {e}")
                error_count += 1
        
        db.commit()
        
        # Final summary
        total_in_db = db.query(Category).count()
        
        print("\n" + "=" * 70)
        print("[SUCCESS] Category insertion completed!")
        print("=" * 70)
        print(f"  - Inserted: {inserted_count} categories")
        print(f"  - Skipped (already exist): {skipped_count} categories")
        print(f"  - Errors: {error_count} categories")
        print(f"  - Total in database: {total_in_db} categories")
        print("=" * 70)
        
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Error inserting categories: {e}")
        import traceback
        traceback.print_exc()
        raise


def main():
    """Main function."""
    # Determine JSON file path
    if len(sys.argv) > 1:
        json_file = Path(sys.argv[1])
    else:
        # Default to the categories JSON file in scripts directory
        script_dir = Path(__file__).parent
        json_file = script_dir / "categories_20260114_132722.json"
    
    if not json_file.exists():
        print(f"[ERROR] JSON file not found: {json_file}")
        print("   Usage: python scripts/insert_categories_from_flat_json.py [json_file_path]")
        return
    
    print(f"[INFO] Using JSON file: {json_file}")
    
    # Connect to database
    db = SessionLocal()
    
    try:
        insert_categories_from_flat_json(db, json_file)
    except Exception as e:
        print(f"\n[ERROR] Operation failed: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
