"""
Service Zone Service
Business logic for service zone and delivery operations
"""

import uuid
from decimal import Decimal
from typing import Optional, List, Tuple

from sqlalchemy.orm import Session

from app.models.service_zone import ServiceZone
from app.schemas.service_zone import ServiceZoneCreate, ServiceZoneUpdate, DeliveryCheckResponse
from app.utils.geo import calculate_distance, is_within_radius, calculate_delivery_fee, estimate_delivery_time


class ServiceZoneService:
    """Service class for service zone operations."""
    
    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
    
    # ============== CRUD Operations ==============
    
    def create_zone(self, zone_data: ServiceZoneCreate) -> ServiceZone:
        """
        Create a new service zone.
        
        Args:
            zone_data: Service zone creation data
            
        Returns:
            Created service zone object
        """
        zone = ServiceZone(
            zone_name=zone_data.zone_name,
            city=zone_data.city,
            center_latitude=zone_data.center_latitude,
            center_longitude=zone_data.center_longitude,
            radius_km=zone_data.radius_km,
            delivery_fee=zone_data.delivery_fee,
            min_order_value=zone_data.min_order_value,
            estimated_time_mins=zone_data.estimated_time_mins,
        )
        
        self.db.add(zone)
        self.db.commit()
        self.db.refresh(zone)
        
        return zone
    
    def get_zone_by_id(self, zone_id: uuid.UUID) -> Optional[ServiceZone]:
        """Get service zone by ID."""
        return self.db.query(ServiceZone).filter(ServiceZone.id == zone_id).first()
    
    def update_zone(
        self,
        zone_id: uuid.UUID,
        update_data: ServiceZoneUpdate,
    ) -> Optional[ServiceZone]:
        """
        Update a service zone.
        
        Args:
            zone_id: Zone's UUID
            update_data: Fields to update
            
        Returns:
            Updated zone object
        """
        zone = self.get_zone_by_id(zone_id)
        if not zone:
            return None
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        for field, value in update_dict.items():
            setattr(zone, field, value)
        
        self.db.commit()
        self.db.refresh(zone)
        
        return zone
    
    def delete_zone(self, zone_id: uuid.UUID) -> bool:
        """
        Soft delete a service zone.
        
        Args:
            zone_id: Zone's UUID
            
        Returns:
            True if successful
        """
        zone = self.get_zone_by_id(zone_id)
        if not zone:
            return False
        
        zone.is_active = False
        self.db.commit()
        
        return True
    
    # ============== Query Operations ==============
    
    def get_zones(
        self,
        city: Optional[str] = None,
        is_active: Optional[bool] = True,
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[ServiceZone], int]:
        """
        Get paginated list of service zones.
        
        Args:
            city: Filter by city
            is_active: Filter by active status
            page: Page number
            size: Page size
            
        Returns:
            Tuple of (zones list, total count)
        """
        query = self.db.query(ServiceZone)
        
        if city:
            query = query.filter(ServiceZone.city.ilike(f"%{city}%"))
        
        if is_active is not None:
            query = query.filter(ServiceZone.is_active == is_active)
        
        total = query.count()
        offset = (page - 1) * size
        zones = query.order_by(ServiceZone.city, ServiceZone.zone_name).offset(offset).limit(size).all()
        
        return zones, total
    
    def get_zones_by_city(self, city: str) -> List[ServiceZone]:
        """
        Get all active zones for a city.
        
        Args:
            city: City name
            
        Returns:
            List of service zones
        """
        return self.db.query(ServiceZone).filter(
            ServiceZone.city.ilike(f"%{city}%"),
            ServiceZone.is_active == True,
        ).all()
    
    # ============== Delivery Check Operations ==============
    
    def check_delivery(
        self,
        latitude: float,
        longitude: float,
        city: Optional[str] = None,
    ) -> DeliveryCheckResponse:
        """
        Check if delivery is available at a location.
        
        Args:
            latitude: Delivery latitude
            longitude: Delivery longitude
            city: Optional city to filter zones
            
        Returns:
            Delivery check response
        """
        # Get applicable zones
        if city:
            zones = self.get_zones_by_city(city)
        else:
            zones = self.db.query(ServiceZone).filter(
                ServiceZone.is_active == True,
                ServiceZone.center_latitude.isnot(None),
                ServiceZone.center_longitude.isnot(None),
            ).all()
        
        delivery_location = (latitude, longitude)
        
        # Find matching zone
        best_zone = None
        best_distance = float('inf')
        
        for zone in zones:
            if zone.center_latitude is None or zone.center_longitude is None:
                continue
            
            zone_center = (float(zone.center_latitude), float(zone.center_longitude))
            distance = calculate_distance(zone_center, delivery_location)
            
            if distance <= float(zone.radius_km) and distance < best_distance:
                best_zone = zone
                best_distance = distance
        
        if best_zone:
            return DeliveryCheckResponse(
                is_deliverable=True,
                distance_km=Decimal(str(round(best_distance, 2))),
                delivery_fee=best_zone.delivery_fee,
                estimated_time_mins=best_zone.estimated_time_mins,
                message="Delivery available in your area",
                zone=best_zone,
            )
        
        return DeliveryCheckResponse(
            is_deliverable=False,
            message="Sorry, delivery is not available in your area",
        )
    
    def calculate_delivery_details(
        self,
        vendor_latitude: float,
        vendor_longitude: float,
        delivery_latitude: float,
        delivery_longitude: float,
    ) -> dict:
        """
        Calculate delivery fee and time for a specific route.
        
        Args:
            vendor_latitude: Vendor's latitude
            vendor_longitude: Vendor's longitude
            delivery_latitude: Delivery latitude
            delivery_longitude: Delivery longitude
            
        Returns:
            Dictionary with distance, fee, and estimated time
        """
        vendor_location = (vendor_latitude, vendor_longitude)
        delivery_location = (delivery_latitude, delivery_longitude)
        
        distance = calculate_distance(vendor_location, delivery_location)
        fee = calculate_delivery_fee(distance)
        time_mins = estimate_delivery_time(distance)
        
        return {
            "distance_km": round(distance, 2),
            "delivery_fee": fee,
            "estimated_time_mins": time_mins,
        }

