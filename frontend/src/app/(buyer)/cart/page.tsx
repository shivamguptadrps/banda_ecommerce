"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Truck,
  Tag,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { Button, Card, Input } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectCartItems,
  selectCartTotal,
  selectCartItemCount,
  updateItemQuantity,
  removeItem,
  clearCart,
  initializeCart,
} from "@/store/slices/cartSlice";
import { selectIsAuthenticated, selectUser } from "@/store/slices/authSlice";
import { useGetCartQuery, useApplyCouponMutation, useRemoveCouponMutation } from "@/store/api/cartApi";
import { formatPrice, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

/**
 * Cart Item Component
 */
function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: any;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  // Get image URL - check multiple possible sources
  const getProductImage = () => {
    // Check direct primary_image string
    if (item.product.primary_image) return item.product.primary_image;
    // Check images array
    if (item.product.images?.length) {
      const primaryImg = item.product.images.find((img: any) => img.is_primary) || item.product.images[0];
      return primaryImg?.url || primaryImg?.image_url || null;
    }
    return null;
  };
  
  const imageUrl = getProductImage();
  const itemTotal = item.sellUnit.price * item.quantity;
  const savings = item.sellUnit.mrp 
    ? (item.sellUnit.mrp - item.sellUnit.price) * item.quantity 
    : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-white rounded-xl border border-gray-100 p-4"
    >
      <div className="flex gap-4">
        {/* Image */}
        <Link href={`/product/${item.product.slug}`} className="flex-shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-lg overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={item.product.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
            )}
          </div>
        </Link>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <Link href={`/product/${item.product.slug}`}>
            <h3 className="font-medium text-gray-900 hover:text-primary transition-colors line-clamp-2 text-sm sm:text-base">
              {item.product.name}
            </h3>
          </Link>
          
          <p className="text-sm text-gray-500 mt-1">{item.sellUnit.label}</p>

          {/* Price */}
          <div className="flex items-center gap-2 mt-2">
            <span className="font-semibold text-gray-900">
              {formatPrice(item.sellUnit.price)}
            </span>
            {item.sellUnit.mrp && item.sellUnit.mrp > item.sellUnit.price && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(item.sellUnit.mrp)}
              </span>
            )}
          </div>

          {/* Savings */}
          {savings > 0 && (
            <p className="text-xs text-success mt-1">
              You save {formatPrice(savings)}
            </p>
          )}
        </div>

        {/* Remove Button (Desktop) */}
        <button
          onClick={onRemove}
          className="hidden sm:flex p-2 text-gray-400 hover:text-error transition-colors self-start"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Quantity & Total Row */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        {/* Quantity Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              className="h-9 w-9 flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <Minus className="h-4 w-4 text-gray-600" />
            </button>
            <span className="w-10 text-center font-medium">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              className="h-9 w-9 flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <Plus className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Remove Button (Mobile) */}
          <button
            onClick={onRemove}
            className="sm:hidden p-2 text-gray-400 hover:text-error transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Item Total */}
        <div className="text-right">
          <span className="text-lg font-bold text-gray-900">{formatPrice(itemTotal)}</span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Empty Cart Component
 */
function EmptyCart() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-8xl mb-6">🛒</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
      <p className="text-gray-500 mb-8 max-w-md">
        Looks like you haven't added anything to your cart yet. Start shopping and find something you love!
      </p>
      <Link href="/products">
        <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
          Start Shopping
        </Button>
      </Link>
    </div>
  );
}

/**
 * Order Summary Component
 */
function OrderSummary({
  itemCount,
  subtotal,
  savings,
  deliveryFee,
  total,
  onCheckout,
  isAuthenticated,
}: {
  itemCount: number;
  subtotal: number;
  savings: number;
  deliveryFee: number;
  total: number;
  onCheckout: () => void;
  isAuthenticated: boolean;
}) {
  const [couponCode, setCouponCode] = useState("");
  const user = useAppSelector(selectUser);
  const { data: cart } = useGetCartQuery(undefined, { 
    skip: !isAuthenticated || user?.role === "delivery_partner" 
  });
  const [applyCoupon, { isLoading: isApplying }] = useApplyCouponMutation();
  const [removeCoupon, { isLoading: isRemoving }] = useRemoveCouponMutation();

  const appliedCoupon = cart?.coupon_code;
  const discountAmount = cart?.discount_amount || 0;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    try {
      await applyCoupon({ coupon_code: couponCode.trim().toUpperCase() }).unwrap();
      toast.success("Coupon applied successfully!");
      setCouponCode("");
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to apply coupon");
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await removeCoupon().unwrap();
      toast.success("Coupon removed");
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to remove coupon");
    }
  };

  return (
    <Card className="sticky top-24">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

      {/* Coupon Input */}
      {!appliedCoupon ? (
        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === "Enter" && handleApplyCoupon()}
              placeholder="Enter coupon code"
              className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button
            variant="outline"
            size="md"
            onClick={handleApplyCoupon}
            disabled={isApplying || !couponCode.trim()}
          >
            {isApplying ? "Applying..." : "Apply"}
          </Button>
        </div>
      ) : (
        <div className="mb-6 p-3 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">
                {appliedCoupon} applied
              </span>
              <span className="text-xs text-success">
                -{formatPrice(discountAmount)}
              </span>
            </div>
            <button
              onClick={handleRemoveCoupon}
              disabled={isRemoving}
              className="text-error hover:text-error-dark text-sm font-medium"
            >
              {isRemoving ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      )}

      {/* Price Breakdown */}
      <div className="space-y-3 border-t border-gray-100 pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal ({itemCount} items)</span>
          <span className="text-gray-900">{formatPrice(subtotal)}</span>
        </div>

        {savings > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-success">Savings</span>
            <span className="text-success">-{formatPrice(savings)}</span>
          </div>
        )}

        {discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-success">Coupon Discount</span>
            <span className="text-success">-{formatPrice(discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Delivery Fee</span>
          <span className={deliveryFee === 0 ? "text-success" : "text-gray-900"}>
            {deliveryFee === 0 ? "FREE" : formatPrice(deliveryFee)}
          </span>
        </div>

        <div className="flex justify-between pt-3 border-t border-gray-100">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="text-xl font-bold text-gray-900">
            {formatPrice(total - discountAmount)}
          </span>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="mt-6">
        {isAuthenticated ? (
          <Button
            fullWidth
            size="lg"
            rightIcon={<ArrowRight className="h-4 w-4" />}
            onClick={onCheckout}
          >
            Proceed to Checkout
          </Button>
        ) : (
          <Link href={`${ROUTES.LOGIN}?redirect=${ROUTES.CART}`}>
            <Button fullWidth size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Login to Checkout
            </Button>
          </Link>
        )}
      </div>

      {/* Secure Payment Info */}
      <p className="text-xs text-gray-400 text-center mt-4">
        🔒 Secure payment. Your data is protected.
      </p>
    </Card>
  );
}

/**
 * Cart Page
 */
export default function CartPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartTotal);
  const itemCount = useAppSelector(selectCartItemCount);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Initialize cart from localStorage
  useEffect(() => {
    dispatch(initializeCart());
  }, [dispatch]);

  // Calculate totals
  const savings = items.reduce((total, item) => {
    const mrp = item.sellUnit.mrp || item.sellUnit.price;
    return total + (mrp - item.sellUnit.price) * item.quantity;
  }, 0);

  const deliveryFee = subtotal >= 500 ? 0 : 40; // Free delivery over ₹500
  const total = subtotal + deliveryFee;

  const handleUpdateQuantity = (productId: string, sellUnitId: string, quantity: number) => {
    if (quantity < 1) {
      dispatch(removeItem({ productId, sellUnitId }));
      toast.success("Item removed from cart");
    } else {
      dispatch(updateItemQuantity({ productId, sellUnitId, quantity }));
    }
  };

  const handleRemoveItem = (productId: string, sellUnitId: string, productName: string) => {
    dispatch(removeItem({ productId, sellUnitId }));
    toast.success(`${productName} removed from cart`);
  };

  const handleClearCart = () => {
    dispatch(clearCart());
    toast.success("Cart cleared");
  };

  const handleCheckout = () => {
    router.push(ROUTES.CHECKOUT);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EmptyCart />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32 lg:pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="container-app py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/products" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Shopping Cart</h1>
                <p className="text-sm text-gray-500">{itemCount} items</p>
              </div>
            </div>

            <button
              onClick={handleClearCart}
              className="text-sm text-gray-500 hover:text-error transition-colors"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-app py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Delivery Address Banner */}
            <Card className="bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Deliver to</p>
                  <p className="text-sm text-gray-600">Select your delivery address</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Card>

            {/* Free Delivery Progress */}
            {subtotal < 500 && (
              <Card className="bg-success/5 border-success/20">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-success" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      Add <span className="font-semibold text-success">{formatPrice(500 - subtotal)}</span> more for{" "}
                      <span className="font-semibold text-success">FREE delivery</span>
                    </p>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all"
                        style={{ width: `${Math.min((subtotal / 500) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Items List */}
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <CartItem
                  key={`${item.productId}-${item.sellUnitId}`}
                  item={item}
                  onUpdateQuantity={(qty) =>
                    handleUpdateQuantity(item.productId, item.sellUnitId, qty)
                  }
                  onRemove={() =>
                    handleRemoveItem(item.productId, item.sellUnitId, item.product.name)
                  }
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Order Summary (Desktop) */}
          <div className="hidden lg:block">
            <OrderSummary
              itemCount={itemCount}
              subtotal={subtotal}
              savings={savings}
              deliveryFee={deliveryFee}
              total={total}
              onCheckout={handleCheckout}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden safe-bottom z-30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-xl font-bold text-gray-900">{formatPrice(total)}</p>
          </div>
          {savings > 0 && (
            <span className="text-sm text-success font-medium">
              Saving {formatPrice(savings)}
            </span>
          )}
        </div>

        {isAuthenticated ? (
          <Button
            fullWidth
            size="lg"
            rightIcon={<ArrowRight className="h-4 w-4" />}
            onClick={handleCheckout}
          >
            Proceed to Checkout
          </Button>
        ) : (
          <Link href={`${ROUTES.LOGIN}?redirect=${ROUTES.CART}`}>
            <Button fullWidth size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Login to Checkout
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

