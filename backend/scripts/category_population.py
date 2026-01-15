#!/usr/bin/env python3
"""
Seed script to populate categories and attributes in the database.
Based on Blinkit/Zepto category structure with dynamic attributes.

Usage:
    python scripts/seed_categories.py
    
    Or with admin credentials (if needed):
    python scripts/seed_categories.py --email admin@banda.com --password Admin@123
"""

import argparse
import sys
import uuid
from pathlib import Path
from typing import Optional, Dict, List, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.services.category_service import CategoryService
from app.services.attribute_service import AttributeService
from app.schemas.category import CategoryCreate
from app.schemas.attribute import CategoryAttributeCreate
from app.models.enums import AttributeType


# ============== Category Data Structure ==============

CATEGORY_DATA = {
    # Level 1: Top Navigation Categories
    "all": {
        "name": "All",
        "slug": "all",
        "display_order": 1,
        "parent_id": None,
        "description": "All products",
        "attributes": []
    },
    "fresh": {
        "name": "Fresh",
        "slug": "fresh",
        "display_order": 2,
        "parent_id": None,
        "description": "Fresh fruits and vegetables",
        "attributes": []
    },
    "grocery": {
        "name": "Grocery",
        "slug": "grocery",
        "display_order": 3,
        "parent_id": None,
        "description": "Grocery & Kitchen essentials",
        "attributes": [
            {
                "name": "Brand",
                "attribute_type": AttributeType.SELECT,
                "options": ["Amul", "Mother Dairy", "Aashirvaad", "Fortune", "Tata", "Haldiram's", "MTR", "Kissan"],
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": True,
                "show_in_listing": True,
                "display_order": 1,
            },
            {
                "name": "Packaging Type",
                "attribute_type": AttributeType.SELECT,
                "options": ["Pack", "Bottle", "Pouch", "Box", "Jar", "Can"],
                "is_inherited": True,
                "is_filterable": False,
                "display_order": 2,
            }
        ]
    },
    "snacks": {
        "name": "Snacks",
        "slug": "snacks",
        "display_order": 4,
        "parent_id": None,
        "description": "Snacks & Drinks",
        "attributes": [
            {
                "name": "Brand",
                "attribute_type": AttributeType.SELECT,
                "options": ["Lay's", "Kurkure", "Haldiram's", "Too Yumm", "Nestle", "Cadbury", "Parle"],
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": True,
                "show_in_listing": True,
                "display_order": 1,
            }
        ]
    },
    "beauty": {
        "name": "Beauty",
        "slug": "beauty",
        "display_order": 5,
        "parent_id": None,
        "description": "Beauty & Personal Care",
        "attributes": [
            {
                "name": "Brand",
                "attribute_type": AttributeType.SELECT,
                "options": ["Lakme", "Maybelline", "L'Oreal", "Himalaya", "Ponds", "Nivea", "Dove"],
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": True,
                "show_in_listing": True,
                "display_order": 1,
            },
            {
                "name": "Skin Type",
                "attribute_type": AttributeType.SELECT,
                "options": ["Oily", "Dry", "Combination", "Sensitive", "Normal"],
                "is_inherited": True,
                "is_filterable": True,
                "display_order": 2,
            }
        ]
    },
    "fashion": {
        "name": "Fashion",
        "slug": "fashion",
        "display_order": 6,
        "parent_id": None,
        "description": "Fashion & Lifestyle",
        "attributes": [
            {
                "name": "Brand",
                "attribute_type": AttributeType.SELECT,
                "options": ["Zara", "H&M", "Levi's", "Allen Solly", "Van Heusen", "UCB"],
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": True,
                "show_in_listing": True,
                "display_order": 1,
            },
            {
                "name": "Gender",
                "attribute_type": AttributeType.SELECT,
                "options": ["Men", "Women", "Unisex", "Kids"],
                "is_inherited": True,
                "is_filterable": True,
                "display_order": 2,
            }
        ]
    },
    "electronics": {
        "name": "Electronics",
        "slug": "electronics",
        "display_order": 7,
        "parent_id": None,
        "description": "Electronics & Gadgets",
        "attributes": [
            {
                "name": "Brand",
                "attribute_type": AttributeType.SELECT,
                "options": ["Apple", "Samsung", "OnePlus", "Xiaomi", "Realme", "Oppo", "Vivo"],
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": True,
                "show_in_listing": True,
                "display_order": 1,
            },
            {
                "name": "Warranty Period",
                "attribute_type": AttributeType.NUMBER,
                "unit": "months",
                "is_inherited": True,
                "is_filterable": True,
                "display_order": 2,
            }
        ]
    },
    "home": {
        "name": "Home",
        "slug": "home",
        "display_order": 8,
        "parent_id": None,
        "description": "Home & Kitchen",
        "attributes": [
            {
                "name": "Brand",
                "attribute_type": AttributeType.SELECT,
                "options": ["Prestige", "Bajaj", "Philips", "Morphy Richards", "Butterfly"],
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": True,
                "show_in_listing": True,
                "display_order": 1,
            }
        ]
    },
    "health": {
        "name": "Health",
        "slug": "health",
        "display_order": 9,
        "parent_id": None,
        "description": "Health & Wellness",
        "attributes": [
            {
                "name": "Brand",
                "attribute_type": AttributeType.SELECT,
                "options": ["Himalaya", "Dabur", "Baidyanath", "Zandu", "Patanjali"],
                "is_inherited": True,
                "is_filterable": True,
                "is_searchable": True,
                "show_in_listing": True,
                "display_order": 1,
            }
        ]
    },
    "cafe": {
        "name": "Cafe",
        "slug": "cafe",
        "display_order": 10,
        "parent_id": None,
        "description": "Ready-to-eat & Cafe items",
        "attributes": []
    },
    
    # Level 2: Parent Sections
    "grocery_kitchen": {
        "name": "Grocery & Kitchen",
        "slug": "grocery-kitchen",
        "display_order": 1,
        "parent_key": "grocery",
        "description": "All grocery and kitchen essentials",
        "attributes": [
            {
                "name": "Weight/Volume",
                "attribute_type": AttributeType.NUMBER,
                "unit": "kg/liter",
                "is_inherited": True,
                "is_filterable": True,
                "display_order": 1,
            }
        ],
        "children": [
            {
                "name": "Fruits & Vegetables",
                "slug": "fruits-vegetables",
                "display_order": 1,
                "description": "Fresh fruits and vegetables",
                "attributes": [
                    {
                        "name": "Origin",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Local", "Imported"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Organic",
                        "attribute_type": AttributeType.BOOLEAN,
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    },
                    {
                        "name": "Season",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Summer", "Winter", "Monsoon", "All Season"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 3,
                    }
                ]
            },
            {
                "name": "Dairy, Bread & Eggs",
                "slug": "dairy-bread-eggs",
                "display_order": 2,
                "description": "Dairy products, bread, and eggs",
                "attributes": [
                    {
                        "name": "Fat Content",
                        "attribute_type": AttributeType.NUMBER,
                        "unit": "%",
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Egg Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Regular", "Free Range", "Organic", "Desi"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    },
                    {
                        "name": "Bread Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["White", "Brown", "Multigrain", "Whole Wheat"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 3,
                    }
                ]
            },
            {
                "name": "Atta, Rice, Oil & Dals",
                "slug": "atta-rice-oil-dals",
                "display_order": 3,
                "description": "Staples: atta, rice, oil, and dals",
                "attributes": [
                    {
                        "name": "Grain Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Basmati", "Sona Masoori", "Brown Rice", "Jasmine"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Oil Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Mustard", "Sunflower", "Olive", "Coconut", "Groundnut", "Soybean"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    },
                    {
                        "name": "Purity",
                        "attribute_type": AttributeType.NUMBER,
                        "unit": "%",
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 3,
                    }
                ]
            },
            {
                "name": "Masala & Dry Fruits",
                "slug": "masala-dry-fruits",
                "display_order": 4,
                "description": "Spices and dry fruits",
                "attributes": [
                    {
                        "name": "Spice Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Whole Spices", "Powder", "Blended Masala"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Breakfast & Sauces",
                "slug": "breakfast-sauces",
                "display_order": 5,
                "description": "Breakfast items and sauces",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Cereal", "Oats", "Sauce", "Ketchup", "Chutney"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Packaged Food",
                "slug": "packaged-food",
                "display_order": 6,
                "description": "Ready-to-cook and packaged foods",
                "attributes": [
                    {
                        "name": "Cuisine Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Indian", "Chinese", "Italian", "Continental"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Frozen Food",
                "slug": "frozen-food",
                "display_order": 7,
                "description": "Frozen food items",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Vegetables", "Fruits", "Ready Meals", "Snacks"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Meat, Fish & Eggs",
                "slug": "meat-fish-eggs",
                "display_order": 8,
                "description": "Fresh meat, fish, and eggs",
                "attributes": [
                    {
                        "name": "Meat Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Chicken", "Mutton", "Fish", "Prawns", "Eggs"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Cut Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Whole", "Curry Cut", "Boneless", "Fillet"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    }
                ]
            }
        ]
    },
    
    "snacks_drinks": {
        "name": "Snacks & Drinks",
        "slug": "snacks-drinks",
        "display_order": 1,
        "parent_key": "snacks",
        "description": "All snacks and beverages",
        "attributes": [],
        "children": [
            {
                "name": "Snacks & Munchies",
                "slug": "snacks-munchies",
                "display_order": 1,
                "description": "Chips, namkeen, and munchies",
                "attributes": [
                    {
                        "name": "Snack Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Chips", "Namkeen", "Nuts", "Popcorn", "Biscuits"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Flavor",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Plain", "Masala", "Tomato", "Cheese", "Sour Cream"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    }
                ]
            },
            {
                "name": "Cold Drinks & Juices",
                "slug": "cold-drinks-juices",
                "display_order": 2,
                "description": "Soft drinks and juices",
                "attributes": [
                    {
                        "name": "Drink Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Carbonated", "Juice", "Energy Drink", "Sports Drink"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Sugar Free",
                        "attribute_type": AttributeType.BOOLEAN,
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    }
                ]
            },
            {
                "name": "Tea, Coffee & More",
                "slug": "tea-coffee-more",
                "display_order": 3,
                "description": "Tea, coffee, and health drinks",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Tea", "Coffee", "Green Tea", "Herbal Tea", "Health Drink"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Ice Creams & More",
                "slug": "ice-creams-more",
                "display_order": 4,
                "description": "Ice creams and frozen desserts",
                "attributes": [
                    {
                        "name": "Flavor",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Vanilla", "Chocolate", "Strawberry", "Butterscotch", "Kulfi"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Chocolates & Candies",
                "slug": "chocolates-candies",
                "display_order": 5,
                "description": "Chocolates and candies",
                "attributes": [
                    {
                        "name": "Chocolate Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Milk Chocolate", "Dark Chocolate", "White Chocolate", "Candy"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Biscuits & Cookies",
                "slug": "biscuits-cookies",
                "display_order": 6,
                "description": "Biscuits and cookies",
                "attributes": [
                    {
                        "name": "Biscuit Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Sweet", "Salty", "Cream", "Digestive"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Zepto Cafe",
                "slug": "zepto-cafe",
                "display_order": 7,
                "description": "Ready-to-eat cafe items",
                "attributes": [
                    {
                        "name": "Cuisine Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Indian", "Continental", "Chinese", "Italian"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            }
        ]
    },
    
    "beauty_personal_care": {
        "name": "Beauty & Personal Care",
        "slug": "beauty-personal-care",
        "display_order": 1,
        "parent_key": "beauty",
        "description": "Beauty and personal care products",
        "attributes": [
            {
                "name": "Volume/Weight",
                "attribute_type": AttributeType.NUMBER,
                "unit": "ml/g",
                "is_inherited": True,
                "is_filterable": True,
                "display_order": 1,
            },
            {
                "name": "Suitable For",
                "attribute_type": AttributeType.MULTI_SELECT,
                "options": ["Men", "Women", "Unisex", "Kids"],
                "is_inherited": True,
                "is_filterable": True,
                "display_order": 2,
            }
        ],
        "children": [
            {
                "name": "Personal Care Studio",
                "slug": "personal-care-studio",
                "display_order": 1,
                "description": "Personal care essentials",
                "attributes": []
            },
            {
                "name": "Skincare",
                "slug": "skincare",
                "display_order": 2,
                "description": "Skincare products",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Face Wash", "Moisturizer", "Serum", "Sunscreen", "Toner"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    },
                    {
                        "name": "SPF",
                        "attribute_type": AttributeType.NUMBER,
                        "unit": "SPF",
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    },
                    {
                        "name": "Active Ingredients",
                        "attribute_type": AttributeType.TEXT,
                        "is_inherited": False,
                        "is_searchable": True,
                        "display_order": 3,
                    }
                ]
            },
            {
                "name": "Makeup & Beauty",
                "slug": "makeup-beauty",
                "display_order": 3,
                "description": "Makeup and beauty products",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Lipstick", "Foundation", "Mascara", "Eyeliner", "Blush", "Compact"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Shade",
                        "attribute_type": AttributeType.TEXT,
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    },
                    {
                        "name": "Finish",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Matte", "Glossy", "Satin", "Dewy"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 3,
                    }
                ]
            },
            {
                "name": "Fragrance",
                "slug": "fragrance",
                "display_order": 4,
                "description": "Perfumes and fragrances",
                "attributes": [
                    {
                        "name": "Fragrance Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Perfume", "Deodorant", "Body Spray", "Cologne"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Bath & Body",
                "slug": "bath-body",
                "display_order": 5,
                "description": "Bath and body care",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Soap", "Body Wash", "Shampoo", "Conditioner", "Body Lotion"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Haircare",
                "slug": "haircare",
                "display_order": 6,
                "description": "Hair care products",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Shampoo", "Conditioner", "Hair Oil", "Hair Serum", "Hair Mask"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Hair Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Normal", "Oily", "Dry", "Damaged", "Color Treated"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    }
                ]
            },
            {
                "name": "Baby Care",
                "slug": "baby-care",
                "display_order": 7,
                "description": "Baby care products",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Diapers", "Baby Wipes", "Baby Lotion", "Baby Shampoo", "Baby Food"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Protein & Nutrition",
                "slug": "protein-nutrition",
                "display_order": 8,
                "description": "Protein and nutrition supplements",
                "attributes": [
                    {
                        "name": "Protein Content",
                        "attribute_type": AttributeType.NUMBER,
                        "unit": "g",
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Pharmacy",
                "slug": "pharmacy",
                "display_order": 9,
                "description": "Pharmacy and medicines",
                "attributes": [
                    {
                        "name": "Medicine Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Prescription", "OTC", "Ayurvedic", "Homeopathic"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Feminine Care",
                "slug": "feminine-care",
                "display_order": 10,
                "description": "Feminine hygiene products",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Sanitary Pads", "Tampons", "Intimate Wash", "Pantyliners"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Sexual Wellness",
                "slug": "sexual-wellness",
                "display_order": 11,
                "description": "Sexual wellness products",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Condoms", "Lubricants", "Pregnancy Tests"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            }
        ]
    },
    
    "fashion_lifestyle": {
        "name": "Fashion & Lifestyle",
        "slug": "fashion-lifestyle",
        "display_order": 1,
        "parent_key": "fashion",
        "description": "Fashion and lifestyle products",
        "attributes": [
            {
                "name": "Material",
                "attribute_type": AttributeType.SELECT,
                "options": ["Cotton", "Polyester", "Denim", "Silk", "Linen", "Wool"],
                "is_inherited": True,
                "is_filterable": True,
                "display_order": 1,
            },
            {
                "name": "Care Instructions",
                "attribute_type": AttributeType.TEXT,
                "is_inherited": True,
                "is_filterable": False,
                "display_order": 2,
            }
        ],
        "children": [
            {
                "name": "Apparel",
                "slug": "apparel",
                "display_order": 1,
                "description": "Clothing and apparel",
                "attributes": [
                    {
                        "name": "Size",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "show_in_listing": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Fit Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Regular", "Slim", "Loose", "Oversized"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    },
                    {
                        "name": "Pattern",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Solid", "Striped", "Printed", "Checked", "Polka Dot"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 3,
                    }
                ]
            },
            {
                "name": "Jewellery",
                "slug": "jewellery",
                "display_order": 2,
                "description": "Jewellery and accessories",
                "attributes": [
                    {
                        "name": "Metal Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Gold", "Silver", "Platinum", "Rose Gold", "Brass"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Purity",
                        "attribute_type": AttributeType.NUMBER,
                        "unit": "carat/karat",
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    },
                    {
                        "name": "Stone Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Diamond", "Ruby", "Emerald", "Pearl", "None"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 3,
                    }
                ]
            },
            {
                "name": "Footwear",
                "slug": "footwear",
                "display_order": 3,
                "description": "Footwear",
                "attributes": [
                    {
                        "name": "Size",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["6", "7", "8", "9", "10", "11", "12"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "show_in_listing": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Shoe Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Casual", "Formal", "Sports", "Sneakers", "Sandals"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    }
                ]
            },
            {
                "name": "Bags & Accessories",
                "slug": "bags-accessories",
                "display_order": 4,
                "description": "Bags and accessories",
                "attributes": [
                    {
                        "name": "Bag Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Backpack", "Handbag", "Wallet", "Laptop Bag", "Travel Bag"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Watches",
                "slug": "watches",
                "display_order": 5,
                "description": "Watches and timepieces",
                "attributes": [
                    {
                        "name": "Watch Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Analog", "Digital", "Smart Watch", "Sports Watch"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Sunglasses",
                "slug": "sunglasses",
                "display_order": 6,
                "description": "Sunglasses and eyewear",
                "attributes": [
                    {
                        "name": "Frame Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Full Rim", "Half Rim", "Rimless", "Aviator"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            }
        ]
    },
    
    "electronics_items": {
        "name": "Electronics Items",
        "slug": "electronics-items",
        "display_order": 1,
        "parent_key": "electronics",
        "description": "Electronics and gadgets",
        "attributes": [
            {
                "name": "Model Number",
                "attribute_type": AttributeType.TEXT,
                "is_inherited": True,
                "is_searchable": True,
                "display_order": 1,
            },
            {
                "name": "Color",
                "attribute_type": AttributeType.SELECT,
                "options": ["Black", "White", "Silver", "Gold", "Blue", "Red"],
                "is_inherited": True,
                "is_filterable": True,
                "display_order": 2,
            }
        ],
        "children": [
            {
                "name": "Mobiles & Accessories",
                "slug": "mobiles-accessories",
                "display_order": 1,
                "description": "Mobile phones and accessories",
                "attributes": [
                    {
                        "name": "RAM",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["4GB", "6GB", "8GB", "12GB", "16GB"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "show_in_listing": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Storage",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["64GB", "128GB", "256GB", "512GB", "1TB"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "show_in_listing": True,
                        "display_order": 2,
                    },
                    {
                        "name": "Screen Size",
                        "attribute_type": AttributeType.NUMBER,
                        "unit": "inches",
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 3,
                    },
                    {
                        "name": "Battery Capacity",
                        "attribute_type": AttributeType.NUMBER,
                        "unit": "mAh",
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 4,
                    },
                    {
                        "name": "Camera",
                        "attribute_type": AttributeType.TEXT,
                        "is_inherited": False,
                        "is_searchable": True,
                        "display_order": 5,
                    },
                    {
                        "name": "5G Support",
                        "attribute_type": AttributeType.BOOLEAN,
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 6,
                    },
                    {
                        "name": "Operating System",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Android", "iOS"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 7,
                    }
                ]
            },
            {
                "name": "Laptops & Computers",
                "slug": "laptops-computers",
                "display_order": 2,
                "description": "Laptops and computers",
                "attributes": [
                    {
                        "name": "RAM",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["4GB", "8GB", "16GB", "32GB"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "show_in_listing": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Storage",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["256GB", "512GB", "1TB", "2TB"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "show_in_listing": True,
                        "display_order": 2,
                    },
                    {
                        "name": "Processor",
                        "attribute_type": AttributeType.TEXT,
                        "is_inherited": False,
                        "is_searchable": True,
                        "display_order": 3,
                    },
                    {
                        "name": "Screen Size",
                        "attribute_type": AttributeType.NUMBER,
                        "unit": "inches",
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 4,
                    }
                ]
            },
            {
                "name": "Home Appliances",
                "slug": "home-appliances",
                "display_order": 3,
                "description": "Home appliances",
                "attributes": [
                    {
                        "name": "Appliance Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Refrigerator", "Washing Machine", "Microwave", "Air Conditioner", "TV"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Capacity",
                        "attribute_type": AttributeType.NUMBER,
                        "unit": "liters/kg",
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    }
                ]
            },
            {
                "name": "Audio & Headphones",
                "slug": "audio-headphones",
                "display_order": 4,
                "description": "Audio devices and headphones",
                "attributes": [
                    {
                        "name": "Device Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Earbuds", "Headphones", "Speakers", "Soundbar"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    },
                    {
                        "name": "Connectivity",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Wired", "Wireless", "Both"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 2,
                    }
                ]
            }
        ]
    },
    
    "home_kitchen": {
        "name": "Home & Kitchen",
        "slug": "home-kitchen",
        "display_order": 1,
        "parent_key": "home",
        "description": "Home and kitchen products",
        "attributes": [],
        "children": [
            {
                "name": "Kitchen & Dining",
                "slug": "kitchen-dining",
                "display_order": 1,
                "description": "Kitchen and dining essentials",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Cookware", "Cutlery", "Storage", "Appliances"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Home Furnishing",
                "slug": "home-furnishing",
                "display_order": 2,
                "description": "Home furnishing items",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Bedding", "Curtains", "Cushions", "Towels"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Cleaning Essentials",
                "slug": "cleaning-essentials",
                "display_order": 3,
                "description": "Cleaning products",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Detergent", "Floor Cleaner", "Dish Wash", "Toilet Cleaner"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Electricals & Accessories",
                "slug": "electricals-accessories",
                "display_order": 4,
                "description": "Electrical items and accessories",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Bulbs", "Switches", "Extension Cords", "Adapters"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Stationery Needs",
                "slug": "stationery-needs",
                "display_order": 5,
                "description": "Stationery items",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Pens", "Notebooks", "Files", "Art Supplies"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            }
        ]
    },
    
    "health_wellness": {
        "name": "Health & Wellness",
        "slug": "health-wellness",
        "display_order": 1,
        "parent_key": "health",
        "description": "Health and wellness products",
        "attributes": [],
        "children": [
            {
                "name": "Pharma & Wellness",
                "slug": "pharma-wellness",
                "display_order": 1,
                "description": "Pharmacy and wellness",
                "attributes": [
                    {
                        "name": "Medicine Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Prescription", "OTC", "Ayurvedic", "Homeopathic"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Baby Care",
                "slug": "baby-care-health",
                "display_order": 2,
                "description": "Baby care products",
                "attributes": [
                    {
                        "name": "Product Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Diapers", "Baby Wipes", "Baby Lotion", "Baby Food"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Pet Care",
                "slug": "pet-care",
                "display_order": 3,
                "description": "Pet care products",
                "attributes": [
                    {
                        "name": "Pet Type",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Dog", "Cat", "Bird", "Fish"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            },
            {
                "name": "Organic & Premium",
                "slug": "organic-premium",
                "display_order": 4,
                "description": "Organic and premium products",
                "attributes": [
                    {
                        "name": "Certification",
                        "attribute_type": AttributeType.SELECT,
                        "options": ["Organic", "Natural", "Ayurvedic", "Premium"],
                        "is_inherited": False,
                        "is_filterable": True,
                        "display_order": 1,
                    }
                ]
            }
        ]
    },
}


# ============== Population Functions ==============

def create_category_with_attributes(
    category_service: CategoryService,
    attribute_service: AttributeService,
    category_data: Dict[str, Any],
    parent_id: Optional[uuid.UUID] = None,
) -> uuid.UUID:
    """Create a category and its attributes."""
    # Check if category already exists
    existing = category_service.get_category_by_slug(category_data["slug"])
    if existing:
        print(f"  [WARNING] Category '{category_data['name']}' already exists, skipping...")
        return existing.id
    
    # Create category
    category_create = CategoryCreate(
        name=category_data["name"],
        description=category_data.get("description"),
        image_url=category_data.get("image_url"),
        parent_id=parent_id,
        display_order=category_data.get("display_order", 0),
    )
    
    category = category_service.create_category(category_create)
    print(f"  [OK] Created category: {category.name}")
    
    # Create attributes
    for attr_data in category_data.get("attributes", []):
        try:
            attr_create = CategoryAttributeCreate(
                category_id=category.id,
                name=attr_data["name"],
                description=attr_data.get("description"),
                attribute_type=attr_data["attribute_type"],
                options=attr_data.get("options"),
                unit=attr_data.get("unit"),
                is_required=attr_data.get("is_required", False),
                is_inherited=attr_data.get("is_inherited", True),
                is_filterable=attr_data.get("is_filterable", True),
                is_searchable=attr_data.get("is_searchable", False),
                display_order=attr_data.get("display_order", 0),
                show_in_listing=attr_data.get("show_in_listing", False),
                show_in_details=attr_data.get("show_in_details", True),
            )
            
            attribute = attribute_service.create_attribute(attr_create)
            print(f"    [OK] Created attribute: {attribute.name}")
        except Exception as e:
            print(f"    [ERROR] Failed to create attribute '{attr_data['name']}': {e}")
    
    return category.id


def populate_categories(db: SessionLocal):
    """Populate all categories and attributes from CATEGORY_DATA."""
    category_service = CategoryService(db)
    attribute_service = AttributeService(db)
    
    print("\n[INFO] Starting category population...")
    print("=" * 60)
    
    # Track created categories by key for parent references
    created_categories: Dict[str, uuid.UUID] = {}
    
    # Step 1: Create Level 1 categories (Top Nav)
    print("\n[STEP 1] Creating Level 1 Categories (Top Navigation)...")
    for key, data in CATEGORY_DATA.items():
        if data.get("parent_id") is None and "parent_key" not in data:
            try:
                cat_id = create_category_with_attributes(
                    category_service, attribute_service, data, parent_id=None
                )
                created_categories[key] = cat_id
            except Exception as e:
                print(f"  [ERROR] Failed to create category '{data['name']}': {e}")
    
    # Step 2: Create Level 2 categories (Parent Sections)
    print("\n[STEP 2] Creating Level 2 Categories (Parent Sections)...")
    for key, data in CATEGORY_DATA.items():
        if "parent_key" in data:
            parent_key = data["parent_key"]
            if parent_key in created_categories:
                try:
                    cat_id = create_category_with_attributes(
                        category_service,
                        attribute_service,
                        data,
                        parent_id=created_categories[parent_key],
                    )
                    created_categories[key] = cat_id
                except Exception as e:
                    print(f"  [ERROR] Failed to create category '{data['name']}': {e}")
            else:
                print(f"  [WARNING] Parent '{parent_key}' not found for '{data['name']}'")
    
    # Step 3: Create Level 3 categories (Subcategories)
    print("\n[STEP 3] Creating Level 3 Categories (Subcategories)...")
    for key, data in CATEGORY_DATA.items():
        if "children" in data:
            parent_id = created_categories.get(key)
            if parent_id:
                for child_data in data["children"]:
                    try:
                        create_category_with_attributes(
                            category_service,
                            attribute_service,
                            child_data,
                            parent_id=parent_id,
                        )
                    except Exception as e:
                        print(f"  [ERROR] Failed to create subcategory '{child_data['name']}': {e}")
            else:
                print(f"  [WARNING] Parent category '{key}' not found")
    
    print("\n" + "=" * 60)
    print("[SUCCESS] Category population completed!")
    print(f"   Total categories created: {len(created_categories)}")
    print("=" * 60 + "\n")


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(description="Populate categories and attributes")
    parser.add_argument(
        "--email",
        default="admin@banda.com",
        help="Admin email (for reference only, not used for seeding)",
    )
    parser.add_argument(
        "--password",
        default="Admin@123",
        help="Admin password (for reference only, not used for seeding)",
    )
    
    args = parser.parse_args()
    
    print("\n[START] Banda E-commerce - Category Population Script")
    print("=" * 60)
    print(f"Admin Email: {args.email}")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        populate_categories(db)
        db.commit()  # Final commit to ensure all changes are persisted
        print("\n[INFO] All changes committed to database successfully!")
    except Exception as e:
        print(f"\n[ERROR] Error during population: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()