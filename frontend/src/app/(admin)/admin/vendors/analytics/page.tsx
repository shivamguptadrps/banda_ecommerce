"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingBag,
  BarChart3,
  Download,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Select, Input } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice, cn } from "@/lib/utils";
import { useGetVendorAnalyticsQuery, useGetVendorListAnalyticsQuery } from "@/store/api/adminApi";

/**
 * Vendor Analytics Page
 */
export default function VendorAnalyticsPage() {
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "custom">("today");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Calculate date range
  const dateParams = useMemo(() => {
    const today = new Date();
    const start = new Date();
    
    switch (dateRange) {
      case "today":
        start.setHours(0, 0, 0, 0);
        return {
          start_date: start.toISOString().split("T")[0],
          end_date: today.toISOString().split("T")[0],
        };
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return {
          start_date: weekStart.toISOString().split("T")[0],
          end_date: today.toISOString().split("T")[0],
        };
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start_date: monthStart.toISOString().split("T")[0],
          end_date: today.toISOString().split("T")[0],
        };
      case "custom":
        return {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        };
      default:
        return {};
    }
  }, [dateRange, startDate, endDate]);

  // Get vendor analytics
  const { data: analytics, isLoading, refetch } = useGetVendorAnalyticsQuery({
    vendor_id: selectedVendor !== "all" ? selectedVendor : undefined,
    ...dateParams,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  // Get vendor list for dropdown
  const { data: vendorList } = useGetVendorListAnalyticsQuery({
    search: searchQuery || undefined,
  });

  const handleExport = () => {
    toast.success("Export functionality coming soon!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const stats = analytics || {
    total_revenue: 0,
    today_revenue: 0,
    week_revenue: 0,
    month_revenue: 0,
    total_orders: 0,
    today_orders: 0,
    week_orders: 0,
    month_orders: 0,
    status_breakdown: {},
    payment_breakdown: {},
    avg_order_value: 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Vendor Analytics"
        subtitle="Comprehensive analytics and insights for vendors"
      />

      <div className="container-app py-6 space-y-6">
        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Vendor Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor
              </label>
              <Select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                options={[
                  { value: "all", label: "All Vendors" },
                  ...(vendorList?.map((v: any) => ({
                    value: v.vendor_id,
                    label: v.shop_name,
                  })) || []),
                ]}
              />
            </div>

            {/* Date Range */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                options={[
                  { value: "today", label: "Today" },
                  { value: "week", label: "This Week" },
                  { value: "month", label: "This Month" },
                  { value: "custom", label: "Custom Range" },
                ]}
              />
            </div>

            {/* Custom Date Inputs */}
            {dateRange === "custom" && (
              <>
                <div className="min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="min-w-[150px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Status Filter */}
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Status
              </label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "placed", label: "Placed" },
                  { value: "confirmed", label: "Confirmed" },
                  { value: "picked", label: "Picked" },
                  { value: "packed", label: "Packed" },
                  { value: "out_for_delivery", label: "Out for Delivery" },
                  { value: "delivered", label: "Delivered" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Export
              </Button>
            </div>
          </div>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={formatPrice(stats.total_revenue)}
            icon={<DollarSign className="h-5 w-5" />}
            trend={stats.month_revenue > 0 ? "up" : "neutral"}
            subtitle="All time"
          />
          <MetricCard
            title="Total Orders"
            value={stats.total_orders.toLocaleString()}
            icon={<ShoppingBag className="h-5 w-5" />}
            trend={stats.month_orders > 0 ? "up" : "neutral"}
            subtitle="All time"
          />
          <MetricCard
            title="Avg Order Value"
            value={formatPrice(stats.avg_order_value)}
            icon={<BarChart3 className="h-5 w-5" />}
            trend="neutral"
            subtitle="Average"
          />
          <MetricCard
            title="Today's Revenue"
            value={formatPrice(stats.today_revenue)}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={stats.today_revenue > 0 ? "up" : "neutral"}
            subtitle={`${stats.today_orders} orders`}
          />
        </div>

        {/* Time Period Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Orders</span>
                <span className="font-semibold text-gray-900">{stats.today_orders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Revenue</span>
                <span className="font-semibold text-primary">{formatPrice(stats.today_revenue)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Week</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Orders</span>
                <span className="font-semibold text-gray-900">{stats.week_orders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Revenue</span>
                <span className="font-semibold text-primary">{formatPrice(stats.week_revenue)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Orders</span>
                <span className="font-semibold text-gray-900">{stats.month_orders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Revenue</span>
                <span className="font-semibold text-primary">{formatPrice(stats.month_revenue)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(stats.status_breakdown || {}).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-gray-600 capitalize">{status.replace("_", " ")}</span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ))}
              {Object.keys(stats.status_breakdown || {}).length === 0 && (
                <p className="text-gray-500 text-center py-4">No orders found</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Mode Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(stats.payment_breakdown || {}).map(([mode, data]: [string, any]) => (
                <div key={mode} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 uppercase">{mode}</span>
                    <span className="font-semibold text-gray-900">{data.count} orders</span>
                  </div>
                  <div className="text-sm text-primary font-medium">
                    {formatPrice(data.revenue)}
                  </div>
                </div>
              ))}
              {Object.keys(stats.payment_breakdown || {}).length === 0 && (
                <p className="text-gray-500 text-center py-4">No payment data found</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Metric Card Component
 */
function MetricCard({
  title,
  value,
  icon,
  trend,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: "up" | "down" | "neutral";
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
          {trend !== "neutral" && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm",
                trend === "up" ? "text-success" : "text-error"
              )}
            >
              {trend === "up" ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
            </div>
          )}
        </div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </Card>
    </motion.div>
  );
}

