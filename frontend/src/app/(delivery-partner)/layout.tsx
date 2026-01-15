"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAppSelector } from "@/store/hooks";
import {
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
} from "@/store/slices/authSlice";
import { ROUTES } from "@/lib/constants";

/**
 * Delivery Partner Layout
 * Protected layout for delivery partner pages
 */
export default function DeliveryPartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // Allow access to login page
    if (pathname === ROUTES.DELIVERY_PARTNER_LOGIN) {
      if (isAuthenticated && user?.role === "delivery_partner") {
        // Already logged in, redirect to orders
        router.push(ROUTES.DELIVERY_PARTNER_ORDERS);
        return;
      }
      setIsReady(true);
      return;
    }

    // Check authentication for other pages
    if (!isAuthenticated) {
      router.push(ROUTES.DELIVERY_PARTNER_LOGIN);
      return;
    }

    // Check role
    if (user?.role !== "delivery_partner") {
      router.push(ROUTES.HOME);
      return;
    }

    setIsReady(true);
  }, [isLoading, isAuthenticated, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <PageSpinner />
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <PageSpinner />
          <p className="mt-4 text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}


