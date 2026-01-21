"""
Location API Routes
Handles serviceability check, distance calculation, and ETA
"""

import math
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.config import settings

router = APIRouter(prefix="/location", tags=["Location"])


# ============== Schemas ==============

class LocationCheckRequest(BaseModel):
    """Request to check if location is serviceable."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class LocationCheckResponse(BaseModel):
    """Response for serviceability check."""
    serviceable: bool
    distance_km: float
    estimated_delivery_minutes: int
    warehouse_name: str
    max_delivery_radius_km: float
    message: str


class ETARequest(BaseModel):
    """Request to calculate ETA for an address."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class ETAResponse(BaseModel):
    """Response with ETA details."""
    distance_km: float
    travel_time_minutes: int
    prep_time_minutes: int
    total_eta_minutes: int
    eta_display: str  # "10-15 minutes"


class WarehouseInfoResponse(BaseModel):
    """Response with warehouse information."""
    name: str
    latitude: float
    longitude: float
    max_delivery_radius_km: float
    base_prep_time_minutes: int


# ============== Helper Functions ==============

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth.
    Returns distance in kilometers.
    """
    R = 6371  # Earth's radius in kilometers
    
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def calculate_eta(distance_km: float) -> dict:
    """
    Calculate estimated delivery time based on distance.
    Returns prep time, travel time, and total ETA.
    """
    prep_time = settings.base_prep_time_minutes
    
    # Travel time with road factor (roads are not straight, add 30% buffer)
    road_distance = distance_km * 1.3
    travel_time = int(road_distance / settings.delivery_speed_km_per_min)
    
    # Add buffer for traffic, finding address, etc.
    buffer_time = 3
    
    total_eta = prep_time + travel_time + buffer_time
    
    # Create display string with range
    if total_eta <= 10:
        eta_display = "8-10 minutes"
    elif total_eta <= 15:
        eta_display = "10-15 minutes"
    elif total_eta <= 20:
        eta_display = "15-20 minutes"
    elif total_eta <= 30:
        eta_display = "20-30 minutes"
    else:
        eta_display = f"{total_eta - 5}-{total_eta + 5} minutes"
    
    return {
        "prep_time_minutes": prep_time,
        "travel_time_minutes": travel_time + buffer_time,
        "total_eta_minutes": total_eta,
        "eta_display": eta_display,
    }


# ============== API Endpoints ==============

@router.post("/check-serviceability", response_model=LocationCheckResponse)
async def check_serviceability(request: LocationCheckRequest):
    """
    Check if a location is within the delivery radius.
    Returns serviceability status and estimated delivery time.
    """
    # Calculate distance from warehouse
    distance = haversine_distance(
        settings.warehouse_latitude,
        settings.warehouse_longitude,
        request.latitude,
        request.longitude
    )
    
    # Round to 2 decimal places
    distance_km = round(distance, 2)
    
    # Check if within delivery radius
    serviceable = distance_km <= settings.max_delivery_radius_km
    
    # Calculate ETA
    eta_info = calculate_eta(distance_km)
    
    if serviceable:
        message = f"Great! We deliver to your location in {eta_info['eta_display']}"
    else:
        message = f"Sorry, your location is {distance_km} km away. We currently deliver within {settings.max_delivery_radius_km} km only."
    
    return LocationCheckResponse(
        serviceable=serviceable,
        distance_km=distance_km,
        estimated_delivery_minutes=eta_info["total_eta_minutes"],
        warehouse_name=settings.warehouse_name,
        max_delivery_radius_km=settings.max_delivery_radius_km,
        message=message,
    )


@router.post("/calculate-eta", response_model=ETAResponse)
async def calculate_delivery_eta(request: ETARequest):
    """
    Calculate detailed ETA for a delivery address.
    """
    # Calculate distance from warehouse
    distance = haversine_distance(
        settings.warehouse_latitude,
        settings.warehouse_longitude,
        request.latitude,
        request.longitude
    )
    
    distance_km = round(distance, 2)
    
    # Check serviceability first
    if distance_km > settings.max_delivery_radius_km:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Location is outside delivery area ({distance_km} km). Maximum delivery radius is {settings.max_delivery_radius_km} km."
        )
    
    # Calculate ETA
    eta_info = calculate_eta(distance_km)
    
    return ETAResponse(
        distance_km=distance_km,
        travel_time_minutes=eta_info["travel_time_minutes"],
        prep_time_minutes=eta_info["prep_time_minutes"],
        total_eta_minutes=eta_info["total_eta_minutes"],
        eta_display=eta_info["eta_display"],
    )


@router.get("/warehouse", response_model=WarehouseInfoResponse)
async def get_warehouse_info():
    """
    Get warehouse location and delivery settings.
    Useful for showing warehouse on map or client-side calculations.
    """
    return WarehouseInfoResponse(
        name=settings.warehouse_name,
        latitude=settings.warehouse_latitude,
        longitude=settings.warehouse_longitude,
        max_delivery_radius_km=settings.max_delivery_radius_km,
        base_prep_time_minutes=settings.base_prep_time_minutes,
    )


@router.get("/reverse-geocode")
async def reverse_geocode(lat: float, lon: float):
    """
    Reverse geocode coordinates to address using Nominatim (OpenStreetMap).
    This is a proxy endpoint to avoid CORS issues on the frontend.
    """
    import httpx
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={
                    "lat": lat,
                    "lon": lon,
                    "format": "json",
                    "addressdetails": 1,
                },
                headers={
                    "User-Agent": "BandaBazaar/1.0"
                },
                timeout=10.0,
            )
            
            if response.status_code == 200:
                data = response.json()
                address = data.get("address", {})
                
                return {
                    "success": True,
                    "display_name": data.get("display_name", ""),
                    "address": {
                        "house_number": address.get("house_number", ""),
                        "road": address.get("road", ""),
                        "neighbourhood": address.get("neighbourhood", address.get("suburb", "")),
                        "city": address.get("city", address.get("town", address.get("village", ""))),
                        "state": address.get("state", ""),
                        "postcode": address.get("postcode", ""),
                        "country": address.get("country", ""),
                    },
                    "latitude": lat,
                    "longitude": lon,
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to geocode location"
                )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Geocoding service timeout"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Geocoding error: {str(e)}"
        )
