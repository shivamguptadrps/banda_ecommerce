"""
Admin Analytics API Routes
Analytics endpoints for admins
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.database import get_db
from app.api.deps import DbSession, require_role, get_current_user
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.analytics import (
    AdminDashboardStatsResponse,
    VendorPerformanceResponse,
    RevenueReportResponse,
    DeliveryPartnerPerformanceResponse,
    VendorPerformanceItem,
    RevenueReportItem,
    DeliveryPartnerPerformanceItem,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=AdminDashboardStatsResponse,
    summary="Get admin dashboard stats",
    description="Get platform dashboard statistics.",
)
def get_admin_dashboard_stats(
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Get admin dashboard statistics."""
    analytics_service = AnalyticsService(db)
    stats = analytics_service.get_admin_dashboard_stats()
    
    return AdminDashboardStatsResponse(**stats)


@router.get(
    "/vendors",
    response_model=VendorPerformanceResponse,
    summary="Get vendor performance report",
    description="Get top performing vendors.",
)
def get_vendor_performance_report(
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    limit: int = Query(10, ge=1, le=50, description="Number of vendors"),
):
    """Get vendor performance report."""
    analytics_service = AnalyticsService(db)
    vendors = analytics_service.get_vendor_performance_report(limit=limit)
    
    return VendorPerformanceResponse(
        vendors=[VendorPerformanceItem(**item) for item in vendors]
    )


@router.get(
    "/revenue",
    response_model=RevenueReportResponse,
    summary="Get revenue report",
    description="Get platform revenue report with time-based grouping.",
)
def get_revenue_report(
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    group_by: str = Query("day", description="Group by: day, week, month"),
):
    """Get platform revenue report."""
    # Validate group_by
    valid_groups = ["day", "week", "month"]
    if group_by not in valid_groups:
        group_by = "day"
    
    analytics_service = AnalyticsService(db)
    revenue_data = analytics_service.get_revenue_report(
        start_date=start_date,
        end_date=end_date,
        group_by=group_by,
    )
    
    # Calculate totals
    total_revenue = sum(item["revenue"] for item in revenue_data)
    total_orders = sum(item["order_count"] for item in revenue_data)
    
    return RevenueReportResponse(
        items=[RevenueReportItem(**item) for item in revenue_data],
        total_revenue=total_revenue,
        total_orders=total_orders,
    )


@router.get(
    "/delivery-partners",
    response_model=DeliveryPartnerPerformanceResponse,
    summary="Get delivery partner performance report",
    description="Get top performing delivery partners.",
)
def get_delivery_partner_performance_report(
    db: DbSession,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    limit: int = Query(10, ge=1, le=50, description="Number of delivery partners"),
):
    """Get delivery partner performance report."""
    analytics_service = AnalyticsService(db)
    delivery_partners = analytics_service.get_delivery_partner_performance_report(limit=limit)
    
    return DeliveryPartnerPerformanceResponse(
        delivery_partners=[DeliveryPartnerPerformanceItem(**item) for item in delivery_partners]
    )

