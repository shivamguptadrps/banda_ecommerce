"use client";

import { ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCartItemCount, selectCartTotal, openCart } from "@/store/slices/cartSlice";
import { formatPrice, cn } from "@/lib/utils";

interface CartButtonProps {
  variant?: "icon" | "fab";
  className?: string;
}

/**
 * Cart Button Component
 * Shows cart item count and opens drawer on click
 */
export function CartButton({ variant = "icon", className }: CartButtonProps) {
  const dispatch = useAppDispatch();
  const itemCount = useAppSelector(selectCartItemCount);
  const total = useAppSelector(selectCartTotal);

  const handleClick = () => dispatch(openCart());

  if (variant === "fab") {
    // Floating action button style (mobile)
    if (itemCount === 0) return null;

    return (
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={handleClick}
        className={cn(
          "fixed bottom-20 right-4 z-40 flex items-center gap-3 bg-primary text-white rounded-full px-4 py-3 shadow-lg hover:shadow-xl transition-shadow md:hidden",
          className
        )}
      >
        <div className="relative">
          <ShoppingCart className="h-5 w-5" />
          <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-secondary text-xs flex items-center justify-center font-bold">
            {itemCount}
          </span>
        </div>
        <span className="font-semibold">{formatPrice(total)}</span>
      </motion.button>
    );
  }

  // Icon button style (header)
  return (
    <button
      onClick={handleClick}
      className={cn("relative p-2 rounded-lg hover:bg-gray-100 transition-colors", className)}
    >
      <ShoppingCart className="h-5 w-5 text-gray-600" />
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-secondary text-white text-xs flex items-center justify-center font-bold"
          >
            {itemCount > 99 ? "99+" : itemCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

