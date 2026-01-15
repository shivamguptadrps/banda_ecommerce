#!/usr/bin/env python3
"""
Script to clean up duplicate attributes in the database.

This script removes attributes from child categories that duplicate
inherited attributes from parent categories.

Logic:
1. For each category, check if it has attributes with is_inherited=True
2. For each child category, check if it has attributes with the same slug
3. If found, remove the duplicate from child (keep parent's inherited attribute)
"""

import sys
import uuid
from pathlib import Path
from typing import List, Dict, Set

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
from app.models.attribute import CategoryAttribute
from app.services.attribute_service import AttributeService


def get_category_children(category_id: uuid.UUID, db: SessionLocal) -> List[Category]:
    """Get all direct children of a category."""
    return db.query(Category).filter(
        Category.parent_id == category_id,
        Category.is_active == True
    ).all()


def get_all_descendants(category_id: uuid.UUID, db: SessionLocal) -> List[Category]:
    """Get all descendants (children, grandchildren, etc.) of a category."""
    descendants = []
    children = get_category_children(category_id, db)
    
    for child in children:
        descendants.append(child)
        # Recursively get descendants of this child
        descendants.extend(get_all_descendants(child.id, db))
    
    return descendants


def cleanup_duplicate_attributes(db: SessionLocal, dry_run: bool = True):
    """
    Clean up duplicate attributes.
    
    Args:
        db: Database session
        dry_run: If True, only report what would be deleted without actually deleting
    """
    attribute_service = AttributeService(db)
    
    print("=" * 70)
    print("[START] Cleanup Duplicate Attributes Script")
    print("=" * 70)
    if dry_run:
        print("[INFO] DRY RUN MODE - No changes will be made")
    print()
    
    # Get all categories
    all_categories = db.query(Category).filter(Category.is_active == True).all()
    
    duplicates_found = []
    total_deleted = 0
    
    # Process each category
    for category in all_categories:
        # Get all inherited attributes from this category
        inherited_attrs = db.query(CategoryAttribute).filter(
            CategoryAttribute.category_id == category.id,
            CategoryAttribute.is_inherited == True,
            CategoryAttribute.is_active == True
        ).all()
        
        if not inherited_attrs:
            continue
        
        # Get all descendants of this category
        descendants = get_all_descendants(category.id, db)
        
        # For each inherited attribute, check descendants for duplicates
        for inherited_attr in inherited_attrs:
            for descendant in descendants:
                # Check if descendant has an attribute with the same slug
                duplicate = db.query(CategoryAttribute).filter(
                    CategoryAttribute.category_id == descendant.id,
                    CategoryAttribute.slug == inherited_attr.slug,
                    CategoryAttribute.is_active == True
                ).first()
                
                if duplicate:
                    duplicates_found.append({
                        "parent_category": category.name,
                        "parent_attr": inherited_attr.name,
                        "parent_attr_slug": inherited_attr.slug,
                        "child_category": descendant.name,
                        "duplicate_attr": duplicate.name,
                        "duplicate_id": duplicate.id
                    })
                    
                    if not dry_run:
                        # Delete the duplicate
                        db.delete(duplicate)
                        total_deleted += 1
                        print(f"[DELETE] Removed duplicate attribute '{duplicate.name}' "
                              f"(slug: '{duplicate.slug}') from category '{descendant.name}' "
                              f"(inherited from '{category.name}')")
    
    # Print summary
    print("\n" + "=" * 70)
    print("[SUMMARY]")
    print("=" * 70)
    print(f"Total duplicate attributes found: {len(duplicates_found)}")
    
    if duplicates_found:
        print("\n[DUPLICATES FOUND]:")
        for dup in duplicates_found:
            print(f"  - '{dup['duplicate_attr']}' in '{dup['child_category']}' "
                  f"(duplicates inherited '{dup['parent_attr']}' from '{dup['parent_category']}')")
    
    if not dry_run:
        db.commit()
        print(f"\n[SUCCESS] Deleted {total_deleted} duplicate attributes")
    else:
        print(f"\n[INFO] DRY RUN - Would delete {len(duplicates_found)} duplicate attributes")
        print("[INFO] Run with --execute to actually delete duplicates")
    
    print("=" * 70)


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Clean up duplicate attributes")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually delete duplicates (default is dry-run)"
    )
    
    args = parser.parse_args()
    
    db = SessionLocal()
    
    try:
        cleanup_duplicate_attributes(db, dry_run=not args.execute)
    except Exception as e:
        print(f"\n[ERROR] Operation failed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
