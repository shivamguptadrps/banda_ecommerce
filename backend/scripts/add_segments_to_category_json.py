#!/usr/bin/env python3
"""
Script to add attribute segments and attributes to existing category.json file.

This script:
1. Reads existing category.json
2. Adds appropriate segments and attributes based on category type
3. Saves enhanced JSON to category_with_attributes.json

Attribute Strategy:
- Level 1 (Top Nav): Common attributes (Brand, Warranty) - is_inherited=true
- Level 2 (Parent Section): Less common attributes (Model, Color) - is_inherited=true  
- Level 3 (Subcategory): Specific attributes (RAM, Storage) - is_inherited=false
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional


# Attribute templates for different category types
ATTRIBUTE_TEMPLATES = {
    # Electronics categories
    "electronics": {
        "level_1": [
            {
                "name": "General Information",
                "icon": "info",
                "attributes": [
                    {"name": "Brand", "type": "select", "options": ["Apple", "Samsung", "OnePlus", "Xiaomi", "Realme", "Oppo", "Vivo", "Motorola", "Nokia", "Other"], "required": True, "filterable": True, "searchable": True},
                    {"name": "Warranty Period", "type": "number", "unit": "months", "required": False, "filterable": True},
                    {"name": "Country of Origin", "type": "select", "options": ["India", "China", "USA", "South Korea", "Japan", "Other"], "required": False, "filterable": True}
                ]
            }
        ],
        "level_2": [
            {
                "name": "Device Specifications",
                "icon": "smartphone",
                "attributes": [
                    {"name": "Model Number", "type": "text", "required": True, "searchable": True},
                    {"name": "Color", "type": "select", "options": ["Black", "White", "Blue", "Red", "Green", "Purple", "Gold", "Silver", "Other"], "required": True, "filterable": True},
                    {"name": "Network Type", "type": "multi_select", "options": ["4G", "5G", "WiFi", "Bluetooth"], "required": True, "filterable": True}
                ]
            }
        ],
        "level_3_mobile": [
            {
                "name": "Performance",
                "icon": "cpu",
                "attributes": [
                    {"name": "RAM", "type": "select", "options": ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"], "unit": "GB", "required": True, "filterable": True},
                    {"name": "Storage", "type": "select", "options": ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"], "unit": "GB", "required": True, "filterable": True},
                    {"name": "Processor", "type": "text", "required": False}
                ]
            },
            {
                "name": "Display",
                "icon": "monitor",
                "attributes": [
                    {"name": "Screen Size", "type": "number", "unit": "inches", "required": True, "filterable": True},
                    {"name": "Resolution", "type": "select", "options": ["HD", "Full HD", "HD+", "Full HD+", "Quad HD", "4K"], "required": False, "filterable": True},
                    {"name": "Refresh Rate", "type": "select", "options": ["60Hz", "90Hz", "120Hz", "144Hz"], "unit": "Hz", "required": False, "filterable": True}
                ]
            },
            {
                "name": "Camera",
                "icon": "camera",
                "attributes": [
                    {"name": "Rear Camera", "type": "number", "unit": "MP", "required": False, "filterable": True},
                    {"name": "Front Camera", "type": "number", "unit": "MP", "required": False, "filterable": True},
                    {"name": "Video Recording", "type": "select", "options": ["1080p", "4K", "8K"], "required": False, "filterable": True}
                ]
            },
            {
                "name": "Battery & Charging",
                "icon": "battery",
                "attributes": [
                    {"name": "Battery Capacity", "type": "number", "unit": "mAh", "required": True, "filterable": True},
                    {"name": "Fast Charging", "type": "boolean", "required": False, "filterable": True},
                    {"name": "Wireless Charging", "type": "boolean", "required": False, "filterable": True}
                ]
            }
        ]
    },
    # Fresh produce categories
    "fresh": {
        "level_1": [
            {
                "name": "General Information",
                "icon": "leaf",
                "attributes": [
                    {"name": "Origin", "type": "select", "options": ["Local", "Imported", "Organic Farm", "Other"], "required": False, "filterable": True},
                    {"name": "Organic", "type": "boolean", "required": False, "filterable": True}
                ]
            }
        ],
        "level_2": [
            {
                "name": "Produce Details",
                "icon": "apple",
                "attributes": [
                    {"name": "Variety", "type": "text", "required": False, "filterable": True},
                    {"name": "Ripeness", "type": "select", "options": ["Unripe", "Semi-Ripe", "Ripe", "Overripe"], "required": False, "filterable": True}
                ]
            }
        ],
        "level_3_fruit": [
            {
                "name": "Fruit Specifications",
                "icon": "banana",
                "attributes": [
                    {"name": "Fruit Type", "type": "select", "options": ["Regular", "Premium", "Exotic", "Seasonal"], "required": True, "filterable": True},
                    {"name": "Quantity", "type": "number", "unit": "pieces", "required": True, "filterable": True},
                    {"name": "Weight", "type": "number", "unit": "kg", "required": False, "filterable": True}
                ]
            }
        ],
        "level_3_vegetable": [
            {
                "name": "Vegetable Specifications",
                "icon": "carrot",
                "attributes": [
                    {"name": "Vegetable Type", "type": "text", "required": True, "filterable": True},
                    {"name": "Quantity", "type": "number", "unit": "pieces", "required": True, "filterable": True},
                    {"name": "Weight", "type": "number", "unit": "kg", "required": False, "filterable": True}
                ]
            }
        ]
    }
}


def detect_category_type(category_name: str, level: int) -> str:
    """Detect category type based on name."""
    name_lower = category_name.lower()
    
    if level == 1:
        if "electronics" in name_lower or "mobile" in name_lower:
            return "electronics"
        elif "fresh" in name_lower or "fruit" in name_lower or "vegetable" in name_lower:
            return "fresh"
    
    return "general"


def add_segments_to_category(category: Dict[str, Any], level: int, parent_type: Optional[str] = None) -> None:
    """Add segments and attributes to a category based on its type and level."""
    category_name = category.get("name", "")
    category_type = detect_category_type(category_name, level)
    
    # Use parent type if available
    if parent_type:
        category_type = parent_type
    
    # Get templates
    templates = ATTRIBUTE_TEMPLATES.get(category_type, {})
    
    segments = []
    
    if level == 1:
        # Level 1: Common attributes (inherited)
        level_1_segments = templates.get("level_1", [])
        for seg_template in level_1_segments:
            segment = {
                "name": seg_template["name"],
                "description": f"Common attributes for {category_name}",
                "icon": seg_template.get("icon", "info"),
                "display_order": len(segments) + 1,
                "attributes": []
            }
            
            for attr_template in seg_template["attributes"]:
                attribute = {
                    "name": attr_template["name"],
                    "description": attr_template.get("description", ""),
                    "attribute_type": attr_template["type"],
                    "is_required": attr_template.get("required", False),
                    "is_inherited": True,  # Level 1 attributes are inherited
                    "is_filterable": attr_template.get("filterable", True),
                    "is_searchable": attr_template.get("searchable", False),
                    "display_order": len(segment["attributes"]) + 1
                }
                
                if attr_template["type"] in ["select", "multi_select"]:
                    attribute["options"] = attr_template.get("options", [])
                
                if "unit" in attr_template:
                    attribute["unit"] = attr_template["unit"]
                
                segment["attributes"].append(attribute)
            
            segments.append(segment)
    
    elif level == 2:
        # Level 2: Less common attributes (inherited by Level 3)
        level_2_segments = templates.get("level_2", [])
        for seg_template in level_2_segments:
            segment = {
                "name": seg_template["name"],
                "description": f"Attributes for {category_name}",
                "icon": seg_template.get("icon", "settings"),
                "display_order": len(segments) + 1,
                "attributes": []
            }
            
            for attr_template in seg_template["attributes"]:
                attribute = {
                    "name": attr_template["name"],
                    "description": attr_template.get("description", ""),
                    "attribute_type": attr_template["type"],
                    "is_required": attr_template.get("required", False),
                    "is_inherited": True,  # Level 2 attributes are inherited
                    "is_filterable": attr_template.get("filterable", True),
                    "is_searchable": attr_template.get("searchable", False),
                    "display_order": len(segment["attributes"]) + 1
                }
                
                if attr_template["type"] in ["select", "multi_select"]:
                    attribute["options"] = attr_template.get("options", [])
                
                if "unit" in attr_template:
                    attribute["unit"] = attr_template["unit"]
                
                segment["attributes"].append(attribute)
            
            segments.append(segment)
    
    elif level == 3:
        # Level 3: Specific attributes (not inherited)
        # Determine specific template based on category name
        name_lower = category_name.lower()
        
        if "mobile" in name_lower or "phone" in name_lower or "smartphone" in name_lower:
            level_3_segments = templates.get("level_3_mobile", [])
        elif "fruit" in name_lower:
            level_3_segments = templates.get("level_3_fruit", [])
        elif "vegetable" in name_lower:
            level_3_segments = templates.get("level_3_vegetable", [])
        else:
            level_3_segments = []
        
        for seg_template in level_3_segments:
            segment = {
                "name": seg_template["name"],
                "description": f"Specific attributes for {category_name}",
                "icon": seg_template.get("icon", "tag"),
                "display_order": len(segments) + 1,
                "attributes": []
            }
            
            for attr_template in seg_template["attributes"]:
                attribute = {
                    "name": attr_template["name"],
                    "description": attr_template.get("description", ""),
                    "attribute_type": attr_template["type"],
                    "is_required": attr_template.get("required", False),
                    "is_inherited": False,  # Level 3 attributes are NOT inherited
                    "is_filterable": attr_template.get("filterable", True),
                    "is_searchable": attr_template.get("searchable", False),
                    "display_order": len(segment["attributes"]) + 1
                }
                
                if attr_template["type"] in ["select", "multi_select"]:
                    attribute["options"] = attr_template.get("options", [])
                
                if "unit" in attr_template:
                    attribute["unit"] = attr_template["unit"]
                
                segment["attributes"].append(attribute)
            
            segments.append(segment)
    
    # Add segments to category if any
    if segments:
        category["segments"] = segments
    
    # Process children recursively
    children = category.get("children", [])
    if children:
        next_level = level + 1
        for child in children:
            add_segments_to_category(child, next_level, category_type)


def main():
    """Main function."""
    print("=" * 70)
    print("📋 Add Segments & Attributes to Category JSON")
    print("=" * 70)
    
    # File paths
    project_root = Path(__file__).parent.parent.parent
    input_file = project_root / "category.json"
    output_file = project_root / "category_with_attributes.json"
    
    if not input_file.exists():
        print(f"\n❌ Input file not found: {input_file}")
        return
    
    print(f"\n📂 Reading: {input_file}")
    
    # Load JSON
    try:
        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Failed to load JSON: {e}")
        return
    
    categories = data.get("categories", [])
    if not categories:
        print("❌ No categories found in JSON")
        return
    
    print(f"✅ Loaded {len(categories)} top-level categories")
    
    # Add segments to each category
    print(f"\n🚀 Adding segments and attributes...")
    for category in categories:
        add_segments_to_category(category, level=1)
    
    # Save enhanced JSON
    print(f"\n💾 Saving to: {output_file}")
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"✅ Saved successfully!")
    except Exception as e:
        print(f"❌ Failed to save: {e}")
        return
    
    # Count segments and attributes
    def count_segments_attrs(obj, level=1):
        segments_count = len(obj.get("segments", []))
        attrs_count = sum(len(seg.get("attributes", [])) for seg in obj.get("segments", []))
        for child in obj.get("children", []):
            seg, attr = count_segments_attrs(child, level + 1)
            segments_count += seg
            attrs_count += attr
        return segments_count, attrs_count
    
    total_segments = 0
    total_attrs = 0
    for cat in categories:
        seg, attr = count_segments_attrs(cat)
        total_segments += seg
        total_attrs += attr
    
    print("\n" + "=" * 70)
    print("✨ Operation Complete!")
    print("=" * 70)
    print(f"   📦 Total segments added: {total_segments}")
    print(f"   📋 Total attributes added: {total_attrs}")
    print(f"   📄 Output file: {output_file}")
    print("=" * 70)


if __name__ == "__main__":
    main()

