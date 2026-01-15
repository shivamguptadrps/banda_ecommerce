"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Store,
  MapPin,
  Phone,
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react";

import { Button, Input, Card } from "@/components/ui";
import { useRegisterVendorMutation } from "@/store/api/vendorApi";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/authSlice";
import { ROUTES } from "@/lib/constants";

/**
 * Vendor Onboarding Schema
 */
const vendorOnboardingSchema = z.object({
  shop_name: z.string().min(2, "Shop name must be at least 2 characters").max(255),
  description: z.string().max(500).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile number"),
  address_line_1: z.string().min(5, "Address must be at least 5 characters").max(255),
  address_line_2: z.string().max(255).optional(),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  pincode: z.string().regex(/^\d{6}$/, "Enter valid 6-digit pincode"),
  delivery_radius_km: z.coerce.number().min(1).max(50).default(5),
});

type VendorOnboardingForm = z.infer<typeof vendorOnboardingSchema>;

/**
 * Step indicator component
 */
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-2 rounded-full transition-all duration-300 ${
            index <= currentStep
              ? "w-8 bg-primary"
              : "w-2 bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Vendor Onboarding Page
 */
export default function VendorOnboardingPage() {
  const router = useRouter();
  const user = useAppSelector(selectUser);
  const [currentStep, setCurrentStep] = useState(0);
  const [registerVendor, { isLoading }] = useRegisterVendorMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    watch,
  } = useForm<VendorOnboardingForm>({
    resolver: zodResolver(vendorOnboardingSchema),
    defaultValues: {
      delivery_radius_km: 5,
    },
  });

  const steps = [
    {
      title: "Shop Details",
      description: "Tell us about your shop",
      icon: Store,
      fields: ["shop_name", "description", "phone"] as const,
    },
    {
      title: "Shop Address",
      description: "Where is your shop located?",
      icon: MapPin,
      fields: ["address_line_1", "address_line_2", "city", "state", "pincode"] as const,
    },
    {
      title: "Delivery Settings",
      description: "Configure your delivery area",
      icon: FileText,
      fields: ["delivery_radius_km"] as const,
    },
  ];

  const handleNext = async () => {
    const fieldsToValidate = steps[currentStep].fields;
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: VendorOnboardingForm) => {
    try {
      await registerVendor({
        shop_name: data.shop_name,
        description: data.description || undefined,
        phone: data.phone,
        address_line_1: data.address_line_1,
        address_line_2: data.address_line_2 || undefined,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        delivery_radius_km: data.delivery_radius_km,
      }).unwrap();

      toast.success("Shop registered successfully! Waiting for admin approval.");
      router.push(ROUTES.VENDOR_DASHBOARD);
    } catch (error: any) {
      console.error("Vendor registration error:", error);
      toast.error(error.data?.detail || "Failed to register shop. Please try again.");
    }
  };

  const CurrentStepIcon = steps[currentStep].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white mb-4">
            <CurrentStepIcon className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Complete Your Shop Profile
          </h1>
          <p className="text-gray-600">
            Welcome, {user?.name || "Vendor"}! Let's set up your shop.
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} totalSteps={steps.length} />

        {/* Form Card */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {steps[currentStep].title}
            </h2>
            <p className="text-sm text-gray-500">
              {steps[currentStep].description}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Shop Details */}
            {currentStep === 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <Input
                  label="Shop Name"
                  placeholder="Enter your shop name"
                  {...register("shop_name")}
                  error={errors.shop_name?.message}
                  leftIcon={<Store className="h-4 w-4" />}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="Tell customers about your shop..."
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                    rows={3}
                    {...register("description")}
                  />
                </div>
                <Input
                  label="Phone Number"
                  placeholder="9876543210"
                  {...register("phone")}
                  error={errors.phone?.message}
                  leftIcon={<Phone className="h-4 w-4" />}
                />
              </motion.div>
            )}

            {/* Step 2: Address */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <Input
                  label="Address Line 1"
                  placeholder="Shop no., Building name, Street"
                  {...register("address_line_1")}
                  error={errors.address_line_1?.message}
                  leftIcon={<MapPin className="h-4 w-4" />}
                />
                <Input
                  label="Address Line 2 (Optional)"
                  placeholder="Landmark, Area"
                  {...register("address_line_2")}
                  error={errors.address_line_2?.message}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    placeholder="City"
                    {...register("city")}
                    error={errors.city?.message}
                  />
                  <Input
                    label="State"
                    placeholder="State"
                    {...register("state")}
                    error={errors.state?.message}
                  />
                </div>
                <Input
                  label="Pincode"
                  placeholder="123456"
                  maxLength={6}
                  {...register("pincode")}
                  error={errors.pincode?.message}
                />
              </motion.div>
            )}

            {/* Step 3: Delivery Settings */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Radius (km)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      {...register("delivery_radius_km")}
                    />
                    <span className="w-16 text-center font-semibold text-primary">
                      {watch("delivery_radius_km")} km
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Customers within this radius can order from your shop
                  </p>
                  {errors.delivery_radius_km && (
                    <p className="text-xs text-red-500 mt-1">{errors.delivery_radius_km.message}</p>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shop Name:</span>
                      <span className="font-medium">{watch("shop_name") || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium">{watch("phone") || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">City:</span>
                      <span className="font-medium">{watch("city") || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delivery Radius:</span>
                      <span className="font-medium">{watch("delivery_radius_km")} km</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Your shop will be reviewed by our team. 
                    You'll be notified once approved.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading}
                  leftIcon={
                    isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )
                  }
                >
                  {isLoading ? "Registering..." : "Complete Setup"}
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Help text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Need help? Contact us at{" "}
          <a href="mailto:support@banda.com" className="text-primary hover:underline">
            support@banda.com
          </a>
        </p>
      </motion.div>
    </div>
  );
}

