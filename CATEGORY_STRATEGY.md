# Category Database Strategy
## Based on Blinkit & Zepto Analysis

### Executive Summary
After analyzing Blinkit and Zepto's category structures, I've identified a **3-level hierarchy** approach:
1. **Top Navigation Categories** (Quick Access Bar)
2. **Parent Category Sections** (Major Groupings)
3. **Subcategories** (Specific Product Categories)

---

## Category Hierarchy Structure

### Level 1: Top Navigation Categories (Horizontal Scroll Bar)
**Purpose:** Quick access to major shopping areas
**Display:** Horizontal scrollable bar at top of homepage
**Count:** 8-10 categories

```
1. All (default - shows all products)
2. Fresh (Fruits & Vegetables)
3. Grocery (Grocery & Kitchen)
4. Snacks (Snacks & Drinks)
5. Beauty (Beauty & Personal Care)
6. Fashion (Fashion & Lifestyle)
7. Electronics
8. Home (Home & Kitchen)
9. Health (Health & Wellness)
10. Cafe (Ready-to-eat/Zepto Cafe style)
```

---

### Level 2: Parent Category Sections (Major Groupings)
**Purpose:** Organize related subcategories into logical sections
**Display:** Bold section headers with grid of subcategories below
**Structure:** Each parent contains 5-15 subcategories

#### **1. Grocery & Kitchen** (Parent Category)
- Fruits & Vegetables
- Dairy, Bread & Eggs
- Atta, Rice, Oil & Dals
- Masala & Dry Fruits
- Breakfast & Sauces
- Packaged Food
- Frozen Food
- Meat, Fish & Eggs

#### **2. Snacks & Drinks** (Parent Category)
- Snacks & Munchies
- Cold Drinks & Juices
- Tea, Coffee & More
- Ice Creams & More
- Chocolates & Candies
- Biscuits & Cookies
- Juices & Soft Drinks
- Zepto Cafe (Ready-to-eat)

#### **3. Beauty & Personal Care** (Parent Category)
- Personal Care Studio
- Skincare
- Makeup & Beauty
- Fragrance
- Bath & Body
- Haircare
- Baby Care
- Protein & Nutrition
- Pharmacy
- Feminine Care
- Sexual Wellness

#### **4. Fashion & Lifestyle** (Parent Category)
- Apparel
- Jewellery
- Footwear
- Bags & Accessories
- Watches
- Sunglasses

#### **5. Home & Kitchen** (Parent Category)
- Kitchen & Dining
- Home Furnishing
- Cleaning Essentials
- Electricals & Accessories
- Stationery Needs

#### **6. Health & Wellness** (Parent Category)
- Pharma & Wellness
- Baby Care
- Pet Care
- Organic & Premium

#### **7. Electronics** (Parent Category)
- Mobiles & Accessories
- Electronics
- Home Appliances
- Computer & Accessories

#### **8. Entertainment** (Parent Category)
- Books
- Toys & Games
- Sports & Fitness

#### **9. Paan Corner** (Parent Category - Regional)
- Cigarettes
- Rolling Paper & Tobacco
- Hookah
- Paan Items

---

### Level 3: Subcategories (Specific Product Categories)
**Purpose:** Detailed product classification
**Display:** Cards with images in grid layout under parent sections
**Example Structure:**

**Under "Fruits & Vegetables":**
- Fresh Fruits
- Fresh Vegetables
- Exotic Fruits
- Organic Fruits & Vegetables

**Under "Dairy, Bread & Eggs":**
- Milk
- Butter
- Cheese
- Curd/Yogurt
- Bread
- Eggs
- Paneer & Cream

**Under "Snacks & Munchies":**
- Chips & Crisps
- Namkeen
- Nuts & Dry Fruits
- Popcorn
- Cookies & Biscuits

---

## Database Schema Design

### Category Table Structure
```sql
categories:
  - id (UUID, Primary Key)
  - name (String, e.g., "Fruits & Vegetables")
  - slug (String, unique, e.g., "fruits-vegetables")
  - description (Text, optional)
  - image_url (String, optional - category banner image)
  - parent_id (UUID, Foreign Key, NULL for root categories)
  - category_level (Integer: 1=Top Nav, 2=Parent Section, 3=Subcategory)
  - display_order (Integer, for sorting)
  - is_active (Boolean)
  - is_featured (Boolean, for top navigation)
  - created_at (DateTime)
  - updated_at (DateTime)
```

### Category Levels Explained:
- **Level 1 (Top Nav):** Categories shown in horizontal scroll bar
- **Level 2 (Parent Sections):** Major groupings like "Grocery & Kitchen"
- **Level 3 (Subcategories):** Specific categories like "Fruits & Vegetables"

---

## Proposed Category Database

### TOP NAVIGATION CATEGORIES (Level 1)
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| All | all | 1 | NULL |
| Fresh | fresh | 2 | NULL |
| Grocery | grocery | 3 | NULL |
| Snacks | snacks | 4 | NULL |
| Beauty | beauty | 5 | NULL |
| Fashion | fashion | 6 | NULL |
| Electronics | electronics | 7 | NULL |
| Home | home | 8 | NULL |
| Health | health | 9 | NULL |
| Cafe | cafe | 10 | NULL |

### PARENT SECTIONS (Level 2)

#### 1. Grocery & Kitchen
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Grocery & Kitchen | grocery-kitchen | 1 | Grocery |

#### 2. Snacks & Drinks
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Snacks & Drinks | snacks-drinks | 1 | Snacks |

#### 3. Beauty & Personal Care
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Beauty & Personal Care | beauty-personal-care | 1 | Beauty |

#### 4. Fashion & Lifestyle
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Fashion & Lifestyle | fashion-lifestyle | 1 | Fashion |

#### 5. Home & Kitchen
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Home & Kitchen | home-kitchen | 1 | Home |

#### 6. Health & Wellness
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Health & Wellness | health-wellness | 1 | Health |

#### 7. Electronics
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Electronics | electronics | 1 | Electronics |

#### 8. Entertainment
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Entertainment | entertainment | 1 | NULL |

#### 9. Paan Corner
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Paan Corner | paan-corner | 1 | NULL |

### SUBCATEGORIES (Level 3)

#### Under "Grocery & Kitchen"
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Fruits & Vegetables | fruits-vegetables | 1 | Grocery & Kitchen |
| Dairy, Bread & Eggs | dairy-bread-eggs | 2 | Grocery & Kitchen |
| Atta, Rice, Oil & Dals | atta-rice-oil-dals | 3 | Grocery & Kitchen |
| Masala & Dry Fruits | masala-dry-fruits | 4 | Grocery & Kitchen |
| Breakfast & Sauces | breakfast-sauces | 5 | Grocery & Kitchen |
| Packaged Food | packaged-food | 6 | Grocery & Kitchen |
| Frozen Food | frozen-food | 7 | Grocery & Kitchen |
| Meat, Fish & Eggs | meat-fish-eggs | 8 | Grocery & Kitchen |

#### Under "Snacks & Drinks"
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Snacks & Munchies | snacks-munchies | 1 | Snacks & Drinks |
| Cold Drinks & Juices | cold-drinks-juices | 2 | Snacks & Drinks |
| Tea, Coffee & More | tea-coffee-more | 3 | Snacks & Drinks |
| Ice Creams & More | ice-creams-more | 4 | Snacks & Drinks |
| Chocolates & Candies | chocolates-candies | 5 | Snacks & Drinks |
| Biscuits & Cookies | biscuits-cookies | 6 | Snacks & Drinks |
| Juices & Soft Drinks | juices-soft-drinks | 7 | Snacks & Drinks |
| Zepto Cafe | zepto-cafe | 8 | Snacks & Drinks |

#### Under "Beauty & Personal Care"
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Personal Care Studio | personal-care-studio | 1 | Beauty & Personal Care |
| Skincare | skincare | 2 | Beauty & Personal Care |
| Makeup & Beauty | makeup-beauty | 3 | Beauty & Personal Care |
| Fragrance | fragrance | 4 | Beauty & Personal Care |
| Bath & Body | bath-body | 5 | Beauty & Personal Care |
| Haircare | haircare | 6 | Beauty & Personal Care |
| Baby Care | baby-care | 7 | Beauty & Personal Care |
| Protein & Nutrition | protein-nutrition | 8 | Beauty & Personal Care |
| Pharmacy | pharmacy | 9 | Beauty & Personal Care |
| Feminine Care | feminine-care | 10 | Beauty & Personal Care |
| Sexual Wellness | sexual-wellness | 11 | Beauty & Personal Care |

#### Under "Fashion & Lifestyle"
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Apparel | apparel | 1 | Fashion & Lifestyle |
| Jewellery | jewellery | 2 | Fashion & Lifestyle |
| Footwear | footwear | 3 | Fashion & Lifestyle |
| Bags & Accessories | bags-accessories | 4 | Fashion & Lifestyle |
| Watches | watches | 5 | Fashion & Lifestyle |
| Sunglasses | sunglasses | 6 | Fashion & Lifestyle |

#### Under "Home & Kitchen"
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Kitchen & Dining | kitchen-dining | 1 | Home & Kitchen |
| Home Furnishing | home-furnishing | 2 | Home & Kitchen |
| Cleaning Essentials | cleaning-essentials | 3 | Home & Kitchen |
| Electricals & Accessories | electricals-accessories | 4 | Home & Kitchen |
| Stationery Needs | stationery-needs | 5 | Home & Kitchen |

#### Under "Health & Wellness"
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Pharma & Wellness | pharma-wellness | 1 | Health & Wellness |
| Baby Care | baby-care | 2 | Health & Wellness |
| Pet Care | pet-care | 3 | Health & Wellness |
| Organic & Premium | organic-premium | 4 | Health & Wellness |

#### Under "Electronics"
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Mobiles & Accessories | mobiles-accessories | 1 | Electronics |
| Electronics | electronics-items | 2 | Electronics |
| Home Appliances | home-appliances | 3 | Electronics |
| Computer & Accessories | computer-accessories | 4 | Electronics |

#### Under "Entertainment"
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Books | books | 1 | Entertainment |
| Toys & Games | toys-games | 2 | Entertainment |
| Sports & Fitness | sports-fitness | 3 | Entertainment |

#### Under "Paan Corner"
| Name | Slug | Display Order | Parent |
|------|------|---------------|--------|
| Cigarettes | cigarettes | 1 | Paan Corner |
| Rolling Paper & Tobacco | rolling-paper-tobacco | 2 | Paan Corner |
| Hookah | hookah | 3 | Paan Corner |
| Paan Items | paan-items | 4 | Paan Corner |

---

## Display Strategy

### Homepage Layout:
1. **Hero Section** (Search bar, location selector)
2. **Top Navigation Bar** (Horizontal scroll: All, Fresh, Grocery, Snacks, Beauty, Fashion, Electronics, Home, Health, Cafe)
3. **Category Sections** (Vertical scroll):
   - Each parent section (e.g., "Grocery & Kitchen") as bold header
   - Grid of subcategory cards (2-3 columns on mobile, 4-6 on desktop)
   - Each card shows: Image + Category Name
   - "See All" link at end of each section

### Category Page:
- Shows all subcategories under selected parent
- Grid layout with images
- Filter by subcategory
- Sort options

---

## Implementation Notes

1. **Category Images:** Each category should have a representative image
   - Can be composite image of top products
   - Or custom category banner image
   - Fallback to emoji/icon if no image

2. **Display Order:** Critical for UX
   - Top nav: Most popular categories first
   - Parent sections: Grocery first (highest demand)
   - Subcategories: Most searched first

3. **Active Status:** 
   - Categories with no products should be hidden
   - Seasonal categories can be toggled on/off

4. **Slug Generation:**
   - Auto-generate from name
   - Lowercase, hyphen-separated
   - Must be unique

---

## Approval Checklist

- [ ] Category hierarchy structure approved
- [ ] Top navigation categories list approved
- [ ] Parent sections list approved
- [ ] Subcategories list approved
- [ ] Display strategy approved
- [ ] Database schema approved
- [ ] Ready for implementation

---

## Next Steps (After Approval)

1. Create database migration for category structure
2. Create seed script with all categories
3. Update frontend to display categories in new structure
4. Add category images/assets
5. Test category navigation flow

---

**Prepared by:** Senior Product Manager (Quick Commerce)
**Date:** January 11, 2026
**Status:** Awaiting Approval

