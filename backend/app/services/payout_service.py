"""
Payout Service
Business logic for vendor earnings calculation and payout processing
"""

import uuid
import logging
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Dict, List, Tuple

from sqlalchemy import and_, func, desc, case
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

from app.models.payout import VendorPayout, VendorPayoutItem, PayoutStatus
from app.models.order import Order
from app.models.refund import Refund
from app.models.vendor import Vendor
from app.models.user import User
from app.models.enums import OrderStatus, PaymentStatus, PaymentMode
from app.schemas.payout import PayoutGenerateRequest, PayoutProcessRequest
from app.services.notification_service import NotificationService


class PayoutService:
    """Service for vendor payout operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_vendor_earnings(
        self,
        vendor_id: uuid.UUID,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
    ) -> Dict:
        """
        Calculate vendor earnings for a period.
        
        Returns:
            {
                "gross_amount": Decimal,
                "commission_amount": Decimal,
                "refund_deductions": Decimal,
                "net_amount": Decimal,
                "total_orders": int,
                "orders": List[Order],
            }
        """
        vendor = self.db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found",
            )
        
        # Base query for delivered orders
        query = self.db.query(Order).filter(
            and_(
                Order.vendor_id == vendor_id,
                Order.order_status == OrderStatus.DELIVERED,
            )
        )
        
        # Apply period filter
        if period_start:
            query = query.filter(Order.delivered_at >= datetime.combine(period_start, datetime.min.time()))
        if period_end:
            query = query.filter(Order.delivered_at <= datetime.combine(period_end, datetime.max.time()))
        
        orders = query.all()
        
        # Calculate amounts
        gross_amount = Decimal("0.00")
        commission_amount = Decimal("0.00")
        refund_deductions = Decimal("0.00")
        
        for order in orders:
            # Gross amount (order total)
            gross_amount += order.total_amount
            
            # Commission (percentage of order total)
            commission = (order.total_amount * vendor.commission_percent) / Decimal("100")
            commission_amount += commission
        
        # Calculate refund deductions
        refund_query = self.db.query(
            func.sum(Refund.amount)
        ).join(Order).filter(
            and_(
                Order.vendor_id == vendor_id,
                Refund.status == "processed",
            )
        )
        
        if period_start:
            refund_query = refund_query.filter(Refund.processed_at >= datetime.combine(period_start, datetime.min.time()))
        if period_end:
            refund_query = refund_query.filter(Refund.processed_at <= datetime.combine(period_end, datetime.max.time()))
        
        refund_total = refund_query.scalar() or Decimal("0.00")
        refund_deductions = refund_total
        
        # Net amount
        net_amount = gross_amount - commission_amount - refund_deductions
        
        return {
            "gross_amount": gross_amount,
            "commission_amount": commission_amount,
            "refund_deductions": refund_deductions,
            "net_amount": net_amount,
            "total_orders": len(orders),
            "orders": orders,
            "commission_rate": vendor.commission_percent,
        }
    
    def generate_payout_batch(
        self,
        period_start: date,
        period_end: date,
        vendor_id: Optional[uuid.UUID] = None,
    ) -> List[VendorPayout]:
        """
        Generate payout batch for vendors.
        
        If vendor_id is provided, generates payout for single vendor.
        Otherwise, generates payouts for all vendors with earnings.
        """
        if period_start > period_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Period start must be before period end",
            )
        
        # Get vendors
        if vendor_id:
            vendors = self.db.query(Vendor).filter(Vendor.id == vendor_id).all()
        else:
            vendors = self.db.query(Vendor).filter(Vendor.is_active == True).all()
        
        payouts = []
        
        for vendor in vendors:
            # Check if payout already exists for this period
            existing_payout = self.db.query(VendorPayout).filter(
                and_(
                    VendorPayout.vendor_id == vendor.id,
                    VendorPayout.period_start == period_start,
                    VendorPayout.period_end == period_end,
                )
            ).first()
            
            if existing_payout:
                logger.info(f"Payout already exists for vendor {vendor.id}, period {period_start} to {period_end}")
                payouts.append(existing_payout)
                continue
            
            # Calculate earnings
            earnings = self.calculate_vendor_earnings(
                vendor_id=vendor.id,
                period_start=period_start,
                period_end=period_end,
            )
            
            # Skip if no earnings
            if earnings["net_amount"] <= 0:
                logger.info(f"No earnings for vendor {vendor.id} in period {period_start} to {period_end}")
                continue
            
            # Create payout
            payout = VendorPayout(
                vendor_id=vendor.id,
                period_start=period_start,
                period_end=period_end,
                total_orders=earnings["total_orders"],
                gross_amount=earnings["gross_amount"],
                commission_amount=earnings["commission_amount"],
                refund_deductions=earnings["refund_deductions"],
                net_amount=earnings["net_amount"],
                status=PayoutStatus.PENDING,
            )
            
            self.db.add(payout)
            self.db.flush()  # Get payout.id
            
            # Create payout items for each order
            for order in earnings["orders"]:
                order_commission = (order.total_amount * vendor.commission_percent) / Decimal("100")
                order_net = order.total_amount - order_commission
                
                payout_item = VendorPayoutItem(
                    payout_id=payout.id,
                    order_id=order.id,
                    order_amount=order.total_amount,
                    commission=order_commission,
                    net_amount=order_net,
                )
                self.db.add(payout_item)
            
            payouts.append(payout)
        
        self.db.commit()
        
        # Refresh all payouts
        for payout in payouts:
            self.db.refresh(payout)
        
        logger.info(f"Generated {len(payouts)} payout(s) for period {period_start} to {period_end}")
        
        return payouts
    
    def process_payout(
        self,
        payout_id: uuid.UUID,
        transaction_id: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> VendorPayout:
        """
        Mark payout as processed (after external payment transfer).
        
        This is called after the actual money transfer is completed
        (e.g., via bank transfer, UPI, etc.).
        """
        payout = self.db.query(VendorPayout).options(
            joinedload(VendorPayout.vendor).joinedload(Vendor.user),
        ).filter(
            VendorPayout.id == payout_id
        ).first()
        
        if not payout:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payout not found",
            )
        
        if payout.status != PayoutStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payout is already {payout.status.value}",
            )
        
        # Update payout
        payout.status = PayoutStatus.PROCESSED
        payout.processed_at = datetime.utcnow()
        if transaction_id:
            payout.transaction_id = transaction_id
        
        self.db.commit()
        self.db.refresh(payout)
        
        # Create notification for vendor
        notification_service = NotificationService(self.db)
        if payout.vendor and payout.vendor.user_id:
            notification_service.create_notification(
                user_id=payout.vendor.user_id,
                notification_type="PAYOUT_PROCESSED",
                title="Payout Processed",
                message=f"Payout of ₹{payout.net_amount} has been processed for period {payout.period_start} to {payout.period_end}",
                data={
                    "payout_id": str(payout.id),
                    "amount": float(payout.net_amount),
                    "period_start": payout.period_start.isoformat(),
                    "period_end": payout.period_end.isoformat(),
                },
            )
        
        logger.info(f"Payout processed: {payout.id} for vendor {payout.vendor_id}")
        
        return payout
    
    def get_vendor_earnings_summary(
        self,
        vendor_id: uuid.UUID,
    ) -> Dict:
        """
        Get vendor earnings summary (all time and current period).
        
        Returns:
            {
                "total_earnings": Decimal,
                "pending_payouts": Decimal,
                "processed_payouts": Decimal,
                "current_period_earnings": Decimal,
                "total_orders": int,
                "commission_rate": Decimal,
            }
        """
        vendor = self.db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found",
            )
        
        # All-time earnings (all delivered orders)
        all_time_earnings = self.calculate_vendor_earnings(vendor_id=vendor_id)
        
        # Current period (last 30 days)
        period_end = date.today()
        period_start = period_end - timedelta(days=30)
        current_period_earnings = self.calculate_vendor_earnings(
            vendor_id=vendor_id,
            period_start=period_start,
            period_end=period_end,
        )
        
        # Pending payouts
        pending_payouts = self.db.query(
            func.sum(VendorPayout.net_amount)
        ).filter(
            and_(
                VendorPayout.vendor_id == vendor_id,
                VendorPayout.status == PayoutStatus.PENDING,
            )
        ).scalar() or Decimal("0.00")
        
        # Processed payouts
        processed_payouts = self.db.query(
            func.sum(VendorPayout.net_amount)
        ).filter(
            and_(
                VendorPayout.vendor_id == vendor_id,
                VendorPayout.status == PayoutStatus.PROCESSED,
            )
        ).scalar() or Decimal("0.00")
        
        # Total orders count
        total_orders = self.db.query(func.count(Order.id)).filter(
            and_(
                Order.vendor_id == vendor_id,
                Order.order_status == OrderStatus.DELIVERED,
            )
        ).scalar() or 0
        
        return {
            "total_earnings": all_time_earnings["net_amount"],
            "pending_payouts": pending_payouts,
            "processed_payouts": processed_payouts,
            "current_period_earnings": current_period_earnings["net_amount"],
            "total_orders": total_orders,
            "commission_rate": vendor.commission_percent,
        }
    
    def get_payout(
        self,
        payout_id: uuid.UUID,
        vendor_id: Optional[uuid.UUID] = None,
    ) -> VendorPayout:
        """Get payout by ID with optional vendor access control."""
        payout = self.db.query(VendorPayout).options(
            joinedload(VendorPayout.vendor),
            joinedload(VendorPayout.items).joinedload(VendorPayoutItem.order),
        ).filter(
            VendorPayout.id == payout_id
        ).first()
        
        if not payout:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payout not found",
            )
        
        # Check vendor access
        if vendor_id and payout.vendor_id != vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
        
        return payout
    
    def list_payouts(
        self,
        vendor_id: Optional[uuid.UUID] = None,
        status_filter: Optional[PayoutStatus] = None,
        page: int = 1,
        size: int = 20,
    ) -> Dict:
        """List payouts with optional filters."""
        query = self.db.query(VendorPayout).options(
            joinedload(VendorPayout.vendor),
        )
        
        if vendor_id:
            query = query.filter(VendorPayout.vendor_id == vendor_id)
        
        if status_filter:
            query = query.filter(VendorPayout.status == status_filter)
        
        # Count total
        total = query.count()
        
        # Paginate
        items = query.order_by(desc(VendorPayout.created_at)).offset(
            (page - 1) * size
        ).limit(size).all()
        
        pages = (total + size - 1) // size if total > 0 else 0
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        }

