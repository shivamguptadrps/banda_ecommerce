"""
Vendor Analytics API Routes
Analytics endpoints for vendors
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.database import get_db
from app.api.deps import DbSession, VendorUser
from app.schemas.analytics import (
    VendorDashboardStatsResponse,
    VendorSalesReportResponse,
    VendorProductPerformanceResponse,
    SalesReportItem,
    ProductPerformanceItem,
)
from app.services.analytics_service import AnalyticsService
from app.services.vendor_service import VendorService

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=VendorDashboardStatsResponse,
    summary="Get vendor dashboard stats",
    description="Get dashboard statistics for the vendor.",
)
def get_vendor_dashboard_stats(
    current_user: VendorUser,
    db: DbSession,
):
    """Get vendor dashboard statistics."""
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_user_id(current_user.id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found",
        )
    
    analytics_service = AnalyticsService(db)
    stats = analytics_service.get_vendor_dashboard_stats(vendor.id)
    
    return VendorDashboardStatsResponse(**stats)


@router.get(
    "/sales",
    response_model=VendorSalesReportResponse,
    summary="Get vendor sales report",
    description="Get sales report with time-based grouping.",
)
def get_vendor_sales_report(
    db: DbSession,
    current_user: VendorUser,
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    group_by: str = Query("day", description="Group by: day, week, month"),
):
    """Get vendor sales report."""
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_user_id(current_user.id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found",
        )
    
    # Validate group_by
    valid_groups = ["day", "week", "month"]
    if group_by not in valid_groups:
        group_by = "day"
    
    analytics_service = AnalyticsService(db)
    sales_data = analytics_service.get_vendor_sales_report(
        vendor_id=vendor.id,
        start_date=start_date,
        end_date=end_date,
        group_by=group_by,
    )
    
    # Calculate totals
    total_revenue = sum(item["revenue"] for item in sales_data)
    total_orders = sum(item["order_count"] for item in sales_data)
    
    return VendorSalesReportResponse(
        items=[SalesReportItem(**item) for item in sales_data],
        total_revenue=total_revenue,
        total_orders=total_orders,
    )


@router.get(
    "/products",
    response_model=VendorProductPerformanceResponse,
    summary="Get product performance",
    description="Get top performing products for the vendor.",
)
def get_vendor_product_performance(
    db: DbSession,
    current_user: VendorUser,
    limit: int = Query(10, ge=1, le=50, description="Number of products"),
):
    """Get vendor product performance."""
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor_by_user_id(current_user.id)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found",
        )
    
    analytics_service = AnalyticsService(db)
    products = analytics_service.get_vendor_product_performance(
        vendor_id=vendor.id,
        limit=limit,
    )
    
    return VendorProductPerformanceResponse(
        products=[ProductPerformanceItem(**item) for item in products]
    )

