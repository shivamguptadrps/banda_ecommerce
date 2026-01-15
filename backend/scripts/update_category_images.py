"""
Update all category image_url to a specific Cloudinary URL

Usage:
    python backend/scripts/update_category_images.py [--execute]
    
    Without --execute: Dry run (shows what would be updated)
    With --execute: Actually updates the database
"""

import sys
import os
import argparse
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.category import Category


# The image URL to set for all categories
DEFAULT_IMAGE_URL = "https://res.cloudinary.com/dycawfrr8/image/upload/v1768325669/products/14e51899-d6ae-42c0-9e80-742417aceef8/0bc1c653-5666-4b64-af6c-b600e7c5a6d9/product_20260113_173425_0930b70f.png.jpg"


def update_all_category_images(db: Session, image_url: str, execute: bool = False) -> dict:
    """
    Update all categories with the specified image URL.
    
    Args:
        db: Database session
        image_url: The image URL to set for all categories
        execute: If True, actually update the database. If False, dry run.
        
    Returns:
        Dictionary with update statistics
    """
    # Get all categories
    categories = db.query(Category).all()
    total_count = len(categories)
    
    if total_count == 0:
        print("[INFO] No categories found in database")
        return {
            "total": 0,
            "updated": 0,
            "skipped": 0,
            "already_set": 0
        }
    
    print(f"[INFO] Found {total_count} categories in database")
    print(f"[INFO] Image URL to set: {image_url}")
    print("")
    
    if not execute:
        print("[DRY RUN] This is a dry run - no changes will be made")
        print("")
    
    updated_count = 0
    skipped_count = 0
    already_set_count = 0
    
    for category in categories:
        if category.image_url == image_url:
            already_set_count += 1
            if execute:
                print(f"[SKIP] Category '{category.name}' (ID: {category.id}) already has this image URL")
            continue
        
        if execute:
            category.image_url = image_url
            updated_count += 1
            print(f"[UPDATE] Category '{category.name}' (ID: {category.id}, Slug: {category.slug})")
        else:
            updated_count += 1
            print(f"[WOULD UPDATE] Category '{category.name}' (ID: {category.id}, Slug: {category.slug})")
            print(f"  Current: {category.image_url or 'None'}")
            print(f"  New:     {image_url}")
    
    if execute:
        try:
            db.commit()
            print("")
            print(f"[OK] Successfully updated {updated_count} categories")
        except Exception as e:
            db.rollback()
            print("")
            print(f"[ERROR] Failed to commit changes: {e}")
            raise
    else:
        print("")
        print(f"[DRY RUN] Would update {updated_count} categories")
        print(f"[DRY RUN] {already_set_count} categories already have this image URL")
    
    return {
        "total": total_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "already_set": already_set_count
    }


def main():
    parser = argparse.ArgumentParser(
        description="Update all category image_url to a specific Cloudinary URL"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually update the database (default is dry run)"
    )
    parser.add_argument(
        "--image-url",
        type=str,
        default=DEFAULT_IMAGE_URL,
        help=f"Image URL to set (default: {DEFAULT_IMAGE_URL})"
    )
    
    args = parser.parse_args()
    
    print("")
    print("=" * 60)
    print("Update All Category Images")
    print("=" * 60)
    print("")
    
    if not args.execute:
        print("[WARNING] Running in DRY RUN mode")
        print("[WARNING] Use --execute flag to actually update the database")
        print("")
    
    db: Session = SessionLocal()
    
    try:
        stats = update_all_category_images(
            db=db,
            image_url=args.image_url,
            execute=args.execute
        )
        
        print("")
        print("=" * 60)
        print("Summary")
        print("=" * 60)
        print(f"Total categories:     {stats['total']}")
        print(f"Updated:              {stats['updated']}")
        print(f"Already set:          {stats['already_set']}")
        print(f"Skipped:              {stats['skipped']}")
        print("")
        
        if args.execute:
            print("[SUCCESS] All category images have been updated!")
        else:
            print("[INFO] This was a dry run. Use --execute to apply changes.")
        print("")
        
    except Exception as e:
        print("")
        print(f"[ERROR] An error occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
