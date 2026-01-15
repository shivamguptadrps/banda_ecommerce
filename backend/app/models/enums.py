"""
Enum definitions for the application
"""

import enum


class UserRole(str, enum.Enum):
    """User role enumeration."""
    ADMIN = "admin"
    VENDOR = "vendor"
    BUYER = "buyer"
    DELIVERY_PARTNER = "delivery_partner"


class OrderStatus(str, enum.Enum):
    """Order status enumeration."""
    PLACED = "placed"  # Order placed, waiting for vendor acceptance
    CONFIRMED = "confirmed"  # Vendor accepted the order
    PICKED = "picked"  # Items picked from inventory
    PACKED = "packed"  # Order packed and ready
    OUT_FOR_DELIVERY = "out_for_delivery"  # Out for delivery
    DELIVERED = "delivered"  # Order delivered
    CANCELLED = "cancelled"  # Order cancelled
    RETURNED = "returned"  # Order returned
    
    # Legacy statuses (for backward compatibility)
    PENDING = "pending"  # Alias for PLACED
    PROCESSING = "processing"  # Alias for PICKED
    SHIPPED = "shipped"  # Alias for OUT_FOR_DELIVERY


class PaymentStatus(str, enum.Enum):
    """Payment status enumeration."""
    PENDING = "PENDING"
    CREATED = "CREATED"  # Razorpay order created
    AUTHORIZED = "AUTHORIZED"  # Payment authorized but not captured
    CAPTURED = "CAPTURED"  # Payment captured (equivalent to PAID)
    PAID = "PAID"  # Alias for CAPTURED (for backward compatibility)
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class PaymentMode(str, enum.Enum):
    """Payment mode enumeration."""
    ONLINE = "online"
    COD = "cod"


class StockUnit(str, enum.Enum):
    """Stock unit enumeration."""
    KG = "kg"
    PIECE = "piece"
    LITER = "liter"
    METER = "meter"


class ReturnStatus(str, enum.Enum):
    """Return request status enumeration."""
    REQUESTED = "requested"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"


class ReturnReason(str, enum.Enum):
    """Return reason enumeration."""
    DAMAGED = "damaged"
    WRONG_ITEM = "wrong_item"
    QUALITY = "quality"
    OTHER = "other"


class AttributeType(str, enum.Enum):
    """Types of category attribute values."""
    TEXT = "text"                   # Free text input
    NUMBER = "number"               # Numeric input
    SELECT = "select"               # Single select from options
    MULTI_SELECT = "multi_select"   # Multiple select from options
    BOOLEAN = "boolean"             # Yes/No toggle


class DiscountType(str, enum.Enum):
    """Coupon discount type enumeration."""
    PERCENTAGE = "percentage"  # Percentage discount (e.g., 20%)
    FLAT = "flat"              # Fixed amount discount (e.g., ₹100)

