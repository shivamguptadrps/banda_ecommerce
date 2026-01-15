"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Store, MapPin, Phone, Mail, Save } from "lucide-react";
import toast from "react-hot-toast";

import { DashboardHeader } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Avatar } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { useGetVendorProfileQuery, useUpdateVendorProfileMutation } from "@/store/api/vendorApi";

/**
 * Settings Form Schema
 */
const settingsSchema = z.object({
  shop_name: z.string().min(2, "Shop name must be at least 2 characters"),
  description: z.string().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid phone number").optional().or(z.literal("")),
  address_line_1: z.string().min(5, "Please enter address"),
  address_line_2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Please enter a valid 6-digit pincode"),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

/**
 * Vendor Settings Page
 */
export default function VendorSettingsPage() {
  const { data: vendor, isLoading } = useGetVendorProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateVendorProfileMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    values: vendor
      ? {
          shop_name: vendor.shop_name,
          description: vendor.description || "",
          phone: vendor.phone || "",
          address_line_1: vendor.address_line_1 || "",
          address_line_2: vendor.address_line_2 || "",
          city: vendor.city || "",
          state: vendor.state || "",
          pincode: vendor.pincode || "",
        }
      : undefined,
  });

  const onSubmit = async (data: SettingsFormData) => {
    try {
      await updateProfile({
        shop_name: data.shop_name,
        description: data.description,
        phone: data.phone || undefined,
        address_line_1: data.address_line_1,
        address_line_2: data.address_line_2,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
      }).unwrap();
      toast.success("Settings saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Settings" subtitle="Manage your shop settings" />

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Shop Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Shop Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Shop Logo */}
              <div className="flex items-center gap-4">
                <Avatar name={vendor?.shop_name} size="xl" />
                <div>
                  <Button type="button" variant="outline" size="sm">
                    Change Logo
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              {/* Shop Name */}
              <Input
                label="Shop Name"
                placeholder="Enter your shop name"
                leftIcon={<Store className="h-4 w-4" />}
                error={errors.shop_name?.message}
                {...register("shop_name")}
              />

              {/* Description */}
              <div>
                <label className="form-label">Description</label>
                <textarea
                  placeholder="Tell customers about your shop..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  {...register("description")}
                />
              </div>

              {/* Phone */}
              <Input
                label="Phone Number"
                placeholder="Enter phone number"
                leftIcon={<Phone className="h-4 w-4" />}
                error={errors.phone?.message}
                {...register("phone")}
              />
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Shop Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Address Line 1 */}
              <Input
                label="Address Line 1"
                placeholder="Shop no., Building name, Street"
                error={errors.address_line_1?.message}
                {...register("address_line_1")}
              />
              
              {/* Address Line 2 */}
              <Input
                label="Address Line 2 (Optional)"
                placeholder="Landmark, Area"
                error={errors.address_line_2?.message}
                {...register("address_line_2")}
              />

              {/* City, State, Pincode */}
              <div className="grid sm:grid-cols-3 gap-4">
                <Input
                  label="City"
                  placeholder="City"
                  error={errors.city?.message}
                  {...register("city")}
                />
                <Input
                  label="State"
                  placeholder="State"
                  error={errors.state?.message}
                  {...register("state")}
                />
                <Input
                  label="Pincode"
                  placeholder="Pincode"
                  error={errors.pincode?.message}
                  {...register("pincode")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              isLoading={isUpdating}
              disabled={!isDirty}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

