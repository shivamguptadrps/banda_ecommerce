"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header, MobileNav } from "@/components/layout";
import { CartDrawer, CartButton } from "@/components/cart";
import { ActiveOrderWidget } from "@/components/order/ActiveOrderWidget";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { initializeCart } from "@/store/slices/cartSlice";
import { selectUser, selectIsAuthenticated, selectAuthLoading } from "@/store/slices/authSlice";
import { ROUTES } from "@/lib/constants";
import { PageSpinner } from "@/components/ui/Spinner";

/**
 * Buyer Layout
 * Main layout for buyer-facing pages with header, mobile navigation, and cart
 * Blocks delivery partners from accessing buyer routes
 */
export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by tracking mount state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize cart from localStorage on mount
  useEffect(() => {
    dispatch(initializeCart());
  }, [dispatch]);

  // Block non-buyers from accessing buyer routes
  useEffect(() => {
    if (!mounted || isLoading) return;

    if (isAuthenticated && user?.role === "delivery_partner") {
      router.replace(ROUTES.DELIVERY_PARTNER_ORDERS);
      return;
    }

    if (isAuthenticated && user?.role === "vendor") {
      router.replace(ROUTES.VENDOR_DASHBOARD);
      return;
    }

    if (isAuthenticated && user?.role === "admin") {
      router.replace(ROUTES.ADMIN_DASHBOARD);
      return;
    }
  }, [mounted, isLoading, isAuthenticated, user, router]);

  // Don't render buyer layout if user is not buyer (will redirect) - only check after mount
  if (
    mounted &&
    isAuthenticated &&
    (user?.role === "delivery_partner" || user?.role === "vendor" || user?.role === "admin")
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="pb-20 md:pb-0">{children}</main>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Floating Cart Button (Mobile) */}
      <CartButton variant="fab" />

      {/* Active Order Widget - shows live tracking for active orders */}
      <ActiveOrderWidget />
    </div>
  );
}
