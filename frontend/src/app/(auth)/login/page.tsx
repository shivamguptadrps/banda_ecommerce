"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Truck, Smartphone } from "lucide-react";
import toast from "react-hot-toast";

import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui";
import { useLoginMutation } from "@/store/api/authApi";
import { useLoginMutation as useDeliveryPartnerLoginMutation } from "@/store/api/deliveryPartnerApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { ROUTES } from "@/lib/constants";

/**
 * Login Form Schema
 */
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Login Page with Delivery Partner Login
 */
export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [deliveryPartnerLogin, { isLoading: isDeliveryPartnerLoading }] = useDeliveryPartnerLoginMutation();
  const [showDeliveryPartnerLogin, setShowDeliveryPartnerLogin] = useState(false);
  const [deliveryPartnerPhone, setDeliveryPartnerPhone] = useState("");
  const [deliveryPartnerOTP, setDeliveryPartnerOTP] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data).unwrap();

      // Validate response has required fields
      if (!result.user || !result.access_token || !result.refresh_token) {
        toast.error("Invalid response from server. Please try again.");
        return;
      }

      // Save credentials to Redux store
      dispatch(
        setCredentials({
          user: result.user,
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        })
      );

      toast.success("Welcome back!");

      // Redirect based on role
      const redirectPath =
        result.user.role === "vendor"
          ? ROUTES.VENDOR_DASHBOARD
          : result.user.role === "admin"
          ? ROUTES.ADMIN_DASHBOARD
          : ROUTES.HOME;

      router.push(redirectPath);
    } catch (error: any) {
      const errorMessage = error?.data?.detail || error?.message || "Login failed. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleDeliveryPartnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deliveryPartnerPhone || !deliveryPartnerOTP) {
      toast.error("Please enter phone number and OTP");
      return;
    }

    // Validate phone number
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = deliveryPartnerPhone.replace(/\s|-/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    // Validate OTP
    if (deliveryPartnerOTP.length !== 4 || !/^\d{4}$/.test(deliveryPartnerOTP)) {
      toast.error("OTP must be 4 digits");
      return;
    }

    try {
      const result = await deliveryPartnerLogin({
        phone: cleanPhone,
        otp: deliveryPartnerOTP,
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
      toast.error(error?.data?.detail || "Login failed. Please check your credentials.");
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>
          {showDeliveryPartnerLogin ? "Delivery Partner Login" : "Sign in to your account to continue"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!showDeliveryPartnerLogin ? (
          // Regular Login Form
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register("email")}
            />

            {/* Password */}
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              {...register("password")}
            />

            {/* Forgot Password */}
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>
        ) : (
          // Delivery Partner Login Form
          <form onSubmit={handleDeliveryPartnerLogin} className="space-y-4">
            {/* Phone Number */}
            <div>
              <label
                htmlFor="delivery-phone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Phone Number
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="delivery-phone"
                  type="tel"
                  value={deliveryPartnerPhone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 10) {
                      setDeliveryPartnerPhone(value);
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
                htmlFor="delivery-otp"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                OTP
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="delivery-otp"
                  type="text"
                  value={deliveryPartnerOTP}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 4) {
                      setDeliveryPartnerOTP(value);
                    }
                  }}
                  placeholder="1234"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center text-xl tracking-widest font-mono"
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
              fullWidth
              size="lg"
              isLoading={isDeliveryPartnerLoading}
              leftIcon={<Truck className="h-4 w-4" />}
            >
              {isDeliveryPartnerLoading ? "Logging in..." : "Login as Delivery Partner"}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-center gap-3">
        {!showDeliveryPartnerLogin ? (
          <>
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                href={ROUTES.REGISTER}
                className="font-medium text-primary hover:underline"
              >
                Sign up
              </Link>
            </p>
            
            {/* Delivery Partner Login Section */}
            <div className="w-full border-t border-gray-200 pt-4 mt-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-500 font-medium">OR</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeliveryPartnerLogin(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              >
                <Truck className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-gray-700">Delivery Partner Login</span>
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Login with phone number and OTP
              </p>
            </div>

            {/* Other Login Options */}
            <div className="w-full border-t border-gray-200 pt-3">
              <p className="text-xs text-gray-500 text-center mb-2">Other login options:</p>
              <Link
                href={ROUTES.VENDOR_LOGIN}
                className="text-xs text-center text-gray-600 hover:text-primary transition-colors block"
              >
                Vendor Login →
              </Link>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setShowDeliveryPartnerLogin(false);
                setDeliveryPartnerPhone("");
                setDeliveryPartnerOTP("");
              }}
              className="text-sm text-gray-600 hover:text-primary transition-colors"
            >
              ← Back to regular login
            </button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

