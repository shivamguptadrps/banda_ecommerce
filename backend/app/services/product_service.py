"""
Product Service
Business logic for product, inventory, and sell unit operations
"""

import uuid
import re
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func, case

from app.models.product import Product, ProductImage, SellUnit, Inventory
from app.models.vendor import Vendor
from app.models.category import Category
from app.models.attribute import ProductAttributeValue
from app.models.enums import StockUnit
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    SellUnitCreate,
    SellUnitUpdate,
    InventoryUpdate,
    ProductImageCreate,
)


class ProductService:
    """Service class for product operations."""
    
    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
    
    # ============== Helper Methods ==============
    
    def _get_category_and_descendants(self, category_id: uuid.UUID) -> List[uuid.UUID]:
        """
        Get category ID and all its descendant category IDs (recursively).
        
        Args:
            category_id: Root category UUID
            
        Returns:
            List of category UUIDs including the root and all descendants
        """
        category_ids = [category_id]
        
        # Get direct children
        children = self.db.query(Category).filter(
            Category.parent_id == category_id,
            Category.is_active == True,
        ).all()
        
        # Recursively get descendants
        for child in children:
            category_ids.extend(self._get_category_and_descendants(child.id))
        
        return category_ids
    
    def _generate_slug(self, name: str, vendor_id: uuid.UUID) -> str:
        """
        Generate unique slug for product.
        
        Args:
            name: Product name
            vendor_id: Vendor's UUID
            
        Returns:
            Unique slug string
        """
        slug = name.lower().strip()
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[-\s]+', '-', slug)
        
        # Check uniqueness within vendor
        base_slug = slug
        counter = 1
        
        while self.db.query(Product).filter(
            Product.slug == slug,
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        ).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        return slug
    
    def _load_product_relations(self, query):
        """Add eager loading for product relations."""
        return query.options(
            joinedload(Product.images),
            joinedload(Product.sell_units),
            joinedload(Product.inventory),
            joinedload(Product.vendor),
            joinedload(Product.category),
            joinedload(Product.attribute_values).joinedload(ProductAttributeValue.attribute),
        )
    
    # ============== Product CRUD ==============
    
    def create_product(
        self,
        vendor_id: uuid.UUID,
        product_data: ProductCreate,
    ) -> Product:
        """
        Create a new product with optional sell units.
        
        Args:
            vendor_id: Vendor's UUID
            product_data: Product creation data
            
        Returns:
            Created product object
            
        Raises:
            ValueError: If vendor not found or not verified
        """
        # Verify vendor exists and is verified
        vendor = self.db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            raise ValueError("Vendor not found")
        if not vendor.is_verified:
            raise ValueError("Vendor must be verified to add products")
        
        # Validate category if provided
        if product_data.category_id:
            category = self.db.query(Category).filter(
                Category.id == product_data.category_id,
                Category.is_active == True,
            ).first()
            if not category:
                raise ValueError("Category not found or inactive")
        
        # Generate slug
        slug = self._generate_slug(product_data.name, vendor_id)
        
        # Create product
        product = Product(
            vendor_id=vendor_id,
            category_id=product_data.category_id,
            name=product_data.name,
            slug=slug,
            description=product_data.description,
            stock_unit=product_data.stock_unit,
            # Return Policy (mandatory)
            return_eligible=product_data.return_eligible,
            return_window_days=product_data.return_window_days if product_data.return_eligible else None,
            return_conditions=product_data.return_conditions,
        )
        
        self.db.add(product)
        self.db.flush()  # Get product ID
        
        # Create inventory
        inventory = Inventory(
            product_id=product.id,
            available_quantity=product_data.initial_stock,
            low_stock_threshold=product_data.low_stock_threshold,
        )
        self.db.add(inventory)
        
        # Create sell units
        for sell_unit_data in product_data.sell_units:
            sell_unit = SellUnit(
                product_id=product.id,
                label=sell_unit_data.label,
                unit_value=sell_unit_data.unit_value,
                price=sell_unit_data.price,
                compare_price=sell_unit_data.compare_price,
            )
            self.db.add(sell_unit)
        
        self.db.commit()
        self.db.refresh(product)
        
        return product
    
    def get_product_by_id(
        self,
        product_id: uuid.UUID,
        include_deleted: bool = False,
    ) -> Optional[Product]:
        """Get product by ID with relations."""
        query = self._load_product_relations(
            self.db.query(Product).filter(Product.id == product_id)
        )
        
        if not include_deleted:
            query = query.filter(Product.is_deleted == False)
        
        return query.first()
    
    def get_product_by_slug(
        self,
        vendor_id: uuid.UUID,
        slug: str,
    ) -> Optional[Product]:
        """Get product by vendor and slug."""
        return self._load_product_relations(
            self.db.query(Product).filter(
                Product.vendor_id == vendor_id,
                Product.slug == slug,
                Product.is_deleted == False,
            )
        ).first()
    
    def get_product_by_slug_public(
        self,
        slug: str,
    ) -> Optional[Product]:
        """Get product by slug (public, checks vendor is active and verified)."""
        return self._load_product_relations(
            self.db.query(Product)
            .join(Vendor)
            .filter(
                Product.slug == slug,
                Product.is_deleted == False,
                Product.is_active == True,
                Vendor.is_active == True,
                Vendor.is_verified == True,
            )
        ).first()
    
    def update_product(
        self,
        product_id: uuid.UUID,
        vendor_id: uuid.UUID,
        update_data: ProductUpdate,
    ) -> Optional[Product]:
        """
        Update a product.
        
        Args:
            product_id: Product's UUID
            vendor_id: Vendor's UUID (for ownership check)
            update_data: Fields to update
            
        Returns:
            Updated product object
        """
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        ).first()
        
        if not product:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        # Regenerate slug if name changed
        if "name" in update_dict:
            update_dict["slug"] = self._generate_slug(update_dict["name"], vendor_id)
        
        # Validate category if changed
        if "category_id" in update_dict and update_dict["category_id"]:
            category = self.db.query(Category).filter(
                Category.id == update_dict["category_id"],
                Category.is_active == True,
            ).first()
            if not category:
                raise ValueError("Category not found or inactive")
        
        for field, value in update_dict.items():
            setattr(product, field, value)
        
        self.db.commit()
        self.db.refresh(product)
        
        return product
    
    def delete_product(
        self,
        product_id: uuid.UUID,
        vendor_id: uuid.UUID,
    ) -> bool:
        """
        Soft delete a product.
        
        Args:
            product_id: Product's UUID
            vendor_id: Vendor's UUID (for ownership check)
            
        Returns:
            True if successful
        """
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        ).first()
        
        if not product:
            return False
        
        product.is_deleted = True
        product.is_active = False
        self.db.commit()
        
        return True
    
    # ============== Product Queries ==============
    
    def get_vendor_products(
        self,
        vendor_id: uuid.UUID,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        category_id: Optional[uuid.UUID] = None,
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[Product], int]:
        """
        Get vendor's products.
        
        Returns:
            Tuple of (products list, total count)
        """
        query = self.db.query(Product).filter(
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        )
        
        if is_active is not None:
            query = query.filter(Product.is_active == is_active)
        
        if search:
            query = query.filter(
                or_(
                    Product.name.ilike(f"%{search}%"),
                    Product.description.ilike(f"%{search}%"),
                )
            )
        
        if category_id:
            # Include subcategories
            category_ids = self._get_category_and_descendants(category_id)
            query = query.filter(Product.category_id.in_(category_ids))
        
        total = query.count()
        
        # Add relations and pagination
        query = self._load_product_relations(query)
        offset = (page - 1) * size
        products = query.order_by(Product.created_at.desc()).offset(offset).limit(size).all()
        
        return products, total
    
    def browse_products(
        self,
        category_id: Optional[uuid.UUID] = None,
        vendor_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        min_price: Optional[Decimal] = None,
        max_price: Optional[Decimal] = None,
        in_stock_only: bool = False,
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[Product], int]:
        """
        Browse products (public).
        
        Returns:
            Tuple of (products list, total count)
        """
        query = self.db.query(Product).join(Product.vendor).filter(
            Product.is_active == True,
            Product.is_deleted == False,
            Vendor.is_verified == True,
            Vendor.is_active == True,
        )
        
        if category_id:
            # Include subcategories - get all category IDs including descendants
            category_ids = self._get_category_and_descendants(category_id)
            query = query.filter(Product.category_id.in_(category_ids))
        
        if vendor_id:
            query = query.filter(Product.vendor_id == vendor_id)
        
        if search:
            # Enhanced multi-field search with category and vendor matching
            # Join Category and Vendor for search
            query = query.outerjoin(Product.category).outerjoin(Product.vendor)
            
            # Split search terms for better matching
            search_terms = search.strip().split()
            search_conditions = []
            
            for term in search_terms:
                term_pattern = f"%{term}%"
                # Search in multiple fields:
                # 1. Product name (highest priority)
                # 2. Product description
                # 3. Category name (including parent categories)
                # 4. Vendor shop name
                search_conditions.extend([
                    func.lower(Product.name).like(f"%{term.lower()}%"),
                    func.lower(Product.description).like(f"%{term.lower()}%"),
                    func.lower(Category.name).like(f"%{term.lower()}%"),
                    func.lower(Vendor.shop_name).like(f"%{term.lower()}%"),
                ])
            
            if search_conditions:
                query = query.filter(or_(*search_conditions))
        
        # Price filtering requires subquery on sell_units
        if min_price is not None or max_price is not None:
            from sqlalchemy import exists, select
            
            price_filter = self.db.query(SellUnit.product_id).filter(
                SellUnit.is_active == True
            )
            
            if min_price is not None:
                price_filter = price_filter.filter(SellUnit.price >= min_price)
            if max_price is not None:
                price_filter = price_filter.filter(SellUnit.price <= max_price)
            
            query = query.filter(Product.id.in_(price_filter.subquery()))
        
        # In-stock filter
        if in_stock_only:
            query = query.join(Product.inventory).filter(
                Inventory.available_quantity > 0
            )
        
        total = query.count()
        
        # Add relations and pagination
        query = self._load_product_relations(query)
        offset = (page - 1) * size
        
        # Order by relevance if searching, otherwise by created_at
        if search:
            # Enhanced relevance scoring:
            # 1. Product name starts with search term (highest priority)
            # 2. Product name contains search term
            # 3. Category name matches (finds products in matching categories)
            # 4. Vendor name matches
            # 5. Description contains search term
            # 6. Then by created_at (newest first)
            search_lower = search.lower()
            from sqlalchemy import case
            
            # Build relevance score
            relevance_score = case(
                # Exact name match (starts with) - highest priority
                (func.lower(Product.name).like(f"{search_lower}%"), 1),
                # Name contains - high priority
                (func.lower(Product.name).like(f"%{search_lower}%"), 2),
                # Category name matches - medium-high priority (finds "mobile" category products)
                (func.lower(Category.name).like(f"%{search_lower}%"), 3),
                # Vendor name matches - medium priority
                (func.lower(Vendor.shop_name).like(f"%{search_lower}%"), 4),
                # Description contains - lower priority
                (func.lower(Product.description).like(f"%{search_lower}%"), 5),
                else_=6
            )
            
            query = query.order_by(
                relevance_score,
                Product.created_at.desc()
            )
        else:
            query = query.order_by(Product.created_at.desc())
        
        products = query.offset(offset).limit(size).all()
        
        return products, total
    
    def search_suggestions(
        self,
        query: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Get search suggestions/autocomplete for products.
        
        Args:
            query: Search query string
            limit: Maximum number of suggestions
            
        Returns:
            List of suggestion dictionaries with name, category, and vendor info
        """
        if not query or len(query.strip()) < 2:
            return []
        
        search_term = query.strip().lower()
        
        # Get products matching the search (including category and vendor)
        products = self.db.query(Product).join(Product.vendor).outerjoin(Product.category).filter(
            Product.is_active == True,
            Product.is_deleted == False,
            Vendor.is_verified == True,
            Vendor.is_active == True,
            or_(
                func.lower(Product.name).like(f"%{search_term}%"),
                func.lower(Product.description).like(f"%{search_term}%"),
                func.lower(Category.name).like(f"%{search_term}%"),  # Search in category names
                func.lower(Vendor.shop_name).like(f"%{search_term}%"),  # Search in vendor names
            )
        ).options(
            joinedload(Product.category),
            joinedload(Product.vendor),
        ).order_by(
            # Enhanced relevance scoring for suggestions
            case(
                (func.lower(Product.name).like(f"{search_term}%"), 1),  # Name starts with
                (func.lower(Product.name).like(f"%{search_term}%"), 2),  # Name contains
                (func.lower(Category.name).like(f"%{search_term}%"), 3),  # Category matches
                (func.lower(Vendor.shop_name).like(f"%{search_term}%"), 4),  # Vendor matches
                else_=5
            ),
            Product.name
        ).limit(limit).all()
        
        suggestions = []
        seen_names = set()
        
        for product in products:
            # Avoid duplicates
            if product.name.lower() in seen_names:
                continue
            seen_names.add(product.name.lower())
            
            suggestions.append({
                "id": str(product.id),
                "name": product.name,
                "slug": product.slug,
                "category": product.category.name if product.category else None,
                "vendor": product.vendor.shop_name if product.vendor else None,
                "min_price": float(product.min_price) if product.min_price else None,
                "primary_image": product.primary_image,
            })
        
        return suggestions
    
    # ============== Sell Unit Operations ==============
    
    def add_sell_unit(
        self,
        product_id: uuid.UUID,
        vendor_id: uuid.UUID,
        sell_unit_data: SellUnitCreate,
    ) -> SellUnit:
        """Add a sell unit to product."""
        # Verify ownership
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        ).first()
        
        if not product:
            raise ValueError("Product not found")
        
        sell_unit = SellUnit(
            product_id=product_id,
            label=sell_unit_data.label,
            unit_value=sell_unit_data.unit_value,
            price=sell_unit_data.price,
            compare_price=sell_unit_data.compare_price,
        )
        
        self.db.add(sell_unit)
        self.db.commit()
        self.db.refresh(sell_unit)
        
        return sell_unit
    
    def update_sell_unit(
        self,
        sell_unit_id: uuid.UUID,
        vendor_id: uuid.UUID,
        update_data: SellUnitUpdate,
    ) -> Optional[SellUnit]:
        """Update a sell unit."""
        sell_unit = self.db.query(SellUnit).join(Product).filter(
            SellUnit.id == sell_unit_id,
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        ).first()
        
        if not sell_unit:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        for field, value in update_dict.items():
            setattr(sell_unit, field, value)
        
        self.db.commit()
        self.db.refresh(sell_unit)
        
        return sell_unit
    
    def delete_sell_unit(
        self,
        sell_unit_id: uuid.UUID,
        vendor_id: uuid.UUID,
    ) -> bool:
        """Delete a sell unit (set inactive)."""
        sell_unit = self.db.query(SellUnit).join(Product).filter(
            SellUnit.id == sell_unit_id,
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        ).first()
        
        if not sell_unit:
            return False
        
        sell_unit.is_active = False
        self.db.commit()
        
        return True
    
    # ============== Image Operations ==============
    
    def add_product_image(
        self,
        product_id: uuid.UUID,
        vendor_id: uuid.UUID,
        image_url: str,
        is_primary: bool = False,
        display_order: Optional[int] = None,
    ) -> ProductImage:
        """Add an image to product."""
        # Verify ownership
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        ).first()
        
        if not product:
            raise ValueError("Product not found")
        
        # Get current max display order if not specified
        if display_order is None:
            max_order = self.db.query(func.max(ProductImage.display_order)).filter(
                ProductImage.product_id == product_id
            ).scalar() or -1
            display_order = max_order + 1
        
        # If setting as primary, unset others
        if is_primary:
            self.db.query(ProductImage).filter(
                ProductImage.product_id == product_id
            ).update({"is_primary": False})
        
        image = ProductImage(
            product_id=product_id,
            image_url=image_url,
            display_order=display_order,
            is_primary=is_primary,
        )
        
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        
        return image
    
    def delete_product_image(
        self,
        image_id: uuid.UUID,
        vendor_id: uuid.UUID,
    ) -> bool:
        """Delete a product image."""
        image = self.db.query(ProductImage).join(Product).filter(
            ProductImage.id == image_id,
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        ).first()
        
        if not image:
            return False
        
        self.db.delete(image)
        self.db.commit()
        
        return True
    
    def set_primary_image(
        self,
        image_id: uuid.UUID,
        vendor_id: uuid.UUID,
    ) -> bool:
        """Set an image as primary."""
        image = self.db.query(ProductImage).join(Product).filter(
            ProductImage.id == image_id,
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        ).first()
        
        if not image:
            return False
        
        # Unset all other images
        self.db.query(ProductImage).filter(
            ProductImage.product_id == image.product_id
        ).update({"is_primary": False})
        
        image.is_primary = True
        self.db.commit()
        
        return True
    
    def reorder_images(
        self,
        product_id: uuid.UUID,
        vendor_id: uuid.UUID,
        image_ids: List[uuid.UUID],
    ) -> bool:
        """Reorder product images."""
        # Verify ownership
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        ).first()
        
        if not product:
            return False
        
        for order, image_id in enumerate(image_ids):
            self.db.query(ProductImage).filter(
                ProductImage.id == image_id,
                ProductImage.product_id == product_id,
            ).update({"display_order": order})
        
        self.db.commit()
        return True
    
    # ============== Inventory Operations ==============
    
    def update_stock(
        self,
        product_id: uuid.UUID,
        vendor_id: uuid.UUID,
        quantity: Decimal,
        reason: Optional[str] = None,
    ) -> Optional[Inventory]:
        """
        Adjust product stock.
        
        Args:
            product_id: Product's UUID
            vendor_id: Vendor's UUID
            quantity: Amount to adjust (positive or negative)
            reason: Optional reason for adjustment
            
        Returns:
            Updated inventory object
        """
        # Verify ownership
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        ).first()
        
        if not product or not product.inventory:
            return None
        
        inventory = product.inventory
        new_quantity = inventory.available_quantity + quantity
        
        if new_quantity < 0:
            raise ValueError("Stock cannot be negative")
        
        inventory.available_quantity = new_quantity
        self.db.commit()
        self.db.refresh(inventory)
        
        # TODO: Log stock change with reason
        
        return inventory
    
    def set_stock(
        self,
        product_id: uuid.UUID,
        vendor_id: uuid.UUID,
        available_quantity: Decimal,
    ) -> Optional[Inventory]:
        """Set absolute stock quantity."""
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        ).first()
        
        if not product or not product.inventory:
            return None
        
        if available_quantity < 0:
            raise ValueError("Stock cannot be negative")
        
        product.inventory.available_quantity = available_quantity
        self.db.commit()
        self.db.refresh(product.inventory)
        
        return product.inventory
    
    def get_low_stock_products(
        self,
        vendor_id: uuid.UUID,
    ) -> List[Product]:
        """Get products with low stock."""
        return self._load_product_relations(
            self.db.query(Product).join(Product.inventory).filter(
                Product.vendor_id == vendor_id,
                Product.is_deleted == False,
                Product.is_active == True,
                Inventory.available_quantity <= Inventory.low_stock_threshold,
            )
        ).all()
    
    def get_out_of_stock_products(
        self,
        vendor_id: uuid.UUID,
    ) -> List[Product]:
        """Get products that are out of stock."""
        return self._load_product_relations(
            self.db.query(Product).join(Product.inventory).filter(
                Product.vendor_id == vendor_id,
                Product.is_deleted == False,
                Inventory.available_quantity <= 0,
            )
        ).all()

