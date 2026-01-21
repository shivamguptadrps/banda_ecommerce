import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector } from "@/store/hooks";
import { useGetCartQuery } from "@/store/api/cartApi";
import {
  useGetAddressesQuery,
  useSetDefaultAddressMutation,
} from "@/store/api/addressApi";
import { useCreateOrderMutation } from "@/store/api/orderApi";
import {
  useCreatePaymentOrderMutation,
  useVerifyPaymentMutation,
} from "@/store/api/paymentApi";
import {
  useApplyCouponMutation,
  useRemoveCouponMutation,
} from "@/store/api/cartApi";
import { Address } from "@/types/address";
import { OrderCreate } from "@/types/order";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
// Temporarily disable Razorpay for build compatibility
// import RazorpayCheckout from "react-native-razorpay";
let RazorpayCheckout: any = null;
try {
  RazorpayCheckout = require("react-native-razorpay").default;
} catch (e) {
  // Razorpay not available
  console.warn("Razorpay not available:", e);
}

type CheckoutStep = "address" | "payment" | "review";

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  // Only fetch cart for buyers, skip for delivery partners and other roles
  const isBuyer = user?.role === "buyer" || (!user?.role && isAuthenticated);
  const { data: cart, isLoading: isLoadingCart, refetch: refetchCart } = useGetCartQuery(undefined, {
    skip: !isBuyer, // Skip cart query for delivery partners and other non-buyer roles
  });
  const { data: addressesData, isLoading: isLoadingAddresses } = useGetAddressesQuery(undefined, {
    skip: !isBuyer, // Skip addresses query for delivery partners
  });
  const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation();
  const [setDefaultAddress] = useSetDefaultAddressMutation();
  const [createPaymentOrder] = useCreatePaymentOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [applyCoupon, { isLoading: isApplyingCoupon }] = useApplyCouponMutation();
  const [removeCoupon] = useRemoveCouponMutation();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>("address");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Set default address if available
  React.useEffect(() => {
    if (addressesData?.items) {
      const defaultAddress = addressesData.items.find((addr) => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else if (addressesData.items.length > 0) {
        setSelectedAddressId(addressesData.items[0].id);
      }
    }
  }, [addressesData]);

  // Refetch cart when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetchCart();
    }, [refetchCart])
  );

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setCouponError(null);

    try {
      const result = await applyCoupon({ coupon_code: couponCode.trim().toUpperCase() }).unwrap();
      
      // Log the response for debugging
      if (__DEV__) {
        console.log("Apply coupon response:", result);
      }
      
      // Small delay to ensure backend has processed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Explicitly refetch cart to ensure we have the latest discount_amount
      await refetchCart();
      
      setCouponCode("");
      setShowCouponInput(false);
      setCouponError(null);
    } catch (err: any) {
      console.error("Apply coupon error:", err);
      const errorMessage = err?.data?.detail || err?.data?.message || "Invalid coupon code. Please check and try again.";
      setCouponError(errorMessage);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await removeCoupon().unwrap();
      // Explicitly refetch cart to ensure discount is removed
      await refetchCart();
      Alert.alert("Success", "Coupon removed successfully");
    } catch (err: any) {
      console.error("Remove coupon error:", err);
      Alert.alert("Error", err?.data?.detail || "Failed to remove coupon");
    }
  };

  if (isLoadingCart || isLoadingAddresses) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.container}>
          <Spinner />
        </View>
      </>
    );
  }

  // Validate cart has items
  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.container}>
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Button
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              Go Back to Cart
            </Button>
          </View>
        </View>
      </>
    );
  }

  const selectedAddress = addressesData?.items.find(
    (addr) => addr.id === selectedAddressId
  );

  // Safely convert all values to numbers
  const subtotal = typeof cart.subtotal === 'number' 
    ? cart.subtotal 
    : parseFloat(String(cart.subtotal || 0)) || 0;
  const deliveryFee = typeof cart.delivery_fee === 'number' 
    ? cart.delivery_fee 
    : parseFloat(String(cart.delivery_fee || 0)) || 0;
  
  // Check discount_amount first (from API), then fallback to discount
  let discount = 0;
  if (cart.discount_amount !== undefined && cart.discount_amount !== null) {
    discount = typeof cart.discount_amount === 'number'
      ? cart.discount_amount
      : parseFloat(String(cart.discount_amount)) || 0;
  } else if (cart.discount !== undefined && cart.discount !== null) {
    discount = typeof cart.discount === 'number'
      ? cart.discount
      : parseFloat(String(cart.discount)) || 0;
  }
  
  const total = subtotal + deliveryFee - discount;
  
  // Debug logging
  if (__DEV__) {
    console.log("Cart data:", {
      subtotal,
      deliveryFee,
      discount,
      total,
      discount_amount: cart.discount_amount,
      discount: cart.discount,
      coupon_code: cart.coupon_code,
    });
  }

  const handleNext = () => {
    if (currentStep === "address") {
      if (!selectedAddressId) {
        Alert.alert("Error", "Please select a delivery address");
        return;
      }
      setCurrentStep("payment");
    } else if (currentStep === "payment") {
      setCurrentStep("review");
    }
  };

  const handleBack = () => {
    if (currentStep === "payment") {
      setCurrentStep("address");
    } else if (currentStep === "review") {
      setCurrentStep("payment");
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      Alert.alert("Error", "Please select a delivery address");
      return;
    }

    try {
      const { data: latestCart } = await refetchCart();
      
      if (!latestCart || !latestCart.items || latestCart.items.length === 0) {
        Alert.alert(
          "Cart Empty",
          "Your cart is empty. Please add items to your cart before placing an order.",
          [
            {
              text: "Go to Cart",
              onPress: () => {
                (navigation as any).navigate("MainTabs", { screen: "Cart" });
              },
            },
            { text: "OK" },
          ]
        );
        return;
      }

      const orderData: OrderCreate = {
        delivery_address_id: selectedAddressId,
        payment_mode: paymentMethod,
        notes: "",
      };

      const order = await createOrder(orderData).unwrap();
      
      if (paymentMethod === "online") {
        await handleRazorpayPayment(order.id, order.total_amount, order.order_number);
      } else {
        setOrderNumber(order.order_number);
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      const errorMessage =
        error?.data?.detail || error?.message || "Failed to create order. Please try again.";
      
      if (error?.data?.detail === "Cart is empty" || errorMessage.includes("Cart is empty")) {
        Alert.alert(
          "Cart Empty",
          "Your cart appears to be empty on the server. Please add items to your cart and try again.",
          [
            {
              text: "Go to Cart",
              onPress: () => {
                (navigation as any).navigate("MainTabs", { screen: "Cart" });
              },
            },
            { text: "OK" },
          ]
        );
      } else {
        Alert.alert("Error", errorMessage);
      }
    }
  };

  const handleRazorpayPayment = async (
    orderId: string,
    amount: number,
    orderNumber: string
  ) => {
    // Check if Razorpay is available
    if (!RazorpayCheckout) {
      Alert.alert(
        "Online Payment Unavailable",
        "Online payment is currently unavailable. Please use Cash on Delivery (COD) for now.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const paymentOrder = await createPaymentOrder({
        order_id: orderId,
        amount: amount,
        currency: "INR",
      }).unwrap();

      const selectedAddress = addressesData?.items.find(
        (addr) => addr.id === selectedAddressId
      );

      const options = {
        description: `Order #${orderNumber}`,
        image: "https://your-logo-url.com/logo.png",
        currency: "INR",
        key: paymentOrder.key_id,
        amount: Math.round(amount * 100),
        name: "Banda Baazar",
        order_id: paymentOrder.razorpay_order_id,
        prefill: {
          email: "",
          contact: selectedAddress?.recipient_phone || "",
          name: selectedAddress?.recipient_name || "",
        },
        theme: { color: "#22C55E" },
      };
      
      RazorpayCheckout.open(options)
        .then(async (data: any) => {
          try {
            await verifyPayment({
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature,
            }).unwrap();

            setOrderNumber(orderNumber);
            setShowSuccessModal(true);
          } catch (verifyError: any) {
            Alert.alert(
              "Payment Verification Failed",
              verifyError?.data?.detail || "Payment was successful but verification failed. Please contact support.",
              [
                {
                  text: "View Order",
                  onPress: () => {
                    (navigation as any).navigate("OrderDetail", { orderId });
                  },
                },
                { text: "OK" },
              ]
            );
          }
        })
        .catch((error: any) => {
          if (error.code === "PAYMENT_CANCELLED") {
            Alert.alert(
              "Payment Cancelled",
              "Your payment was cancelled. The order has been created but not confirmed.",
              [
                {
                  text: "View Order",
                  onPress: () => {
                    (navigation as any).navigate("OrderDetail", { orderId });
                  },
                },
                { text: "OK" },
              ]
            );
          } else {
            Alert.alert(
              "Payment Failed",
              error?.description || "Payment failed. Please try again.",
              [
                {
                  text: "Retry Payment",
                  onPress: () => handleRazorpayPayment(orderId, amount, orderNumber),
                },
                {
                  text: "View Order",
                  onPress: () => {
                    (navigation as any).navigate("OrderDetail", { orderId });
                  },
                },
                { text: "Cancel" },
              ]
            );
          }
        });
    } catch (error: any) {
      Alert.alert(
        "Payment Error",
        error?.data?.detail || "Failed to initialize payment. Please try again.",
        [
          {
            text: "Retry",
            onPress: () => handleRazorpayPayment(orderId, amount, orderNumber),
          },
          {
            text: "View Order",
            onPress: () => {
              (navigation as any).navigate("OrderDetail", { orderId });
            },
          },
          { text: "Cancel" },
        ]
      );
    }
  };

  const renderAddressStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Delivery Address</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddressForm" as never, { addressId: undefined } as never)}
        >
          <Ionicons name="add-circle-outline" size={14} color="#22C55E" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {addressesData && addressesData.items.length > 0 ? (
        <ScrollView style={styles.addressList} showsVerticalScrollIndicator={false}>
          {addressesData.items.map((address: Address) => (
            <TouchableOpacity
              key={address.id}
              style={[
                styles.addressCard,
                selectedAddressId === address.id && styles.addressCardSelected,
              ]}
              onPress={() => setSelectedAddressId(address.id)}
            >
              <View style={styles.addressHeader}>
                <View style={styles.addressTitleRow}>
                  <Text style={styles.addressLabel}>{address.label}</Text>
                  {address.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                {selectedAddressId === address.id && (
                  <View style={styles.selectedCheckmark}>
                    <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                  </View>
                )}
              </View>
              <Text style={styles.recipientName}>{address.recipient_name}</Text>
              <Text style={styles.recipientPhone}>{address.recipient_phone}</Text>
              <Text style={styles.addressText}>
                {address.address_line_1}
                {address.address_line_2 && `, ${address.address_line_2}`}
              </Text>
              <Text style={styles.addressText}>
                {address.city}, {address.state} - {address.pincode}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyAddressContainer}>
          <Ionicons name="location-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyAddressText}>No addresses found</Text>
          <Button
            onPress={() => navigation.navigate("AddressForm" as never, { addressId: undefined } as never)}
            style={styles.addFirstAddressButton}
          >
            Add Address
          </Button>
        </View>
      )}
    </View>
  );

  const renderPaymentStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Payment Method</Text>
      <View style={styles.paymentOptions}>
        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === "cod" && styles.paymentOptionSelected,
          ]}
          onPress={() => setPaymentMethod("cod")}
        >
          <View style={styles.paymentOptionContent}>
            <View style={[styles.paymentIconContainer, paymentMethod === "cod" && styles.paymentIconContainerActive]}>
              <Ionicons
                name="cash-outline"
                size={16}
                color={paymentMethod === "cod" ? "#22C55E" : "#6B7280"}
              />
            </View>
            <View style={styles.paymentOptionText}>
              <Text style={styles.paymentOptionTitle}>Cash on Delivery</Text>
              <Text style={styles.paymentOptionSubtitle}>Pay when you receive</Text>
            </View>
          </View>
          {paymentMethod === "cod" && (
            <View style={styles.selectedCheckmark}>
              <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            </View>
          )}
        </TouchableOpacity>

        {/* Online payment temporarily disabled for build compatibility */}
        {/* <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === "online" && styles.paymentOptionSelected,
          ]}
          onPress={() => setPaymentMethod("online")}
        >
          <View style={styles.paymentOptionContent}>
            <View style={[styles.paymentIconContainer, paymentMethod === "online" && styles.paymentIconContainerActive]}>
              <Ionicons
                name="card-outline"
                size={16}
                color={paymentMethod === "online" ? "#22C55E" : "#6B7280"}
              />
            </View>
            <View style={styles.paymentOptionText}>
              <Text style={styles.paymentOptionTitle}>Online Payment</Text>
              <Text style={styles.paymentOptionSubtitle}>Pay securely with Razorpay</Text>
            </View>
          </View>
          {paymentMethod === "online" && (
            <View style={styles.selectedCheckmark}>
              <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            </View>
          )}
        </TouchableOpacity> */}
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Review Your Order</Text>

      {/* Selected Address */}
      {selectedAddress && (
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Delivery Address</Text>
          <View style={styles.reviewCard}>
            <View style={styles.reviewCardHeader}>
              <Text style={styles.reviewLabel}>{selectedAddress.label}</Text>
              {selectedAddress.is_default && (
                <View style={styles.defaultBadgeSmall}>
                  <Text style={styles.defaultBadgeTextSmall}>Default</Text>
                </View>
              )}
            </View>
            <Text style={styles.reviewText}>{selectedAddress.recipient_name}</Text>
            <Text style={styles.reviewText}>{selectedAddress.recipient_phone}</Text>
            <Text style={styles.reviewText}>
              {selectedAddress.address_line_1}
              {selectedAddress.address_line_2 && `, ${selectedAddress.address_line_2}`}
            </Text>
            <Text style={styles.reviewText}>
              {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
            </Text>
          </View>
        </View>
      )}

      {/* Order Items */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Order Items ({cart.items.length})</Text>
        {cart.items.map((item) => {
          const unitPrice = typeof item.sell_unit.price === 'number' 
            ? item.sell_unit.price 
            : parseFloat(String(item.sell_unit.price)) || 0;
          return (
            <View key={item.id} style={styles.reviewItem}>
              <View style={styles.reviewItemContent}>
                <Text style={styles.reviewItemName} numberOfLines={1}>
                  {item.product.name}
                </Text>
                <Text style={styles.reviewItemDetails}>
                  {item.sell_unit.label} × {item.quantity}
                </Text>
              </View>
              <Text style={styles.reviewItemPrice}>
                ₹{(unitPrice * item.quantity).toFixed(0)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Payment Method */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Payment Method</Text>
        <View style={styles.reviewCard}>
          <Text style={styles.reviewText}>
            Cash on Delivery
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Checkout</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Progress Steps */}
        <View style={styles.progressBar}>
          <View style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                currentStep !== "address" && styles.progressDotCompleted,
              ]}
            >
              {currentStep !== "address" && (
                <Ionicons name="checkmark" size={9} color="#FFFFFF" />
              )}
            </View>
            <Text
              style={[
                styles.progressLabel,
                currentStep !== "address" && styles.progressLabelCompleted,
              ]}
            >
              Address
            </Text>
          </View>
          <View style={[styles.progressLine, currentStep !== "address" && styles.progressLineCompleted]} />
          <View style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                (currentStep === "payment" || currentStep === "review") && styles.progressDotCompleted,
                currentStep === "payment" && styles.progressDotActive,
              ]}
            >
              {(currentStep === "payment" || currentStep === "review") && (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              )}
            </View>
            <Text
              style={[
                styles.progressLabel,
                (currentStep === "payment" || currentStep === "review") && styles.progressLabelCompleted,
                currentStep === "payment" && styles.progressLabelActive,
              ]}
            >
              Payment
            </Text>
          </View>
          <View style={[styles.progressLine, currentStep === "review" && styles.progressLineCompleted]} />
          <View style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                currentStep === "review" && styles.progressDotActive,
              ]}
            />
            <Text
              style={[
                styles.progressLabel,
                currentStep === "review" && styles.progressLabelActive,
              ]}
            >
              Review
            </Text>
          </View>
        </View>

        {/* Step Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {currentStep === "address" && renderAddressStep()}
          {currentStep === "payment" && renderPaymentStep()}
          {currentStep === "review" && renderReviewStep()}
        </ScrollView>

        {/* Footer with Summary and Actions */}
        <View style={styles.footer}>
          {/* Coupon Section */}
          <View style={styles.couponSection}>
            {cart.coupon_code ? (
              <View style={styles.appliedCoupon}>
                <View style={styles.couponInfo}>
                  <Ionicons name="ticket" size={14} color="#22C55E" />
                  <View style={styles.couponTextContainer}>
                    <Text style={styles.couponCode}>{cart.coupon_code}</Text>
                    <Text style={styles.couponDiscount}>
                      ₹{discount.toFixed(0)} discount applied
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleRemoveCoupon}
                  style={styles.removeCouponButton}
                >
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {showCouponInput ? (
                  <View style={styles.couponInputContainer}>
                    <TextInput
                      style={styles.couponInput}
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChangeText={(text) => {
                        setCouponCode(text);
                        setCouponError(null);
                      }}
                      autoCapitalize="characters"
                      placeholderTextColor="#9CA3AF"
                    />
                    {couponError && (
                      <View style={styles.couponErrorContainer}>
                        <Ionicons name="alert-circle" size={12} color="#EF4444" />
                        <Text style={styles.couponErrorText}>{couponError}</Text>
                      </View>
                    )}
                    <View style={styles.couponActions}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowCouponInput(false);
                          setCouponCode("");
                          setCouponError(null);
                        }}
                        style={styles.couponCancelButton}
                      >
                        <Text style={styles.couponCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleApplyCoupon}
                        style={[styles.couponApplyButton, (isApplyingCoupon || !couponCode.trim()) && styles.couponApplyButtonDisabled]}
                        disabled={isApplyingCoupon || !couponCode.trim()}
                      >
                        {isApplyingCoupon ? (
                          <Spinner size="small" />
                        ) : (
                          <Text style={styles.couponApplyText}>Apply</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addCouponButton}
                    onPress={() => setShowCouponInput(true)}
                  >
                    <Ionicons name="ticket-outline" size={14} color="#22C55E" />
                    <Text style={styles.addCouponText}>Have a coupon code?</Text>
                    <Ionicons name="chevron-forward" size={14} color="#22C55E" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{subtotal.toFixed(0)}</Text>
            </View>
            {deliveryFee > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>₹{deliveryFee.toFixed(0)}</Text>
              </View>
            )}
            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, styles.discount]}>
                  -₹{discount.toFixed(0)}
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{total.toFixed(0)}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            {currentStep !== "address" && (
              <TouchableOpacity
                onPress={handleBack}
                style={[styles.actionButton, styles.backButtonStyle]}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={14} color="#22C55E" style={styles.backButtonIcon} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            {currentStep !== "review" ? (
              <TouchableOpacity
                onPress={handleNext}
                style={[styles.actionButton, styles.nextButton]}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={styles.nextButtonIcon} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handlePlaceOrder}
                style={[styles.actionButton, styles.placeOrderButton]}
                disabled={isCreatingOrder}
                activeOpacity={0.8}
              >
                {isCreatingOrder ? (
                  <Text style={styles.placeOrderButtonText}>Placing Order...</Text>
                ) : (
                  <>
                    <Text style={styles.placeOrderButtonText}>Place Order</Text>
                    <Text style={styles.placeOrderButtonPrice}>₹{total.toFixed(0)}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
            </View>
            <Text style={styles.successTitle}>Thank You!</Text>
            <Text style={styles.successMessage}>
              Order #{orderNumber} placed successfully
            </Text>
            <Text style={styles.successSubtext}>
              We'll notify you once the vendor confirms your order.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowSuccessModal(false);
                (navigation as any).navigate("MainTabs", { screen: "Home" });
              }}
              style={styles.successButton}
              activeOpacity={0.8}
            >
              <Ionicons name="storefront-outline" size={14} color="#22C55E" style={styles.successButtonIcon} />
              <Text style={styles.successButtonText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  placeholder: {
    width: 30,
  },
  progressBar: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  progressStep: {
    alignItems: "center",
    flex: 1,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  progressDotCompleted: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  progressDotActive: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  progressLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  progressLabelCompleted: {
    color: "#22C55E",
    fontWeight: "700",
  },
  progressLabelActive: {
    color: "#22C55E",
    fontWeight: "700",
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 6,
    marginTop: -16,
    borderRadius: 1,
  },
  progressLineCompleted: {
    backgroundColor: "#22C55E",
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 14,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#22C55E",
  },
  addressList: {
    maxHeight: 400,
  },
  addressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addressCardSelected: {
    borderColor: "#22C55E",
    backgroundColor: "#F0FDF4",
    shadowColor: "#22C55E",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addressTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.1,
  },
  defaultBadge: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  selectedCheckmark: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 1,
  },
  defaultBadgeSmall: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultBadgeTextSmall: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  recipientName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 3,
  },
  recipientPhone: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "500",
  },
  addressText: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 2,
  },
  emptyAddressContainer: {
    alignItems: "center",
    padding: 32,
  },
  emptyAddressText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
    marginBottom: 20,
  },
  addFirstAddressButton: {
    minWidth: 180,
  },
  paymentOptions: {
    marginTop: 8,
  },
  paymentOption: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentOptionSelected: {
    borderColor: "#22C55E",
    backgroundColor: "#F0FDF4",
    shadowColor: "#22C55E",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  paymentIconContainerActive: {
    backgroundColor: "#D1FAE5",
  },
  paymentOptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  paymentOptionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  reviewSection: {
    marginBottom: 16,
  },
  reviewSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  reviewText: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 3,
    fontWeight: "500",
  },
  reviewItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  reviewItemContent: {
    flex: 1,
    marginRight: 8,
  },
  reviewItemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  reviewItemDetails: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  reviewItemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  footer: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  couponSection: {
    marginBottom: 12,
  },
  addCouponButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  addCouponText: {
    flex: 1,
    marginLeft: 6,
    fontSize: 11,
    color: "#22C55E",
    fontWeight: "500",
  },
  couponInputContainer: {
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  couponInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: "#111827",
    marginBottom: 6,
    backgroundColor: "#F9FAFB",
  },
  couponActions: {
    flexDirection: "row",
    gap: 6,
  },
  couponCancelButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  couponCancelText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  couponApplyButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "#22C55E",
  },
  couponApplyButtonDisabled: {
    backgroundColor: "#D1D5DB",
    opacity: 0.6,
  },
  couponApplyText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  couponErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  couponErrorText: {
    fontSize: 10,
    color: "#EF4444",
    flex: 1,
  },
  appliedCoupon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#D1FAE5",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  couponInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  couponTextContainer: {
    marginLeft: 6,
    flex: 1,
  },
  couponCode: {
    fontSize: 12,
    fontWeight: "700",
    color: "#22C55E",
    marginBottom: 2,
  },
  couponDiscount: {
    fontSize: 10,
    color: "#6B7280",
  },
  removeCouponButton: {
    padding: 2,
  },
  summary: {
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  discount: {
    color: "#22C55E",
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.1,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  actionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
  },
  nextButton: {
    backgroundColor: "#22C55E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  nextButtonIcon: {
    marginLeft: 4,
  },
  placeOrderButton: {
    backgroundColor: "#22C55E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  placeOrderButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  placeOrderButtonPrice: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  backButtonStyle: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#22C55E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  backButtonIcon: {
    marginRight: 4,
  },
  backButtonText: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  successMessage: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  successSubtext: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
    fontWeight: "500",
  },
  successButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#22C55E",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  successButtonIcon: {
    marginRight: 0,
  },
  successButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#22C55E",
  },
});
