"""
Analytics Service
Business logic for vendor and admin analytics
"""

import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, extract, desc
from sqlalchemy.orm import joinedload

from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.vendor import Vendor
from app.models.user import User
from app.models.payment import Payment, PaymentStatus
from app.models.category import Category
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery_history import DeliveryHistory, DeliveryAttemptStatus


class AnalyticsService:
    """Service for analytics operations."""
    
    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db
    
    # ============== Vendor Analytics ==============
    
    def get_vendor_dashboard_stats(
        self,
        vendor_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Get vendor dashboard statistics.
        
        Returns:
            Dictionary with dashboard stats
        """
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)
        
        # Total revenue (all time)
        total_revenue = self.db.query(
            func.coalesce(func.sum(Order.total_amount), Decimal("0.00"))
        ).filter(
            Order.vendor_id == vendor_id,
            Order.order_status == OrderStatus.DELIVERED,
        ).scalar() or Decimal("0.00")
        
        # Today's revenue
        today_revenue = self.db.query(
            func.coalesce(func.sum(Order.total_amount), Decimal("0.00"))
        ).filter(
            Order.vendor_id == vendor_id,
            Order.placed_at >= today_start,
            Order.order_status != OrderStatus.CANCELLED,
        ).scalar() or Decimal("0.00")
        
        # This week's revenue
        week_revenue = self.db.query(
            func.coalesce(func.sum(Order.total_amount), Decimal("0.00"))
        ).filter(
            Order.vendor_id == vendor_id,
            Order.placed_at >= week_start,
            Order.order_status != OrderStatus.CANCELLED,
        ).scalar() or Decimal("0.00")
        
        # This month's revenue
        month_revenue = self.db.query(
            func.coalesce(func.sum(Order.total_amount), Decimal("0.00"))
        ).filter(
            Order.vendor_id == vendor_id,
            Order.placed_at >= month_start,
            Order.order_status != OrderStatus.CANCELLED,
        ).scalar() or Decimal("0.00")
        
        # Order counts
        total_orders = self.db.query(Order).filter(
            Order.vendor_id == vendor_id,
        ).count()
        
        today_orders = self.db.query(Order).filter(
            Order.vendor_id == vendor_id,
            Order.placed_at >= today_start,
        ).count()
        
        pending_orders = self.db.query(Order).filter(
            Order.vendor_id == vendor_id,
            Order.order_status.in_([OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PICKED, OrderStatus.PACKED]),
        ).count()
        
        # Product counts
        total_products = self.db.query(Product).filter(
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
        ).count()
        
        active_products = self.db.query(Product).filter(
            Product.vendor_id == vendor_id,
            Product.is_active == True,
            Product.is_deleted == False,
        ).count()
        
        # Average order value
        avg_order_value = self.db.query(
            func.avg(Order.total_amount)
        ).filter(
            Order.vendor_id == vendor_id,
            Order.order_status == OrderStatus.DELIVERED,
        ).scalar() or Decimal("0.00")
        
        return {
            "total_revenue": float(total_revenue),
            "today_revenue": float(today_revenue),
            "week_revenue": float(week_revenue),
            "month_revenue": float(month_revenue),
            "total_orders": total_orders,
            "today_orders": today_orders,
            "pending_orders": pending_orders,
            "total_products": total_products,
            "active_products": active_products,
            "avg_order_value": float(avg_order_value),
        }
    
    def get_vendor_sales_report(
        self,
        vendor_id: uuid.UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        group_by: str = "day",  # day, week, month
    ) -> List[Dict[str, Any]]:
        """
        Get vendor sales report with time-based grouping.
        
        Args:
            vendor_id: Vendor UUID
            start_date: Start date (default: last 30 days)
            end_date: End date (default: today)
            group_by: Group by day, week, or month
            
        Returns:
            List of sales data grouped by time period
        """
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Base query
        query = self.db.query(Order).filter(
            Order.vendor_id == vendor_id,
            Order.order_status == OrderStatus.DELIVERED,
            func.date(Order.delivered_at) >= start_date,
            func.date(Order.delivered_at) <= end_date,
        )
        
        # Group by time period
        if group_by == "day":
            date_expr = func.date(Order.delivered_at)
        elif group_by == "week":
            date_expr = func.date_trunc('week', Order.delivered_at)
        elif group_by == "month":
            date_expr = func.date_trunc('month', Order.delivered_at)
        else:
            date_expr = func.date(Order.delivered_at)
        
        # Aggregate sales data
        sales_data = query.with_entities(
            date_expr.label("period"),
            func.count(Order.id).label("order_count"),
            func.sum(Order.total_amount).label("revenue"),
            func.avg(Order.total_amount).label("avg_order_value"),
        ).group_by(date_expr).order_by(date_expr).all()
        
        result = []
        for row in sales_data:
            result.append({
                "period": row.period.isoformat() if isinstance(row.period, date) else row.period.strftime("%Y-%m-%d"),
                "order_count": row.order_count,
                "revenue": float(row.revenue or Decimal("0.00")),
                "avg_order_value": float(row.avg_order_value or Decimal("0.00")),
            })
        
        return result
    
    def get_vendor_product_performance(
        self,
        vendor_id: uuid.UUID,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Get top performing products for a vendor.
        
        Args:
            vendor_id: Vendor UUID
            limit: Number of products to return
            
        Returns:
            List of product performance data
        """
        # Get products with order statistics
        products = self.db.query(
            Product.id,
            Product.name,
            Product.primary_image,
            func.count(OrderItem.id).label("order_count"),
            func.sum(OrderItem.quantity).label("total_quantity_sold"),
            func.sum(OrderItem.total_price).label("total_revenue"),
        ).join(
            OrderItem, OrderItem.product_id == Product.id
        ).join(
            Order, Order.id == OrderItem.order_id
        ).filter(
            Product.vendor_id == vendor_id,
            Product.is_deleted == False,
            Order.order_status == OrderStatus.DELIVERED,
        ).group_by(
            Product.id, Product.name, Product.primary_image
        ).order_by(
            desc("total_revenue")
        ).limit(limit).all()
        
        result = []
        for product in products:
            result.append({
                "product_id": str(product.id),
                "product_name": product.name,
                "primary_image": product.primary_image,
                "order_count": product.order_count,
                "total_quantity_sold": float(product.total_quantity_sold or Decimal("0.00")),
                "total_revenue": float(product.total_revenue or Decimal("0.00")),
            })
        
        return result
    
    # ============== Admin Analytics ==============
    
    def get_admin_dashboard_stats(self) -> Dict[str, Any]:
        """
        Get admin platform dashboard statistics.
        
        Returns:
            Dictionary with platform stats
        """
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today_start.replace(day=1)
        
        # Total vendors
        total_vendors = self.db.query(Vendor).filter(
            Vendor.is_active == True,
        ).count()
        
        verified_vendors = self.db.query(Vendor).filter(
            Vendor.is_active == True,
            Vendor.is_verified == True,
        ).count()
        
        # Total products
        total_products = self.db.query(Product).filter(
            Product.is_deleted == False,
        ).count()
        
        active_products = self.db.query(Product).filter(
            Product.is_active == True,
            Product.is_deleted == False,
        ).count()
        
        # Total orders
        total_orders = self.db.query(Order).count()
        
        today_orders = self.db.query(Order).filter(
            Order.placed_at >= today_start,
        ).count()
        
        # Revenue
        total_revenue = self.db.query(
            func.coalesce(func.sum(Order.total_amount), Decimal("0.00"))
        ).filter(
            Order.order_status == OrderStatus.DELIVERED,
        ).scalar() or Decimal("0.00")
        
        today_revenue = self.db.query(
            func.coalesce(func.sum(Order.total_amount), Decimal("0.00"))
        ).filter(
            Order.placed_at >= today_start,
            Order.order_status != OrderStatus.CANCELLED,
        ).scalar() or Decimal("0.00")
        
        month_revenue = self.db.query(
            func.coalesce(func.sum(Order.total_amount), Decimal("0.00"))
        ).filter(
            Order.placed_at >= month_start,
            Order.order_status != OrderStatus.CANCELLED,
        ).scalar() or Decimal("0.00")
        
        # Total users
        total_users = self.db.query(User).count()
        
        total_buyers = self.db.query(User).filter(
            User.role == "BUYER",
        ).count()
        
        # Pending orders
        pending_orders = self.db.query(Order).filter(
            Order.order_status.in_([OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PICKED, OrderStatus.PACKED]),
        ).count()
        
        return {
            "total_vendors": total_vendors,
            "verified_vendors": verified_vendors,
            "total_products": total_products,
            "active_products": active_products,
            "total_orders": total_orders,
            "today_orders": today_orders,
            "pending_orders": pending_orders,
            "total_revenue": float(total_revenue),
            "today_revenue": float(today_revenue),
            "month_revenue": float(month_revenue),
            "total_users": total_users,
            "total_buyers": total_buyers,
        }
    
    def get_vendor_performance_report(
        self,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Get top performing vendors.
        
        Args:
            limit: Number of vendors to return
            
        Returns:
            List of vendor performance data
        """
        vendors = self.db.query(
            Vendor.id,
            Vendor.shop_name,
            Vendor.logo_url,
            func.count(Order.id).label("total_orders"),
            func.sum(Order.total_amount).label("total_revenue"),
            func.avg(Order.total_amount).label("avg_order_value"),
        ).join(
            Order, Order.vendor_id == Vendor.id
        ).filter(
            Vendor.is_active == True,
            Vendor.is_verified == True,
            Order.order_status == OrderStatus.DELIVERED,
        ).group_by(
            Vendor.id, Vendor.shop_name, Vendor.logo_url
        ).order_by(
            desc("total_revenue")
        ).limit(limit).all()
        
        result = []
        for vendor in vendors:
            result.append({
                "vendor_id": str(vendor.id),
                "shop_name": vendor.shop_name,
                "logo_url": vendor.logo_url,
                "total_orders": vendor.total_orders,
                "total_revenue": float(vendor.total_revenue or Decimal("0.00")),
                "avg_order_value": float(vendor.avg_order_value or Decimal("0.00")),
            })
        
        return result
    
    def get_revenue_report(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        group_by: str = "day",  # day, week, month
    ) -> List[Dict[str, Any]]:
        """
        Get platform revenue report.
        
        Args:
            start_date: Start date (default: last 30 days)
            end_date: End date (default: today)
            group_by: Group by day, week, or month
            
        Returns:
            List of revenue data grouped by time period
        """
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Base query for delivered orders
        query = self.db.query(Order).filter(
            Order.order_status == OrderStatus.DELIVERED,
            func.date(Order.delivered_at) >= start_date,
            func.date(Order.delivered_at) <= end_date,
        )
        
        # Group by time period
        if group_by == "day":
            date_expr = func.date(Order.delivered_at)
        elif group_by == "week":
            date_expr = func.date_trunc('week', Order.delivered_at)
        elif group_by == "month":
            date_expr = func.date_trunc('month', Order.delivered_at)
        else:
            date_expr = func.date(Order.delivered_at)
        
        # Aggregate revenue data
        revenue_data = query.with_entities(
            date_expr.label("period"),
            func.count(Order.id).label("order_count"),
            func.sum(Order.total_amount).label("revenue"),
            func.avg(Order.total_amount).label("avg_order_value"),
        ).group_by(date_expr).order_by(date_expr).all()
        
        result = []
        for row in revenue_data:
            result.append({
                "period": row.period.isoformat() if isinstance(row.period, date) else row.period.strftime("%Y-%m-%d"),
                "order_count": row.order_count,
                "revenue": float(row.revenue or Decimal("0.00")),
                "avg_order_value": float(row.avg_order_value or Decimal("0.00")),
            })
        
        return result
    
    def get_delivery_partner_performance_report(
        self,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Get top performing delivery partners.
        
        Args:
            limit: Number of delivery partners to return
            
        Returns:
            List of delivery partner performance data
        """
        # Get delivery partners with their statistics
        delivery_partners = self.db.query(
            DeliveryPartner.id,
            DeliveryPartner.name,
            DeliveryPartner.phone,
            func.count(DeliveryHistory.id).label("total_deliveries"),
            func.sum(
                case(
                    (DeliveryHistory.status == DeliveryAttemptStatus.SUCCESS, 1),
                    else_=0
                )
            ).label("successful_deliveries"),
            func.sum(
                case(
                    (DeliveryHistory.status == DeliveryAttemptStatus.FAILED, 1),
                    else_=0
                )
            ).label("failed_deliveries"),
            func.sum(
                case(
                    (DeliveryHistory.cod_collected == True, DeliveryHistory.cod_amount),
                    else_=Decimal("0.00")
                )
            ).label("cod_collected"),
        ).join(
            DeliveryHistory, DeliveryHistory.delivery_partner_id == DeliveryPartner.id
        ).filter(
            DeliveryPartner.is_active == True,
        ).group_by(
            DeliveryPartner.id, DeliveryPartner.name, DeliveryPartner.phone
        ).order_by(
            desc("total_deliveries")
        ).limit(limit).all()
        
        result = []
        for dp in delivery_partners:
            total = dp.total_deliveries or 0
            successful = dp.successful_deliveries or 0
            failed = dp.failed_deliveries or 0
            success_rate = (successful / total * 100) if total > 0 else 0.0
            
            result.append({
                "delivery_partner_id": str(dp.id),
                "name": dp.name,
                "phone": dp.phone,
                "total_deliveries": total,
                "successful_deliveries": successful,
                "failed_deliveries": failed,
                "success_rate": round(success_rate, 2),
                "cod_collected": float(dp.cod_collected or Decimal("0.00")),
            })
        
        return result
    
    # ============== Admin Vendor Analytics ==============
    
    def get_admin_vendor_analytics(
        self,
        vendor_id: Optional[uuid.UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status_filter: Optional[OrderStatus] = None,
    ) -> Dict[str, Any]:
        """
        Get comprehensive vendor analytics for admin.
        
        Args:
            vendor_id: Optional vendor ID to filter by
            start_date: Start date filter
            end_date: End date filter
            status_filter: Optional order status filter
            
        Returns:
            Dictionary with comprehensive vendor analytics
        """
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)
        
        # Base query
        base_query = self.db.query(Order)
        if vendor_id:
            base_query = base_query.filter(Order.vendor_id == vendor_id)
        if start_date:
            base_query = base_query.filter(func.date(Order.placed_at) >= start_date)
        if end_date:
            base_query = base_query.filter(func.date(Order.placed_at) <= end_date)
        if status_filter:
            base_query = base_query.filter(Order.order_status == status_filter)
        
        # Order counts by status
        status_counts = self.db.query(
            Order.order_status,
            func.count(Order.id).label("count")
        )
        if vendor_id:
            status_counts = status_counts.filter(Order.vendor_id == vendor_id)
        if start_date:
            status_counts = status_counts.filter(func.date(Order.placed_at) >= start_date)
        if end_date:
            status_counts = status_counts.filter(func.date(Order.placed_at) <= end_date)
        status_counts = status_counts.group_by(Order.order_status).all()
        
        status_breakdown = {status.value: count for status, count in status_counts}
        
        # Revenue metrics
        total_revenue = self.db.query(
            func.coalesce(func.sum(Order.total_amount), Decimal("0.00"))
        )
        if vendor_id:
            total_revenue = total_revenue.filter(Order.vendor_id == vendor_id)
        if start_date:
            total_revenue = total_revenue.filter(func.date(Order.placed_at) >= start_date)
        if end_date:
            total_revenue = total_revenue.filter(func.date(Order.placed_at) <= end_date)
        total_revenue = total_revenue.filter(Order.order_status == OrderStatus.DELIVERED).scalar() or Decimal("0.00")
        
        # Time period revenues
        today_revenue_query = self.db.query(func.coalesce(func.sum(Order.total_amount), Decimal("0.00")))
        if vendor_id:
            today_revenue_query = today_revenue_query.filter(Order.vendor_id == vendor_id)
        today_revenue = today_revenue_query.filter(
            Order.placed_at >= today_start,
            Order.order_status == OrderStatus.DELIVERED
        ).scalar() or Decimal("0.00")
        
        week_revenue_query = self.db.query(func.coalesce(func.sum(Order.total_amount), Decimal("0.00")))
        if vendor_id:
            week_revenue_query = week_revenue_query.filter(Order.vendor_id == vendor_id)
        week_revenue = week_revenue_query.filter(
            Order.placed_at >= week_start,
            Order.order_status == OrderStatus.DELIVERED
        ).scalar() or Decimal("0.00")
        
        month_revenue_query = self.db.query(func.coalesce(func.sum(Order.total_amount), Decimal("0.00")))
        if vendor_id:
            month_revenue_query = month_revenue_query.filter(Order.vendor_id == vendor_id)
        month_revenue = month_revenue_query.filter(
            Order.placed_at >= month_start,
            Order.order_status == OrderStatus.DELIVERED
        ).scalar() or Decimal("0.00")
        
        # Order counts
        total_orders = base_query.count()
        today_orders = base_query.filter(Order.placed_at >= today_start).count()
        week_orders = base_query.filter(Order.placed_at >= week_start).count()
        month_orders = base_query.filter(Order.placed_at >= month_start).count()
        
        # Average order value
        avg_order_value = self.db.query(func.avg(Order.total_amount))
        if vendor_id:
            avg_order_value = avg_order_value.filter(Order.vendor_id == vendor_id)
        if start_date:
            avg_order_value = avg_order_value.filter(func.date(Order.placed_at) >= start_date)
        if end_date:
            avg_order_value = avg_order_value.filter(func.date(Order.placed_at) <= end_date)
        avg_order_value = avg_order_value.filter(Order.order_status == OrderStatus.DELIVERED).scalar() or Decimal("0.00")
        
        # Payment mode breakdown
        payment_breakdown = self.db.query(
            Order.payment_mode,
            func.count(Order.id).label("count"),
            func.sum(Order.total_amount).label("revenue")
        )
        if vendor_id:
            payment_breakdown = payment_breakdown.filter(Order.vendor_id == vendor_id)
        if start_date:
            payment_breakdown = payment_breakdown.filter(func.date(Order.placed_at) >= start_date)
        if end_date:
            payment_breakdown = payment_breakdown.filter(func.date(Order.placed_at) <= end_date)
        payment_breakdown = payment_breakdown.group_by(Order.payment_mode).all()
        
        payment_stats = {}
        for mode, count, revenue in payment_breakdown:
            payment_stats[mode.value] = {
                "count": count,
                "revenue": float(revenue or Decimal("0.00"))
            }
        
        return {
            "total_revenue": float(total_revenue),
            "today_revenue": float(today_revenue),
            "week_revenue": float(week_revenue),
            "month_revenue": float(month_revenue),
            "total_orders": total_orders,
            "today_orders": today_orders,
            "week_orders": week_orders,
            "month_orders": month_orders,
            "status_breakdown": status_breakdown,
            "payment_breakdown": payment_stats,
            "avg_order_value": float(avg_order_value),
        }
    
    def get_admin_vendor_list_analytics(
        self,
        search: Optional[str] = None,
        is_verified: Optional[bool] = None,
        is_active: Optional[bool] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get analytics for all vendors (admin view).
        
        Returns:
            List of vendor analytics data
        """
        query = self.db.query(Vendor)
        if search:
            query = query.filter(
                or_(
                    Vendor.shop_name.ilike(f"%{search}%"),
                    Vendor.phone.ilike(f"%{search}%"),
                    Vendor.email.ilike(f"%{search}%"),
                )
            )
        if is_verified is not None:
            query = query.filter(Vendor.is_verified == is_verified)
        if is_active is not None:
            query = query.filter(Vendor.is_active == is_active)
        
        vendors = query.all()
        
        result = []
        for vendor in vendors:
            # Get vendor stats
            vendor_stats = self.get_admin_vendor_analytics(
                vendor_id=vendor.id,
                start_date=start_date,
                end_date=end_date,
            )
            
            # Get product count
            product_count = self.db.query(Product).filter(
                Product.vendor_id == vendor.id,
                Product.is_deleted == False,
            ).count()
            
            result.append({
                "vendor_id": str(vendor.id),
                "shop_name": vendor.shop_name,
                "email": vendor.email,
                "phone": vendor.phone,
                "is_verified": vendor.is_verified,
                "is_active": vendor.is_active,
                "city": vendor.city,
                "logo_url": vendor.logo_url,
                "total_orders": vendor_stats["total_orders"],
                "total_revenue": vendor_stats["total_revenue"],
                "today_orders": vendor_stats["today_orders"],
                "today_revenue": vendor_stats["today_revenue"],
                "product_count": product_count,
                "avg_order_value": vendor_stats["avg_order_value"],
            })
        
        return result
    
    # ============== Admin Delivery Partner Analytics ==============
    
    def get_admin_delivery_partner_analytics(
        self,
        delivery_partner_id: Optional[uuid.UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Get comprehensive delivery partner analytics for admin.
        
        Args:
            delivery_partner_id: Optional delivery partner ID to filter by
            start_date: Start date filter
            end_date: End date filter
            
        Returns:
            Dictionary with comprehensive delivery partner analytics
        """
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)
        
        # Base query for orders
        order_query = self.db.query(Order)
        if delivery_partner_id:
            order_query = order_query.filter(Order.delivery_partner_id == delivery_partner_id)
        if start_date:
            order_query = order_query.filter(func.date(Order.placed_at) >= start_date)
        if end_date:
            order_query = order_query.filter(func.date(Order.placed_at) <= end_date)
        
        # Base query for delivery history
        history_query = self.db.query(DeliveryHistory)
        if delivery_partner_id:
            history_query = history_query.filter(DeliveryHistory.delivery_partner_id == delivery_partner_id)
        if start_date:
            history_query = history_query.filter(func.date(DeliveryHistory.assigned_at) >= start_date)
        if end_date:
            history_query = history_query.filter(func.date(DeliveryHistory.assigned_at) <= end_date)
        
        # Total deliveries
        total_deliveries = history_query.count()
        
        # Successful vs failed
        successful = history_query.filter(
            DeliveryHistory.status == DeliveryAttemptStatus.SUCCESS
        ).count()
        failed = history_query.filter(
            DeliveryHistory.status == DeliveryAttemptStatus.FAILED
        ).count()
        success_rate = (successful / total_deliveries * 100) if total_deliveries > 0 else 0.0
        
        # Today's stats
        today_history = history_query.filter(
            DeliveryHistory.assigned_at >= today_start
        )
        today_assigned = today_history.count()
        today_delivered = today_history.filter(
            DeliveryHistory.status == DeliveryAttemptStatus.SUCCESS
        ).count()
        
        # Week's stats
        week_history = history_query.filter(
            DeliveryHistory.assigned_at >= week_start
        )
        week_assigned = week_history.count()
        week_delivered = week_history.filter(
            DeliveryHistory.status == DeliveryAttemptStatus.SUCCESS
        ).count()
        
        # Month's stats
        month_history = history_query.filter(
            DeliveryHistory.assigned_at >= month_start
        )
        month_assigned = month_history.count()
        month_delivered = month_history.filter(
            DeliveryHistory.status == DeliveryAttemptStatus.SUCCESS
        ).count()
        
        # COD statistics
        cod_query = history_query.filter(
            DeliveryHistory.cod_collected == True
        )
        cod_total = cod_query.count()
        cod_collected = cod_query.with_entities(
            func.sum(DeliveryHistory.cod_amount)
        ).scalar() or Decimal("0.00")
        
        # Average delivery time (in minutes)
        # Use delivery_time_minutes if available, otherwise calculate from timestamps
        avg_delivery_time_query = history_query.filter(
            DeliveryHistory.status == DeliveryAttemptStatus.SUCCESS,
            DeliveryHistory.completed_at.isnot(None),
        )
        
        # Try to use pre-calculated delivery_time_minutes first
        avg_from_field = avg_delivery_time_query.with_entities(
            func.avg(DeliveryHistory.delivery_time_minutes)
        ).scalar()
        
        if avg_from_field is not None:
            avg_delivery_time = float(avg_from_field)
        else:
            # Fallback: calculate from timestamps
            avg_delivery_time = avg_delivery_time_query.with_entities(
                func.avg(
                    extract('epoch', DeliveryHistory.completed_at - DeliveryHistory.assigned_at) / 60
                )
            ).scalar() or 0.0
        
        # Order status breakdown for assigned orders
        order_status_breakdown = order_query.with_entities(
            Order.order_status,
            func.count(Order.id).label("count")
        ).group_by(Order.order_status).all()
        
        status_breakdown = {status.value: count for status, count in order_status_breakdown}
        
        return {
            "total_deliveries": total_deliveries,
            "successful_deliveries": successful,
            "failed_deliveries": failed,
            "success_rate": round(success_rate, 2),
            "today_assigned": today_assigned,
            "today_delivered": today_delivered,
            "week_assigned": week_assigned,
            "week_delivered": week_delivered,
            "month_assigned": month_assigned,
            "month_delivered": month_delivered,
            "cod_total_orders": cod_total,
            "cod_collected": float(cod_collected),
            "cod_collection_rate": round((cod_total / total_deliveries * 100) if total_deliveries > 0 else 0.0, 2),
            "avg_delivery_time_minutes": round(avg_delivery_time, 2),
            "status_breakdown": status_breakdown,
        }
    
    def get_admin_delivery_partner_list_analytics(
        self,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get analytics for all delivery partners (admin view).
        
        Returns:
            List of delivery partner analytics data
        """
        query = self.db.query(DeliveryPartner)
        if search:
            query = query.filter(
                or_(
                    DeliveryPartner.name.ilike(f"%{search}%"),
                    DeliveryPartner.phone.ilike(f"%{search}%"),
                )
            )
        if is_active is not None:
            query = query.filter(DeliveryPartner.is_active == is_active)
        
        delivery_partners = query.all()
        
        result = []
        for dp in delivery_partners:
            # Get delivery partner stats
            dp_stats = self.get_admin_delivery_partner_analytics(
                delivery_partner_id=dp.id,
                start_date=start_date,
                end_date=end_date,
            )
            
            result.append({
                "delivery_partner_id": str(dp.id),
                "name": dp.name,
                "phone": dp.phone,
                "vehicle_type": dp.vehicle_type.value if dp.vehicle_type else None,
                "vehicle_number": dp.vehicle_number,
                "is_active": dp.is_active,
                "is_available": dp.is_available,
                "total_deliveries": dp_stats["total_deliveries"],
                "successful_deliveries": dp_stats["successful_deliveries"],
                "failed_deliveries": dp_stats["failed_deliveries"],
                "success_rate": dp_stats["success_rate"],
                "today_assigned": dp_stats["today_assigned"],
                "today_delivered": dp_stats["today_delivered"],
                "cod_collected": dp_stats["cod_collected"],
                "avg_delivery_time_minutes": dp_stats["avg_delivery_time_minutes"],
            })
        
        return result

