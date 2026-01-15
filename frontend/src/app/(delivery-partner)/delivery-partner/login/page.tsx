"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Loader2, Smartphone, Lock } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { Button, Card } from "@/components/ui";
import { useLoginMutation } from "@/store/api/deliveryPartnerApi";
import { setCredentials } from "@/store/slices/authSlice";
import { useAppDispatch } from "@/store/hooks";
import { ROUTES } from "@/lib/constants";

/**
 * Delivery Partner Login Page
 */
export default function DeliveryPartnerLoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [login, { isLoading }] = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone || !otp) {
      toast.error("Please enter phone number and OTP");
      return;
    }

    // Validate phone number
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.replace(/\s|-/g, ""))) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    // Validate OTP
    if (otp.length !== 4 || !/^\d{4}$/.test(otp)) {
      toast.error("OTP must be 4 digits");
      return;
    }

    try {
      const result = await login({
        phone: phone.replace(/\s|-/g, ""),
        otp,
      }).unwrap();

      // Store tokens and user data
      dispatch(
        setCredentials({
          user: {
            id: result.delivery_partner.id,
            email: `delivery_${result.delivery_partner.phone}@banda.com`,
            name: result.delivery_partner.name,
            phone: result.delivery_partner.phone,
            role: "delivery_partner",
            is_active: result.delivery_partner.is_active,
            created_at: new Date().toISOString(),
          },
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        })
      );

      toast.success("Login successful!");
      router.push(ROUTES.DELIVERY_PARTNER_ORDERS);
    } catch (error: any) {
      toast.error(error.data?.detail || "Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Truck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Delivery Partner Login
            </h1>
            <p className="text-gray-600">
              Enter your phone number and OTP to continue
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Number */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Phone Number
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 10) {
                      setPhone(value);
                    }
                  }}
                  placeholder="9876543210"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  maxLength={10}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                10-digit phone number (starting with 6-9)
              </p>
            </div>

            {/* OTP */}
            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                OTP
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 4) {
                      setOtp(value);
                    }
                  }}
                  placeholder="1234"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center text-2xl tracking-widest font-mono"
                  required
                  maxLength={4}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Use OTP: <span className="font-mono font-semibold">1234</span> for testing
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
              leftIcon={
                isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Truck className="h-5 w-5" />
                )
              }
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> For testing, use OTP <code className="font-mono bg-blue-100 px-1 rounded">1234</code>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

