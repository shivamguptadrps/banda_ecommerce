#!/usr/bin/env python3
"""
Script to delete all categories, attributes, and attribute segments from the database.

WARNING: This will permanently delete all category-related data!
Use with caution.

Usage:
    python scripts/delete_all_categories.py [--execute]
    
    Without --execute: Dry run (shows what would be deleted)
    With --execute: Actually deletes the data
"""

import sys
import argparse
from pathlib import Path

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
from app.models.attribute_segment import AttributeSegment
from sqlalchemy import text


def delete_all_categories(db: SessionLocal, dry_run: bool = True):
    """
    Delete all categories, attributes, and segments.
    
    Args:
        db: Database session
        dry_run: If True, only report what would be deleted without actually deleting
    """
    print("=" * 70)
    print("[START] Delete All Categories Script")
    print("=" * 70)
    if dry_run:
        print("[WARNING] DRY RUN MODE - No changes will be made")
    else:
        print("[WARNING] EXECUTION MODE - Data will be permanently deleted!")
    print()
    
    # Count records
    segments_count = db.query(AttributeSegment).count()
    attributes_count = db.query(CategoryAttribute).count()
    categories_count = db.query(Category).count()
    
    print("[INFO] Current database state:")
    print(f"  - Attribute Segments: {segments_count}")
    print(f"  - Category Attributes: {attributes_count}")
    print(f"  - Categories: {categories_count}")
    print()
    
    if categories_count == 0 and attributes_count == 0 and segments_count == 0:
        print("[INFO] Database is already empty. Nothing to delete.")
        return
    
    if not dry_run:
        print("[INFO] Starting deletion process...")
        print()
        
        # Step 1: Delete all attribute segments (they reference categories)
        print("[STEP 1] Deleting attribute segments...")
        deleted_segments = db.query(AttributeSegment).delete()
        print(f"  [OK] Deleted {deleted_segments} attribute segments")
        db.flush()
        
        # Step 2: Delete all category attributes (they reference categories)
        print("[STEP 2] Deleting category attributes...")
        deleted_attributes = db.query(CategoryAttribute).delete()
        print(f"  [OK] Deleted {deleted_attributes} category attributes")
        db.flush()
        
        # Step 3: Delete all categories (handle self-referencing foreign key)
        # We need to set parent_id to NULL first, or delete in a way that handles the constraint
        print("[STEP 3] Deleting categories...")
        
        # Option 1: Use raw SQL to handle the self-referencing constraint
        # First, set all parent_id to NULL
        db.execute(text("UPDATE categories SET parent_id = NULL"))
        db.flush()
        
        # Then delete all categories
        deleted_categories = db.query(Category).delete()
        print(f"  [OK] Deleted {deleted_categories} categories")
        
        # Commit all changes
        db.commit()
        
        print()
        print("[SUCCESS] All categories, attributes, and segments have been deleted!")
        print(f"  - Deleted {deleted_segments} attribute segments")
        print(f"  - Deleted {deleted_attributes} category attributes")
        print(f"  - Deleted {deleted_categories} categories")
    else:
        print("[INFO] DRY RUN - Would delete:")
        print(f"  - {segments_count} attribute segments")
        print(f"  - {attributes_count} category attributes")
        print(f"  - {categories_count} categories")
        print()
        print("[INFO] Run with --execute to actually delete the data")
    
    print("=" * 70)


def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Delete all categories, attributes, and segments from database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
WARNING: This will permanently delete all category-related data!

Examples:
  # Dry run (safe, shows what would be deleted):
  python scripts/delete_all_categories.py
  
  # Actually delete (destructive):
  python scripts/delete_all_categories.py --execute
        """
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually delete data (default is dry-run)"
    )
    
    args = parser.parse_args()
    
    db = SessionLocal()
    
    try:
        delete_all_categories(db, dry_run=not args.execute)
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
