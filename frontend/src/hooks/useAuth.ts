"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { selectUser, selectIsAuthenticated, selectAuthLoading } from "@/store/slices/authSlice";
import { ROUTES } from "@/lib/constants";
import { UserRole } from "@/types";

interface UseAuthOptions {
  required?: boolean;
  redirectTo?: string;
  allowedRoles?: UserRole[];
}

/**
 * Custom hook for authentication
 */
export function useAuth(options: UseAuthOptions = {}) {
  const {
    required = false,
    redirectTo = ROUTES.LOGIN,
    allowedRoles,
  } = options;

  const router = useRouter();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);

  useEffect(() => {
    // Wait for auth initialization
    if (isLoading) return;

    // Check if auth is required
    if (required && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Check role-based access
    if (isAuthenticated && allowedRoles && user) {
      if (!allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        if (user.role === "admin") {
          router.push(ROUTES.ADMIN_DASHBOARD);
        } else if (user.role === "vendor") {
          router.push(ROUTES.VENDOR_DASHBOARD);
        } else {
          router.push(ROUTES.HOME);
        }
      }
    }
  }, [isLoading, isAuthenticated, required, allowedRoles, user, router, redirectTo]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin: user?.role === "admin",
    isVendor: user?.role === "vendor",
    isBuyer: user?.role === "buyer",
  };
}

/**
 * Hook that requires authentication
 */
export function useRequireAuth(allowedRoles?: UserRole[]) {
  return useAuth({
    required: true,
    allowedRoles,
  });
}

/**
 * Hook for buyer-only pages
 */
export function useBuyerAuth() {
  return useRequireAuth(["buyer"]);
}

/**
 * Hook for vendor-only pages
 */
export function useVendorAuth() {
  return useRequireAuth(["vendor"]);
}

/**
 * Hook for admin-only pages
 */
export function useAdminAuth() {
  return useRequireAuth(["admin"]);
}

