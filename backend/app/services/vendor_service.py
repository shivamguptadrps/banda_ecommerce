"""
Vendor Service
Business logic for vendor operations
"""

import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import or_, func, and_

from app.models.vendor import Vendor
from app.models.user import User
from app.models.order import Order
from app.models.product import Product
from app.models.enums import UserRole, OrderStatus
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorApproval
from app.utils.geo import calculate_distance, is_within_radius


class VendorService:
    """Service class for vendor operations."""
    
    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
    
    # ============== Vendor Registration ==============
    
    def create_vendor(self, user_id: uuid.UUID, vendor_data: VendorCreate) -> Vendor:
        """
        Create a new vendor profile.
        
        Args:
            user_id: User's UUID
            vendor_data: Vendor registration data
            
        Returns:
            Created vendor object
            
        Raises:
            ValueError: If user already has a vendor profile or is not a vendor role
        """
        # Check if user exists and has vendor role
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        if user.role != UserRole.VENDOR:
            raise ValueError("User must have vendor role to create a shop")
        
        # Check if vendor profile already exists
        existing = self.db.query(Vendor).filter(Vendor.user_id == user_id).first()
        if existing:
            raise ValueError("Vendor profile already exists for this user")
        
        # Create vendor
        vendor = Vendor(
            user_id=user_id,
            shop_name=vendor_data.shop_name,
            description=vendor_data.description,
            address_line_1=vendor_data.address_line_1,
            address_line_2=vendor_data.address_line_2,
            city=vendor_data.city,
            state=vendor_data.state,
            pincode=vendor_data.pincode,
            phone=vendor_data.phone,
            latitude=vendor_data.latitude,
            longitude=vendor_data.longitude,
            delivery_radius_km=vendor_data.delivery_radius_km,
        )
        
        self.db.add(vendor)
        self.db.commit()
        self.db.refresh(vendor)
        
        return vendor
    
    # ============== Vendor Queries ==============
    
    def get_vendor_by_id(self, vendor_id: uuid.UUID) -> Optional[Vendor]:
        """Get vendor by ID."""
        return self.db.query(Vendor).filter(Vendor.id == vendor_id).first()
    
    def get_vendor_by_user_id(self, user_id: uuid.UUID) -> Optional[Vendor]:
        """Get vendor by user ID."""
        return self.db.query(Vendor).filter(Vendor.user_id == user_id).first()
    
    def get_vendors(
        self,
        city: Optional[str] = None,
        is_verified: Optional[bool] = None,
        is_active: Optional[bool] = True,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[Vendor], int]:
        """
        Get paginated list of vendors.
        
        Args:
            city: Filter by city
            is_verified: Filter by verification status
            is_active: Filter by active status
            search: Search in shop name
            page: Page number
            size: Page size
            
        Returns:
            Tuple of (vendors list, total count)
        """
        query = self.db.query(Vendor)
        
        # Apply filters
        if city:
            query = query.filter(Vendor.city.ilike(f"%{city}%"))
        
        if is_verified is not None:
            query = query.filter(Vendor.is_verified == is_verified)
        
        if is_active is not None:
            query = query.filter(Vendor.is_active == is_active)
        
        if search:
            query = query.filter(Vendor.shop_name.ilike(f"%{search}%"))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * size
        vendors = query.order_by(Vendor.created_at.desc()).offset(offset).limit(size).all()
        
        return vendors, total
    
    def get_nearby_vendors(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
        city: Optional[str] = None,
    ) -> List[Tuple[Vendor, float]]:
        """
        Get vendors within a radius, sorted by distance.
        
        Args:
            latitude: User's latitude
            longitude: User's longitude
            radius_km: Search radius in km
            city: Optional city filter
            
        Returns:
            List of (vendor, distance_km) tuples
        """
        query = self.db.query(Vendor).filter(
            Vendor.is_active == True,
            Vendor.is_verified == True,
            Vendor.latitude.isnot(None),
            Vendor.longitude.isnot(None),
        )
        
        if city:
            query = query.filter(Vendor.city.ilike(f"%{city}%"))
        
        vendors = query.all()
        
        # Calculate distances and filter
        nearby = []
        user_location = (latitude, longitude)
        
        for vendor in vendors:
            vendor_location = (float(vendor.latitude), float(vendor.longitude))
            distance = calculate_distance(user_location, vendor_location)
            
            if distance <= radius_km:
                nearby.append((vendor, distance))
        
        # Sort by distance
        nearby.sort(key=lambda x: x[1])
        
        return nearby
    
    # ============== Vendor Updates ==============
    
    def update_vendor(
        self,
        vendor_id: uuid.UUID,
        update_data: VendorUpdate,
    ) -> Optional[Vendor]:
        """
        Update vendor profile.
        
        Args:
            vendor_id: Vendor's UUID
            update_data: Fields to update
            
        Returns:
            Updated vendor object
        """
        vendor = self.get_vendor_by_id(vendor_id)
        if not vendor:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        for field, value in update_dict.items():
            setattr(vendor, field, value)
        
        self.db.commit()
        self.db.refresh(vendor)
        
        return vendor
    
    def update_logo(self, vendor_id: uuid.UUID, logo_url: str) -> Optional[Vendor]:
        """
        Update vendor logo.
        
        Args:
            vendor_id: Vendor's UUID
            logo_url: URL of uploaded logo
            
        Returns:
            Updated vendor object
        """
        vendor = self.get_vendor_by_id(vendor_id)
        if not vendor:
            return None
        
        vendor.logo_url = logo_url
        self.db.commit()
        self.db.refresh(vendor)
        
        return vendor
    
    # ============== Admin Operations ==============
    
    def approve_vendor(
        self,
        vendor_id: uuid.UUID,
        approval_data: VendorApproval,
    ) -> Optional[Vendor]:
        """
        Approve or reject a vendor.
        
        Args:
            vendor_id: Vendor's UUID
            approval_data: Approval details
            
        Returns:
            Updated vendor object
        """
        vendor = self.get_vendor_by_id(vendor_id)
        if not vendor:
            return None
        
        vendor.is_verified = approval_data.is_verified
        
        if approval_data.is_verified:
            vendor.verified_at = datetime.utcnow()
        
        if approval_data.commission_percent is not None:
            vendor.commission_percent = approval_data.commission_percent
        
        self.db.commit()
        self.db.refresh(vendor)
        
        return vendor
    
    def suspend_vendor(
        self,
        vendor_id: uuid.UUID,
        is_active: bool,
    ) -> Optional[Vendor]:
        """
        Suspend or reactivate a vendor.
        
        Args:
            vendor_id: Vendor's UUID
            is_active: New active status
            
        Returns:
            Updated vendor object
        """
        vendor = self.get_vendor_by_id(vendor_id)
        if not vendor:
            return None
        
        vendor.is_active = is_active
        self.db.commit()
        self.db.refresh(vendor)
        
        return vendor
    
    def get_pending_vendors(self, page: int = 1, size: int = 20) -> Tuple[List[Vendor], int]:
        """
        Get vendors pending approval.
        
        Returns:
            Tuple of (vendors list, total count)
        """
        query = self.db.query(Vendor).filter(
            Vendor.is_verified == False,
            Vendor.is_active == True,
        )
        
        total = query.count()
        offset = (page - 1) * size
        vendors = query.order_by(Vendor.created_at.asc()).offset(offset).limit(size).all()
        
        return vendors, total
    
    # ============== Delivery Check ==============
    
    def can_deliver_to(
        self,
        vendor_id: uuid.UUID,
        latitude: float,
        longitude: float,
    ) -> Tuple[bool, Optional[float]]:
        """
        Check if vendor can deliver to a location.
        
        Args:
            vendor_id: Vendor's UUID
            latitude: Delivery latitude
            longitude: Delivery longitude
            
        Returns:
            Tuple of (can_deliver, distance_km)
        """
        vendor = self.get_vendor_by_id(vendor_id)
        if not vendor or not vendor.latitude or not vendor.longitude:
            return False, None
        
        vendor_location = (float(vendor.latitude), float(vendor.longitude))
        delivery_location = (latitude, longitude)
        
        distance = calculate_distance(vendor_location, delivery_location)
        can_deliver = distance <= float(vendor.delivery_radius_km)
        
        return can_deliver, distance

    # ============== Vendor Stats ==============
    
    def get_vendor_stats(self, vendor_id: uuid.UUID) -> Dict[str, Any]:
        """
        Get dashboard statistics for a vendor.
        
        Args:
            vendor_id: Vendor's UUID
            
        Returns:
            Dictionary with stats data
        """
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        
        # Total revenue (from delivered orders)
        total_revenue_result = self.db.query(
            func.coalesce(func.sum(Order.total_amount), 0)
        ).filter(
            Order.vendor_id == vendor_id,
            Order.order_status == OrderStatus.DELIVERED,
        ).scalar()
        total_revenue = Decimal(str(total_revenue_result or 0))
        
        # Total orders count
        total_orders = self.db.query(Order).filter(
            Order.vendor_id == vendor_id,
        ).count()
        
        # Total products count
        total_products = self.db.query(Product).filter(
            Product.vendor_id == vendor_id,
            Product.is_active == True,
        ).count()
        
        # Pending orders count
        pending_orders = self.db.query(Order).filter(
            Order.vendor_id == vendor_id,
            Order.order_status.in_([OrderStatus.PENDING, OrderStatus.CONFIRMED]),
        ).count()
        
        # Today's orders
        today_orders = self.db.query(Order).filter(
            Order.vendor_id == vendor_id,
            Order.placed_at >= today_start,
        ).count()
        
        # Today's revenue
        today_revenue_result = self.db.query(
            func.coalesce(func.sum(Order.total_amount), 0)
        ).filter(
            Order.vendor_id == vendor_id,
            Order.placed_at >= today_start,
            Order.order_status != OrderStatus.CANCELLED,
        ).scalar()
        today_revenue = Decimal(str(today_revenue_result or 0))
        
        # This week's orders
        this_week_orders = self.db.query(Order).filter(
            Order.vendor_id == vendor_id,
            Order.placed_at >= week_start,
        ).count()
        
        # This week's revenue
        this_week_revenue_result = self.db.query(
            func.coalesce(func.sum(Order.total_amount), 0)
        ).filter(
            Order.vendor_id == vendor_id,
            Order.placed_at >= week_start,
            Order.order_status != OrderStatus.CANCELLED,
        ).scalar()
        this_week_revenue = Decimal(str(this_week_revenue_result or 0))
        
        return {
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "total_products": total_products,
            "pending_orders": pending_orders,
            "today_orders": today_orders,
            "today_revenue": today_revenue,
            "this_week_orders": this_week_orders,
            "this_week_revenue": this_week_revenue,
        }

