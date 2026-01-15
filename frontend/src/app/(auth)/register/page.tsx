"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, User, Phone, Store } from "lucide-react";
import toast from "react-hot-toast";

import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui";
import { useRegisterMutation } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Register Form Schema
 */
const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit phone number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number"
      ),
    confirmPassword: z.string(),
    role: z.enum(["buyer", "vendor"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Register Page
 */
export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [register, { isLoading }] = useRegisterMutation();

  const {
    register: registerField,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "buyer",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const { confirmPassword, ...registerData } = data;
      const result = await register(registerData).unwrap();

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

      toast.success("Account created successfully!");

      // Redirect based on role
      if (data.role === "vendor") {
        // Vendor needs to complete shop profile setup
        router.push(ROUTES.VENDOR_ONBOARDING);
      } else {
        router.push(ROUTES.HOME);
      }
    } catch (error: any) {
      toast.error(error.message || "Registration failed. Please try again.");
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>
          Join Banda and start shopping or selling
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Role Toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setValue("role", "buyer")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all",
                selectedRole === "buyer"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <User className="h-4 w-4" />
              Buyer
            </button>
            <button
              type="button"
              onClick={() => setValue("role", "vendor")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all",
                selectedRole === "vendor"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Store className="h-4 w-4" />
              Vendor
            </button>
          </div>

          {/* Name */}
          <Input
            label="Full Name"
            type="text"
            placeholder="Enter your full name"
            leftIcon={<User className="h-4 w-4" />}
            error={errors.name?.message}
            {...registerField("name")}
          />

          {/* Email */}
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...registerField("email")}
          />

          {/* Phone */}
          <Input
            label="Phone Number"
            type="tel"
            placeholder="Enter your phone number"
            leftIcon={<Phone className="h-4 w-4" />}
            error={errors.phone?.message}
            {...registerField("phone")}
          />

          {/* Password */}
          <Input
            label="Password"
            type="password"
            placeholder="Create a password"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            helperText="Must be 8+ characters with uppercase, lowercase, and number"
            {...registerField("password")}
          />

          {/* Confirm Password */}
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.confirmPassword?.message}
            {...registerField("confirmPassword")}
          />

          {/* Terms */}
          <p className="text-xs text-gray-500">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>

          {/* Submit Button */}
          <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
            {selectedRole === "vendor" ? "Continue as Vendor" : "Create Account"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href={ROUTES.LOGIN}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

