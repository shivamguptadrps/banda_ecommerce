"""
Delivery Routes
Delivery availability and fee calculation
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.service_zone import DeliveryCheckRequest, DeliveryCheckResponse
from app.services.service_zone_service import ServiceZoneService
from app.api.deps import DbSession


router = APIRouter()


@router.post(
    "/check",
    response_model=DeliveryCheckResponse,
    summary="Check delivery availability",
    description="Check if delivery is available at a location.",
)
def check_delivery(
    request: DeliveryCheckRequest,
    db: DbSession,
):
    """
    Check delivery availability at a location.
    
    Returns delivery fee and estimated time if available.
    """
    zone_service = ServiceZoneService(db)
    
    result = zone_service.check_delivery(
        latitude=float(request.latitude),
        longitude=float(request.longitude),
    )
    
    return result


@router.get(
    "/check",
    response_model=DeliveryCheckResponse,
    summary="Check delivery availability (GET)",
    description="Check if delivery is available at a location using query params.",
)
def check_delivery_get(
    db: DbSession,
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    city: str = Query(None),
):
    """
    Check delivery availability at a location.
    
    Returns delivery fee and estimated time if available.
    """
    zone_service = ServiceZoneService(db)
    
    result = zone_service.check_delivery(
        latitude=latitude,
        longitude=longitude,
        city=city,
    )
    
    return result


@router.get(
    "/fee",
    summary="Calculate delivery fee",
    description="Calculate delivery fee between two points.",
)
def calculate_delivery_fee(
    db: DbSession,
    vendor_lat: float = Query(..., ge=-90, le=90, description="Vendor latitude"),
    vendor_lng: float = Query(..., ge=-180, le=180, description="Vendor longitude"),
    delivery_lat: float = Query(..., ge=-90, le=90, description="Delivery latitude"),
    delivery_lng: float = Query(..., ge=-180, le=180, description="Delivery longitude"),
):
    """
    Calculate delivery fee and estimated time.
    
    Based on distance between vendor and delivery location.
    """
    zone_service = ServiceZoneService(db)
    
    result = zone_service.calculate_delivery_details(
        vendor_latitude=vendor_lat,
        vendor_longitude=vendor_lng,
        delivery_latitude=delivery_lat,
        delivery_longitude=delivery_lng,
    )
    
    return {
        "distance_km": result["distance_km"],
        "delivery_fee": float(result["delivery_fee"]),
        "estimated_time_mins": result["estimated_time_mins"],
    }

