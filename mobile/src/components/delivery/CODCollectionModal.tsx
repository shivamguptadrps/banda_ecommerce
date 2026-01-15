import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatPrice } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

interface CODCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (collected: boolean) => void;
  amount: number;
  isLoading?: boolean;
}

export function CODCollectionModal({
  visible,
  onClose,
  onConfirm,
  amount,
  isLoading = false,
}: CODCollectionModalProps) {
  const [collected, setCollected] = useState<boolean>(true);

  const handleConfirm = () => {
    onConfirm(collected);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>COD Collection</Text>
            <TouchableOpacity onPress={onClose} disabled={isLoading}>
              <Ionicons name="close-circle" size={28} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#F59E0B" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Cash on Delivery</Text>
              <Text style={styles.infoText}>
                Please confirm if you have collected the payment from the customer.
              </Text>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Amount to Collect</Text>
            <Text style={styles.amountValue}>{formatPrice(amount)}</Text>
          </View>

          {/* Options */}
          <View style={styles.options}>
            <TouchableOpacity
              style={[
                styles.option,
                collected && styles.optionSelected,
              ]}
              onPress={() => setCollected(true)}
              disabled={isLoading}
            >
              <View style={styles.optionContent}>
                <View style={styles.radio}>
                  {collected && <View style={styles.radioSelected} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Payment Collected</Text>
                  <Text style={styles.optionSubtitle}>
                    Customer has paid the full amount
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                !collected && styles.optionSelected,
              ]}
              onPress={() => setCollected(false)}
              disabled={isLoading}
            >
              <View style={styles.optionContent}>
                <View style={styles.radio}>
                  {!collected && <View style={styles.radioSelected} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Payment Not Collected</Text>
                  <Text style={styles.optionSubtitle}>
                    Customer did not pay (will be marked as failed)
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, isLoading && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <Spinner size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: "#78350F",
    lineHeight: 16,
  },
  amountContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  options: {
    gap: 12,
    marginBottom: 20,
  },
  option: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 12,
  },
  optionSelected: {
    borderColor: "#7B2D8E",
    backgroundColor: "#F9FAFB",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#7B2D8E",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  confirmButton: {
    backgroundColor: "#7B2D8E",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

