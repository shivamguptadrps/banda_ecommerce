"""
Geographic Utilities
Distance calculation and location-based services
"""

import math
from decimal import Decimal
from typing import Tuple, Optional

# Earth's radius in kilometers
EARTH_RADIUS_KM = 6371.0


def calculate_distance(
    point1: Tuple[float, float],
    point2: Tuple[float, float],
) -> float:
    """
    Calculate the distance between two geographic points using Haversine formula.
    
    Args:
        point1: (latitude, longitude) of first point
        point2: (latitude, longitude) of second point
        
    Returns:
        Distance in kilometers
    """
    lat1, lon1 = math.radians(point1[0]), math.radians(point1[1])
    lat2, lon2 = math.radians(point2[0]), math.radians(point2[1])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    
    return EARTH_RADIUS_KM * c


def is_within_radius(
    center: Tuple[float, float],
    point: Tuple[float, float],
    radius_km: float,
) -> bool:
    """
    Check if a point is within a given radius from a center point.
    
    Args:
        center: (latitude, longitude) of center point
        point: (latitude, longitude) of point to check
        radius_km: Radius in kilometers
        
    Returns:
        True if point is within radius, False otherwise
    """
    distance = calculate_distance(center, point)
    return distance <= radius_km


def calculate_delivery_fee(
    distance_km: float,
    base_fee: float = 0.0,
    per_km_fee: float = 5.0,
    free_delivery_radius: float = 2.0,
) -> Decimal:
    """
    Calculate delivery fee based on distance.
    
    Args:
        distance_km: Distance in kilometers
        base_fee: Base delivery fee
        per_km_fee: Fee per kilometer beyond free radius
        free_delivery_radius: Radius within which delivery is free
        
    Returns:
        Calculated delivery fee
    """
    if distance_km <= free_delivery_radius:
        return Decimal("0.0")
    
    chargeable_distance = distance_km - free_delivery_radius
    fee = base_fee + (chargeable_distance * per_km_fee)
    
    return Decimal(str(round(fee, 2)))


def estimate_delivery_time(
    distance_km: float,
    base_time_mins: int = 15,
    mins_per_km: float = 3.0,
) -> int:
    """
    Estimate delivery time based on distance.
    
    Args:
        distance_km: Distance in kilometers
        base_time_mins: Base preparation time in minutes
        mins_per_km: Minutes per kilometer of travel
        
    Returns:
        Estimated delivery time in minutes
    """
    travel_time = distance_km * mins_per_km
    total_time = base_time_mins + travel_time
    
    return int(round(total_time))


def validate_coordinates(
    latitude: Optional[Decimal],
    longitude: Optional[Decimal],
) -> bool:
    """
    Validate if coordinates are within valid ranges.
    
    Args:
        latitude: Latitude value (-90 to 90)
        longitude: Longitude value (-180 to 180)
        
    Returns:
        True if coordinates are valid, False otherwise
    """
    if latitude is None or longitude is None:
        return False
    
    lat = float(latitude)
    lon = float(longitude)
    
    return -90 <= lat <= 90 and -180 <= lon <= 180

