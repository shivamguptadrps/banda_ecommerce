#!/usr/bin/env python3
"""Quick script to verify products were created."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.product import Product
from app.models.category import Category

db = SessionLocal()

# Check both categories
veg_cat = db.query(Category).filter(Category.name == "Fresh Vegetables").first()
fruit_cat = db.query(Category).filter(Category.name == "Fresh Fruits").first()

if veg_cat:
    products = db.query(Product).filter(Product.category_id == veg_cat.id).all()
    print(f"\n[SUCCESS] Found {len(products)} products in 'Fresh Vegetables' category:\n")
    for p in products:
        print(f"  {p.name}")
        print(f"    - Images: {len(p.images)}")
        if p.images:
            print(f"    - Primary Image: {p.images[0].image_url[:70]}...")
        print(f"    - Sell Units: {len(p.sell_units)}")
        for su in p.sell_units:
            print(f"      * {su.label}: Rs. {su.price} (Compare: Rs. {su.compare_price})")
        print(f"    - Inventory: {p.inventory.available_quantity if p.inventory else 'None'} {p.stock_unit.value}")
        print()

if fruit_cat:
    products = db.query(Product).filter(Product.category_id == fruit_cat.id).all()
    print(f"\n[SUCCESS] Found {len(products)} products in 'Fresh Fruits' category:\n")
    for p in products:
        print(f"  {p.name}")
        print(f"    - Images: {len(p.images)}")
        if p.images:
            print(f"    - Primary Image: {p.images[0].image_url[:70]}...")
        print(f"    - Sell Units: {len(p.sell_units)}")
        for su in p.sell_units:
            print(f"      * {su.label}: Rs. {su.price} (Compare: Rs. {su.compare_price})")
        print(f"    - Inventory: {p.inventory.available_quantity if p.inventory else 'None'} {p.stock_unit.value}")
        print()
else:
    print("[ERROR] Category 'Fresh Fruits' not found")

if not veg_cat and not fruit_cat:
    print("[ERROR] Categories not found")

db.close()
