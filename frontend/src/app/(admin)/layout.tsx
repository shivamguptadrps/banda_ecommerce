"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/layout";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAppSelector } from "@/store/hooks";
import { selectUser, selectIsAuthenticated, selectAuthLoading } from "@/store/slices/authSlice";
import { ROUTES } from "@/lib/constants";

/**
 * Admin Layout
 * Protected layout for admin panel pages
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Debug: log auth state
    console.log("[AdminLayout] Auth state:", { isLoading, isAuthenticated, user: user?.email, role: user?.role });

    if (isLoading) return;

    if (!isAuthenticated) {
      console.log("[AdminLayout] Not authenticated, redirecting to login");
      router.push(ROUTES.LOGIN);
      return;
    }

    if (user?.role !== "admin") {
      console.log("[AdminLayout] Not admin, redirecting to home");
      router.push(ROUTES.HOME);
      return;
    }

    // User is authenticated and is admin
    console.log("[AdminLayout] User is admin, rendering content");
    setIsReady(true);
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <PageSpinner />
          <p className="mt-4 text-gray-500">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <PageSpinner />
          <p className="mt-4 text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Access denied. Admin only.</p>
          <p className="mt-2 text-gray-500">Your role: {user?.role || "unknown"}</p>
        </div>
      </div>
    );
  }

  // Only render content after client-side hydration to prevent mismatch
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <PageSpinner />
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <DashboardSidebar type="admin" />

      {/* Main Content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

