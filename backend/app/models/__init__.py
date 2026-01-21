"""
SQLAlchemy Models
All database models are imported here for Alembic to discover
"""

from app.models.user import User, RefreshToken
from app.models.otp import OTP
from app.models.vendor import Vendor
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery_history import DeliveryHistory
from app.models.notification import Notification, NotificationType, NotificationPriority
from app.models.category import Category
from app.models.service_zone import ServiceZone
from app.models.product import Product, ProductImage, SellUnit, Inventory
from app.models.address import DeliveryAddress
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem, StockReservation
from app.models.payment import Payment, PaymentLog
from app.models.attribute import CategoryAttribute, ProductAttributeValue
from app.models.attribute_segment import AttributeSegment
from app.models.coupon import Coupon, CouponUsage
# Import return model dynamically since 'return' is a Python keyword
import importlib
_return_module = importlib.import_module("app.models.return")
ReturnRequest = _return_module.ReturnRequest
from app.models.refund import Refund, RefundStatus
from app.models.payout import VendorPayout, VendorPayoutItem, PayoutStatus
from app.models.enums import (
    UserRole,
    OrderStatus,
    PaymentStatus,
    PaymentMode,
    StockUnit,
    ReturnStatus,
    ReturnReason,
    AttributeType,
    DiscountType,
)

__all__ = [
    # User models
    "User",
    "RefreshToken",
    "OTP",
    # Vendor models
    "Vendor",
    # Delivery partner models
    "DeliveryPartner",
    # Category models
    "Category",
    # Service zone models
    "ServiceZone",
    # Product models
    "Product",
    "ProductImage",
    "SellUnit",
    "Inventory",
    # Attribute models
    "CategoryAttribute",
    "ProductAttributeValue",
    "AttributeSegment",
    # Address models
    "DeliveryAddress",
    # Cart models
    "Cart",
    "CartItem",
    # Order models
    "Order",
    "OrderItem",
    "StockReservation",
    # Payment models
    "Payment",
    "PaymentLog",
    # Notification models
    "Notification",
    "NotificationType",
    "NotificationPriority",
    # Coupon models
    "Coupon",
    "CouponUsage",
    # Return models
    "ReturnRequest",
    # Refund models
    "Refund",
    "RefundStatus",
    # Payout models
    "VendorPayout",
    "VendorPayoutItem",
    "PayoutStatus",
    # Enums
    "UserRole",
    "OrderStatus",
    "PaymentStatus",
    "PaymentMode",
    "StockUnit",
    "ReturnStatus",
    "ReturnReason",
    "AttributeType",
    "DiscountType",
]
