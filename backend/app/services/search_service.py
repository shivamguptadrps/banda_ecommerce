"""
Search Service
Enhanced search functionality with PostgreSQL full-text search
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func, case, text, desc, asc
from sqlalchemy.dialects.postgresql import TSVECTOR

from app.models.product import Product, ProductImage, SellUnit, Inventory
from app.models.vendor import Vendor
from app.models.category import Category
from app.models.user import User


class SearchService:
    """Service for enhanced product search with full-text search."""
    
    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
    
    def _get_category_and_descendants(self, category_id: uuid.UUID) -> List[uuid.UUID]:
        """Get category ID and all its descendant category IDs (recursively)."""
        category_ids = [category_id]
        
        children = self.db.query(Category).filter(
            Category.parent_id == category_id,
            Category.is_active == True,
        ).all()
        
        for child in children:
            category_ids.extend(self._get_category_and_descendants(child.id))
        
        return category_ids
    
    def _load_product_relations(self, query):
        """Add eager loading for product relations."""
        return query.options(
            joinedload(Product.images),
            joinedload(Product.sell_units),
            joinedload(Product.inventory),
            joinedload(Product.vendor),
            joinedload(Product.category),
        )
    
    def search_products(
        self,
        query: str,
        category_id: Optional[uuid.UUID] = None,
        vendor_id: Optional[uuid.UUID] = None,
        min_price: Optional[Decimal] = None,
        max_price: Optional[Decimal] = None,
        in_stock_only: bool = False,
        sort_by: str = "relevance",  # relevance, price_asc, price_desc, newest, rating
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[Product], int]:
        """
        Enhanced product search with PostgreSQL full-text search.
        
        Args:
            query: Search query string
            category_id: Filter by category
            vendor_id: Filter by vendor
            min_price: Minimum price filter
            max_price: Maximum price filter
            in_stock_only: Show only in-stock products
            sort_by: Sort option (relevance, price_asc, price_desc, newest, rating)
            page: Page number
            size: Page size
            
        Returns:
            Tuple of (products list, total count)
        """
        if not query or len(query.strip()) < 2:
            # Fallback to basic browse if query is too short
            from app.services.product_service import ProductService
            product_service = ProductService(self.db)
            return product_service.browse_products(
                category_id=category_id,
                vendor_id=vendor_id,
                search=query,
                min_price=min_price,
                max_price=max_price,
                in_stock_only=in_stock_only,
                page=page,
                size=size,
            )
        
        # Base query - only active products from verified vendors
        base_query = self.db.query(Product).join(Product.vendor).filter(
            Product.is_active == True,
            Product.is_deleted == False,
            Vendor.is_verified == True,
            Vendor.is_active == True,
        )
        
        # Category filter (include subcategories)
        if category_id:
            category_ids = self._get_category_and_descendants(category_id)
            base_query = base_query.filter(Product.category_id.in_(category_ids))
        
        # Vendor filter
        if vendor_id:
            base_query = base_query.filter(Product.vendor_id == vendor_id)
        
        # Price filter
        if min_price is not None or max_price is not None:
            price_subq = self.db.query(SellUnit.product_id).filter(
                SellUnit.is_active == True
            )
            if min_price is not None:
                price_subq = price_subq.filter(SellUnit.price >= min_price)
            if max_price is not None:
                price_subq = price_subq.filter(SellUnit.price <= max_price)
            base_query = base_query.filter(Product.id.in_(price_subq.subquery()))
        
        # In-stock filter
        if in_stock_only:
            base_query = base_query.join(Product.inventory).filter(
                Inventory.available_quantity > 0
            )
        
        # Full-text search using PostgreSQL tsvector
        # Create search vector from product name, description, category, and vendor
        search_terms = query.strip().lower()
        
        # Join category and vendor for search
        search_query = base_query.outerjoin(Product.category).outerjoin(Product.vendor)
        
        # Build full-text search conditions
        # Using to_tsvector for better search quality
        search_conditions = []
        
        # Split query into terms
        terms = search_terms.split()
        
        for term in terms:
            # Search in multiple fields with different weights
            # Product name (highest weight)
            # Description (medium weight)
            # Category name (medium weight)
            # Vendor name (lower weight)
            term_pattern = f"%{term}%"
            search_conditions.extend([
                func.lower(Product.name).like(term_pattern),
                func.lower(Product.description).like(term_pattern) if Product.description else False,
                func.lower(Category.name).like(term_pattern) if Category.name else False,
                func.lower(Vendor.shop_name).like(term_pattern) if Vendor.shop_name else False,
            ])
        
        if search_conditions:
            search_query = search_query.filter(or_(*search_conditions))
        
        # Get total count
        total = search_query.count()
        
        # Add relations
        search_query = self._load_product_relations(search_query)
        
        # Apply sorting
        if sort_by == "relevance":
            # Relevance scoring: name match > category match > vendor match > description match
            search_lower = search_terms.lower()
            relevance_score = case(
                (func.lower(Product.name).like(f"{search_lower}%"), 1),  # Exact start match
                (func.lower(Product.name).like(f"%{search_lower}%"), 2),  # Contains
                (func.lower(Category.name).like(f"%{search_lower}%"), 3),  # Category match
                (func.lower(Vendor.shop_name).like(f"%{search_lower}%"), 4),  # Vendor match
                (func.lower(Product.description).like(f"%{search_lower}%"), 5),  # Description
                else_=6
            )
            search_query = search_query.order_by(
                relevance_score,
                Product.created_at.desc()
            )
        elif sort_by == "price_asc":
            search_query = search_query.order_by(Product.min_price.asc())
        elif sort_by == "price_desc":
            search_query = search_query.order_by(Product.min_price.desc())
        elif sort_by == "newest":
            search_query = search_query.order_by(Product.created_at.desc())
        elif sort_by == "rating":
            # Order by vendor rating (if available)
            search_query = search_query.order_by(
                Vendor.rating.desc().nulls_last(),
                Product.created_at.desc()
            )
        else:
            # Default: newest first
            search_query = search_query.order_by(Product.created_at.desc())
        
        # Apply pagination
        offset = (page - 1) * size
        products = search_query.offset(offset).limit(size).all()
        
        return products, total
    
    def get_search_suggestions(
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
            List of suggestion dictionaries
        """
        if not query or len(query.strip()) < 2:
            return []
        
        search_term = query.strip().lower()
        
        # Get products matching the search
        products = self.db.query(Product).join(Product.vendor).outerjoin(Product.category).filter(
            Product.is_active == True,
            Product.is_deleted == False,
            Vendor.is_verified == True,
            Vendor.is_active == True,
            or_(
                func.lower(Product.name).like(f"%{search_term}%"),
                func.lower(Product.description).like(f"%{search_term}%"),
                func.lower(Category.name).like(f"%{search_term}%"),
                func.lower(Vendor.shop_name).like(f"%{search_term}%"),
            )
        ).options(
            joinedload(Product.category),
            joinedload(Product.vendor),
        ).order_by(
            # Relevance scoring
            case(
                (func.lower(Product.name).like(f"{search_term}%"), 1),
                (func.lower(Product.name).like(f"%{search_term}%"), 2),
                (func.lower(Category.name).like(f"%{search_term}%"), 3),
                (func.lower(Vendor.shop_name).like(f"%{search_term}%"), 4),
                else_=5
            ),
            Product.name
        ).limit(limit).all()
        
        suggestions = []
        seen_names = set()
        
        for product in products:
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
    
    def record_search_history(
        self,
        user_id: Optional[uuid.UUID],
        query: str,
        results_count: int,
    ) -> None:
        """
        Record search history (optional feature).
        
        Args:
            user_id: User ID (None for anonymous searches)
            query: Search query
            results_count: Number of results returned
        """
        # This is optional - can be implemented if search_history table exists
        # For now, we'll skip it to keep it minimal
        pass

