"use client";

import Link from "next/link";
import {
  Store,
  ShoppingCart,
  Package,
  TrendingUp,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Truck,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Avatar } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice, formatDateTime, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import {
  useGetPendingVendorsQuery,
  useApproveVendorMutation,
  AdminVendor,
} from "@/store/api/adminApi";
import {
  useGetAdminDashboardStatsQuery,
  useGetDeliveryPartnerPerformanceReportQuery,
} from "@/store/api/analyticsApi";

/**
 * Stat Card Component
 */
function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color,
  index,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down";
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
            {change && (
              <div className="flex items-center gap-1 mt-2">
                {changeType === "up" ? (
                  <ArrowUpRight className="h-4 w-4 text-success" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-error" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    changeType === "up" ? "text-success" : "text-error"
                  )}
                >
                  {change}
                </span>
              </div>
            )}
          </div>
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Pending Vendor Card
 */
function PendingVendorCard({
  vendor,
  onApprove,
  isApproving,
}: {
  vendor: AdminVendor;
  onApprove: (id: string) => void;
  isApproving: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <Avatar name={vendor.shop_name} size="sm" />
        <div>
          <p className="font-medium text-gray-900">{vendor.shop_name}</p>
          <p className="text-sm text-gray-500">{vendor.user_name || vendor.city}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{formatDateTime(vendor.created_at)}</span>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => onApprove(vendor.id)}
          isLoading={isApproving}
        >
          Review
        </Button>
      </div>
    </div>
  );
}

/**
 * Alert Card
 */
function AlertCard({
  type,
  title,
  description,
  action,
  href,
}: {
  type: "warning" | "error" | "info";
  title: string;
  description: string;
  action?: string;
  href?: string;
}) {
  const styles = {
    warning: "bg-warning/10 border-warning/20 text-warning",
    error: "bg-error/10 border-error/20 text-error",
    info: "bg-primary/10 border-primary/20 text-primary",
  };

  return (
    <div className={cn("flex items-start gap-3 p-4 rounded-xl border", styles[type])}>
      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm opacity-80">{description}</p>
      </div>
      {action && href && (
        <Link href={href}>
          <Button size="sm" variant="ghost" className="flex-shrink-0">
            {action}
          </Button>
        </Link>
      )}
    </div>
  );
}

/**
 * Admin Dashboard Page
 */
export default function AdminDashboardPage() {
  // Fetch pending vendors
  const { data: pendingData, isLoading, error, refetch } = useGetPendingVendorsQuery({ page: 1, size: 5 });
  const [approveVendor, { isLoading: isApproving }] = useApproveVendorMutation();
  
  // Fetch analytics stats
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useGetAdminDashboardStatsQuery();
  const { data: deliveryPartnerData, isLoading: isLoadingDeliveryPartners } = useGetDeliveryPartnerPerformanceReportQuery({ limit: 5 });

  const pendingVendors = pendingData?.items || [];
  const pendingCount = pendingData?.total || 0;

  // Show error if API failed (likely auth issue)
  if (error) {
    const errData = error as any;
    console.error("Admin API Error:", errData);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            {errData?.data?.detail || "Please login as admin to access this page."}
          </p>
          <Link href="/login">
            <Button>Go to Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Stats from analytics API
  const stats = analyticsData ? [
    {
      title: "Total Revenue",
      value: formatPrice(analyticsData.total_revenue),
      change: analyticsData.month_revenue > 0 ? `₹${(analyticsData.month_revenue / 1000).toFixed(0)}k this month` : undefined,
      changeType: "up" as const,
      icon: IndianRupee,
      color: "bg-primary",
    },
    {
      title: "Total Orders",
      value: analyticsData.total_orders.toLocaleString(),
      change: analyticsData.today_orders > 0 ? `${analyticsData.today_orders} today` : undefined,
      changeType: "up" as const,
      icon: ShoppingCart,
      color: "bg-secondary",
    },
    {
      title: "Active Vendors",
      value: analyticsData.verified_vendors.toString(),
      change: `${analyticsData.total_vendors} total`,
      changeType: "up" as const,
      icon: Store,
      color: "bg-success",
    },
    {
      title: "Total Products",
      value: analyticsData.active_products.toLocaleString(),
      change: `${analyticsData.total_products} total`,
      changeType: "up" as const,
      icon: Package,
      color: "bg-warning",
    },
  ] : [];

  const handleApproveVendor = async (id: string) => {
    try {
      await approveVendor({ id, data: { is_verified: true } }).unwrap();
      toast.success("Vendor approved!");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to approve vendor");
    }
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Admin Dashboard"
        subtitle="Platform overview and management"
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Alerts */}
        {pendingCount > 0 && (
          <div className="space-y-3 mb-8">
            <AlertCard
              type="warning"
              title={`${pendingCount} vendor${pendingCount > 1 ? 's' : ''} pending approval`}
              description="Review and approve pending vendor applications"
              action="Review"
              href={ROUTES.ADMIN_VENDORS}
            />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isLoadingAnalytics ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-200 rounded" />
                </Card>
              ))}
            </>
          ) : (
            stats.map((stat, index) => (
              <StatCard key={stat.title} {...stat} index={index} />
            ))
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pending Vendors */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Pending Vendor Approvals
                  </h2>
                  {pendingCount > 0 && (
                    <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />}
                    onClick={() => refetch()}
                  >
                    Refresh
                  </Button>
                  <Link href={ROUTES.ADMIN_VENDORS}>
                    <Button variant="ghost" size="sm">View All</Button>
                  </Link>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner />
                </div>
              ) : pendingVendors.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {pendingVendors.map((vendor) => (
                    <PendingVendorCard
                      key={vendor.id}
                      vendor={vendor}
                      onApprove={handleApproveVendor}
                      isApproving={isApproving}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-2" />
                  <p className="text-gray-500">No pending approvals</p>
                </div>
              )}
            </Card>
          </div>

          {/* Quick Stats & Actions */}
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-primary to-primary-dark text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm opacity-80">Today's Revenue</p>
                  <p className="text-2xl font-bold">
                    {isLoadingAnalytics ? "..." : formatPrice(analyticsData?.today_revenue || 0)}
                  </p>
                </div>
              </div>
              {analyticsData && analyticsData.today_orders > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <ArrowUpRight className="h-4 w-4" />
                  <span>{analyticsData.today_orders} orders today</span>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Link href={ROUTES.ADMIN_VENDORS}>
                  <Button variant="outline" fullWidth className="justify-start">
                    <Store className="h-4 w-4 mr-2" />
                    Manage Vendors
                  </Button>
                </Link>
                <Link href={ROUTES.ADMIN_CATEGORIES}>
                  <Button variant="outline" fullWidth className="justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    Manage Categories
                  </Button>
                </Link>
                <Link href={ROUTES.ADMIN_ORDERS}>
                  <Button variant="outline" fullWidth className="justify-start">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    View Orders
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Top Delivery Partners */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-gray-900">Top Delivery Partners</h3>
                </div>
              </div>
              {isLoadingDeliveryPartners ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : deliveryPartnerData?.delivery_partners && deliveryPartnerData.delivery_partners.length > 0 ? (
                <div className="space-y-3">
                  {deliveryPartnerData.delivery_partners.map((dp, index) => (
                    <div key={dp.delivery_partner_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{dp.name}</p>
                        <p className="text-xs text-gray-500">{dp.phone}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-600">
                            {dp.total_deliveries} deliveries
                          </span>
                          <span className={cn(
                            "text-xs font-medium",
                            dp.success_rate >= 90 ? "text-success" : dp.success_rate >= 70 ? "text-warning" : "text-error"
                          )}>
                            {dp.success_rate}% success
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-900">
                          #{index + 1}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Truck className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No delivery data yet</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
