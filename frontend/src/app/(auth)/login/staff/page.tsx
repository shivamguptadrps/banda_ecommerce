"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail, Lock, Store, Shield, Truck } from "lucide-react";
import toast from "react-hot-toast";

import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";
import { useLoginMutation } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { ROUTES } from "@/lib/constants";

const staffLoginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type StaffLoginFormData = z.infer<typeof staffLoginSchema>;
type StaffRole = "vendor" | "admin";

export default function StaffLoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const form = useForm<StaffLoginFormData>({
    resolver: zodResolver(staffLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: StaffLoginFormData, role: StaffRole) => {
    try {
      const result = await login(data).unwrap();

      // hard guard: don't let buyer log into staff screen
      if (role === "vendor" && result.user.role !== "vendor") {
        toast.error("This account is not a vendor account.");
        return;
      }
      if (role === "admin" && result.user.role !== "admin") {
        toast.error("This account is not an admin account.");
        return;
      }

      dispatch(
        setCredentials({
          user: result.user,
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        })
      );

      toast.success("Welcome back!");
      router.push(role === "vendor" ? ROUTES.VENDOR_DASHBOARD : ROUTES.ADMIN_DASHBOARD);
    } catch (error: any) {
      toast.error(error?.data?.detail || "Login failed");
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-md mx-auto pt-10">
        <Card className="w-full animate-fade-in">
          <CardHeader className="text-center">
            <Link href={ROUTES.LOGIN} className="absolute left-4 top-4 p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <CardTitle className="text-2xl font-bold">Staff Login</CardTitle>
            <CardDescription>Vendor / Admin / Delivery Partner</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Vendor */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Store className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Vendor</p>
                  <p className="text-xs text-gray-500">Email + Password</p>
                </div>
              </div>

              <form onSubmit={form.handleSubmit((data) => onSubmit(data, "vendor"))} className="space-y-3">
                <Input
                  label="Email"
                  type="email"
                  placeholder="vendor@banda.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={form.formState.errors.email?.message}
                  {...form.register("email")}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                  error={form.formState.errors.password?.message}
                  {...form.register("password")}
                />
                <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                  Login as Vendor
                </Button>
              </form>
            </div>

            {/* Admin */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Admin</p>
                  <p className="text-xs text-gray-500">Email + Password</p>
                </div>
              </div>

              <form onSubmit={form.handleSubmit((data) => onSubmit(data, "admin"))} className="space-y-3">
                <Input
                  label="Email"
                  type="email"
                  placeholder="admin@banda.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={form.formState.errors.email?.message}
                  {...form.register("email")}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                  error={form.formState.errors.password?.message}
                  {...form.register("password")}
                />
                <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                  Login as Admin
                </Button>
              </form>
            </div>

            {/* Delivery Partner */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Delivery Partner</p>
                  <p className="text-xs text-gray-500">Use the Delivery Partner app</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Delivery Partner access is restricted from the buyer webapp.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

