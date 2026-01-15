"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Grid3X3, ShoppingCart, User } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectUser, selectIsAuthenticated } from "@/store/slices/authSlice";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Navigation items
 */
const navItems = [
  {
    label: "Home",
    href: ROUTES.HOME,
    icon: Home,
  },
  {
    label: "Search",
    href: "/products",
    icon: Search,
  },
  {
    label: "Categories",
    href: "/category",
    icon: Grid3X3,
  },
  {
    label: "Cart",
    href: ROUTES.CART,
    icon: ShoppingCart,
    requireAuth: true,
    role: "buyer",
  },
  {
    label: "Account",
    href: ROUTES.PROFILE,
    icon: User,
    requireAuth: true,
    fallback: ROUTES.LOGIN,
  },
];

/**
 * Mobile Bottom Navigation
 */
export function MobileNav() {
  const pathname = usePathname();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Filter items based on auth and role
  const filteredItems = navItems.filter((item) => {
    if (item.requireAuth && !isAuthenticated) {
      return item.fallback ? true : false;
    }
    if (item.role && user?.role !== item.role) {
      return false;
    }
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-bottom md:hidden">
      <div className="flex items-center justify-around h-16">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const href =
            item.requireAuth && !isAuthenticated && item.fallback
              ? item.fallback
              : item.href;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-primary" : "text-gray-500"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

