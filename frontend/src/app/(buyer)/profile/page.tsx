"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Phone, Save, LogOut } from "lucide-react";
import toast from "react-hot-toast";

import { Button, Input, Card, CardHeader, CardTitle, CardContent, Avatar } from "@/components/ui";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { selectUser, selectIsAuthenticated, logout, updateUser } from "@/store/slices/authSlice";
import { useUpdateCurrentUserMutation } from "@/store/api/authApi";
import { ROUTES } from "@/lib/constants";

/**
 * Profile Form Schema
 */
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit phone number"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

/**
 * Profile Page
 */
export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [updateProfile, { isLoading }] = useUpdateCurrentUserMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push(ROUTES.LOGIN);
    }
  }, [isAuthenticated, router]);

  // Set form values when user data loads
  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        phone: user.phone || "",
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const updatedUser = await updateProfile(data).unwrap();
      dispatch(updateUser(updatedUser));
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push(ROUTES.LOGIN);
    toast.success("Logged out successfully");
  };

  if (!isAuthenticated || !user) {
    return <PageSpinner />;
  }

  return (
    <div className="container-app py-8">
      <div className="max-w-2xl mx-auto">
        {/* Page Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar name={user.name} size="xl" />
              <div>
                <CardTitle>{user.name}</CardTitle>
                <p className="text-sm text-gray-500">{user.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary text-xs font-medium rounded-full capitalize">
                  {user.role}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <Input
                label="Full Name"
                type="text"
                placeholder="Enter your full name"
                leftIcon={<User className="h-4 w-4" />}
                error={errors.name?.message}
                {...register("name")}
              />

              {/* Email (Read-only) */}
              <Input
                label="Email"
                type="email"
                value={user.email}
                leftIcon={<Mail className="h-4 w-4" />}
                disabled
                helperText="Email cannot be changed"
              />

              {/* Phone */}
              <Input
                label="Phone Number"
                type="tel"
                placeholder="Enter your phone number"
                leftIcon={<Phone className="h-4 w-4" />}
                error={errors.phone?.message}
                {...register("phone")}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={!isDirty}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Change Password Link */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Password</p>
                <p className="text-sm text-gray-500">
                  Change your account password
                </p>
              </div>
              <Button variant="outline" size="sm">
                Change
              </Button>
            </div>

            {/* Logout */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">Logout</p>
                <p className="text-sm text-gray-500">
                  Sign out of your account
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<LogOut className="h-4 w-4" />}
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

