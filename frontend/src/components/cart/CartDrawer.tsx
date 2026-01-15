"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectCartItems,
  selectCartIsOpen,
  selectCartTotal,
  selectCartItemCount,
  closeCart,
  updateItemQuantity,
  removeItem,
} from "@/store/slices/cartSlice";
import { formatPrice, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

/**
 * Cart Item Component
 */
const CartItemRow = React.forwardRef<
  HTMLDivElement,
  {
    item: any;
    onUpdateQuantity: (quantity: number) => void;
    onRemove: () => void;
  }
>(({ item, onUpdateQuantity, onRemove }, ref) => {
  const primaryImage = item.product.images?.find((img: any) => img.is_primary) || item.product.images?.[0];
  const itemTotal = item.sellUnit.price * item.quantity;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex gap-3 py-4 border-b border-gray-100"
    >
      {/* Image */}
      <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={item.product.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <Link href={`/product/${item.product.slug}`}>
          <h4 className="font-medium text-gray-900 text-sm line-clamp-2 hover:text-primary transition-colors">
            {item.product.name}
          </h4>
        </Link>
        <p className="text-xs text-gray-500 mt-0.5">{item.sellUnit.label}</p>

        <div className="flex items-center justify-between mt-2">
          {/* Quantity Controls */}
          <div className="flex items-center border border-gray-200 rounded-lg">
            <button
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              className="h-7 w-7 flex items-center justify-center hover:bg-gray-100 transition-colors rounded-l-lg"
            >
              <Minus className="h-3 w-3 text-gray-600" />
            </button>
            <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              className="h-7 w-7 flex items-center justify-center hover:bg-gray-100 transition-colors rounded-r-lg"
            >
              <Plus className="h-3 w-3 text-gray-600" />
            </button>
          </div>

          {/* Price */}
          <span className="font-semibold text-gray-900">{formatPrice(itemTotal)}</span>
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="p-1.5 text-gray-400 hover:text-error transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
});

CartItemRow.displayName = "CartItemRow";

/**
 * Cart Drawer Component
 */
export function CartDrawer() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectCartIsOpen);
  const items = useAppSelector(selectCartItems);
  const total = useAppSelector(selectCartTotal);
  const itemCount = useAppSelector(selectCartItemCount);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleClose = () => dispatch(closeCart());

  const handleUpdateQuantity = (productId: string, sellUnitId: string, quantity: number) => {
    dispatch(updateItemQuantity({ productId, sellUnitId, quantity }));
  };

  const handleRemoveItem = (productId: string, sellUnitId: string) => {
    dispatch(removeItem({ productId, sellUnitId }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Cart ({itemCount} items)
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4">
              {items.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <CartItemRow
                      key={`${item.productId}-${item.sellUnitId}`}
                      item={item}
                      onUpdateQuantity={(qty) =>
                        handleUpdateQuantity(item.productId, item.sellUnitId, qty)
                      }
                      onRemove={() => handleRemoveItem(item.productId, item.sellUnitId)}
                    />
                  ))}
                </AnimatePresence>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <div className="text-6xl mb-4">🛒</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Your cart is empty
                  </h3>
                  <p className="text-gray-500 text-center mb-6">
                    Add some delicious items to your cart!
                  </p>
                  <Button onClick={handleClose}>Start Shopping</Button>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 p-4 safe-bottom">
                {/* Subtotal */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-xl font-bold text-gray-900">{formatPrice(total)}</span>
                </div>

                {/* Delivery info */}
                <p className="text-xs text-gray-500 text-center mb-4">
                  Delivery charges calculated at checkout
                </p>

                {/* Checkout Button */}
                <Link href={ROUTES.CART} onClick={handleClose}>
                  <Button
                    fullWidth
                    size="lg"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Proceed to Checkout
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

