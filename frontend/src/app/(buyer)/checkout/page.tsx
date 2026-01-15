"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  CreditCard,
  Wallet,
  Check,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { Button, Card } from "@/components/ui";
import { RazorpayScript, isRazorpayLoaded, getRazorpay } from "@/components/payment/RazorpayScript";
import { useAppSelector } from "@/store/hooks";
import {
  selectCartItems,
  selectCartTotal,
  selectCartItemCount,
} from "@/store/slices/cartSlice";
import {
  useGetAddressesQuery,
  useCreateAddressMutation,
  useSetDefaultAddressMutation,
  type Address,
  type AddressCreate,
} from "@/store/api/addressApi";
import { useCreateOrderMutation } from "@/store/api/orderApi";
import {
  useCreatePaymentOrderMutation,
  useVerifyPaymentMutation,
} from "@/store/api/paymentApi";
import {
  useAddToCartMutation,
  useGetCartQuery,
} from "@/store/api/cartApi";
import { selectIsAuthenticated, selectUser } from "@/store/slices/authSlice";
import { formatPrice, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";

/**
 * Address Selection Component
 */
function AddressSelection({
  selectedAddress,
  onSelect,
  onAddNew,
}: {
  selectedAddress: string | null;
  onSelect: (addressId: string) => void;
  onAddNew: () => void;
}) {
  const { data: addressesData, isLoading } = useGetAddressesQuery();
  const [setDefault] = useSetDefaultAddressMutation();

  const addresses = addressesData?.items || [];

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefault(addressId).unwrap();
      toast.success("Default address updated");
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to set default address");
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (addresses.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No delivery addresses found</p>
          <Button onClick={onAddNew} leftIcon={<Plus className="h-4 w-4" />}>
            Add Delivery Address
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.map((address) => (
        <motion.div
          key={address.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "relative border-2 rounded-lg p-4 cursor-pointer transition-all",
            selectedAddress === address.id
              ? "border-primary bg-primary/5"
              : "border-gray-200 hover:border-gray-300"
          )}
          onClick={() => onSelect(address.id)}
        >
          {selectedAddress === address.id && (
            <div className="absolute top-3 right-3">
              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{address.label}</h3>
                {address.is_default && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                    Default
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-1">
                {address.recipient_name} • {address.recipient_phone}
              </p>

              <p className="text-sm text-gray-700">
                {address.address_line_1}
                {address.address_line_2 && `, ${address.address_line_2}`}
                {address.landmark && `, Near ${address.landmark}`}
                <br />
                {address.city}, {address.state} - {address.pincode}
              </p>
            </div>
          </div>

          {!address.is_default && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetDefault(address.id);
                }}
                className="text-xs text-primary hover:underline"
              >
                Set as default
              </button>
            </div>
          )}
        </motion.div>
      ))}

      <Button
        variant="outline"
        fullWidth
        onClick={onAddNew}
        leftIcon={<Plus className="h-4 w-4" />}
      >
        Add New Address
      </Button>
    </div>
  );
}

/**
 * Address Form Component
 */
function AddressForm({
  onSave,
  onCancel,
  initialData,
}: {
  onSave: (data: AddressCreate) => void;
  onCancel: () => void;
  initialData?: Address;
}) {
  const [formData, setFormData] = useState<AddressCreate>({
    label: initialData?.label || "Home",
    recipient_name: initialData?.recipient_name || "",
    recipient_phone: initialData?.recipient_phone || "",
    address_line_1: initialData?.address_line_1 || "",
    address_line_2: initialData?.address_line_2 || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    pincode: initialData?.pincode || "",
    landmark: initialData?.landmark || "",
    is_default: initialData?.is_default || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {initialData ? "Edit Address" : "Add New Address"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Label <span className="text-error">*</span>
            </label>
            <select
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            >
              <option value="Home">Home</option>
              <option value="Work">Work</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Recipient Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.recipient_name}
              onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone <span className="text-error">*</span>
            </label>
            <input
              type="tel"
              value={formData.recipient_phone}
              onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
              pattern="[0-9]{10}"
              maxLength={10}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Address Line 1 <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.address_line_1}
              onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Address Line 2
            </label>
            <input
              type="text"
              value={formData.address_line_2 || ""}
              onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              City <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              State <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Pincode <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
              pattern="[0-9]{6}"
              maxLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Landmark
            </label>
            <input
              type="text"
              value={formData.landmark || ""}
              onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_default"
            checked={formData.is_default}
            onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="is_default" className="text-sm text-gray-700">
            Set as default address
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1">
            Save Address
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * Payment Mode Selection
 */
function PaymentModeSelection({
  selectedMode,
  onSelect,
}: {
  selectedMode: "online" | "cod" | null;
  onSelect: (mode: "online" | "cod") => void;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>

      <div className="space-y-3">
        <button
          onClick={() => onSelect("online")}
          className={cn(
            "w-full p-4 rounded-lg border-2 text-left transition-all",
            selectedMode === "online"
              ? "border-primary bg-primary/5"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                selectedMode === "online" ? "border-primary bg-primary" : "border-gray-300"
              )}
            >
              {selectedMode === "online" && (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
            </div>
            <CreditCard className="h-5 w-5 text-gray-600" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Online Payment</p>
              <p className="text-sm text-gray-600">Pay securely with Razorpay</p>
            </div>
            {selectedMode === "online" && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </div>
        </button>

        <button
          onClick={() => onSelect("cod")}
          className={cn(
            "w-full p-4 rounded-lg border-2 text-left transition-all",
            selectedMode === "cod"
              ? "border-primary bg-primary/5"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                selectedMode === "cod" ? "border-primary bg-primary" : "border-gray-300"
              )}
            >
              {selectedMode === "cod" && (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
            </div>
            <Wallet className="h-5 w-5 text-gray-600" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Cash on Delivery (COD)</p>
              <p className="text-sm text-gray-600">Pay when you receive</p>
            </div>
            {selectedMode === "cod" && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </div>
        </button>
      </div>
    </Card>
  );
}

/**
 * Order Summary Component
 */
function OrderSummary({
  items,
  subtotal,
  deliveryFee,
  total,
}: {
  items: any[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}) {
  return (
    <Card className="sticky top-24">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {items.map((item) => {
          const primaryImage =
            item.product.images?.find((img: any) => img.is_primary) ||
            item.product.images?.[0];
          const itemTotal = item.sellUnit.price * item.quantity;

          return (
            <div key={`${item.product.id}-${item.sellUnit.id}`} className="flex gap-3">
              <div className="w-12 h-12 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                {primaryImage ? (
                  <img
                    src={primaryImage.url}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.product.name}
                </p>
                <p className="text-xs text-gray-600">
                  {item.sellUnit.label} × {item.quantity}
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {formatPrice(itemTotal)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Delivery Fee</span>
          <span className={deliveryFee === 0 ? "text-success" : "text-gray-900"}>
            {deliveryFee === 0 ? "FREE" : formatPrice(deliveryFee)}
          </span>
        </div>
        <div className="flex justify-between pt-3 border-t border-gray-200">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="text-xl font-bold text-gray-900">{formatPrice(total)}</span>
        </div>
      </div>
    </Card>
  );
}

/**
 * Checkout Page
 */
export default function CheckoutPage() {
  const router = useRouter();
  const cartItems = useAppSelector(selectCartItems);
  const cartTotal = useAppSelector(selectCartTotal);
  const itemCount = useAppSelector(selectCartItemCount);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"online" | "cod" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncingCart, setIsSyncingCart] = useState(false);

  const { data: addressesData } = useGetAddressesQuery();
  const [createAddress] = useCreateAddressMutation();
  const [createOrder] = useCreateOrderMutation();
  const [createPaymentOrder] = useCreatePaymentOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [addToCart] = useAddToCartMutation();
  const user = useAppSelector(selectUser);
  const { refetch: refetchBackendCart } = useGetCartQuery(undefined, {
    skip: !isAuthenticated || user?.role === "delivery_partner", // Skip for delivery partners
  });

  // Set default address on load
  useEffect(() => {
    if (addressesData?.items && !selectedAddress) {
      const defaultAddress = addressesData.items.find((addr) => addr.is_default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress.id);
      } else if (addressesData.items.length > 0) {
        setSelectedAddress(addressesData.items[0].id);
      }
    }
  }, [addressesData, selectedAddress]);

  // Calculate totals
  const deliveryFee = cartTotal >= 500 ? 0 : 40; // Free delivery over ₹500
  const total = cartTotal + deliveryFee;

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      router.push(ROUTES.CART);
    }
  }, [cartItems.length, router]);

  const handleSaveAddress = async (data: AddressCreate) => {
    try {
      const address = await createAddress(data).unwrap();
      setSelectedAddress(address.id);
      setShowAddressForm(false);
      toast.success("Address saved successfully");
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to save address");
    }
  };

  // Sync Redux cart to backend cart if authenticated
  const syncCartToBackend = async () => {
    if (!isAuthenticated || cartItems.length === 0) {
      return;
    }

    setIsSyncingCart(true);
    try {
      // Get backend cart to see what's already there
      await refetchBackendCart();
      
      // Add each item from Redux cart to backend cart
      for (const item of cartItems) {
        try {
          await addToCart({
            product_id: item.productId,
            sell_unit_id: item.sellUnitId,
            quantity: item.quantity,
          }).unwrap();
        } catch (error: any) {
          // If item already exists, that's okay - backend will update quantity
          if (!error?.data?.detail?.includes("already")) {
            console.warn(`Failed to sync cart item ${item.productId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Failed to sync cart to backend:", error);
    } finally {
      setIsSyncingCart(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }

    if (!paymentMode) {
      toast.error("Please select a payment method");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty. Please add items to cart first.");
      router.push(ROUTES.CART);
      return;
    }

    setIsProcessing(true);

    try {
      // Sync Redux cart to backend before placing order (if authenticated)
      if (isAuthenticated) {
        await syncCartToBackend();
        // Wait a bit for backend to process
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Create order
      const order = await createOrder({
        delivery_address_id: selectedAddress,
        payment_mode: paymentMode,
      }).unwrap();

      // If COD, redirect to success page
      if (paymentMode === "cod") {
        router.push(`${ROUTES.ORDER_DETAIL(order.id)}?success=true&mode=cod`);
        return;
      }

      // For online payment, create Razorpay order
      if (paymentMode === "online") {
        let razorpayOrderId = order.razorpay_order_id;
        let keyId = "";

        // If Razorpay order not created by backend, create it
        if (!razorpayOrderId) {
          const paymentOrder = await createPaymentOrder({
            order_id: order.id,
            amount: order.total_amount,
            currency: "INR",
          }).unwrap();

          razorpayOrderId = paymentOrder.razorpay_order_id;
          keyId = paymentOrder.key_id;
        }

        await handleRazorpayPayment(
          razorpayOrderId!,
          order.id,
          order.total_amount,
          keyId
        );
      }
    } catch (error: any) {
      console.error("Order creation error:", error);
      const errorMessage = error?.data?.detail || error?.data?.message || "Failed to place order";
      toast.error(errorMessage);
      
      // If cart is empty error, redirect to cart
      if (errorMessage.toLowerCase().includes("cart is empty")) {
        router.push(ROUTES.CART);
      }
      
      setIsProcessing(false);
    }
  };

  const handleRazorpayPayment = async (
    razorpayOrderId: string,
    orderId: string,
    amount: number,
    keyId?: string
  ) => {
    // Wait for Razorpay to load
    let retries = 0;
    while (!isRazorpayLoaded() && retries < 10) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      retries++;
    }

    if (!isRazorpayLoaded()) {
      toast.error("Payment gateway is loading. Please try again.");
      setIsProcessing(false);
      return;
    }

    const Razorpay = getRazorpay();
    if (!Razorpay) {
      toast.error("Payment gateway not available");
      setIsProcessing(false);
      return;
    }

    // Get key_id from parameter or environment
    const razorpayKeyId = keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

    if (!razorpayKeyId) {
      toast.error("Payment gateway not configured");
      setIsProcessing(false);
      return;
    }

    const options = {
      key: razorpayKeyId,
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      name: "Banda E-Commerce",
      description: `Order #${orderId}`,
      order_id: razorpayOrderId,
      handler: async function (response: any) {
        try {
          // Verify payment
          await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }).unwrap();

          // Redirect to success page
          router.push(`${ROUTES.ORDER_DETAIL(orderId)}?success=true&mode=online`);
        } catch (error: any) {
          console.error("Payment verification error:", error);
          toast.error(error?.data?.detail || "Payment verification failed");
          router.push(`${ROUTES.ORDER_DETAIL(orderId)}?error=verification_failed`);
        } finally {
          setIsProcessing(false);
        }
      },
      prefill: {
        name: addressesData?.items.find((a) => a.id === selectedAddress)?.recipient_name || "",
        contact:
          addressesData?.items.find((a) => a.id === selectedAddress)?.recipient_phone || "",
        email: "", // You can get this from user profile
      },
      theme: {
        color: "#10b981", // Primary color
      },
      modal: {
        ondismiss: function () {
          setIsProcessing(false);
          toast.error("Payment cancelled");
        },
      },
    };

    const razorpay = new Razorpay(options);
    razorpay.open();
  };

  if (cartItems.length === 0) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RazorpayScript />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container-app py-4">
          <div className="flex items-center gap-4">
            <Link href={ROUTES.CART}>
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back to Cart
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
          </div>
        </div>
      </div>

      <div className="container-app py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Address Selection */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Address</h2>
              {showAddressForm ? (
                <AddressForm
                  onSave={handleSaveAddress}
                  onCancel={() => setShowAddressForm(false)}
                />
              ) : (
                <AddressSelection
                  selectedAddress={selectedAddress}
                  onSelect={setSelectedAddress}
                  onAddNew={() => setShowAddressForm(true)}
                />
              )}
            </div>

            {/* Payment Mode Selection */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
              <PaymentModeSelection
                selectedMode={paymentMode}
                onSelect={setPaymentMode}
              />
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <OrderSummary
              items={cartItems}
              subtotal={cartTotal}
              deliveryFee={deliveryFee}
              total={total}
            />

            {/* Place Order Button */}
            <div className="mt-4">
              <Button
                fullWidth
                size="lg"
                onClick={handlePlaceOrder}
                isLoading={isProcessing}
                disabled={!selectedAddress || !paymentMode || isProcessing || isSyncingCart}
              >
                {isSyncingCart
                  ? "Syncing cart..."
                  : isProcessing
                  ? "Processing..."
                  : `Place Order • ${formatPrice(total)}`}
              </Button>

              {(!selectedAddress || !paymentMode) && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  {!selectedAddress && "Please select a delivery address"}
                  {!selectedAddress && !paymentMode && " and "}
                  {!paymentMode && "select a payment method"}
                </p>
              )}
            </div>

            {/* Security Info */}
            <p className="text-xs text-gray-400 text-center mt-4">
              🔒 Secure payment. Your data is protected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

