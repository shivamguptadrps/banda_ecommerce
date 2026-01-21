"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Product, SellUnit } from "@/types/product";
import { formatPrice, cn } from "@/lib/utils";

interface SellUnitSelectionModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSelect: (sellUnit: SellUnit) => void;
}

/**
 * Sell Unit Selection Modal
 * Professional modal for selecting product variants (matching React Native design)
 */
export function SellUnitSelectionModal({
  isOpen,
  product,
  onClose,
  onSelect,
}: SellUnitSelectionModalProps) {
  if (!product) return null;

  const availableUnits = product.sell_units?.filter((u) => u.is_active !== false) || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 line-clamp-2 flex-1 pr-2">
                {product.name}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              {availableUnits.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">No variants available</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {availableUnits.map((unit) => {
                    const unitPrice =
                      typeof unit.price === "number"
                        ? unit.price
                        : parseFloat(String(unit.price)) || 0;

                    const unitMrpValue = unit.compare_price || unit.mrp;
                    let unitMrp: number | null = null;

                    if (unitMrpValue != null && unitMrpValue !== undefined) {
                      if (typeof unitMrpValue === "number" && !isNaN(unitMrpValue)) {
                        unitMrp = unitMrpValue;
                      } else {
                        const parsed = parseFloat(String(unitMrpValue));
                        if (!isNaN(parsed) && isFinite(parsed)) {
                          unitMrp = parsed;
                        }
                      }
                    }

                    const unitDiscount =
                      unitMrp && unitMrp > unitPrice
                        ? Math.round(((unitMrp - unitPrice) / unitMrp) * 100)
                        : 0;

                    return (
                      <button
                        key={unit.id}
                        onClick={() => {
                          onSelect(unit);
                          onClose();
                        }}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors active:bg-gray-100"
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Left: Label & Discount */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {unit.label}
                            </span>
                            {unitDiscount > 0 && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">
                                {unitDiscount}% OFF
                              </span>
                            )}
                          </div>

                          {/* Right: Price */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-bold text-gray-900">
                              {formatPrice(unitPrice)}
                            </span>
                            {unitMrp &&
                              unitMrp > unitPrice &&
                              typeof unitMrp === "number" && (
                                <span className="text-xs text-gray-400 line-through">
                                  {formatPrice(unitMrp)}
                                </span>
                              )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
