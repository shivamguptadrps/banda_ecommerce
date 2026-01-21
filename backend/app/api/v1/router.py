"""
API V1 Router
Combines all API routes

IMPORTANT: Route order matters! More specific routes (like /vendor/products) 
must be registered BEFORE less specific routes (like /vendor/{vendor_id}).
"""

from fastapi import APIRouter
import importlib

from app.api.v1 import (
    auth,
    vendor,
    category,
    admin,
    delivery,
    vendor_product,
    product,
    address,
    cart,
    order,
    vendor_order,
    attribute,
    payment,
    delivery_partner,
    notification,
    admin_coupon,
    refund,
    payout,
    upload,
    search,
    vendor_analytics,
    admin_analytics,
    location,
)
# Import return module dynamically since 'return' is a Python keyword
return_api = importlib.import_module("app.api.v1.return")

# Create main API router
api_router = APIRouter()

# Include route modules
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

# IMPORTANT: More specific vendor routes must be included BEFORE vendor to avoid 
# /vendor/{vendor_id} matching /vendor/products or /vendor/orders
api_router.include_router(
    vendor_product.router,
    prefix="/vendor/products",
    tags=["Vendor Products"],
)

api_router.include_router(
    vendor_order.router,
    tags=["Vendor Orders"],
)

api_router.include_router(
    vendor.router,
    prefix="/vendor",
    tags=["Vendor"],
)

api_router.include_router(
    category.router,
    prefix="/categories",
    tags=["Categories"],
)

api_router.include_router(
    product.router,
    prefix="/products",
    tags=["Products"],
)

api_router.include_router(
    delivery.router,
    prefix="/delivery",
    tags=["Delivery"],
)

api_router.include_router(
    address.router,
    tags=["Delivery Addresses"],
)

api_router.include_router(
    cart.router,
    tags=["Shopping Cart"],
)

api_router.include_router(
    order.router,
    tags=["Orders"],
)

api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["Admin"],
)

api_router.include_router(
    admin_coupon.router,
    tags=["Admin - Coupons"],
)

api_router.include_router(
    attribute.router,
    prefix="/admin",
    tags=["Attributes"],
)

api_router.include_router(
    payment.router,
    prefix="/payments",
    tags=["Payments"],
)

api_router.include_router(
    delivery_partner.router,
    tags=["Delivery Partner"],
)

api_router.include_router(
    notification.router,
    tags=["Notifications"],
)

api_router.include_router(
    return_api.router,
    tags=["Returns"],
)

api_router.include_router(
    refund.router,
    prefix="/admin",
    tags=["Admin - Refunds"],
)

api_router.include_router(
    payout.router,
    tags=["Payouts"],
)

api_router.include_router(
    upload.router,
    tags=["Upload"],
)

api_router.include_router(
    search.router,
    prefix="/search",
    tags=["Search"],
)

api_router.include_router(
    vendor_analytics.router,
    prefix="/vendor/analytics",
    tags=["Vendor Analytics"],
)

api_router.include_router(
    admin_analytics.router,
    prefix="/admin/analytics",
    tags=["Admin Analytics"],
)

api_router.include_router(
    location.router,
    tags=["Location & Serviceability"],
)

# Future route modules will be added here:
# api_router.include_router(review.router, prefix="/reviews", tags=["Reviews"])
