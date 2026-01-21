"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Minus } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { SellUnitSelectionModal } from "./SellUnitSelectionModal";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addItem, updateItemQuantity, selectCartItemByProduct, openCart } from "@/store/slices/cartSlice";
import { Product, SellUnit } from "@/types/product";
import { formatPrice } from "@/lib/utils";

interface ProductCardCompactProps {
  product: Product;
  index?: number;
}

export function ProductCardCompact({ product, index = 0 }: ProductCardCompactProps) {
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
  const isOutOfStock = product.is_in_stock === false || (product.inventory && product.inventory.available_quantity <= 0);
  
  // Get primary image
  const primaryImage = useMemo(() => {
    if (product.primary_image) return product.primary_image;
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

    // Single variant - add directly
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
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

      {/* Variant Selection Modal */}
      <SellUnitSelectionModal
        isOpen={showVariantModal}
        product={product}
        onClose={() => setShowVariantModal(false)}
        onSelect={handleVariantSelect}
      />
    </motion.div>
  );
}
