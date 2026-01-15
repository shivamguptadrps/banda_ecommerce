import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Product } from "@/types/product";

interface SellUnitSelectionModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onSelect: (sellUnit: any) => void;
}

export const SellUnitSelectionModal: React.FC<SellUnitSelectionModalProps> = ({
  visible,
  product,
  onClose,
  onSelect,
}) => {
  if (!product) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{product.name || "Select Option"}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {product.sell_units
              ?.filter((unit: any) => unit.is_active !== false)
              .map((unit: any) => {
                const unitPrice =
                  typeof unit.price === "number"
                    ? unit.price
                    : parseFloat(String(unit.price)) || 0;

                const unitMrpValue = unit.compare_price || unit.mrp;
                let unitMrp: number | null = null;
                if (unitMrpValue !== null && unitMrpValue !== undefined) {
                  if (typeof unitMrpValue === "number") {
                    unitMrp =
                      isNaN(unitMrpValue) || !isFinite(unitMrpValue)
                        ? null
                        : unitMrpValue;
                  } else {
                    const parsed = parseFloat(String(unitMrpValue));
                    unitMrp =
                      isNaN(parsed) || !isFinite(parsed) ? null : parsed;
                  }
                }

                const unitDiscount =
                  unitMrp && unitMrp > unitPrice
                    ? Math.round(((unitMrp - unitPrice) / unitMrp) * 100)
                    : 0;

                return (
                  <TouchableOpacity
                    key={unit.id}
                    style={styles.option}
                    onPress={() => onSelect(unit)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      <View style={styles.optionLeft}>
                        <Text style={styles.optionLabel}>{unit.label}</Text>
                        {unitDiscount > 0 && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>
                              {unitDiscount}% OFF
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.optionRight}>
                        <Text style={styles.optionPrice}>
                          ₹{unitPrice.toFixed(0)}
                        </Text>
                        {unitMrp &&
                          unitMrp > unitPrice &&
                          typeof unitMrp === "number" && (
                            <Text style={styles.optionMrp}>
                              ₹{unitMrp.toFixed(0)}
                            </Text>
                          )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  overlay: {
    flex: 1,
  },
  content: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  body: {
    maxHeight: 400,
  },
  option: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  optionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  discountBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },
  optionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  optionMrp: {
    fontSize: 13,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
});
