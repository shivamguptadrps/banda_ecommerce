"use client";

import { useRouter } from "next/navigation";
import {
  Package,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  TrendingUp,
  ArrowLeft,
  Calendar,
  Truck,
  Activity,
  Target,
  BarChart3,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { Card, Button, Spinner } from "@/components/ui";
import { useGetStatsQuery } from "@/store/api/deliveryPartnerApi";
import { formatPrice, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

/**
 * Delivery Statistics Dashboard Page
 */
export default function DeliveryStatsPage() {
  const router = useRouter();
  const { data: stats, isLoading, error, refetch } = useGetStatsQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container-app py-12">
          <Card className="p-8 text-center max-w-md mx-auto">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-6">
              Failed to load statistics. Please try again.
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </Card>
        </div>
      </div>
    );
  }

  // Today's Performance Cards
  const todayCards = [
    {
      title: "Assigned Today",
      value: stats.today_assigned,
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      title: "Delivered Today",
      value: stats.today_delivered,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/20",
    },
    {
      title: "COD Revenue Today",
      value: formatPrice(stats.today_cod_revenue),
      icon: Wallet,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      title: "Currently Assigned",
      value: stats.currently_assigned,
      icon: Truck,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
  ];

  // All-Time Stats Cards
  const allTimeCards = [
    {
      title: "Total Orders Assigned",
      value: stats.total_orders_assigned,
      icon: Package,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Total Deliveries",
      value: stats.total_deliveries,
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Successful",
      value: stats.successful,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Failed",
      value: stats.failed,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  // Performance Metrics
  const performanceCards = [
    {
      title: "Success Rate",
      value: `${stats.success_rate.toFixed(1)}%`,
      icon: Target,
      color: "text-success",
      bgColor: "bg-success/10",
      progress: stats.success_rate,
    },
    {
      title: "COD Collection Rate",
      value: `${stats.cod_collection_rate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      progress: stats.cod_collection_rate,
    },
    {
      title: "Avg Delivery Time",
      value: stats.avg_delivery_time_minutes
        ? `${Math.round(stats.avg_delivery_time_minutes)} min`
        : "N/A",
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  // Weekly & Monthly Stats
  const periodStats = [
    {
      title: "This Week",
      delivered: stats.week_delivered,
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "This Month",
      delivered: stats.month_delivered,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="container-app py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(ROUTES.DELIVERY_PARTNER_ORDERS)}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Delivery Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Comprehensive performance metrics</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container-app py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Today's Performance - Highlight Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today's Performance
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {todayCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={index}
                    className={cn(
                      "p-6 border-2 transition-all hover:shadow-md",
                      stat.borderColor
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn("p-2.5 rounded-lg", stat.bgColor)}>
                        <Icon className={cn("h-5 w-5", stat.color)} />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* All-Time Statistics */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              All-Time Statistics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {allTimeCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn("p-2.5 rounded-lg", stat.bgColor)}>
                        <Icon className={cn("h-5 w-5", stat.color)} />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Performance Metrics & Revenue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Performance Metrics
              </h3>
              <div className="space-y-6">
                {performanceCards.map((metric, index) => {
                  const Icon = metric.icon;
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", metric.color)} />
                          <span className="text-sm font-medium text-gray-700">
                            {metric.title}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-gray-900">{metric.value}</span>
                      </div>
                      {metric.progress !== undefined && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={cn(
                              "h-2.5 rounded-full transition-all",
                              metric.color === "text-success"
                                ? "bg-success"
                                : "bg-green-600"
                            )}
                            style={{ width: `${Math.min(metric.progress, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Revenue & Period Stats */}
            <div className="space-y-6">
              {/* COD Revenue */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  COD Revenue
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Total COD Collected</p>
                      <p className="text-2xl font-bold text-green-700">
                        {formatPrice(stats.cod_revenue)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">COD Orders</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {stats.cod_total}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Collected</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {stats.cod_collected}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Weekly & Monthly */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Period Performance
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {periodStats.map((period, index) => {
                    const Icon = period.icon;
                    return (
                      <div
                        key={index}
                        className={cn("p-4 rounded-lg border", period.bgColor)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={cn("h-4 w-4", period.color)} />
                          <p className="text-sm font-medium text-gray-700">{period.title}</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                          {period.delivered} delivered
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>

          {/* Current Status Alert */}
          {stats.pending_deliveries > 0 && (
            <Card className="p-6 border-orange-200 bg-orange-50">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-900">
                    {stats.pending_deliveries} pending delivery{stats.pending_deliveries > 1 ? "ies" : ""}
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    You have deliveries that are still in progress. Complete them to improve your stats!
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(ROUTES.DELIVERY_PARTNER_ORDERS)}
                >
                  View Orders
                </Button>
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(ROUTES.DELIVERY_PARTNER_ORDERS)}
                leftIcon={<Truck className="h-4 w-4" />}
              >
                View All Orders
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(ROUTES.DELIVERY_PARTNER_ORDERS + "?status=out_for_delivery")}
                leftIcon={<Package className="h-4 w-4" />}
              >
                Active Deliveries
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
