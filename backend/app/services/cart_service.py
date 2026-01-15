"""
Cart Service
Business logic for shopping cart operations
"""

import uuid
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.cart import Cart, CartItem
from app.models.product import Product, SellUnit, Inventory
from app.models.vendor import Vendor
from app.models.user import User
from app.schemas.cart import CartItemAdd, CartItemUpdate, CartSummary
from app.services.service_zone_service import ServiceZoneService


class CartService:
    """Service for shopping cart operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_or_create_cart(self, buyer: User) -> Cart:
        """Get existing cart or create a new one for buyer."""
        cart = self.db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.vendor),
            joinedload(Cart.items).joinedload(CartItem.sell_unit),
            joinedload(Cart.coupon),
        ).filter(Cart.buyer_id == buyer.id).first()
        
        if not cart:
            cart = Cart(buyer_id=buyer.id)
            self.db.add(cart)
            self.db.commit()
            self.db.refresh(cart)
        
        return cart
    
    def get_cart(self, buyer: User) -> Optional[Cart]:
        """Get cart with full details."""
        return self.db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.vendor),
            joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.images),
            joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.inventory),
            joinedload(Cart.items).joinedload(CartItem.sell_unit),
        ).filter(Cart.buyer_id == buyer.id).first()
    
    def add_item(
        self,
        buyer: User,
        data: CartItemAdd,
    ) -> Cart:
        """Add an item to the cart."""
        # Validate product
        product = self._get_valid_product(data.product_id)
        
        # Validate sell unit belongs to product
        sell_unit = self._get_valid_sell_unit(data.sell_unit_id, data.product_id)
        
        # Check stock availability
        self._check_stock_availability(product, sell_unit, data.quantity)
        
        # Get or create cart
        cart = self.get_or_create_cart(buyer)
        
        # Check if item already exists
        existing_item = self._get_cart_item(cart.id, data.sell_unit_id)
        
        if existing_item:
            # Update quantity
            new_quantity = existing_item.quantity + data.quantity
            self._check_stock_availability(product, sell_unit, new_quantity)
            existing_item.quantity = new_quantity
        else:
            # Add new item
            cart_item = CartItem(
                cart_id=cart.id,
                product_id=data.product_id,
                sell_unit_id=data.sell_unit_id,
                quantity=data.quantity,
            )
            self.db.add(cart_item)
        
        self.db.commit()
        
        # Reload cart with relationships
        return self.get_cart(buyer)
    
    def update_item(
        self,
        buyer: User,
        item_id: uuid.UUID,
        data: CartItemUpdate,
    ) -> Cart:
        """Update cart item quantity."""
        cart = self.get_cart(buyer)
        if not cart:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cart not found",
            )
        
        # Find item
        item = next((i for i in cart.items if i.id == item_id), None)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cart item not found",
            )
        
        # Check stock availability
        product = self._get_valid_product(item.product_id)
        sell_unit = self._get_valid_sell_unit(item.sell_unit_id, item.product_id)
        self._check_stock_availability(product, sell_unit, data.quantity)
        
        item.quantity = data.quantity
        self.db.commit()
        
        return self.get_cart(buyer)
    
    def remove_item(
        self,
        buyer: User,
        item_id: uuid.UUID,
    ) -> Cart:
        """Remove an item from cart."""
        cart = self.get_cart(buyer)
        if not cart:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cart not found",
            )
        
        # Find and remove item
        item = next((i for i in cart.items if i.id == item_id), None)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cart item not found",
            )
        
        self.db.delete(item)
        self.db.commit()
        
        return self.get_cart(buyer)
    
    def clear_cart(self, buyer: User) -> None:
        """Remove all items from cart."""
        cart = self.get_cart(buyer)
        if not cart:
            return
        
        self.db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        self.db.commit()
    
    def get_cart_summary(
        self,
        buyer: User,
        delivery_address_id: Optional[uuid.UUID] = None,
    ) -> CartSummary:
        """Get cart summary with delivery calculation."""
        cart = self.get_cart(buyer)
        
        if not cart or cart.is_empty:
            return CartSummary(
                subtotal=Decimal("0.00"),
                delivery_fee=Decimal("0.00"),
                total_amount=Decimal("0.00"),
                total_items=0,
                is_valid=False,
                validation_errors=["Cart is empty"],
            )
        
        validation_errors = []
        subtotal = Decimal("0.00")
        delivery_fee = Decimal("0.00")
        total_items = 0
        
        # Validate each item and calculate subtotal
        for item in cart.items:
            # Check product is still active
            if not item.product.is_active:
                validation_errors.append(f"{item.product.name} is no longer available")
                continue
            
            # Check sell unit is still active
            if not item.sell_unit.is_active:
                validation_errors.append(f"Selected unit for {item.product.name} is no longer available")
                continue
            
            # Check stock
            stock_needed = item.sell_unit.unit_value * item.quantity
            if item.product.inventory:
                available = item.product.inventory.available_quantity - item.product.inventory.reserved_quantity
                if stock_needed > available:
                    validation_errors.append(f"Insufficient stock for {item.product.name}")
                    continue
            else:
                validation_errors.append(f"{item.product.name} is out of stock")
                continue
            
            subtotal += item.line_total
            total_items += item.quantity
        
        # Calculate delivery fee if address provided
        if delivery_address_id:
            from app.services.address_service import AddressService
            address_service = AddressService(self.db)
            address = address_service.get_address(delivery_address_id, buyer.id)
            
            if address and address.latitude and address.longitude:
                # Get vendor location (assuming single vendor cart for now)
                vendor = cart.items[0].product.vendor if cart.items else None
                if vendor and vendor.latitude and vendor.longitude:
                    zone_service = ServiceZoneService(self.db)
                    delivery_check = zone_service.check_delivery(
                        float(vendor.latitude),
                        float(vendor.longitude),
                        float(address.latitude),
                        float(address.longitude),
                    )
                    
                    if delivery_check.is_deliverable:
                        delivery_fee = Decimal(str(delivery_check.delivery_fee or 0))
                        
                        # Check minimum order
                        if delivery_check.min_order_value and subtotal < Decimal(str(delivery_check.min_order_value)):
                            validation_errors.append(
                                f"Minimum order value is ₹{delivery_check.min_order_value}"
                            )
                    else:
                        validation_errors.append("Delivery not available to this address")
        
        # Get discount from cart (if coupon applied)
        discount_amount = cart.discount_amount if cart else Decimal("0.00")
        
        # Calculate total (subtotal + delivery_fee - discount)
        total_amount = subtotal + delivery_fee - discount_amount
        
        return CartSummary(
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            discount_amount=discount_amount,
            total_amount=total_amount,
            total_items=total_items,
            delivery_address_id=delivery_address_id,
            is_valid=len(validation_errors) == 0,
            validation_errors=validation_errors,
        )
    
    # ========== Helper Methods ==========
    
    def _get_valid_product(self, product_id: uuid.UUID) -> Product:
        """Get and validate a product."""
        product = self.db.query(Product).options(
            joinedload(Product.inventory)
        ).filter(
            and_(
                Product.id == product_id,
                Product.is_active == True,
            )
        ).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found or not available",
            )
        
        return product
    
    def _get_valid_sell_unit(
        self,
        sell_unit_id: uuid.UUID,
        product_id: uuid.UUID,
    ) -> SellUnit:
        """Get and validate a sell unit."""
        sell_unit = self.db.query(SellUnit).filter(
            and_(
                SellUnit.id == sell_unit_id,
                SellUnit.product_id == product_id,
                SellUnit.is_active == True,
            )
        ).first()
        
        if not sell_unit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid sell unit for this product",
            )
        
        return sell_unit
    
    def _check_stock_availability(
        self,
        product: Product,
        sell_unit: SellUnit,
        quantity: int,
    ) -> None:
        """Check if enough stock is available."""
        stock_needed = sell_unit.unit_value * quantity
        
        if not product.inventory:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product is out of stock",
            )
        
        available = product.inventory.available_quantity - product.inventory.reserved_quantity
        
        if stock_needed > available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only {available} {product.stock_unit.value} available",
            )
    
    def _get_cart_item(
        self,
        cart_id: uuid.UUID,
        sell_unit_id: uuid.UUID,
    ) -> Optional[CartItem]:
        """Get cart item by sell unit."""
        return self.db.query(CartItem).filter(
            and_(
                CartItem.cart_id == cart_id,
                CartItem.sell_unit_id == sell_unit_id,
            )
        ).first()
