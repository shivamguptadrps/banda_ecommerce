"use client";

import Link from "next/link";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  Clock,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";

import { DashboardHeader } from "@/components/layout";
import { Card, Button } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { useGetVendorProfileQuery, useGetVendorStatsQuery, useGetVendorOrdersQuery } from "@/store/api/vendorApi";
import { formatPrice } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Stat Card Component
 */
function StatCard({
  title,
  value,
  subvalue,
  icon: Icon,
  color,
  index,
}: {
  title: string;
  value: string | number;
  subvalue?: string;
  icon: React.ElementType;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
            {subvalue && (
              <p className="text-sm text-gray-500 mt-1">{subvalue}</p>
            )}
          </div>
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              color
            )}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Decorative gradient */}
        <div
          className={cn(
            "absolute -bottom-4 -right-4 h-24 w-24 rounded-full opacity-10",
            color
          )}
        />
      </Card>
    </motion.div>
  );
}

/**
 * Quick Action Card
 */
function QuickAction({
  title,
  description,
  href,
  icon: Icon,
  color,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card hoverable className="flex items-center gap-4 group">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-500 truncate">{description}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
      </Card>
    </Link>
  );
}

/**
 * Recent Order Row
 */
function RecentOrderRow({
  orderNumber,
  customer,
  amount,
  status,
  items,
}: {
  orderNumber: string;
  customer: string;
  amount: number;
  status: string;
  items: number;
}) {
  const statusColors: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    confirmed: "bg-primary/10 text-primary",
    processing: "bg-blue-100 text-blue-600",
    shipped: "bg-purple-100 text-purple-600",
    delivered: "bg-success/10 text-success",
    cancelled: "bg-error/10 text-error",
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{orderNumber}</p>
        <p className="text-sm text-gray-500 truncate">{customer} • {items} items</p>
      </div>
      <div className="text-right">
        <p className="font-medium text-gray-900 text-sm">{formatPrice(amount)}</p>
        <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize", statusColors[status] || statusColors.pending)}>
          {status}
        </span>
      </div>
    </div>
  );
}

/**
 * Vendor Dashboard Page
 */
export default function VendorDashboardPage() {
  const { data: vendor, isLoading: loadingVendor } = useGetVendorProfileQuery();
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useGetVendorStatsQuery();
  const { data: ordersData, isLoading: loadingOrders } = useGetVendorOrdersQuery({ page: 1, size: 5 });

  const isLoading = loadingVendor || loadingStats;

  // Build stats cards
  const statCards = stats
    ? [
        {
          title: "Total Revenue",
          value: formatPrice(stats.total_revenue || 0),
          subvalue: `This week: ${formatPrice(stats.this_week_revenue || 0)}`,
          icon: IndianRupee,
          color: "bg-primary",
        },
        {
          title: "Total Orders",
          value: stats.total_orders?.toString() || "0",
          subvalue: `Today: ${stats.today_orders || 0}`,
          icon: ShoppingCart,
          color: "bg-secondary",
        },
        {
          title: "Products",
          value: stats.total_products?.toString() || "0",
          subvalue: "Active listings",
          icon: Package,
          color: "bg-success",
        },
        {
          title: "Pending Orders",
          value: stats.pending_orders?.toString() || "0",
          subvalue: "Need attention",
          icon: Clock,
          color: "bg-warning",
        },
      ]
    : [];

  // Get recent orders
  const recentOrders = ordersData?.items?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title={`Welcome, ${vendor?.shop_name || "Vendor"}!`}
        subtitle="Here's what's happening with your store today"
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Verification Banner */}
        {vendor && !vendor.is_verified && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-warning/10 border border-warning/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
          >
            <div className="flex-1">
              <h3 className="font-medium text-warning-600">Verification Pending</h3>
              <p className="text-sm text-gray-600">
                Your shop is under review. You can add products, but they won't be visible to buyers until approved.
              </p>
            </div>
            <Button variant="outline" size="sm" className="border-warning text-warning hover:bg-warning/10">
              Check Status
            </Button>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <StatCard key={stat.title} {...stat} index={index} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                <Link href={ROUTES.VENDOR_ORDERS}>
                  <Button variant="ghost" size="sm" rightIcon={<Eye className="h-4 w-4" />}>
                    View All
                  </Button>
                </Link>
              </div>

              {loadingOrders ? (
                <div className="flex justify-center py-8">
                  <Spinner size="md" />
                </div>
              ) : recentOrders.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentOrders.map((order) => (
                    <RecentOrderRow
                      key={order.id}
                      orderNumber={order.order_number}
                      customer={order.buyer_name || "Customer"}
                      amount={order.total_amount}
                      status={order.order_status}
                      items={order.total_items}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No orders yet</p>
                </div>
              )}
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            
            <QuickAction
              title="Add New Product"
              description="List a new product in your store"
              href={`${ROUTES.VENDOR_PRODUCTS}/new`}
              icon={Plus}
              color="bg-primary"
            />
            
            <QuickAction
              title="Manage Inventory"
              description="Update stock levels"
              href={ROUTES.VENDOR_PRODUCTS}
              icon={Package}
              color="bg-success"
            />
            
            <QuickAction
              title="Pending Orders"
              description={`${stats?.pending_orders || 0} orders need attention`}
              href={ROUTES.VENDOR_ORDERS}
              icon={ShoppingCart}
              color="bg-warning"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
