# Attribute Segment Management Guide

## Overview

This guide explains how attribute segments and attributes are organized across the 3-level category hierarchy.

## Strategy

### **Level 1 (Top Nav Categories) - Common Attributes**
- **Purpose**: Attributes that apply to ALL products in this category tree
- **Inheritance**: `is_inherited = true` (inherited by Level 2 and Level 3)
- **Examples**:
  - **Electronics**: Brand, Warranty Period, Country of Origin
  - **Fresh Produce**: Origin, Organic

### **Level 2 (Parent Sections) - Less Common Attributes**
- **Purpose**: Attributes specific to this section but common to all subcategories
- **Inheritance**: `is_inherited = true` (inherited by Level 3 only)
- **Examples**:
  - **Mobile Phones**: Model Number, Color, Network Type
  - **Fresh Fruits**: Variety, Ripeness

### **Level 3 (Subcategories) - Specific Attributes**
- **Purpose**: Attributes unique to this specific subcategory
- **Inheritance**: `is_inherited = false` (NOT inherited)
- **Examples**:
  - **Smartphones**: RAM, Storage, Screen Size, Camera specs, Battery
  - **Bananas**: Banana Type, Quantity, Weight

## JSON Structure

```json
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
```

## Attribute Types

- **text**: Free text input
- **number**: Numeric input (can have unit like "GB", "mAh", "kg")
- **select**: Single select from options
- **multi_select**: Multiple select from options
- **boolean**: Yes/No toggle

## How It Works

1. **Level 1 attributes** are inherited by ALL child categories (Level 2 and Level 3)
2. **Level 2 attributes** are inherited by Level 3 categories only
3. **Level 3 attributes** are specific to that category only

### Example Flow:

```
Electronics (Level 1)
  ├─ Brand (inherited by all)
  ├─ Warranty (inherited by all)
  └─ Mobile Phones (Level 2)
      ├─ Model Number (inherited by Level 3)
      ├─ Color (inherited by Level 3)
      └─ Smartphones (Level 3)
          ├─ RAM (specific to Smartphones)
          ├─ Storage (specific to Smartphones)
          └─ Screen Size (specific to Smartphones)
```

When a product is created under "Smartphones", it will have:
- **From Level 1**: Brand, Warranty
- **From Level 2**: Model Number, Color
- **From Level 3**: RAM, Storage, Screen Size

## Scripts

### 1. Add Segments to JSON
```bash
cd backend
python3 scripts/add_segments_to_category_json.py
```
- Reads `category.json`
- Adds segments and attributes based on category type
- Saves to `category_with_attributes.json`

### 2. Insert Segments & Attributes to Database
```bash
cd backend
python3 scripts/insert_segments_and_attributes.py ../category_with_attributes.json
```
- Reads `category_with_attributes.json`
- Creates segments and attributes in database
- Maintains inheritance relationships

## Files

- **`category.json`**: Original category structure (no attributes)
- **`category_with_attributes.json`**: Enhanced with segments and attributes
- **`backend/scripts/add_segments_to_category_json.py`**: Adds segments to JSON
- **`backend/scripts/insert_segments_and_attributes.py`**: Inserts to database

## Customization

To add custom attributes for specific categories, edit `category_with_attributes.json` and add `segments` array to any category:

```json
{
  "name": "Your Category",
  "segments": [
    {
      "name": "Your Segment",
      "icon": "icon-name",
      "display_order": 1,
      "attributes": [
        {
          "name": "Your Attribute",
          "attribute_type": "select",
          "options": ["Option 1", "Option 2"],
          "is_inherited": true,
          "is_filterable": true
        }
      ]
    }
  ]
}
```

Then run the insert script to update the database.

