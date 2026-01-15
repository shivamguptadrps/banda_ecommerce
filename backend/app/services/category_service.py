"""
Category Service
Business logic for category operations
"""

import uuid
import re
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryTreeNode


class CategoryService:
    """Service class for category operations."""
    
    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
    
    # ============== Helper Methods ==============
    
    def _generate_slug(self, name: str, parent_id: Optional[uuid.UUID] = None) -> str:
        """
        Generate unique slug from category name.
        
        Args:
            name: Category name
            parent_id: Parent category ID for context
            
        Returns:
            Unique slug string
        """
        # Create base slug
        slug = name.lower().strip()
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[-\s]+', '-', slug)
        
        # Check uniqueness and add suffix if needed
        base_slug = slug
        counter = 1
        
        while self.db.query(Category).filter(Category.slug == slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        return slug
    
    def _build_tree(self, categories: List[Category]) -> List[Dict[str, Any]]:
        """
        Build tree structure from flat category list.
        
        Args:
            categories: List of category objects
            
        Returns:
            Nested tree structure
        """
        # Create lookup dict
        lookup = {cat.id: {
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "description": cat.description,
            "image_url": cat.image_url,
            "display_order": cat.display_order,
            "is_active": cat.is_active,
            "children": [],
        } for cat in categories}
        
        # Build tree
        tree = []
        for cat in categories:
            node = lookup[cat.id]
            if cat.parent_id and cat.parent_id in lookup:
                lookup[cat.parent_id]["children"].append(node)
            else:
                tree.append(node)
        
        # Sort by display_order
        def sort_tree(nodes):
            nodes.sort(key=lambda x: x["display_order"])
            for node in nodes:
                sort_tree(node["children"])
        
        sort_tree(tree)
        return tree
    
    def _get_breadcrumb(self, category: Category) -> List[Dict[str, Any]]:
        """
        Get breadcrumb trail for a category.
        
        Args:
            category: Category object
            
        Returns:
            List of breadcrumb items from root to current
        """
        breadcrumb = []
        current = category
        
        while current:
            breadcrumb.insert(0, {
                "id": current.id,
                "name": current.name,
                "slug": current.slug,
            })
            
            if current.parent_id:
                current = self.get_category_by_id(current.parent_id)
            else:
                break
        
        return breadcrumb
    
    # ============== Category CRUD ==============
    
    def create_category(
        self, 
        category_data: CategoryCreate,
        max_depth: int = 3,
        enforce_depth_limit: bool = True
    ) -> Category:
        """
        Create a new category.
        
        Args:
            category_data: Category creation data
            max_depth: Maximum allowed depth (default: 3 for Zepto/Blinkit style)
            enforce_depth_limit: Whether to enforce depth limit (default: True)
            
        Returns:
            Created category object
            
        Raises:
            ValueError: If parent category doesn't exist or depth limit exceeded
        """
        # Validate parent if specified
        if category_data.parent_id:
            parent = self.get_category_by_id(category_data.parent_id)
            if not parent:
                raise ValueError("Parent category not found")
            
            # Validate depth limit (Zepto/Blinkit style: max 3 levels)
            self._validate_category_depth(
                category_data.parent_id,
                max_depth=max_depth,
                enforce_limit=enforce_depth_limit
            )
        
        # Generate unique slug
        slug = self._generate_slug(category_data.name, category_data.parent_id)
        
        # Create category
        category = Category(
            name=category_data.name,
            slug=slug,
            description=category_data.description,
            image_url=category_data.image_url,
            parent_id=category_data.parent_id,
            display_order=category_data.display_order,
        )
        
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def update_category_image(self, category_id: uuid.UUID, image_url: str) -> Optional[Category]:
        """
        Update category image URL.
        
        Args:
            category_id: Category's UUID
            image_url: URL of the uploaded image
            
        Returns:
            Updated Category object or None if not found
        """
        category = self.get_category_by_id(category_id)
        if not category:
            return None
        
        category.image_url = image_url
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def get_category_by_id(self, category_id: uuid.UUID) -> Optional[Category]:
        """Get category by ID."""
        return self.db.query(Category).filter(Category.id == category_id).first()
    
    def get_category_by_slug(self, slug: str) -> Optional[Category]:
        """Get category by slug."""
        return self.db.query(Category).filter(Category.slug == slug).first()
    
    def update_category(
        self,
        category_id: uuid.UUID,
        update_data: CategoryUpdate,
        max_depth: int = 3,
        enforce_depth_limit: bool = True,
    ) -> Optional[Category]:
        """
        Update a category.
        
        Args:
            category_id: Category's UUID
            update_data: Fields to update
            max_depth: Maximum allowed depth (default: 3 for Zepto/Blinkit style)
            enforce_depth_limit: Whether to enforce depth limit (default: True)
            
        Returns:
            Updated category object
        """
        category = self.get_category_by_id(category_id)
        if not category:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        # Regenerate slug if name changed
        if "name" in update_dict:
            update_dict["slug"] = self._generate_slug(
                update_dict["name"],
                update_dict.get("parent_id", category.parent_id),
            )
        
        # Prevent circular reference
        if "parent_id" in update_dict and update_dict["parent_id"]:
            if update_dict["parent_id"] == category_id:
                raise ValueError("Category cannot be its own parent")
            
            # Check for circular reference in descendants
            if self._is_descendant(update_dict["parent_id"], category_id):
                raise ValueError("Cannot set a descendant as parent")
            
            # Validate depth limit (Zepto/Blinkit style: max 3 levels)
            self._validate_category_depth(
                update_dict["parent_id"],
                max_depth=max_depth,
                enforce_limit=enforce_depth_limit
            )
        
        for field, value in update_dict.items():
            setattr(category, field, value)
        
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def delete_category(self, category_id: uuid.UUID) -> bool:
        """
        Soft delete a category (set is_active = False).
        Also deactivates all children.
        
        Args:
            category_id: Category's UUID
            
        Returns:
            True if successful
        """
        category = self.get_category_by_id(category_id)
        if not category:
            return False
        
        # Deactivate category and all descendants
        self._deactivate_tree(category)
        self.db.commit()
        
        return True
    
    def _deactivate_tree(self, category: Category):
        """Recursively deactivate category and its children."""
        category.is_active = False
        
        children = self.db.query(Category).filter(
            Category.parent_id == category.id
        ).all()
        
        for child in children:
            self._deactivate_tree(child)
    
    def _is_descendant(self, potential_parent_id: uuid.UUID, category_id: uuid.UUID) -> bool:
        """Check if potential_parent_id is a descendant of category_id."""
        children = self.db.query(Category).filter(
            Category.parent_id == category_id
        ).all()
        
        for child in children:
            if child.id == potential_parent_id:
                return True
            if self._is_descendant(potential_parent_id, child.id):
                return True
        
        return False
    
    def get_category_depth(self, category_id: Optional[uuid.UUID]) -> int:
        """
        Calculate the depth of a category in the hierarchy.
        
        Args:
            category_id: Category UUID (None for root level)
            
        Returns:
            Depth level (1 for root, 2 for level 2, 3 for level 3, etc.)
        """
        if category_id is None:
            return 0
        
        category = self.get_category_by_id(category_id)
        if not category:
            return 0
        
        depth = 1
        current = category
        
        # Traverse up to root
        while current.parent_id:
            depth += 1
            current = self.get_category_by_id(current.parent_id)
            if not current:
                break
        
        return depth
    
    def _validate_category_depth(
        self, 
        parent_id: Optional[uuid.UUID], 
        max_depth: int = 3,
        enforce_limit: bool = True
    ) -> None:
        """
        Validate that adding a category won't exceed the maximum depth.
        
        Args:
            parent_id: Parent category ID (None for root)
            max_depth: Maximum allowed depth (default: 3 for Zepto/Blinkit style)
            enforce_limit: Whether to enforce the limit (default: True)
            
        Raises:
            ValueError: If depth would exceed max_depth
        """
        if not enforce_limit:
            return
        
        if parent_id is None:
            # Root level category (Level 1)
            return
        
        parent_depth = self.get_category_depth(parent_id)
        
        if parent_depth >= max_depth:
            raise ValueError(
                f"Cannot create category beyond level {max_depth}. "
                f"Parent category is already at level {parent_depth}. "
                f"Maximum depth allowed: {max_depth} (Level 1: Top Nav, Level 2: Parent Sections, Level 3: Subcategories)"
            )
    
    # ============== Category Queries ==============
    
    def get_all_categories(self, include_inactive: bool = False) -> List[Category]:
        """
        Get all categories (flat list).
        
        Args:
            include_inactive: Include inactive categories
            
        Returns:
            List of categories
        """
        query = self.db.query(Category)
        
        if not include_inactive:
            query = query.filter(Category.is_active == True)
        
        return query.order_by(Category.display_order).all()
    
    def get_root_categories(self, include_inactive: bool = False) -> List[Category]:
        """
        Get top-level categories (no parent).
        
        Args:
            include_inactive: Include inactive categories
            
        Returns:
            List of root categories
        """
        query = self.db.query(Category).filter(Category.parent_id.is_(None))
        
        if not include_inactive:
            query = query.filter(Category.is_active == True)
        
        return query.order_by(Category.display_order).all()
    
    def get_children(
        self,
        parent_id: uuid.UUID,
        include_inactive: bool = False,
    ) -> List[Category]:
        """
        Get direct children of a category.
        
        Args:
            parent_id: Parent category ID
            include_inactive: Include inactive categories
            
        Returns:
            List of child categories
        """
        query = self.db.query(Category).filter(Category.parent_id == parent_id)
        
        if not include_inactive:
            query = query.filter(Category.is_active == True)
        
        return query.order_by(Category.display_order).all()
    
    def get_category_tree(self, include_inactive: bool = False) -> List[Dict[str, Any]]:
        """
        Get full category tree.
        
        Args:
            include_inactive: Include inactive categories
            
        Returns:
            Nested tree structure
        """
        categories = self.get_all_categories(include_inactive)
        return self._build_tree(categories)
    
    def get_category_with_breadcrumb(
        self,
        category_id: uuid.UUID,
    ) -> Optional[Dict[str, Any]]:
        """
        Get category with its breadcrumb trail.
        
        Args:
            category_id: Category's UUID
            
        Returns:
            Category with breadcrumb
        """
        category = self.get_category_by_id(category_id)
        if not category:
            return None
        
        return {
            "category": category,
            "breadcrumb": self._get_breadcrumb(category),
        }
    
    def get_category_level(self, category_id: uuid.UUID) -> Optional[int]:
        """
        Get the level of a category (1, 2, or 3 for Zepto/Blinkit style).
        
        Args:
            category_id: Category UUID
            
        Returns:
            Level number (1=Top Nav, 2=Parent Section, 3=Subcategory) or None if not found
        """
        depth = self.get_category_depth(category_id)
        return depth if depth > 0 else None
    
    def get_categories_by_level(
        self,
        level: int,
        include_inactive: bool = False
    ) -> List[Category]:
        """
        Get all categories at a specific level.
        
        Args:
            level: Category level (1=Top Nav, 2=Parent Section, 3=Subcategory)
            include_inactive: Include inactive categories
            
        Returns:
            List of categories at the specified level
        """
        all_categories = self.get_all_categories(include_inactive)
        return [
            cat for cat in all_categories
            if self.get_category_depth(cat.id) == level
        ]

