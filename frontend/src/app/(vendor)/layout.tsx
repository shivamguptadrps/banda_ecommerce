"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { DashboardSidebar } from "@/components/layout";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAppSelector } from "@/store/hooks";
import { selectUser, selectIsAuthenticated, selectAuthLoading } from "@/store/slices/authSlice";
import { useGetVendorProfileQuery } from "@/store/api/vendorApi";
import { ROUTES } from "@/lib/constants";

/**
 * Loading Component - Consistent for server and client
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <PageSpinner />
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Vendor Layout
 * Protected layout for vendor dashboard pages
 * Checks if vendor has completed profile setup
 */
export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAuthLoading = useAppSelector(selectAuthLoading);
  const [isReady, setIsReady] = useState(false);

  // Fetch vendor profile - skip if not authenticated or on onboarding page
  const isOnboardingPage = pathname === "/vendor/onboarding" || pathname === ROUTES.VENDOR_ONBOARDING;
  const shouldSkipProfileCheck = !isAuthenticated || isAuthLoading || user?.role !== "vendor" || isOnboardingPage;
  
  const { 
    data: vendorProfile, 
    isLoading: isProfileLoading, 
    error: profileError 
  } = useGetVendorProfileQuery(undefined, {
    skip: shouldSkipProfileCheck,
  });

  useEffect(() => {
    if (isAuthLoading) return;

    // Check authentication
    if (!isAuthenticated) {
      router.push(ROUTES.LOGIN);
      return;
    }

    // Check role
    if (user?.role !== "vendor") {
      router.push(ROUTES.HOME);
      return;
    }

    // On onboarding page - always allow
    if (isOnboardingPage) {
      setIsReady(true);
      return;
    }

    // Wait for profile check
    if (isProfileLoading) return;

    // Check if profile exists (404 error means no profile)
    const is404 = (profileError as any)?.status === 404;
    
    if (profileError && is404) {
      router.push(ROUTES.VENDOR_ONBOARDING);
      return;
    }

    // Profile exists or other error - continue
    setIsReady(true);
  }, [isAuthLoading, isAuthenticated, user, pathname, isOnboardingPage, isProfileLoading, vendorProfile, profileError, router]);

  // Show loading for auth check or profile check
  if (isAuthLoading || (!isOnboardingPage && isProfileLoading)) {
    return <LoadingScreen />;
  }

  // On onboarding page - render without sidebar
  if (isOnboardingPage) {
    return <>{children}</>;
  }

  // Not ready yet (redirecting)
  if (!isReady) {
    return <LoadingScreen />;
  }

  // Vendor dashboard layout with sidebar
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <DashboardSidebar type="vendor" />

      {/* Main Content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
