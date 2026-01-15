"""
Attribute Service
Business logic for category attributes and product attribute values with inheritance
"""

import uuid
import re
from typing import Optional, List, Dict, Any, Tuple
from collections import defaultdict

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.models.category import Category
from app.models.attribute import CategoryAttribute, ProductAttributeValue
from app.models.product import Product
from app.models.enums import AttributeType
from app.schemas.attribute import (
    CategoryAttributeCreate,
    CategoryAttributeUpdate,
    CategoryAttributeResponse,
    ProductAttributeValueCreate,
    ProductAttributeValueUpdate,
    AttributeFilterGroup,
    AttributeFilterOption,
    CategoryFilterOptions,
)


class AttributeService:
    """Service class for attribute operations with inheritance support."""
    
    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
    
    # ============== Helper Methods ==============
    
    def _generate_slug(self, name: str, category_id: uuid.UUID) -> str:
        """Generate unique slug for attribute within a category."""
        slug = name.lower().strip()
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[-\s]+', '-', slug)
        
        base_slug = slug
        counter = 1
        
        while self.db.query(CategoryAttribute).filter(
            CategoryAttribute.category_id == category_id,
            CategoryAttribute.slug == slug
        ).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        return slug
    
    def _get_category_ancestors(self, category_id: uuid.UUID) -> List[Category]:
        """
        Get all ancestor categories (parent → grandparent → ... → root).
        
        Returns list from immediate parent to root.
        """
        ancestors = []
        category = self.db.query(Category).filter(Category.id == category_id).first()
        
        if not category:
            return ancestors
        
        current = category.parent
        while current:
            ancestors.append(current)
            current = current.parent
        
        return ancestors
    
    def _get_category_chain(self, category_id: uuid.UUID) -> List[uuid.UUID]:
        """
        Get category ID chain from root to current category.
        Used for building inherited attributes list.
        """
        chain = []
        category = self.db.query(Category).filter(Category.id == category_id).first()
        
        if not category:
            return chain
        
        # Build chain from current to root
        current = category
        while current:
            chain.insert(0, current.id)
            current = current.parent
        
        return chain
    
    # ============== Category Attribute CRUD ==============
    
    def create_attribute(self, data: CategoryAttributeCreate) -> CategoryAttribute:
        """
        Create a new category attribute.
        
        Args:
            data: Attribute creation data
            
        Returns:
            Created attribute
            
        Raises:
            ValueError: If category doesn't exist
        """
        # Validate category exists
        category = self.db.query(Category).filter(Category.id == data.category_id).first()
        if not category:
            raise ValueError("Category not found")
        
        # Validate options for SELECT types
        if data.attribute_type in [AttributeType.SELECT, AttributeType.MULTI_SELECT]:
            if not data.options or len(data.options) < 1:
                raise ValueError(f"{data.attribute_type} type requires at least one option")
        
        # Generate slug
        slug = self._generate_slug(data.name, data.category_id)
        
        # Check if attribute already exists in current category
        existing_in_current = self.db.query(CategoryAttribute).filter(
            CategoryAttribute.category_id == data.category_id,
            CategoryAttribute.slug == slug,
            CategoryAttribute.is_active == True
        ).first()
        if existing_in_current:
            raise ValueError(
                f"Attribute '{data.name}' (slug: '{slug}') already exists in this category. "
                f"Use update_attribute to modify it."
            )
        
        # Check if parent categories already have this attribute with is_inherited=True
        # If so, don't create a duplicate - the child will inherit it
        if data.is_inherited:
            ancestors = self._get_category_ancestors(data.category_id)
            for ancestor in ancestors:
                existing_attr = self.db.query(CategoryAttribute).filter(
                    CategoryAttribute.category_id == ancestor.id,
                    CategoryAttribute.slug == slug,
                    CategoryAttribute.is_inherited == True,
                    CategoryAttribute.is_active == True
                ).first()
                if existing_attr:
                    raise ValueError(
                        f"Attribute '{data.name}' already exists as inherited attribute "
                        f"in parent category '{ancestor.name}'. "
                        f"Child categories will inherit it automatically. "
                        f"Set is_inherited=False if you want a category-specific attribute."
                    )
        
        # Validate segment if provided
        if data.segment_id:
            from app.models.attribute_segment import AttributeSegment
            segment = self.db.query(AttributeSegment).filter(
                AttributeSegment.id == data.segment_id,
                AttributeSegment.category_id == data.category_id,
                AttributeSegment.is_active == True
            ).first()
            if not segment:
                raise ValueError("Segment not found or doesn't belong to this category")
        
        attribute = CategoryAttribute(
            category_id=data.category_id,
            name=data.name,
            slug=slug,
            description=data.description,
            attribute_type=data.attribute_type,
            options=data.options,
            unit=data.unit,
            is_required=data.is_required,
            is_inherited=data.is_inherited,
            is_filterable=data.is_filterable,
            is_searchable=data.is_searchable,
            display_order=data.display_order,
            show_in_listing=data.show_in_listing,
            show_in_details=data.show_in_details,
            segment_id=data.segment_id,
        )
        
        self.db.add(attribute)
        self.db.commit()
        self.db.refresh(attribute)
        
        return attribute
    
    def get_attribute_by_id(self, attribute_id: uuid.UUID) -> Optional[CategoryAttribute]:
        """Get attribute by ID."""
        return self.db.query(CategoryAttribute).filter(
            CategoryAttribute.id == attribute_id
        ).first()
    
    def update_attribute(
        self,
        attribute_id: uuid.UUID,
        data: CategoryAttributeUpdate,
    ) -> Optional[CategoryAttribute]:
        """Update a category attribute."""
        attribute = self.get_attribute_by_id(attribute_id)
        if not attribute:
            return None
        
        update_dict = data.model_dump(exclude_unset=True)
        
        # Regenerate slug if name changed
        if "name" in update_dict:
            update_dict["slug"] = self._generate_slug(
                update_dict["name"],
                attribute.category_id
            )
        
        # Validate options for SELECT types
        if "attribute_type" in update_dict or "options" in update_dict:
            attr_type = update_dict.get("attribute_type", attribute.attribute_type)
            options = update_dict.get("options", attribute.options)
            
            if attr_type in [AttributeType.SELECT, AttributeType.MULTI_SELECT]:
                if not options or len(options) < 1:
                    raise ValueError(f"{attr_type} type requires at least one option")
        
        for field, value in update_dict.items():
            setattr(attribute, field, value)
        
        self.db.commit()
        self.db.refresh(attribute)
        
        return attribute
    
    def delete_attribute(self, attribute_id: uuid.UUID) -> bool:
        """Soft delete an attribute (set is_active = False)."""
        attribute = self.get_attribute_by_id(attribute_id)
        if not attribute:
            return False
        
        attribute.is_active = False
        self.db.commit()
        
        return True
    
    def hard_delete_attribute(self, attribute_id: uuid.UUID) -> bool:
        """Permanently delete an attribute and its values."""
        attribute = self.get_attribute_by_id(attribute_id)
        if not attribute:
            return False
        
        self.db.delete(attribute)
        self.db.commit()
        
        return True
    
    # ============== Get Attributes with Inheritance ==============
    
    def get_category_own_attributes(
        self,
        category_id: uuid.UUID,
        include_inactive: bool = False,
    ) -> List[CategoryAttribute]:
        """Get only the attributes directly defined on a category."""
        query = self.db.query(CategoryAttribute).filter(
            CategoryAttribute.category_id == category_id
        )
        
        if not include_inactive:
            query = query.filter(CategoryAttribute.is_active == True)
        
        return query.order_by(CategoryAttribute.display_order).all()
    
    def get_category_all_attributes(
        self,
        category_id: uuid.UUID,
        include_inactive: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Get all attributes for a category including inherited ones.
        
        Returns list of dicts with attribute data and 'is_own' flag.
        Attributes are ordered: parent attributes first, then own attributes.
        """
        # Get category chain (root → ... → current)
        chain = self._get_category_chain(category_id)
        
        if not chain:
            return []
        
        all_attributes = []
        seen_slugs = set()  # Prevent duplicates by slug
        
        # Iterate from root to current
        for idx, cat_id in enumerate(chain):
            is_current = (cat_id == category_id)
            
            # Get attributes for this category
            query = self.db.query(CategoryAttribute).filter(
                CategoryAttribute.category_id == cat_id
            )
            
            if not include_inactive:
                query = query.filter(CategoryAttribute.is_active == True)
            
            # For parent categories, only get inheritable attributes
            if not is_current:
                query = query.filter(CategoryAttribute.is_inherited == True)
            
            attributes = query.order_by(CategoryAttribute.display_order).all()
            
            for attr in attributes:
                # Skip if we've seen this slug (child can override parent)
                if attr.slug in seen_slugs:
                    continue
                
                seen_slugs.add(attr.slug)
                
                all_attributes.append({
                    "attribute": attr,
                    "is_own": is_current,
                    "inherited_from": attr.category.name if not is_current else None,
                })
        
        return all_attributes
    
    def get_attributes_for_product_form(
        self,
        category_id: uuid.UUID,
    ) -> List[CategoryAttributeResponse]:
        """
        Get attributes formatted for vendor product form.
        Includes all inherited attributes marked appropriately.
        """
        all_attrs = self.get_category_all_attributes(category_id, include_inactive=False)
        
        result = []
        for item in all_attrs:
            attr = item["attribute"]
            response = CategoryAttributeResponse(
                id=attr.id,
                category_id=attr.category_id,
                name=attr.name,
                slug=attr.slug,
                description=attr.description,
                attribute_type=attr.attribute_type,
                options=attr.options,
                unit=attr.unit,
                is_required=attr.is_required,
                is_inherited=attr.is_inherited,
                is_filterable=attr.is_filterable,
                is_searchable=attr.is_searchable,
                display_order=attr.display_order,
                show_in_listing=attr.show_in_listing,
                show_in_details=attr.show_in_details,
                is_active=attr.is_active,
                created_at=attr.created_at,
                updated_at=attr.updated_at,
                category_name=attr.category.name if attr.category else None,
                is_own=item["is_own"],
            )
            result.append(response)
        
        return result
    
    # ============== Product Attribute Values ==============
    
    def set_product_attribute(
        self,
        product_id: uuid.UUID,
        data: ProductAttributeValueCreate,
    ) -> ProductAttributeValue:
        """
        Set or update a single attribute value for a product.
        """
        # Check if value already exists
        existing = self.db.query(ProductAttributeValue).filter(
            ProductAttributeValue.product_id == product_id,
            ProductAttributeValue.attribute_id == data.attribute_id,
        ).first()
        
        if existing:
            existing.value = data.value
            existing.value_json = data.value_json
            self.db.commit()
            self.db.refresh(existing)
            return existing
        
        # Create new value
        value = ProductAttributeValue(
            product_id=product_id,
            attribute_id=data.attribute_id,
            value=data.value,
            value_json=data.value_json,
        )
        
        self.db.add(value)
        self.db.commit()
        self.db.refresh(value)
        
        return value
    
    def set_product_attributes_bulk(
        self,
        product_id: uuid.UUID,
        attributes: List[ProductAttributeValueCreate],
    ) -> List[ProductAttributeValue]:
        """
        Set multiple attribute values for a product at once.
        Replaces existing values.
        """
        # Delete existing values for these attributes
        attr_ids = [a.attribute_id for a in attributes]
        self.db.query(ProductAttributeValue).filter(
            ProductAttributeValue.product_id == product_id,
            ProductAttributeValue.attribute_id.in_(attr_ids),
        ).delete(synchronize_session=False)
        
        # Create new values
        values = []
        for data in attributes:
            value = ProductAttributeValue(
                product_id=product_id,
                attribute_id=data.attribute_id,
                value=data.value,
                value_json=data.value_json,
            )
            self.db.add(value)
            values.append(value)
        
        self.db.commit()
        
        for v in values:
            self.db.refresh(v)
        
        return values
    
    def get_product_attributes(
        self,
        product_id: uuid.UUID,
    ) -> List[Dict[str, Any]]:
        """
        Get all attribute values for a product with attribute details.
        """
        values = self.db.query(ProductAttributeValue).filter(
            ProductAttributeValue.product_id == product_id
        ).all()
        
        result = []
        for v in values:
            attr = v.attribute
            if not attr or not attr.is_active:
                continue
            
            # Format display value
            display_value = v.value
            if attr.attribute_type == AttributeType.NUMBER and attr.unit:
                display_value = f"{v.value} {attr.unit}"
            elif attr.attribute_type == AttributeType.BOOLEAN:
                display_value = "Yes" if v.value.lower() in ("true", "1", "yes") else "No"
            elif attr.attribute_type == AttributeType.MULTI_SELECT and v.value_json:
                display_value = ", ".join(v.value_json)
            
            result.append({
                "id": v.id,
                "attribute_id": attr.id,
                "attribute_name": attr.name,
                "attribute_slug": attr.slug,
                "attribute_type": attr.attribute_type,
                "value": v.value,
                "value_json": v.value_json,
                "value_display": display_value,
                "unit": attr.unit,
                "show_in_listing": attr.show_in_listing,
                "show_in_details": attr.show_in_details,
            })
        
        return result
    
    def delete_product_attribute(
        self,
        product_id: uuid.UUID,
        attribute_id: uuid.UUID,
    ) -> bool:
        """Delete a specific attribute value from a product."""
        deleted = self.db.query(ProductAttributeValue).filter(
            ProductAttributeValue.product_id == product_id,
            ProductAttributeValue.attribute_id == attribute_id,
        ).delete()
        
        self.db.commit()
        return deleted > 0
    
    # ============== Filtering ==============
    
    def get_category_filter_options(
        self,
        category_id: uuid.UUID,
    ) -> CategoryFilterOptions:
        """
        Get all filterable attributes with their available options and counts.
        Used for building the filter sidebar.
        """
        # Get category with name
        category = self.db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise ValueError("Category not found")
        
        # Get all attributes (including inherited) that are filterable
        all_attrs = self.get_category_all_attributes(category_id, include_inactive=False)
        filterable_attrs = [
            item["attribute"] for item in all_attrs
            if item["attribute"].is_filterable
        ]
        
        # Get all products in this category (and subcategories)
        category_ids = self._get_category_and_descendants(category_id)
        
        # Build filter groups
        filter_groups = []
        
        for attr in filterable_attrs:
            # Get value counts for this attribute
            value_counts = self.db.query(
                ProductAttributeValue.value,
                func.count(ProductAttributeValue.id).label("count")
            ).join(Product).filter(
                ProductAttributeValue.attribute_id == attr.id,
                Product.category_id.in_(category_ids),
                Product.is_active == True,
                Product.is_deleted == False,
            ).group_by(ProductAttributeValue.value).all()
            
            if not value_counts:
                continue
            
            options = [
                AttributeFilterOption(value=vc.value, count=vc.count)
                for vc in value_counts
            ]
            
            # Sort options
            if attr.attribute_type == AttributeType.NUMBER:
                options.sort(key=lambda x: float(x.value) if x.value.replace(".", "").isdigit() else 0)
            else:
                options.sort(key=lambda x: x.value)
            
            filter_groups.append(AttributeFilterGroup(
                attribute_id=attr.id,
                attribute_name=attr.name,
                attribute_slug=attr.slug,
                attribute_type=attr.attribute_type,
                options=options,
            ))
        
        return CategoryFilterOptions(
            category_id=category_id,
            category_name=category.name,
            attributes=filter_groups,
        )
    
    def _get_category_and_descendants(self, category_id: uuid.UUID) -> List[uuid.UUID]:
        """Get category ID and all descendant IDs."""
        ids = [category_id]
        
        children = self.db.query(Category).filter(
            Category.parent_id == category_id,
            Category.is_active == True,
        ).all()
        
        for child in children:
            ids.extend(self._get_category_and_descendants(child.id))
        
        return ids
    
    def filter_products_by_attributes(
        self,
        category_id: uuid.UUID,
        attribute_filters: List[Dict[str, Any]],
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[Product], int]:
        """
        Filter products by attribute values.
        
        attribute_filters format:
        [
            {"attribute_id": uuid, "values": ["8GB", "12GB"]},  # OR within
            {"attribute_id": uuid, "values": ["Snapdragon"]},   # AND between
        ]
        
        Logic: (attr1 = v1 OR attr1 = v2) AND (attr2 = v3)
        """
        # Get category and descendants
        category_ids = self._get_category_and_descendants(category_id)
        
        # Base query
        query = self.db.query(Product).filter(
            Product.category_id.in_(category_ids),
            Product.is_active == True,
            Product.is_deleted == False,
        )
        
        # Apply attribute filters
        for filter_item in attribute_filters:
            attr_id = filter_item.get("attribute_id")
            values = filter_item.get("values", [])
            
            if not attr_id or not values:
                continue
            
            # Subquery: products that have this attribute with one of the values
            subq = self.db.query(ProductAttributeValue.product_id).filter(
                ProductAttributeValue.attribute_id == attr_id,
                ProductAttributeValue.value.in_(values),
            ).subquery()
            
            query = query.filter(Product.id.in_(subq))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * size
        products = query.offset(offset).limit(size).all()
        
        return products, total


