# Category 3-Level Structure (Zepto/Blinkit Style)

## Overview

This document explains how Zepto and Blinkit manage their category hierarchies using a **3-level structure**, and how our system implements this pattern.

---

## Zepto/Blinkit Category Structure

### **Level 1: Top Navigation Categories** (Root Categories)
- **Purpose**: Quick access to major shopping areas
- **Display**: Horizontal scrollable bar at top of homepage
- **Count**: 8-10 categories
- **Database**: `parent_id = NULL`
- **Examples**: 
  - "Grocery"
  - "Electronics"
  - "Beauty"
  - "Fashion"
  - "Home"
  - "Health"

### **Level 2: Parent Sections** (Major Groupings)
- **Purpose**: Organize related subcategories into logical sections
- **Display**: Bold section headers with grid of subcategories below
- **Database**: `parent_id = Level 1 Category ID`
- **Examples**:
  - Under "Grocery" → "Grocery & Kitchen"
  - Under "Electronics" → "Electronics Items"
  - Under "Beauty" → "Beauty & Personal Care"

### **Level 3: Subcategories** (Product Categories)
- **Purpose**: Specific product classification where products are actually assigned
- **Display**: Grid cards with images under parent sections
- **Database**: `parent_id = Level 2 Category ID`
- **Examples**:
  - Under "Grocery & Kitchen" → "Fruits & Vegetables"
  - Under "Grocery & Kitchen" → "Dairy, Bread & Eggs"
  - Under "Electronics Items" → "Mobiles & Accessories"

---

## Implementation in Our System

### Database Model
Our `Category` model supports unlimited hierarchy via `parent_id`, but we now enforce a **3-level limit** to match Zepto/Blinkit's structure:

```python
class Category(Base):
    id: Mapped[uuid.UUID]
    name: Mapped[str]
    slug: Mapped[str]
    parent_id: Mapped[Optional[uuid.UUID]]  # NULL for Level 1
    display_order: Mapped[int]
    is_active: Mapped[bool]
    # ... other fields
```

### Depth Validation

The `CategoryService` now includes:

1. **`get_category_depth(category_id)`**: Calculates depth of a category
   - Returns: `1` for Level 1, `2` for Level 2, `3` for Level 3

2. **`_validate_category_depth(parent_id, max_depth=3)`**: Validates depth before creation/update
   - Prevents creating categories beyond Level 3
   - Configurable via `enforce_depth_limit` parameter

3. **`get_category_level(category_id)`**: Gets the level number (1, 2, or 3)

4. **`get_categories_by_level(level)`**: Gets all categories at a specific level

### Usage Example

```python
from app.services.category_service import CategoryService

# Create Level 1 (Top Nav)
grocery = category_service.create_category(
    CategoryCreate(name="Grocery", parent_id=None)
)

# Create Level 2 (Parent Section)
grocery_kitchen = category_service.create_category(
    CategoryCreate(name="Grocery & Kitchen", parent_id=grocery.id)
)

# Create Level 3 (Subcategory)
fruits_veg = category_service.create_category(
    CategoryCreate(name="Fruits & Vegetables", parent_id=grocery_kitchen.id)
)

# This will raise ValueError (exceeds 3-level limit):
# category_service.create_category(
#     CategoryCreate(name="Fresh Fruits", parent_id=fruits_veg.id)
# )
```

---

## Category Structure Example

### Complete Hierarchy Example

```
Level 1: Grocery (parent_id = NULL)
  └─ Level 2: Grocery & Kitchen (parent_id = Grocery ID)
      ├─ Level 3: Fruits & Vegetables (parent_id = Grocery & Kitchen ID)
      ├─ Level 3: Dairy, Bread & Eggs (parent_id = Grocery & Kitchen ID)
      ├─ Level 3: Atta, Rice, Oil & Dals (parent_id = Grocery & Kitchen ID)
      └─ Level 3: Masala & Dry Fruits (parent_id = Grocery & Kitchen ID)

Level 1: Electronics (parent_id = NULL)
  └─ Level 2: Electronics Items (parent_id = Electronics ID)
      ├─ Level 3: Mobiles & Accessories (parent_id = Electronics Items ID)
      ├─ Level 3: Laptops & Computers (parent_id = Electronics Items ID)
      └─ Level 3: Home Appliances (parent_id = Electronics Items ID)
```

---

## Frontend Display Logic

### 1. Top Navigation Bar
```typescript
// Get root categories (Level 1)
const { data: rootCategories } = useGetRootCategoriesQuery();

// Filter and sort by display_order
const topNavCategories = rootCategories
  .filter(cat => cat.is_active)
  .sort((a, b) => a.display_order - b.display_order);
```

### 2. Category Sections
```typescript
// Get full category tree
const { data: categoryTree } = useGetCategoryTreeQuery();

// Structure: Level 1 → Level 2 → Level 3
categoryTree.forEach(level1 => {
  level1.children.forEach(level2 => {
    // Display level2.name as section header
    // Display level2.children (Level 3) as grid cards
  });
});
```

### 3. Homepage Layout
- **Top Nav**: Horizontal scroll (Level 1 categories)
- **Sections**: Vertical scroll
  - For each Level 1 category:
    - Show Level 2 categories as section headers
    - Show Level 3 categories (children of Level 2) as grid cards

---

## Benefits of 3-Level Structure

✅ **Consistent UX**: Matches user expectations from Zepto/Blinkit  
✅ **Clear Organization**: Logical grouping of products  
✅ **Easy Navigation**: Users can find products in 2-3 clicks  
✅ **Scalable**: Can handle thousands of products across categories  
✅ **SEO Friendly**: Clear URL structure (`/grocery/grocery-kitchen/fruits-vegetables`)  

---

## Configuration

The depth limit is configurable:

```python
# Enforce 3-level limit (default)
category_service.create_category(
    category_data,
    max_depth=3,
    enforce_depth_limit=True
)

# Allow unlimited depth (if needed)
category_service.create_category(
    category_data,
    max_depth=10,
    enforce_depth_limit=False
)
```

---

## API Endpoints

All existing category endpoints work with the 3-level structure:

- `GET /api/v1/categories/tree` - Get full category tree
- `GET /api/v1/categories/root` - Get Level 1 categories
- `GET /api/v1/categories/{id}/children` - Get children of a category
- `POST /api/v1/admin/categories` - Create category (validates depth)
- `PUT /api/v1/admin/categories/{id}` - Update category (validates depth)

---

## Migration Notes

- **Existing categories**: Will continue to work, but new categories will be validated
- **Depth validation**: Can be disabled per operation if needed
- **Backward compatible**: No breaking changes to existing APIs

---

## Best Practices

1. **Level 1 (Top Nav)**: Keep to 8-10 categories for best UX
2. **Level 2 (Parent Sections)**: Use descriptive names that group related subcategories
3. **Level 3 (Subcategories)**: These are where products are actually assigned
4. **Display Order**: Use `display_order` to control sorting within each level
5. **Images**: Add `image_url` for Level 3 categories for better visual appeal

---

**Status**: ✅ Implemented and ready to use  
**Last Updated**: 2025-01-13

