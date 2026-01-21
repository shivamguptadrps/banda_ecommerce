"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Minus, Star, Zap } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { Button } from "@/components/ui";
import { SellUnitSelectionModal } from "./SellUnitSelectionModal";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addItem, updateItemQuantity, selectCartItemByProduct, openCart } from "@/store/slices/cartSlice";
import { Product, SellUnit } from "@/types/product";
import { formatPrice, formatRating, cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  index?: number;
  variant?: "default" | "compact" | "horizontal";
}

/**
 * Product Card Component
 * Blinkit-inspired design with quick add functionality
 */
export function ProductCard({ product, index = 0, variant = "default" }: ProductCardProps) {
  const dispatch = useAppDispatch();
  
  // Find default sell unit or first active one
  const defaultUnit = useMemo(() => {
    if (!product.sell_units?.length) return null;
    return product.sell_units.find((u) => u.is_default) || 
           product.sell_units.find((u) => u.is_active) || 
           product.sell_units[0];
  }, [product.sell_units]);
  
  const [selectedUnit, setSelectedUnit] = useState<SellUnit | null>(defaultUnit);
  const [showVariantModal, setShowVariantModal] = useState(false);

  // Check if product has multiple variants
  const hasMultipleVariants = (product.sell_units?.length || 0) > 1;

  // Get all cart items for this product (to handle multiple variants)
  const allCartItems = useAppSelector((state) => state.cart.items);
  const cartItemsForProduct = allCartItems.filter((item) => item.productId === product.id);
  
  // Get cart item for the currently selected unit
  const cartItem = useAppSelector((state) =>
    selectCartItemByProduct(state, product.id, selectedUnit?.id || "")
  );

  // If multiple variants and no selected unit, check if any variant is in cart
  const anyVariantInCart = hasMultipleVariants && !selectedUnit && cartItemsForProduct.length > 0;
  const variantInCart = anyVariantInCart ? cartItemsForProduct[0] : null;

  const quantity = cartItem?.quantity || variantInCart?.quantity || 0;
  const activeCartItem = cartItem || variantInCart;
  
  // Check stock status
  const isOutOfStock = product.is_in_stock === false || 
    (product.inventory && product.inventory.available_quantity <= 0);
  
  // Get primary image
  const primaryImage = useMemo(() => {
    // Try primary_image field first (from backend computed field)
    if (product.primary_image) return product.primary_image;
    // Then try to find from images array
    const img = product.images?.find((img) => img.is_primary) || product.images?.[0];
    return img?.image_url || img?.url || null;
  }, [product]);
  
  // Calculate discount
  const discount = useMemo(() => {
    if (!selectedUnit) return 0;
    const mrp = selectedUnit.compare_price || selectedUnit.mrp;
    if (mrp && mrp > selectedUnit.price) {
      return Math.round(((mrp - selectedUnit.price) / mrp) * 100);
    }
    return selectedUnit.discount_percent || 0;
  }, [selectedUnit]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    // If multiple variants, show modal
    if (hasMultipleVariants) {
      setShowVariantModal(true);
      return;
    }

    // Single variant - add directly (use default unit or first available)
    const unitToAdd = selectedUnit || defaultUnit || product.sell_units?.[0];
    if (!unitToAdd) {
      toast.error("Product variant not available");
      return;
    }

    dispatch(
      addItem({
        productId: product.id,
        sellUnitId: unitToAdd.id,
        quantity: 1,
        product,
        sellUnit: unitToAdd,
      })
    );
    toast.success(`Added to cart`);
    dispatch(openCart());
  };

  const handleVariantSelect = (sellUnit: SellUnit) => {
    dispatch(
      addItem({
        productId: product.id,
        sellUnitId: sellUnit.id,
        quantity: 1,
        product,
        sellUnit,
      })
    );
    toast.success(`Added to cart`);
    dispatch(openCart());
    setSelectedUnit(sellUnit);
  };

  const handleUpdateQuantity = (e: React.MouseEvent, newQuantity: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Use the unit from cart item if available, otherwise selected unit
    const unitToUpdate = activeCartItem?.sellUnit || selectedUnit || defaultUnit;
    if (!unitToUpdate) return;

    dispatch(
      updateItemQuantity({
        productId: product.id,
        sellUnitId: unitToUpdate.id,
        quantity: newQuantity,
      })
    );
  };

  const mrpPrice = selectedUnit?.compare_price || selectedUnit?.mrp;
  const MotionDiv = motion.div;

  if (variant === "compact") {
    return (
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: (index || 0) * 0.03 }}
        className="relative"
      >
        <div className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
            {/* Discount Badge */}
            {discount > 0 && (
              <div className="absolute top-2 left-2 z-10 bg-[#0c831f] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                {discount}% OFF
              </div>
            )}

            {/* Image - Clickable Link */}
            <Link href={`/product/${product.slug}`} className="block">
              <div className="relative aspect-square bg-gradient-to-b from-gray-50 to-white p-3">
                {primaryImage ? (
                  <img
                    src={primaryImage}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl bg-gray-100 rounded-lg">
                    📦
                  </div>
                )}
                
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-lg">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">Out of Stock</span>
                  </div>
                )}
              </div>
            </Link>

            {/* Content */}
            <div className="p-2.5">
              <Link href={`/product/${product.slug}`}>
                <h3 className="font-medium text-gray-900 text-xs line-clamp-2 min-h-[2rem] leading-tight hover:text-[#22C55E] transition-colors">
                  {product.name}
                </h3>
              </Link>

              {selectedUnit && (
                <p className="text-[10px] text-gray-400 mt-0.5">{selectedUnit.label}</p>
              )}
              {hasMultipleVariants && !selectedUnit && (
                <p className="text-[10px] text-gray-500 mt-0.5">Multiple options</p>
              )}

              <div className="flex items-center justify-between mt-2 gap-2 min-h-[1.75rem]">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-gray-900">
                    {formatPrice(
                      activeCartItem?.sellUnit?.price || 
                      selectedUnit?.price || 
                      defaultUnit?.price || 
                      product.min_price || 
                      0
                    )}
                  </span>
                  {(() => {
                    const displayMrp = activeCartItem?.sellUnit?.compare_price || 
                                      activeCartItem?.sellUnit?.mrp ||
                                      mrpPrice;
                    const displayPrice = activeCartItem?.sellUnit?.price || 
                                         selectedUnit?.price || 
                                         defaultUnit?.price || 
                                         0;
                    return displayMrp && displayMrp > displayPrice && (
                      <span className="text-[10px] text-gray-400 line-through ml-1">
                        {formatPrice(displayMrp)}
                      </span>
                    );
                  })()}
                </div>

                {!isOutOfStock && (
                  <div 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="flex-shrink-0 relative z-10"
                  >
                    {quantity === 0 ? (
                      <button
                        onClick={handleAddToCart}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="h-7 w-7 flex items-center justify-center bg-[#0c831f] text-white rounded-lg hover:bg-[#0a6e1a] transition-colors flex-shrink-0 cursor-pointer"
                        title={hasMultipleVariants ? "Select variant" : "Add to cart"}
                        type="button"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="flex items-center bg-[#0c831f] rounded-lg min-w-[4rem]">
                        <button
                          onClick={(e) => handleUpdateQuantity(e, quantity - 1)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="h-7 w-6 flex items-center justify-center text-white flex-shrink-0 hover:bg-[#0a6e1a] transition-colors cursor-pointer"
                          type="button"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-white font-bold text-xs w-5 text-center flex-shrink-0">
                          {quantity}
                        </span>
                        <button
                          onClick={(e) => handleUpdateQuantity(e, quantity + 1)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="h-7 w-6 flex items-center justify-center text-white flex-shrink-0 hover:bg-[#0a6e1a] transition-colors cursor-pointer"
                          type="button"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Variant Selection Modal - for compact variant */}
        <SellUnitSelectionModal
          isOpen={showVariantModal}
          product={product}
          onClose={() => setShowVariantModal(false)}
          onSelect={handleVariantSelect}
        />
      </MotionDiv>
    );
  }

  // Default variant
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index || 0) * 0.04 }}
      className="group"
    >
      <Link href={`/product/${product.slug}`}>
        <div className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300">
          {/* Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
            {discount > 0 && (
              <span className="bg-[#0c831f] text-white text-[10px] font-bold px-2 py-1 rounded-md">
                {discount}% OFF
              </span>
            )}
            {product.is_featured && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                <Zap className="h-2.5 w-2.5" /> Featured
              </span>
            )}
          </div>

          {/* Image */}
          <div className="relative aspect-square bg-gradient-to-b from-gray-50 to-white p-6">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={product.name}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl bg-gray-100 rounded-xl">
                📦
              </div>
            )}

            {isOutOfStock && (
              <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">Out of Stock</span>
              </div>
            )}

            {/* Quick delivery badge */}
            <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 shadow-sm">
              <Zap className="h-3 w-3 text-[#0c831f]" />
              <span className="text-[10px] font-medium text-gray-700">10 mins</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Vendor */}
            {product.vendor_name && product.vendor_id && (
              <Link
                href={`/vendor/${product.vendor_id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 truncate hover:text-[#0c831f] transition-colors"
              >
                {product.vendor_name}
              </Link>
            )}

            {/* Product Name */}
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 min-h-[2.5rem] leading-snug mb-2">
              {product.name}
            </h3>

            {/* Sell Unit Selector */}
            {product.sell_units?.length > 1 && (
              <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
                {product.sell_units.filter(u => u.is_active !== false).slice(0, 3).map((unit) => (
                  <button
                    key={unit.id}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedUnit(unit);
                    }}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all",
                      selectedUnit?.id === unit.id
                        ? "border-[#0c831f] bg-[#0c831f]/5 text-[#0c831f] font-medium"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    )}
                  >
                    {unit.label}
                  </button>
                ))}
              </div>
            )}

            {/* Single Unit Display */}
            {product.sell_units?.length === 1 && selectedUnit && (
              <p className="text-xs text-gray-500 mb-3">{selectedUnit.label}</p>
            )}

            {/* Price & Cart */}
            <div className="flex items-end justify-between gap-3 min-h-[3rem]">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-gray-900">
                    {formatPrice(selectedUnit?.price || product.min_price || 0)}
                  </span>
                  {mrpPrice && mrpPrice > (selectedUnit?.price || 0) && (
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(mrpPrice)}
                    </span>
                  )}
                </div>
                {/* Rating */}
                {(product.rating || product.vendor_rating) && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium text-gray-600">
                      {formatRating(product.rating || product.vendor_rating)}
                    </span>
                  </div>
                )}
              </div>

              {/* Add to Cart - Fixed position */}
              {!isOutOfStock && (
                <div 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="flex-shrink-0 relative z-10"
                >
                  {quantity === 0 ? (
                    <Button
                      size="sm"
                      onClick={handleAddToCart}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="h-9 px-4 bg-[#0c831f] hover:bg-[#0a6e1a] text-white font-semibold rounded-lg whitespace-nowrap cursor-pointer"
                      title={hasMultipleVariants ? "Select variant" : "Add to cart"}
                      type="button"
                    >
                      ADD
                    </Button>
                  ) : (
                    <div className="flex items-center bg-[#0c831f] rounded-lg shadow-lg min-w-[5rem]">
                      <button
                        onClick={(e) => handleUpdateQuantity(e, quantity - 1)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="h-9 w-9 flex items-center justify-center text-white hover:bg-[#0a6e1a] rounded-l-lg transition-colors flex-shrink-0 cursor-pointer"
                        type="button"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-white font-bold w-8 text-center flex-shrink-0">
                        {quantity}
                      </span>
                      <button
                        onClick={(e) => handleUpdateQuantity(e, quantity + 1)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="h-9 w-9 flex items-center justify-center text-white hover:bg-[#0a6e1a] rounded-r-lg transition-colors flex-shrink-0 cursor-pointer"
                        type="button"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Variant Selection Modal */}
      <SellUnitSelectionModal
        isOpen={showVariantModal}
        product={product}
        onClose={() => setShowVariantModal(false)}
        onSelect={handleVariantSelect}
      />
    </MotionDiv>
  );
}
