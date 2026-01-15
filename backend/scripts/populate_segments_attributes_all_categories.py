#!/usr/bin/env python3
"""
Populate Segments and Attributes for All Categories with Inheritance

This script:
1. Reads all categories from the JSON file
2. Builds a 3-level hierarchy
3. Creates common segments and attributes in parent categories
4. Inherits them to child categories
5. Adds category-specific segments/attributes at level 3

Usage:
    python scripts/populate_segments_attributes_all_categories.py [--execute]
    
    Without --execute: Dry run (shows what would be created)
    With --execute: Actually creates segments and attributes
"""

import os
import sys
import json
import uuid
import argparse
from pathlib import Path
from typing import Optional, Dict, Any, List
from collections import defaultdict

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
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


# ============== Common Segments and Attributes Templates ==============

COMMON_SEGMENTS = {
    "highlights": {
        "name": "Highlights",
        "description": "Key features and highlights",
        "icon": "star",
        "display_order": 1,
        "attributes": [
            {
                "name": "Best Seller",
                "attribute_type": "boolean",
                "is_required": False,
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": False,
                "display_order": 1,
            },
            {
                "name": "New Arrival",
                "attribute_type": "boolean",
                "is_required": False,
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": False,
                "display_order": 2,
            },
            {
                "name": "Featured",
                "attribute_type": "boolean",
                "is_required": False,
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": False,
                "display_order": 3,
            },
        ]
    },
    "general": {
        "name": "General Information",
        "description": "General product information",
        "icon": "info",
        "display_order": 2,
        "attributes": [
            {
                "name": "Brand",
                "attribute_type": "text",
                "is_required": False,
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": True,
                "display_order": 1,
            },
            {
                "name": "Model",
                "attribute_type": "text",
                "is_required": False,
                "is_inherited": True,
                "is_filterable": False,
                "is_searchable": True,
                "display_order": 2,
            },
            {
                "name": "Country of Origin",
                "attribute_type": "text",
                "is_required": False,
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": False,
                "display_order": 3,
            },
        ]
    },
    "packaging": {
        "name": "Packaging",
        "description": "Packaging and quantity information",
        "icon": "package",
        "display_order": 3,
        "attributes": [
            {
                "name": "Package Type",
                "attribute_type": "select",
                "options": ["Box", "Bottle", "Pouch", "Can", "Jar", "Packet", "Other"],
                "is_required": False,
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": False,
                "display_order": 1,
            },
            {
                "name": "Package Weight",
                "attribute_type": "number",
                "unit": "g",
                "is_required": False,
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": False,
                "display_order": 2,
            },
            {
                "name": "Package Quantity",
                "attribute_type": "number",
                "unit": "pieces",
                "is_required": False,
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": False,
                "display_order": 3,
            },
        ]
    },
}


# Category-specific segments (for level 3 categories)
CATEGORY_SPECIFIC_SEGMENTS = {
    "fruits": {
        "name": "Fruit Details",
        "description": "Fruit-specific attributes",
        "icon": "apple",
        "display_order": 4,
        "attributes": [
            {
                "name": "Variety",
                "attribute_type": "text",
                "is_required": False,
                "is_inherited": False,
                "is_filterable": True,
                "is_searchable": True,
                "display_order": 1,
            },
            {
                "name": "Season",
                "attribute_type": "select",
                "options": ["All Season", "Summer", "Winter", "Monsoon"],
                "is_required": False,
                "is_inherited": False,
                "is_filterable": True,
                "is_searchable": False,
                "display_order": 2,
            },
        ]
    },
    "vegetables": {
        "name": "Vegetable Details",
        "description": "Vegetable-specific attributes",
        "icon": "leaf",
        "display_order": 4,
        "attributes": [
            {
                "name": "Type",
                "attribute_type": "text",
                "is_required": False,
                "is_inherited": False,
                "is_filterable": True,
                "is_searchable": True,
                "display_order": 1,
            },
            {
                "name": "Organic",
                "attribute_type": "boolean",
                "is_required": False,
                "is_inherited": False,
                "is_filterable": True,
                "is_searchable": False,
                "display_order": 2,
            },
        ]
    },
}


def build_category_hierarchy(categories: List[Dict]) -> Dict[str, Any]:
    """Build a hierarchical structure from flat category list."""
    category_map = {}
    root_categories = []
    
    # First pass: create map
    for cat in categories:
        cat_id = cat.get("id")
        if cat_id:
            category_map[cat_id] = {
                **cat,
                "children": [],
                "level": None
            }
    
    # Second pass: build hierarchy
    for cat in categories:
        cat_id = cat.get("id")
        parent_id = cat.get("parent_id")
        
        if cat_id in category_map:
            if parent_id and parent_id in category_map:
                category_map[parent_id]["children"].append(category_map[cat_id])
            else:
                root_categories.append(category_map[cat_id])
    
    # Calculate levels
    def set_level(cat, level=1):
        cat["level"] = level
        for child in cat.get("children", []):
            set_level(child, level + 1)
    
    for root in root_categories:
        set_level(root)
    
    return {
        "roots": root_categories,
        "map": category_map
    }


def get_category_type(category_name: str) -> str:
    """Detect category type for specific segments."""
    name_lower = category_name.lower()
    
    if any(word in name_lower for word in ["fruit", "apple", "banana", "orange", "mango"]):
        return "fruits"
    elif any(word in name_lower for word in ["vegetable", "onion", "potato", "tomato"]):
        return "vegetables"
    else:
        return "general"


def create_segment_with_attributes(
    db: SessionLocal,
    segment_service: SegmentService,
    attribute_service: AttributeService,
    category: Category,
    segment_data: Dict[str, Any],
    execute: bool = False
) -> Optional[uuid.UUID]:
    """Create a segment and its attributes."""
    try:
        # Check if segment already exists
        from app.models.attribute_segment import AttributeSegment
        existing_segment = db.query(AttributeSegment).filter(
            AttributeSegment.category_id == category.id,
            AttributeSegment.name == segment_data["name"]
        ).first()
        
        if existing_segment:
            if not execute:
                print(f"    [WOULD SKIP] Segment '{segment_data['name']}' already exists")
            segment_id = existing_segment.id
        else:
            if execute:
                segment_create = AttributeSegmentCreate(
                    category_id=category.id,
                    name=segment_data["name"],
                    description=segment_data.get("description", ""),
                    icon=segment_data.get("icon"),
                    display_order=segment_data.get("display_order", 0),
                    is_collapsible=segment_data.get("is_collapsible", True),
                )
                segment = segment_service.create_segment(segment_create)
                segment_id = segment.id
                print(f"    [CREATED] Segment '{segment_data['name']}' (ID: {segment_id})")
            else:
                print(f"    [WOULD CREATE] Segment '{segment_data['name']}'")
                segment_id = None  # No ID for dry run
        
        # Create attributes (only if segment was created or exists)
        if segment_id or not execute:
            attributes = segment_data.get("attributes", [])
            for attr_data in attributes:
                attr_name = attr_data.get("name")
                if not attr_name:
                    continue
                
                # Check if attribute already exists
                from app.models.attribute import CategoryAttribute
                existing_attr = db.query(CategoryAttribute).filter(
                    CategoryAttribute.category_id == category.id,
                    CategoryAttribute.name == attr_name
                ).first()
                
                if existing_attr:
                    if not execute:
                        print(f"      [WOULD SKIP] Attribute '{attr_name}' already exists")
                    continue
                
                if execute and segment_id:
                    attr_type_str = attr_data.get("attribute_type", "text").lower()
                    try:
                        attr_type = AttributeType(attr_type_str)
                    except ValueError:
                        attr_type = AttributeType.TEXT
                    
                    attr_create = CategoryAttributeCreate(
                        category_id=category.id,
                        segment_id=segment_id,
                        name=attr_name,
                        description=attr_data.get("description", ""),
                        attribute_type=attr_type,
                        options=attr_data.get("options"),
                        unit=attr_data.get("unit"),
                        is_required=attr_data.get("is_required", False),
                        is_inherited=attr_data.get("is_inherited", True),
                        is_filterable=attr_data.get("is_filterable", True),
                        is_searchable=attr_data.get("is_searchable", False),
                        display_order=attr_data.get("display_order", 0),
                    )
                    try:
                        attribute_service.create_attribute(attr_create)
                        print(f"      [CREATED] Attribute '{attr_name}'")
                    except ValueError as e:
                        # Attribute already exists as inherited - this is expected for child categories
                        error_msg = str(e)
                        if "already exists as inherited attribute" in error_msg:
                            print(f"      [SKIP] Attribute '{attr_name}' already inherited from parent")
                        else:
                            print(f"      [ERROR] Failed to create attribute '{attr_name}': {e}")
                else:
                    print(f"      [WOULD CREATE] Attribute '{attr_name}'")
        
        return segment_id
        
    except Exception as e:
        print(f"    [ERROR] Failed to create segment '{segment_data.get('name', 'unknown')}': {e}")
        import traceback
        traceback.print_exc()
        return None


def process_category(
    db: SessionLocal,
    segment_service: SegmentService,
    attribute_service: AttributeService,
    category: Category,
    category_data: Dict[str, Any],
    execute: bool = False
):
    """Process a category and create segments/attributes."""
    level = category_data.get("level", 1)
    category_name = category_data.get("name", "")
    
    print(f"\n{'=' * 70}")
    print(f"Processing: {category_name} (Level {level})")
    print(f"{'=' * 70}")
    
    # Level 1 & 2: Add common segments
    if level <= 2:
        print(f"\n[INFO] Adding common segments (inherited)...")
        for seg_key, seg_data in COMMON_SEGMENTS.items():
            create_segment_with_attributes(
                db, segment_service, attribute_service,
                category, seg_data, execute
            )
    
    # Level 3: Add category-specific segments
    if level == 3:
        category_type = get_category_type(category_name)
        if category_type in CATEGORY_SPECIFIC_SEGMENTS:
            print(f"\n[INFO] Adding category-specific segments...")
            create_segment_with_attributes(
                db, segment_service, attribute_service,
                category, CATEGORY_SPECIFIC_SEGMENTS[category_type], execute
            )
    
    # Process children
    children = category_data.get("children", [])
    if children:
        print(f"\n[INFO] Processing {len(children)} child categories...")
        for child_data in children:
            child_id = child_data.get("id")
            if child_id:
                child_category = db.query(Category).filter(
                    Category.id == uuid.UUID(child_id)
                ).first()
                
                if child_category:
                    process_category(
                        db, segment_service, attribute_service,
                        child_category, child_data, execute
                    )
                else:
                    # Try to find by name
                    child_name = child_data.get("name")
                    if child_name:
                        child_category = db.query(Category).filter(
                            Category.name == child_name,
                            Category.parent_id == category.id
                        ).first()
                        
                        if child_category:
                            print(f"  [INFO] Found child category by name: {child_name}")
                            process_category(
                                db, segment_service, attribute_service,
                                child_category, child_data, execute
                            )
                        else:
                            print(f"  [WARNING] Child category '{child_name}' not found in database")
                    else:
                        print(f"  [WARNING] Child category (ID: {child_id}) not found and no name provided")


def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Populate segments and attributes for all categories with inheritance"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually create segments and attributes (default is dry run)"
    )
    parser.add_argument(
        "--json-file",
        type=str,
        default="scripts/categories_20260114_132722.json",
        help="Path to categories JSON file"
    )
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("Populate Segments and Attributes for All Categories")
    print("=" * 70)
    print()
    
    if not args.execute:
        print("[WARNING] Running in DRY RUN mode")
        print("[WARNING] Use --execute flag to actually create segments and attributes")
        print()
    
    # Load JSON file
    json_path = Path(__file__).parent.parent / args.json_file
    if not json_path.exists():
        print(f"[ERROR] JSON file not found: {json_path}")
        sys.exit(1)
    
    print(f"[INFO] Loading categories from: {json_path}")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    categories = data.get("categories", [])
    print(f"[INFO] Found {len(categories)} categories in JSON")
    
    # Build hierarchy
    print("[INFO] Building category hierarchy...")
    hierarchy = build_category_hierarchy(categories)
    root_categories = hierarchy["roots"]
    print(f"[INFO] Found {len(root_categories)} root categories")
    
    # Connect to database
    db = SessionLocal()
    
    try:
        segment_service = SegmentService(db)
        attribute_service = AttributeService(db)
        
        print(f"\n[INFO] Processing categories...")
        
        # Process each root category
        for root_data in root_categories:
            root_id = root_data.get("id")
            root_name = root_data.get("name")
            
            if root_id:
                try:
                    root_uuid = uuid.UUID(root_id)
                    root_category = db.query(Category).filter(
                        Category.id == root_uuid
                    ).first()
                    
                    # If not found by ID, try by name
                    if not root_category and root_name:
                        root_category = db.query(Category).filter(
                            Category.name == root_name,
                            Category.parent_id.is_(None)
                        ).first()
                    
                    if root_category:
                        print(f"\n[INFO] Found category: {root_category.name} (ID: {root_category.id})")
                        process_category(
                            db, segment_service, attribute_service,
                            root_category, root_data, args.execute
                        )
                    else:
                        print(f"[WARNING] Root category '{root_name}' (ID: {root_id}) not found in database")
                        print(f"  [INFO] Try checking if category exists with different name or ID")
                except ValueError as e:
                    print(f"[ERROR] Invalid UUID for category '{root_name}': {root_id} - {e}")
        
        if args.execute:
            db.commit()
            print("\n" + "=" * 70)
            print("[SUCCESS] Operation Complete!")
            print("=" * 70)
            print("\n[OK] Segments and attributes have been created successfully!")
        else:
            print("\n" + "=" * 70)
            print("[DRY RUN] This was a dry run - no changes were made")
            print("=" * 70)
            print("\n[INFO] Use --execute flag to actually create segments and attributes")
        
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
