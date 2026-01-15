"""
Return Service
Business logic for return request management
"""

import uuid
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict

from sqlalchemy import and_, or_, func, desc
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

import importlib
# Import return model dynamically since 'return' is a Python keyword
_return_model = importlib.import_module("app.models.return")
ReturnRequest = _return_model.ReturnRequest
# Import return schemas dynamically
_return_schema = importlib.import_module("app.schemas.return")
ReturnRequestCreate = _return_schema.ReturnRequestCreate
ReturnRequestUpdate = _return_schema.ReturnRequestUpdate

from app.models.order import Order, OrderItem
from app.models.product import Product, Inventory
from app.models.user import User
from app.models.enums import ReturnStatus, ReturnReason, OrderStatus
from app.services.notification_service import NotificationService


class ReturnService:
    """Service for return request operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_return_request(
        self,
        buyer: User,
        order_id: uuid.UUID,
        data: ReturnRequestCreate,
    ) -> ReturnRequest:
        """
        Create a return request for an order item.
        
        Validations:
        1. Order must belong to buyer
        2. Order must be DELIVERED
        3. Order item must exist in order
        4. Order item must be returnable (return_eligible = True)
        5. Return deadline must not have passed
        6. No existing return request for this order item
        """
        # Get order with items
        order = self.db.query(Order).options(
            joinedload(Order.items)
        ).filter(
            Order.id == order_id,
            Order.buyer_id == buyer.id,
        ).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        
        # Check order status
        if order.order_status != OrderStatus.DELIVERED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order must be delivered to request return. Current status: {order.order_status.value}",
            )
        
        # Get order item
        order_item = next(
            (item for item in order.items if item.id == data.order_item_id),
            None
        )
        
        if not order_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order item not found in this order",
            )
        
        # Check if already returned
        existing_return = self.db.query(ReturnRequest).filter(
            and_(
                ReturnRequest.order_item_id == data.order_item_id,
                ReturnRequest.status.in_([
                    ReturnStatus.REQUESTED,
                    ReturnStatus.APPROVED,
                ])
            )
        ).first()
        
        if existing_return:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Return request already exists for this item",
            )
        
        # Validate return eligibility
        if not order_item.return_eligible:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This product is not eligible for return",
            )
        
        # Check return deadline
        if order_item.return_deadline:
            if datetime.utcnow() > order_item.return_deadline:
                days_overdue = (datetime.utcnow() - order_item.return_deadline).days
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Return window has expired. Return deadline was {days_overdue} days ago.",
                )
        else:
            # If no deadline set but return_eligible is True, this is a data inconsistency
            # Calculate deadline from delivered_at if available
            if order.delivered_at and order_item.return_window_days:
                deadline = order.delivered_at + timedelta(days=order_item.return_window_days)
                if datetime.utcnow() > deadline:
                    days_overdue = (datetime.utcnow() - deadline).days
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Return window has expired. Return deadline was {days_overdue} days ago.",
                    )
        
        # Validate images (max 5)
        if data.images and len(data.images) > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 5 images allowed",
            )
        
        # Calculate refund amount (full item price)
        refund_amount = order_item.total_price
        
        # Create return request
        return_request = ReturnRequest(
            order_id=order_id,
            order_item_id=data.order_item_id,
            buyer_id=buyer.id,
            reason=data.reason,
            description=data.description,
            images={"urls": data.images} if data.images else None,
            status=ReturnStatus.REQUESTED,
            refund_amount=refund_amount,
        )
        
        self.db.add(return_request)
        self.db.commit()
        self.db.refresh(return_request)
        
        # Create notification for vendor
        notification_service = NotificationService(self.db)
        if order.vendor_id:
            notification_service.create_notification(
                user_id=order.vendor.user_id if order.vendor else None,
                notification_type="RETURN_REQUEST",
                title="New Return Request",
                message=f"Return request for order #{order.order_number}",
                data={"order_id": str(order_id), "return_request_id": str(return_request.id)},
            )
        
        logger.info(f"Return request created: {return_request.id} for order {order_id}")
        
        return return_request
    
    def get_return_request(
        self,
        return_request_id: uuid.UUID,
        user: User,
    ) -> ReturnRequest:
        """Get return request by ID with access control."""
        return_request = self.db.query(ReturnRequest).options(
            joinedload(ReturnRequest.order),
            joinedload(ReturnRequest.order_item),
        ).filter(
            ReturnRequest.id == return_request_id
        ).first()
        
        if not return_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Return request not found",
            )
        
        # Check access: buyer, vendor, or admin
        from app.models.enums import UserRole
        
        has_access = False
        if user.role == UserRole.ADMIN:
            has_access = True
        elif user.role == UserRole.BUYER and return_request.buyer_id == user.id:
            has_access = True
        elif user.role == UserRole.VENDOR and return_request.order and return_request.order.vendor_id:
            vendor = self.db.query(User).filter(User.id == user.id).first()
            if vendor and vendor.vendor and vendor.vendor.id == return_request.order.vendor_id:
                has_access = True
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )
        
        return return_request
    
    def list_return_requests(
        self,
        user: User,
        order_id: Optional[uuid.UUID] = None,
        status_filter: Optional[ReturnStatus] = None,
        page: int = 1,
        size: int = 20,
    ) -> Dict:
        """List return requests with access control."""
        from app.models.enums import UserRole
        
        query = self.db.query(ReturnRequest).options(
            joinedload(ReturnRequest.order),
            joinedload(ReturnRequest.order_item),
        )
        
        # Apply filters based on user role
        if user.role == UserRole.BUYER:
            query = query.filter(ReturnRequest.buyer_id == user.id)
        elif user.role == UserRole.VENDOR:
            # Get vendor's orders
            vendor = user.vendor if hasattr(user, 'vendor') else None
            if vendor:
                query = query.join(Order).filter(Order.vendor_id == vendor.id)
            else:
                # No vendor profile, return empty
                return {
                    "items": [],
                    "total": 0,
                    "page": page,
                    "size": size,
                    "pages": 0,
                }
        # Admin can see all
        
        # Additional filters
        if order_id:
            query = query.filter(ReturnRequest.order_id == order_id)
        
        if status_filter:
            query = query.filter(ReturnRequest.status == status_filter)
        
        # Count total
        total = query.count()
        
        # Paginate
        items = query.order_by(desc(ReturnRequest.created_at)).offset(
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
    
    def approve_return_request(
        self,
        return_request_id: uuid.UUID,
        approver: User,
        notes: Optional[str] = None,
    ) -> ReturnRequest:
        """
        Approve a return request.
        
        Actions:
        1. Update return status to APPROVED
        2. Restore stock to inventory
        3. Create notification for buyer
        """
        from app.models.enums import UserRole
        
        return_request = self.db.query(ReturnRequest).options(
            joinedload(ReturnRequest.order),
            joinedload(ReturnRequest.order_item).joinedload(OrderItem.product),
        ).filter(
            ReturnRequest.id == return_request_id
        ).first()
        
        if not return_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Return request not found",
            )
        
        # Check if already processed
        if return_request.status != ReturnStatus.REQUESTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Return request is already {return_request.status.value}",
            )
        
        # Check access (vendor or admin)
        if approver.role == UserRole.VENDOR:
            if not return_request.order or not return_request.order.vendor_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied",
                )
            vendor = approver.vendor if hasattr(approver, 'vendor') else None
            if not vendor or vendor.id != return_request.order.vendor_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied",
                )
        
        # Update status
        return_request.status = ReturnStatus.APPROVED
        if approver.role == UserRole.ADMIN:
            return_request.admin_notes = notes
        else:
            return_request.vendor_notes = notes
        
        # Restore stock
        self._restore_stock(return_request)
        
        self.db.commit()
        self.db.refresh(return_request)
        
        # Create notification for buyer
        notification_service = NotificationService(self.db)
        if return_request.buyer_id:
            notification_service.create_notification(
                user_id=return_request.buyer_id,
                notification_type="RETURN_APPROVED",
                title="Return Request Approved",
                message=f"Your return request for order #{return_request.order.order_number} has been approved",
                data={"return_request_id": str(return_request.id), "order_id": str(return_request.order_id)},
            )
        
        logger.info(f"Return request approved: {return_request.id} by {approver.role.value}")
        
        return return_request
    
    def reject_return_request(
        self,
        return_request_id: uuid.UUID,
        rejector: User,
        notes: str,
    ) -> ReturnRequest:
        """Reject a return request."""
        from app.models.enums import UserRole
        
        return_request = self.db.query(ReturnRequest).options(
            joinedload(ReturnRequest.order),
        ).filter(
            ReturnRequest.id == return_request_id
        ).first()
        
        if not return_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Return request not found",
            )
        
        if return_request.status != ReturnStatus.REQUESTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Return request is already {return_request.status.value}",
            )
        
        # Check access
        if rejector.role == UserRole.VENDOR:
            if not return_request.order or not return_request.order.vendor_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied",
                )
            vendor = rejector.vendor if hasattr(rejector, 'vendor') else None
            if not vendor or vendor.id != return_request.order.vendor_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied",
                )
        
        if not notes or len(notes.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection reason must be at least 10 characters",
            )
        
        # Update status
        return_request.status = ReturnStatus.REJECTED
        return_request.resolved_at = datetime.utcnow()
        
        if rejector.role == UserRole.ADMIN:
            return_request.admin_notes = notes
        else:
            return_request.vendor_notes = notes
        
        self.db.commit()
        self.db.refresh(return_request)
        
        # Create notification for buyer
        notification_service = NotificationService(self.db)
        if return_request.buyer_id:
            notification_service.create_notification(
                user_id=return_request.buyer_id,
                notification_type="RETURN_REJECTED",
                title="Return Request Rejected",
                message=f"Your return request for order #{return_request.order.order_number} has been rejected",
                data={"return_request_id": str(return_request.id), "order_id": str(return_request.order_id)},
            )
        
        logger.info(f"Return request rejected: {return_request.id} by {rejector.role.value}")
        
        return return_request
    
    def complete_return_request(
        self,
        return_request_id: uuid.UUID,
    ) -> ReturnRequest:
        """
        Mark return request as completed (after refund is processed).
        Called by refund service after successful refund.
        """
        return_request = self.db.query(ReturnRequest).filter(
            ReturnRequest.id == return_request_id
        ).first()
        
        if not return_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Return request not found",
            )
        
        if return_request.status != ReturnStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Return request must be approved before completion. Current status: {return_request.status.value}",
            )
        
        return_request.status = ReturnStatus.COMPLETED
        return_request.resolved_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(return_request)
        
        logger.info(f"Return request completed: {return_request.id}")
        
        return return_request
    
    def _restore_stock(
        self,
        return_request: ReturnRequest,
    ) -> None:
        """
        Restore stock to inventory when return is approved.
        
        Logic:
        1. Get order item and product
        2. Calculate quantity to restore (in stock_unit)
        3. Add back to available_quantity
        """
        order_item = return_request.order_item
        if not order_item or not order_item.product_id:
            logger.warning(f"Cannot restore stock: order_item or product_id missing for return {return_request.id}")
            return
        
        # Get product inventory
        inventory = self.db.query(Inventory).filter(
            Inventory.product_id == order_item.product_id
        ).with_for_update().first()
        
        if not inventory:
            logger.warning(f"Inventory not found for product {order_item.product_id}")
            return
        
        # Calculate quantity to restore
        # order_item.unit_value is in stock_unit (e.g., 0.5 kg)
        # order_item.quantity is the count (e.g., 2)
        # Total quantity = unit_value * quantity
        quantity_to_restore = Decimal(str(order_item.unit_value)) * Decimal(str(order_item.quantity))
        
        # Restore to available quantity
        inventory.available_quantity += quantity_to_restore
        
        self.db.commit()
        
        logger.info(
            f"Stock restored: {quantity_to_restore} {order_item.product.stock_unit.value} "
            f"for product {order_item.product_id} (return {return_request.id})"
        )

