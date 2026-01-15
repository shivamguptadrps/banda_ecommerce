"""
Analytics Schemas
Pydantic models for analytics request/response validation
"""

from datetime import date
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field


# ============== Vendor Analytics ==============

class VendorDashboardStatsResponse(BaseModel):
    """Vendor dashboard statistics response."""
    total_revenue: float
    today_revenue: float
    week_revenue: float
    month_revenue: float
    total_orders: int
    today_orders: int
    pending_orders: int
    total_products: int
    active_products: int
    avg_order_value: float


class SalesReportItem(BaseModel):
    """Sales report item."""
    period: str
    order_count: int
    revenue: float
    avg_order_value: float


class VendorSalesReportResponse(BaseModel):
    """Vendor sales report response."""
    items: List[SalesReportItem]
    total_revenue: float
    total_orders: int


class ProductPerformanceItem(BaseModel):
    """Product performance item."""
    product_id: str
    product_name: str
    primary_image: Optional[str] = None
    order_count: int
    total_quantity_sold: float
    total_revenue: float


class VendorProductPerformanceResponse(BaseModel):
    """Vendor product performance response."""
    products: List[ProductPerformanceItem]


# ============== Admin Analytics ==============

class AdminDashboardStatsResponse(BaseModel):
    """Admin dashboard statistics response."""
    total_vendors: int
    verified_vendors: int
    total_products: int
    active_products: int
    total_orders: int
    today_orders: int
    pending_orders: int
    total_revenue: float
    today_revenue: float
    month_revenue: float
    total_users: int
    total_buyers: int


class VendorPerformanceItem(BaseModel):
    """Vendor performance item."""
    vendor_id: str
    shop_name: str
    logo_url: Optional[str] = None
    total_orders: int
    total_revenue: float
    avg_order_value: float


class VendorPerformanceResponse(BaseModel):
    """Vendor performance report response."""
    vendors: List[VendorPerformanceItem]


class RevenueReportItem(BaseModel):
    """Revenue report item."""
    period: str
    order_count: int
    revenue: float
    avg_order_value: float


class RevenueReportResponse(BaseModel):
    """Revenue report response."""
    items: List[RevenueReportItem]
    total_revenue: float
    total_orders: int


class DeliveryPartnerPerformanceItem(BaseModel):
    """Delivery partner performance item."""
    delivery_partner_id: str
    name: str
    phone: str
    total_deliveries: int
    successful_deliveries: int
    failed_deliveries: int
    success_rate: float
    cod_collected: float


class DeliveryPartnerPerformanceResponse(BaseModel):
    """Delivery partner performance report response."""
    delivery_partners: List[DeliveryPartnerPerformanceItem]

