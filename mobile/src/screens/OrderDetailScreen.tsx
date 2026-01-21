import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useGetOrderQuery, useCancelOrderMutation } from "@/store/api/orderApi";
import { useAddToCartMutation } from "@/store/api/cartApi";
import { useGetReturnRequestsQuery } from "@/store/api/returnApi";
import { useGetProductsQuery } from "@/store/api/productApi";
import { OrderItem } from "@/components/order/OrderItem";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { StatusBadge } from "@/components/order/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";
import { SellUnitSelectionModal } from "@/components/product/SellUnitSelectionModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RELATED_PRODUCT_WIDTH = (SCREEN_WIDTH - 64) / 3;

export default function OrderDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const orderId = route.params?.orderId;

  const { data: order, isLoading, error, refetch, isFetching } = useGetOrderQuery(orderId);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();
  const [addToCart] = useAddToCartMutation();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showRelatedProductVariantModal, setShowRelatedProductVariantModal] = useState(false);
  const [selectedRelatedProductForVariant, setSelectedRelatedProductForVariant] = useState<any>(null);

  // Fetch related products
  const { data: relatedProductsData } = useGetProductsQuery(
    {
      page: 1,
      size: 8,
      filters: {},
    }
  );

  const relatedProducts = useMemo(() => {
    return relatedProductsData?.items || [];
  }, [relatedProductsData]);

  const handleAddToCartFromRelated = async (productId: string) => {
    const product = relatedProducts.find((p) => p.id === productId);
    if (!product) return;

    const hasMultipleOptions = product.sell_units && product.sell_units.length > 1;
    if (hasMultipleOptions) {
      setSelectedRelatedProductForVariant(product);
      setShowRelatedProductVariantModal(true);
    } else {
      try {
        await addToCart({
          product_id: productId,
          sell_unit_id: product.sell_units?.[0]?.id || "",
          quantity: 1,
        }).unwrap();
        Alert.alert("Success", "Item added to cart");
      } catch (error: any) {
        Alert.alert("Error", error?.data?.detail || "Failed to add to cart");
      }
    }
  };

  const handleRelatedProductVariantSelect = async (sellUnit: any) => {
    if (!selectedRelatedProductForVariant) return;
    try {
      await addToCart({
        product_id: selectedRelatedProductForVariant.id,
        sell_unit_id: sellUnit.id,
        quantity: 1,
      }).unwrap();
      setShowRelatedProductVariantModal(false);
      setSelectedRelatedProductForVariant(null);
      Alert.alert("Success", "Item added to cart");
    } catch (error: any) {
      Alert.alert("Error", error?.data?.detail || "Failed to add to cart");
    }
  };
  
  // Get return requests for this order
  const { data: returnRequestsData } = useGetReturnRequestsQuery(
    { order_id: orderId },
    { skip: !orderId || order?.order_status !== "delivered" }
  );
  
  const returnRequests = returnRequestsData?.items || [];
  
  // Helper to check if item has active return request
  const hasActiveReturnRequest = (itemId: string) => {
    return returnRequests.some(
      (req) =>
        req.order_item_id === itemId &&
        (req.status === "requested" || req.status === "approved")
    );
  };
  
  // Helper to check if item is within return window
  const isWithinReturnWindow = (item: any) => {
    if (!item.return_eligible || !item.return_deadline) return false;
    const deadline = new Date(item.return_deadline);
    return deadline > new Date();
  };

  const formatPrice = (amount: number) => {
    return `₹${parseFloat(String(amount)).toFixed(0)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim() || cancelReason.trim().length < 10) {
      Alert.alert(
        "Invalid Reason",
        "Please provide a cancellation reason (minimum 10 characters)."
      );
      return;
    }

    try {
      await cancelOrder({
        orderId: order!.id,
        reason: cancelReason.trim(),
      }).unwrap();
      setShowCancelModal(false);
      setCancelReason("");
      Alert.alert("Success", "Order cancelled successfully");
      refetch();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.data?.detail || "Failed to cancel order"
      );
    }
  };

  const handleReorder = async () => {
    if (!order) return;

    try {
      // Add all items from order to cart
      const promises = order.items.map((item) =>
        addToCart({
          product_id: item.product_id!,
          sell_unit_id: item.sell_unit_id!,
          quantity: item.quantity,
        }).unwrap()
      );

      await Promise.all(promises);
      Alert.alert("Success", "Items added to cart", [
        {
          text: "View Cart",
          onPress: () => navigation.navigate("MainTabs", { screen: "Cart" }),
        },
        { text: "OK" },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.data?.detail || "Failed to add items to cart"
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
        <Text style={styles.errorTitle}>Error Loading Order</Text>
        <Text style={styles.errorText}>
          {error && "data" in error
            ? (error.data as any)?.detail || "Failed to load order"
            : "Order not found"}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing || isFetching} 
            onRefresh={onRefresh}
            tintColor="#22C55E"
            colors={["#22C55E"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Order Status Banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusBannerContent}>
            <View style={styles.statusBannerLeft}>
              <View style={styles.statusIconContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              </View>
              <View>
                <Text style={styles.statusBannerTitle}>Order {order.order_status === "delivered" ? "Delivered" : order.order_status === "cancelled" ? "Cancelled" : "In Progress"}</Text>
                <Text style={styles.statusBannerSubtitle}>{order.order_number}</Text>
              </View>
            </View>
            <StatusBadge status={order.order_status} size="medium" />
          </View>
        </View>

        {/* Order Info Card */}
        <View style={styles.card}>
          <View style={styles.orderInfoRow}>
            <View style={styles.orderInfoIcon}>
              <Ionicons name="calendar-outline" size={16} color="#22C55E" />
            </View>
            <View style={styles.orderInfoContent}>
              <Text style={styles.orderInfoLabel}>Order Date</Text>
              <Text style={styles.orderInfoValue}>
                {formatDate(order.placed_at)}
              </Text>
            </View>
          </View>

          {order.vendor && (
            <View style={[styles.orderInfoRow, styles.orderInfoRowLast]}>
              <View style={styles.orderInfoIcon}>
                <Ionicons name="storefront-outline" size={16} color="#22C55E" />
              </View>
              <View style={styles.orderInfoContent}>
                <Text style={styles.orderInfoLabel}>Vendor</Text>
                <Text style={styles.orderInfoValue}>{order.vendor.shop_name}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Order Timeline */}
        <OrderTimeline order={order} />

        {/* Order Items */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cube-outline" size={16} color="#22C55E" />
            <Text style={styles.sectionTitle}>Order Items ({order.items.length})</Text>
          </View>
          {order.items.map((item, index) => {
            const hasReturnRequest = hasActiveReturnRequest(item.id);
            const canReturn = order.order_status === "delivered" && 
                             item.return_eligible && 
                             isWithinReturnWindow(item) &&
                             !hasReturnRequest;
            
            return (
              <View key={item.id}>
                <OrderItem item={item} showImage={true} />
                {index < order.items.length - 1 && (
                  <View style={styles.itemSeparator} />
                )}
                {order.order_status === "delivered" && item.return_eligible && (
                  <View style={styles.returnInfoContainer}>
                    {hasReturnRequest ? (
                      <View style={styles.returnRequestBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                        <Text style={styles.returnRequestText}>
                          Return Request {returnRequests.find(r => r.order_item_id === item.id)?.status === "approved" ? "Approved" : "Pending"}
                        </Text>
                      </View>
                    ) : isWithinReturnWindow(item) ? (
                      <Button
                        onPress={() =>
                          navigation.navigate("ReturnRequest", {
                            orderId: order.id,
                            orderItemId: item.id,
                            productName: item.product_name,
                          })
                        }
                        style={styles.returnButton}
                      >
                        <Ionicons name="return-down-back" size={14} color="#FFFFFF" />
                        <Text style={styles.returnButtonText}>Request Return</Text>
                      </Button>
                    ) : (
                      <View style={styles.returnWindowExpired}>
                        <Ionicons name="time-outline" size={14} color="#6B7280" />
                        <Text style={styles.returnWindowExpiredText}>
                          Return window expired
                        </Text>
                      </View>
                    )}
                    {item.return_window_days && (
                      <Text style={styles.returnWindowText}>
                        {item.return_window_days} days return window
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Order Summary */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={18} color="#22C55E" />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {formatPrice(order.subtotal)}
            </Text>
          </View>
          {order.delivery_fee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>
                {formatPrice(order.delivery_fee)}
              </Text>
            </View>
          )}
          {order.discount_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -{formatPrice(order.discount_amount)}
              </Text>
            </View>
          )}
          {order.tax_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>
                {formatPrice(order.tax_amount)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatPrice(order.total_amount)}
            </Text>
          </View>
        </View>

        {/* Delivery Address */}
        {order.delivery_address_snapshot && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={18} color="#22C55E" />
              <Text style={styles.sectionTitle}>Delivery Address</Text>
            </View>
            <View style={styles.addressCard}>
              <Ionicons name="home-outline" size={18} color="#22C55E" />
              <Text style={styles.addressText}>
                {order.delivery_address_snapshot}
              </Text>
            </View>
          </View>
        )}

        {/* Payment Info */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={18} color="#22C55E" />
            <Text style={styles.sectionTitle}>Payment Information</Text>
          </View>
          <View style={styles.paymentCard}>
            <View style={styles.paymentMethodRow}>
              <View style={styles.paymentMethodIcon}>
                <Ionicons
                  name={order.payment_mode === "cod" ? "cash-outline" : "card-outline"}
                  size={18}
                  color="#22C55E"
                />
              </View>
              <View style={styles.paymentMethodContent}>
                <Text style={styles.paymentMethodLabel}>Payment Method</Text>
                <Text style={styles.paymentMethodValue}>
                  {order.payment_mode === "cod"
                    ? "Cash on Delivery"
                    : "Online Payment"}
                </Text>
              </View>
            </View>
            <View style={styles.paymentStatusRow}>
              <Text style={styles.paymentStatusLabel}>Payment Status</Text>
              <StatusBadge
                status={
                  order.payment_status === "paid" ||
                  order.payment_status === "captured"
                    ? "delivered"
                    : order.payment_status === "pending"
                    ? "placed"
                    : "cancelled"
                }
                size="small"
              />
            </View>
          </View>
        </View>

        {/* Delivery OTP */}
        {order.delivery_otp && (
          <View style={[styles.card, styles.otpCard]}>
            <Ionicons name="key-outline" size={16} color="#22C55E" />
            <View style={styles.otpContent}>
              <Text style={styles.otpLabel}>Delivery OTP</Text>
              <Text style={styles.otpValue}>{order.delivery_otp}</Text>
              <Text style={styles.otpNote}>
                Share this OTP with the delivery partner
              </Text>
            </View>
          </View>
        )}

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>You May Also Like</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedProductsScroll}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              decelerationRate="fast"
              snapToInterval={RELATED_PRODUCT_WIDTH + 8}
              snapToAlignment="start"
              bounces={false}
              alwaysBounceHorizontal={false}
              directionalLockEnabled={true}
            >
              {relatedProducts.map((product) => (
                <View key={product.id} style={styles.relatedProductWrapper}>
                  <ProductCard
                    product={product}
                    onPress={() => (navigation as any).navigate("ProductDetail", { slug: product.slug })}
                    onAddToCart={() => handleAddToCartFromRelated(product.id)}
                    width={RELATED_PRODUCT_WIDTH}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {order.is_cancellable && order.order_status !== "cancelled" && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => setShowCancelModal(true)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}

          {order.order_status === "delivered" && (
            <TouchableOpacity
              style={[styles.actionButton, styles.reorderButton]}
              onPress={handleReorder}
            >
              <Ionicons name="repeat-outline" size={16} color="#22C55E" />
              <Text style={styles.reorderButtonText}>Reorder</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Cancel Order Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Order</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for cancellation (minimum 10 characters)
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter cancellation reason..."
              multiline
              numberOfLines={4}
              value={cancelReason}
              onChangeText={setCancelReason}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCancelOrder}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Variant Selection Modal */}
      {showRelatedProductVariantModal && selectedRelatedProductForVariant && (
        <SellUnitSelectionModal
          visible={showRelatedProductVariantModal}
          product={selectedRelatedProductForVariant}
          onClose={() => {
            setShowRelatedProductVariantModal(false);
            setSelectedRelatedProductForVariant(null);
          }}
          onSelect={handleRelatedProductVariantSelect}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  statusBanner: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#22C55E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBannerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  statusBannerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  orderInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  orderInfoRowLast: {
    borderBottomWidth: 0,
  },
  orderInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  orderInfoContent: {
    flex: 1,
  },
  orderInfoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  orderInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  discountValue: {
    color: "#22C55E",
    fontWeight: "700",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#22C55E",
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    fontWeight: "500",
  },
  paymentCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  paymentMethodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  paymentMethodIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethodContent: {
    flex: 1,
  },
  paymentMethodLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  paymentMethodValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  paymentStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentStatusLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  otpCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#D1FAE5",
    borderColor: "#22C55E",
    borderWidth: 2,
    padding: 18,
  },
  otpContent: {
    flex: 1,
  },
  otpLabel: {
    fontSize: 13,
    color: "#059669",
    marginBottom: 6,
    fontWeight: "600",
  },
  otpValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#22C55E",
    letterSpacing: 6,
    marginBottom: 6,
  },
  otpNote: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "500",
  },
  returnInfoContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  returnRequestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D1FAE5",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  returnRequestText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
  },
  returnButton: {
    backgroundColor: "#22C55E",
    borderRadius: 8,
  },
  returnButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  returnWindowExpired: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 8,
  },
  returnWindowExpiredText: {
    fontSize: 13,
    color: "#6B7280",
  },
  returnWindowText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 6,
  },
  actionsContainer: {
    padding: 16,
    gap: 10,
    paddingBottom: 24,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#DC2626",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
  },
  reorderButton: {
    backgroundColor: "#22C55E",
    borderWidth: 0,
  },
  reorderButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelModalButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelModalButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  confirmButton: {
    backgroundColor: "#DC2626",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  relatedProductsScroll: {
    paddingRight: 16,
  },
  relatedProductWrapper: {
    marginRight: 8,
  },
  itemSeparator: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
});

