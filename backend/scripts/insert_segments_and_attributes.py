#!/usr/bin/env python3
"""
Script to insert attribute segments and attributes from enhanced category JSON.

The JSON should have this structure:
{
  "categories": [
    {
      "name": "Category Name",
      "segments": [
        {
          "name": "Segment Name",
          "description": "Segment description",
          "icon": "icon-name",
          "display_order": 1,
          "attributes": [
            {
              "name": "Attribute Name",
              "description": "Attribute description",
              "attribute_type": "select|text|number|boolean|multi_select",
              "options": ["Option 1", "Option 2"],  // For SELECT/MULTI_SELECT
              "unit": "GB",  // For NUMBER type
              "is_required": false,
              "is_inherited": true,  // Level 1 & 2: true, Level 3: false
              "is_filterable": true,
              "is_searchable": false,
              "display_order": 1
            }
          ]
        }
      ],
      "children": [...]
    }
  ]
}

Usage:
    python scripts/insert_segments_and_attributes.py [json_file_path]
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
    pass

from app.database import SessionLocal
from app.models.category import Category
from app.services.segment_service import SegmentService
from app.services.attribute_service import AttributeService
from app.schemas.attribute import (
    AttributeSegmentCreate,
    CategoryAttributeCreate,
)
from app.models.enums import AttributeType


def process_category_segments_and_attributes(
    db: SessionLocal,
    segment_service: SegmentService,
    attribute_service: AttributeService,
    category: Category,
    category_data: Dict[str, Any],
    level: int = 1
):
    """
    Process segments and attributes for a category and recursively for children.
    
    Args:
        db: Database session
        segment_service: Segment service instance
        attribute_service: Attribute service instance
        category: Category model instance
        category_data: Category data from JSON
        level: Current level (1, 2, or 3)
    """
    segments_data = category_data.get("segments", [])
    
    if segments_data:
        print(f"\n{'  ' * (level - 1)}[INFO] Processing {category.name} (Level {level})")
        
        for segment_data in segments_data:
            segment_name = segment_data.get("name")
            if not segment_name:
                continue
            
            # Create segment
            try:
                segment_create = AttributeSegmentCreate(
                    category_id=category.id,
                    name=segment_name,
                    description=segment_data.get("description"),
                    icon=segment_data.get("icon"),
                    display_order=segment_data.get("display_order", 0),
                    is_collapsible=segment_data.get("is_collapsible", True),
                )
                
                segment = segment_service.create_segment(segment_create)
                print(f"{'  ' * level}  [OK] Segment: {segment.name}")
                
                # Create attributes for this segment
                attributes_data = segment_data.get("attributes", [])
                for attr_data in attributes_data:
                    attr_name = attr_data.get("name")
                    if not attr_name:
                        continue
                    
                    # Determine attribute type
                    attr_type_str = attr_data.get("attribute_type", "text").lower()
                    try:
                        attr_type = AttributeType(attr_type_str)
                    except ValueError:
                        print(f"{'  ' * (level + 1)}  [WARNING] Invalid attribute type '{attr_type_str}' for '{attr_name}', using TEXT")
                        attr_type = AttributeType.TEXT
                    
                    # For Level 1 and 2, set is_inherited=True (common attributes)
                    # For Level 3, set is_inherited=False (specific attributes)
                    is_inherited = level < 3
                    
                    # Override if explicitly set in JSON
                    if "is_inherited" in attr_data:
                        is_inherited = attr_data.get("is_inherited", is_inherited)
                    
                    try:
                        attribute_create = CategoryAttributeCreate(
                            category_id=category.id,
                            segment_id=segment.id,
                            name=attr_name,
                            description=attr_data.get("description"),
                            attribute_type=attr_type,
                            options=attr_data.get("options") if attr_type in [AttributeType.SELECT, AttributeType.MULTI_SELECT] else None,
                            unit=attr_data.get("unit"),
                            is_required=attr_data.get("is_required", False),
                            is_inherited=is_inherited,
                            is_filterable=attr_data.get("is_filterable", True),
                            is_searchable=attr_data.get("is_searchable", False),
                            display_order=attr_data.get("display_order", 0),
                            show_in_listing=attr_data.get("show_in_listing", False),
                            show_in_details=attr_data.get("show_in_details", True),
                        )
                        
                        attribute = attribute_service.create_attribute(attribute_create)
                        inherited_text = " (inherited)" if is_inherited else ""
                        print(f"{'  ' * (level + 1)}    [OK] Attribute: {attribute.name} ({attr_type.value}){inherited_text}")
                        
                    except ValueError as e:
                        error_msg = str(e)
                        # Check if it's a duplicate/inherited attribute error
                        if "already exists" in error_msg.lower() or "inherit" in error_msg.lower():
                            print(f"{'  ' * (level + 1)}    [SKIP] Attribute '{attr_name}': Already exists in parent category (will be inherited)")
                        else:
                            print(f"{'  ' * (level + 1)}    [ERROR] Failed to create attribute '{attr_name}': {e}")
                    except Exception as e:
                        print(f"{'  ' * (level + 1)}    [ERROR] Failed to create attribute '{attr_name}': {e}")
                
            except Exception as e:
                print(f"{'  ' * level}  [ERROR] Failed to create segment '{segment_name}': {e}")
    
    # Process children recursively
    children_data = category_data.get("children", [])
    if children_data:
        next_level = level + 1
        for child_data in children_data:
            child_name = child_data.get("name")
            if not child_name:
                continue
            
            # Find child category by name or slug
            child_slug = child_data.get("slug")
            child_category = db.query(Category).filter(
                Category.name == child_name,
                Category.parent_id == category.id
            ).first()
            
            # If not found by name, try by slug
            if not child_category and child_slug:
                child_category = db.query(Category).filter(
                    Category.slug == child_slug,
                    Category.parent_id == category.id
                ).first()
            
            if child_category:
                process_category_segments_and_attributes(
                    db,
                    segment_service,
                    attribute_service,
                    child_category,
                    child_data,
                    next_level
                )
            else:
                print(f"{'  ' * level}  [WARNING] Child category '{child_name}' not found for parent '{category.name}'")


def main():
    """Main function."""
    print("=" * 70)
    print("[START] Insert Segments & Attributes Script")
    print("=" * 70)
    
    # Determine JSON file path
    if len(sys.argv) > 1:
        json_file = Path(sys.argv[1])
    else:
        # Try to find JSON file in project root
        project_root = Path(__file__).parent.parent.parent
        json_file = project_root / "category.json"
    
    if not json_file.exists():
        print(f"\n[ERROR] JSON file not found: {json_file}")
        print("   Usage: python scripts/insert_segments_and_attributes.py [json_file_path]")
        return
    
    print(f"\n[INFO] Using JSON file: {json_file}")
    
    # Load JSON
    print(f"\n[INFO] Loading JSON...")
    try:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"[ERROR] JSON file not found: {json_file}")
        return
    except json.JSONDecodeError as e:
        print(f"[ERROR] Invalid JSON: {e}")
        return
    
    categories_data = data.get("categories", [])
    if not categories_data:
        print("[ERROR] No categories found in JSON file")
        return
    
    print(f"[OK] Loaded {len(categories_data)} top-level categories")
    
    # Connect to database
    db = SessionLocal()
    
    try:
        segment_service = SegmentService(db)
        attribute_service = AttributeService(db)
        
        print(f"\n[INFO] Processing segments and attributes...")
        
        # Process each top-level category
        for category_data in categories_data:
            category_name = category_data.get("name")
            if not category_name:
                continue
            
            # Find category by name or slug (root categories have parent_id = NULL)
            category = db.query(Category).filter(
                Category.name == category_name,
                Category.parent_id.is_(None)
            ).first()
            
            # If not found by name, try by slug
            if not category:
                category_slug = category_data.get("slug")
                if category_slug:
                    category = db.query(Category).filter(
                        Category.slug == category_slug,
                        Category.parent_id.is_(None)
                    ).first()
            
            if category:
                process_category_segments_and_attributes(
                    db,
                    segment_service,
                    attribute_service,
                    category,
                    category_data,
                    level=1
                )
            else:
                print(f"[WARNING] Category '{category_name}' not found in database")
        
        db.commit()  # Final commit
        print("\n" + "=" * 70)
        print("[SUCCESS] Operation Complete!")
        print("=" * 70)
        print("\n[OK] Segments and attributes have been inserted successfully!")
        
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

