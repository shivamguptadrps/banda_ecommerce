#!/usr/bin/env python3
"""Quick summary of created products."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.product import Product
from app.models.category import Category

db = SessionLocal()

print("\n" + "=" * 70)
print("  PRODUCT SUMMARY")
print("=" * 70)

# Fresh Vegetables
veg_cat = db.query(Category).filter(Category.name == "Fresh Vegetables").first()
if veg_cat:
    veg_products = db.query(Product).filter(Product.category_id == veg_cat.id).all()
    print(f"\n[FRESH VEGETABLES] - {len(veg_products)} products")
    for p in veg_products:
        print(f"  - {p.name}")

# Fresh Fruits
fruit_cat = db.query(Category).filter(Category.name == "Fresh Fruits").first()
if fruit_cat:
    fruit_products = db.query(Product).filter(Product.category_id == fruit_cat.id).all()
    print(f"\n[FRESH FRUITS] - {len(fruit_products)} products")
    for p in fruit_products:
        print(f"  - {p.name}")
else:
    fruit_products = []

print("\n" + "=" * 70)
print(f"  TOTAL: {len(veg_products) + len(fruit_products)} products created")
print("=" * 70 + "\n")

db.close()
