"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  Truck,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Download,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Select, Input } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice, cn } from "@/lib/utils";
import {
  useGetDeliveryPartnerAnalyticsQuery,
  useGetDeliveryPartnerListAnalyticsQuery,
} from "@/store/api/adminApi";

/**
 * Delivery Partner Analytics Page
 */
export default function DeliveryPartnerAnalyticsPage() {
  const [selectedPartner, setSelectedPartner] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "custom">("today");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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

  // Get delivery partner analytics
  const { data: analytics, isLoading, refetch } = useGetDeliveryPartnerAnalyticsQuery({
    delivery_partner_id: selectedPartner !== "all" ? selectedPartner : undefined,
    ...dateParams,
  });

  // Get delivery partner list for dropdown
  const { data: partnerList } = useGetDeliveryPartnerListAnalyticsQuery({
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
    total_deliveries: 0,
    successful_deliveries: 0,
    failed_deliveries: 0,
    success_rate: 0,
    today_assigned: 0,
    today_delivered: 0,
    week_assigned: 0,
    week_delivered: 0,
    month_assigned: 0,
    month_delivered: 0,
    cod_total_orders: 0,
    cod_collected: 0,
    cod_collection_rate: 0,
    avg_delivery_time_minutes: 0,
    status_breakdown: {},
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Delivery Partner Analytics"
        subtitle="Comprehensive analytics and insights for delivery partners"
      />

      <div className="container-app py-6 space-y-6">
        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Delivery Partner Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Partner
              </label>
              <Select
                value={selectedPartner}
                onChange={(e) => setSelectedPartner(e.target.value)}
                options={[
                  { value: "all", label: "All Partners" },
                  ...(partnerList?.map((p: any) => ({
                    value: p.delivery_partner_id,
                    label: `${p.name} (${p.phone})`,
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

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search partners..."
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
            title="Total Deliveries"
            value={stats.total_deliveries.toLocaleString()}
            icon={<Truck className="h-5 w-5" />}
            trend="neutral"
            subtitle="All time"
          />
          <MetricCard
            title="Success Rate"
            value={`${stats.success_rate.toFixed(1)}%`}
            icon={<CheckCircle2 className="h-5 w-5" />}
            trend={stats.success_rate >= 90 ? "up" : stats.success_rate >= 70 ? "neutral" : "down"}
            subtitle={`${stats.successful_deliveries} successful`}
          />
          <MetricCard
            title="COD Collected"
            value={formatPrice(stats.cod_collected)}
            icon={<DollarSign className="h-5 w-5" />}
            trend="neutral"
            subtitle={`${stats.cod_collection_rate.toFixed(1)}% collection rate`}
          />
          <MetricCard
            title="Avg Delivery Time"
            value={stats.avg_delivery_time_minutes > 0 ? `${stats.avg_delivery_time_minutes.toFixed(0)} mins` : "N/A"}
            icon={<Clock className="h-5 w-5" />}
            trend="neutral"
            subtitle="Average time"
          />
        </div>

        {/* Time Period Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Assigned</span>
                <span className="font-semibold text-gray-900">{stats.today_assigned}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Delivered</span>
                <span className="font-semibold text-success">{stats.today_delivered}</span>
              </div>
              {stats.today_assigned > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-semibold text-primary">
                      {((stats.today_delivered / stats.today_assigned) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Week</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Assigned</span>
                <span className="font-semibold text-gray-900">{stats.week_assigned}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Delivered</span>
                <span className="font-semibold text-success">{stats.week_delivered}</span>
              </div>
              {stats.week_assigned > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-semibold text-primary">
                      {((stats.week_delivered / stats.week_assigned) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Assigned</span>
                <span className="font-semibold text-gray-900">{stats.month_assigned}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Delivered</span>
                <span className="font-semibold text-success">{stats.month_delivered}</span>
              </div>
              {stats.month_assigned > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-semibold text-primary">
                      {((stats.month_delivered / stats.month_assigned) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Performance Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="text-gray-700">Successful Deliveries</span>
                </div>
                <span className="font-bold text-success">{stats.successful_deliveries}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-error/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-error" />
                  <span className="text-gray-700">Failed Deliveries</span>
                </div>
                <span className="font-bold text-error">{stats.failed_deliveries}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Deliveries</span>
                  <span className="font-semibold text-gray-900">{stats.total_deliveries}</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-medium">{stats.success_rate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-success h-2 rounded-full transition-all"
                      style={{ width: `${stats.success_rate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">COD Collection</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="text-gray-700">Total COD Orders</span>
                </div>
                <span className="font-bold text-primary">{stats.cod_total_orders}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="text-gray-700">COD Collected</span>
                </div>
                <span className="font-bold text-success">{formatPrice(stats.cod_collected)}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Collection Rate</span>
                  <span className="font-semibold text-primary">{stats.cod_collection_rate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${stats.cod_collection_rate}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Order Status Breakdown */}
        {Object.keys(stats.status_breakdown || {}).length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.status_breakdown || {}).map(([status, count]: [string, any]) => (
                <div key={status} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 capitalize mb-1">
                    {status.replace("_", " ")}
                  </p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
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

