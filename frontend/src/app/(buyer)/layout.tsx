"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header, MobileNav } from "@/components/layout";
import { CartDrawer, CartButton } from "@/components/cart";
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

  // Initialize cart from localStorage on mount
  useEffect(() => {
    dispatch(initializeCart());
  }, [dispatch]);

  // Block delivery partners from accessing buyer routes
  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user?.role === "delivery_partner") {
      // Redirect delivery partners to their orders page
      router.replace(ROUTES.DELIVERY_PARTNER_ORDERS);
      return;
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageSpinner />
      </div>
    );
  }

  // Don't render buyer layout if user is delivery partner (will redirect)
  if (isAuthenticated && user?.role === "delivery_partner") {
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
    </div>
  );
}
