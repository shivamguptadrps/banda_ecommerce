"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  Store,
  Users,
  FolderTree,
  BarChart3,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  Layers,
  Truck,
  Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Avatar, Button } from "@/components/ui";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { selectUser, logout } from "@/store/slices/authSlice";
import { cn } from "@/lib/utils";
import { APP_NAME, ROUTES } from "@/lib/constants";

/**
 * Navigation items for vendor
 */
const vendorNavItems = [
  {
    label: "Dashboard",
    href: ROUTES.VENDOR_DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    label: "Products",
    href: ROUTES.VENDOR_PRODUCTS,
    icon: Package,
  },
  {
    label: "Orders",
    href: ROUTES.VENDOR_ORDERS,
    icon: ShoppingCart,
  },
  {
    label: "Settings",
    href: ROUTES.VENDOR_SETTINGS,
    icon: Settings,
  },
];

/**
 * Navigation items for admin
 */
const adminNavItems = [
  {
    label: "Dashboard",
    href: ROUTES.ADMIN_DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    label: "Vendors",
    href: ROUTES.ADMIN_VENDORS,
    icon: Store,
    children: [
      {
        label: "All Vendors",
        href: ROUTES.ADMIN_VENDORS,
      },
      {
        label: "Vendor Analytics",
        href: "/admin/vendors/analytics",
      },
    ],
  },
  {
    label: "Categories",
    href: ROUTES.ADMIN_CATEGORIES,
    icon: FolderTree,
  },
  {
    label: "Attributes",
    href: ROUTES.ADMIN_ATTRIBUTES,
    icon: Layers,
    children: [
      {
        label: "Attributes",
        href: ROUTES.ADMIN_ATTRIBUTES,
      },
      {
        label: "Segments",
        href: ROUTES.ADMIN_SEGMENTS,
      },
    ],
  },
  {
    label: "Orders",
    href: ROUTES.ADMIN_ORDERS,
    icon: ShoppingCart,
  },
  {
    label: "Delivery Partners",
    href: ROUTES.ADMIN_DELIVERY_PARTNERS,
    icon: Truck,
    children: [
      {
        label: "All Partners",
        href: ROUTES.ADMIN_DELIVERY_PARTNERS,
      },
      {
        label: "Partner Analytics",
        href: "/admin/delivery-partners/analytics",
      },
    ],
  },
  {
    label: "Coupons",
    href: ROUTES.ADMIN_COUPONS,
    icon: Tag,
  },
];

interface DashboardSidebarProps {
  type: "vendor" | "admin";
}

/**
 * Navigation Item Component (with sub-items support)
 */
function NavItem({
  item,
  Icon,
  isActive,
  hasChildren,
  collapsed,
  pathname,
  onMobileClose,
}: {
  item: any;
  Icon: any;
  isActive: boolean;
  hasChildren: boolean;
  collapsed: boolean;
  pathname: string;
  onMobileClose: () => void;
}) {
  // Check if any child is active for initial state
  const initialExpanded = hasChildren && item.children
    ? item.children.some((child: any) => 
        pathname === child.href || pathname.startsWith(child.href + "/")
      )
    : false;
  
  const [expanded, setExpanded] = useState(initialExpanded);

  return (
    <li>
      <div>
        <Link
          href={item.href}
          onClick={(e) => {
            onMobileClose();
            if (hasChildren) {
              e.preventDefault();
              setExpanded(!expanded);
            }
          }}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all",
            isActive
              ? "bg-primary text-white"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          <Icon className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              {hasChildren && (
                <ChevronLeft
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expanded && "rotate-90"
                  )}
                />
              )}
            </>
          )}
        </Link>
        {!collapsed && hasChildren && expanded && (
          <ul className="ml-8 mt-1 space-y-1">
            {item.children.map((child: any) => {
              const isChildActive = pathname === child.href || pathname.startsWith(child.href + "/");
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                      isChildActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </li>
  );
}

/**
 * Dashboard Sidebar Component
 */
export function DashboardSidebar({ type }: DashboardSidebarProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only rendering client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navItems = type === "vendor" ? vendorNavItems : adminNavItems;
  const title = type === "vendor" ? "Vendor Portal" : "Admin Panel";

  const handleLogout = () => {
    dispatch(logout());
    window.location.href = ROUTES.LOGIN;
  };

  return (
    <>
      {/* Mobile Menu Button - Only render on client */}
      {isMounted && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-100 lg:hidden"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
      )}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Only render on client to prevent hydration mismatch */}
      {isMounted && (
        <aside
          className={cn(
            "fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-100 flex flex-col transition-all duration-300",
            // Mobile
            mobileOpen ? "translate-x-0" : "-translate-x-full",
            // Desktop
            "lg:translate-x-0",
            // Width
            collapsed ? "lg:w-20" : "w-64"
          )}
        >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          {!collapsed && (
            <Link href={type === "vendor" ? ROUTES.VENDOR_DASHBOARD : ROUTES.ADMIN_DASHBOARD}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  type === "vendor" ? "bg-primary" : "bg-gray-900"
                )}>
                  <span className="text-white text-sm font-bold">
                    {type === "vendor" ? "V" : "A"}
                  </span>
                </div>
                <span className="font-bold text-gray-900">{title}</span>
              </div>
            </Link>
          )}

          {/* Collapse button (Desktop) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </button>

          {/* Close button (Mobile) */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item: any) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const hasChildren = item.children && item.children.length > 0;

              return (
                <NavItem
                  key={item.href}
                  item={item}
                  Icon={Icon}
                  isActive={isActive}
                  hasChildren={hasChildren}
                  collapsed={collapsed}
                  pathname={pathname}
                  onMobileClose={() => setMobileOpen(false)}
                />
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-100">
          {!collapsed ? (
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={user?.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-3">
              <Avatar name={user?.name} size="sm" />
            </div>
          )}

          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
      )}

      {/* Spacer for main content - Only render on client */}
      {isMounted && (
        <div className={cn("hidden lg:block flex-shrink-0 transition-all", collapsed ? "w-20" : "w-64")} />
      )}
    </>
  );
}

