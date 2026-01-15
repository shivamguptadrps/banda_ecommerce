"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MapPin, ChevronDown, User } from "lucide-react";

import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { selectUser, selectIsAuthenticated, logout } from "@/store/slices/authSlice";
import { Button, Avatar } from "@/components/ui";
import { CartButton } from "@/components/cart";
import { SearchInput } from "@/components/search/SearchInput";
import { BellIcon } from "@/components/notification";
import { ROUTES, APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Header Component - Blinkit-inspired design
 */
export function Header() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    setShowUserMenu(false);
    router.push(ROUTES.LOGIN);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-sm">
      <div className="container-app">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href={ROUTES.HOME}
            className="flex items-center gap-2.5 flex-shrink-0"
          >
            <div className="h-9 w-9 rounded-xl bg-[#0c831f] flex items-center justify-center shadow-md">
              <span className="text-white text-lg font-bold">B</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-xl text-gray-900">{APP_NAME}</span>
              <span className="block text-[10px] text-gray-500 -mt-0.5">groceries in minutes</span>
            </div>
          </Link>

          {/* Location Button */}
          <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
            <MapPin className="h-4 w-4 text-[#0c831f]" />
            <div className="text-left">
              <span className="text-xs text-gray-500 block">Delivery in</span>
              <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                10 minutes
                <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-[#0c831f] transition-colors" />
              </span>
            </div>
          </button>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-xl">
            <SearchInput placeholder='Search "milk"' />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Search (Mobile) */}
            <Link
              href="/products"
              className="md:hidden p-2 text-gray-600 hover:text-[#0c831f] transition-colors"
            >
              <Search className="h-5 w-5" />
            </Link>

            {/* Notifications - Only for buyers, vendors, and admins */}
            {isAuthenticated && user?.role !== "delivery_partner" && <BellIcon />}

            {/* Cart Button - Only for buyers */}
            {user?.role === "buyer" && <CartButton variant="icon" />}

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
                    showUserMenu ? "bg-gray-100" : "hover:bg-gray-50"
                  )}
                >
                  <Avatar name={user?.name} size="sm" className="bg-[#0c831f]" />
                  <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[80px] truncate">
                    {user?.name?.split(" ")[0]}
                  </span>
                  <ChevronDown className={cn(
                    "hidden sm:block h-4 w-4 text-gray-400 transition-transform",
                    showUserMenu && "rotate-180"
                  )} />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white shadow-xl border border-gray-100 py-2 z-20 animate-fade-in">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">
                          {user?.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>

                      <div className="py-2">
                        {user?.role === "buyer" && (
                          <>
                            <Link
                              href={ROUTES.ORDERS}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <span>📦</span> My Orders
                            </Link>
                            <Link
                              href={ROUTES.ADDRESSES}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <span>📍</span> Addresses
                            </Link>
                          </>
                        )}

                        {user?.role === "vendor" && (
                          <Link
                            href={ROUTES.VENDOR_DASHBOARD}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <span>🏪</span> Vendor Dashboard
                          </Link>
                        )}

                        {user?.role === "admin" && (
                          <Link
                            href={ROUTES.ADMIN_DASHBOARD}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <span>⚙️</span> Admin Panel
                          </Link>
                        )}

                        <Link
                          href={ROUTES.PROFILE}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <span>👤</span> Profile
                        </Link>
                      </div>

                      <div className="border-t border-gray-100 pt-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <span>🚪</span> Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href={ROUTES.LOGIN}>
                  <Button variant="ghost" size="sm" className="text-gray-700 hover:text-[#0c831f]">
                    Login
                  </Button>
                </Link>
                <Link href={ROUTES.REGISTER} className="hidden sm:block">
                  <Button size="sm" className="bg-[#0c831f] hover:bg-[#0a6e1a]">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
