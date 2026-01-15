"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  MoreVertical,
  Eye,
  Store,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Avatar } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { cn, formatDateTime } from "@/lib/utils";
import {
  useGetAdminVendorsQuery,
  useApproveVendorMutation,
  useSuspendVendorMutation,
  AdminVendor,
} from "@/store/api/adminApi";

/**
 * Vendor status configuration
 */
const getVendorStatus = (vendor: AdminVendor) => {
  if (!vendor.is_active) {
    return { key: "suspended", label: "Suspended", color: "bg-gray-100 text-gray-500", icon: Ban };
  }
  if (!vendor.is_verified) {
    return { key: "pending", label: "Pending", color: "bg-warning/10 text-warning", icon: Clock };
  }
  return { key: "verified", label: "Verified", color: "bg-success/10 text-success", icon: CheckCircle };
};

/**
 * Status Filter Tabs
 */
function StatusTabs({
  active,
  onChange,
  counts,
}: {
  active: string;
  onChange: (status: string) => void;
  counts: { all: number; pending: number; verified: number; suspended: number };
}) {
  const tabs = [
    { id: "all", label: "All", count: counts.all },
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "verified", label: "Verified", count: counts.verified },
    { id: "suspended", label: "Suspended", count: counts.suspended },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
            active === tab.id
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          {tab.label}
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              active === tab.id
                ? "bg-white/20 text-white"
                : "bg-gray-200 text-gray-600"
            )}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Vendor Card Component
 */
function VendorCard({
  vendor,
  index,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
}: {
  vendor: AdminVendor;
  index: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const status = getVendorStatus(vendor);
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar name={vendor.shop_name} size="md" />
            <div>
              <h3 className="font-semibold text-gray-900">{vendor.shop_name}</h3>
              <p className="text-sm text-gray-500">{vendor.city}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn("text-xs px-2.5 py-1 rounded-full flex items-center gap-1", status.color)}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>

            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MoreVertical className="h-4 w-4 text-gray-400" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                    <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                    {!vendor.is_verified && vendor.is_active && (
                      <>
                        <button
                          onClick={() => { onApprove(vendor.id); setShowMenu(false); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-success hover:bg-gray-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => { onReject(vendor.id); setShowMenu(false); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-gray-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                    {vendor.is_active && vendor.is_verified && (
                      <button
                        onClick={() => { onSuspend(vendor.id); setShowMenu(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-error hover:bg-gray-50"
                      >
                        <Ban className="h-4 w-4" />
                        Suspend
                      </button>
                    )}
                    {!vendor.is_active && (
                      <button
                        onClick={() => { onReactivate(vendor.id); setShowMenu(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-success hover:bg-gray-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reactivate
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Owner Info */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-900">{vendor.user_name || "N/A"}</p>
          <p className="text-sm text-gray-500">{vendor.user_email || vendor.email || "N/A"}</p>
          <p className="text-sm text-gray-500">{vendor.phone}</p>
        </div>

        {/* Address */}
        <div className="mb-4 text-sm text-gray-600">
          <p className="line-clamp-2">{vendor.address}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-right">
            <p className="text-xs text-gray-400">Registered</p>
            <p className="text-sm text-gray-600">{formatDateTime(vendor.created_at)}</p>
          </div>

          {/* Quick Actions for pending */}
          {!vendor.is_verified && vendor.is_active && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onReject(vendor.id)}>
                Reject
              </Button>
              <Button size="sm" onClick={() => onApprove(vendor.id)}>
                Approve
              </Button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Admin Vendors Page
 */
export default function AdminVendorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);

  // Build query params based on active status
  const queryParams = {
    page,
    size: 20,
    search: searchQuery || undefined,
    is_verified: activeStatus === "verified" ? true : activeStatus === "pending" ? false : undefined,
    is_active: activeStatus === "suspended" ? false : activeStatus === "pending" ? true : undefined,
  };

  // Fetch vendors from API
  const { data, isLoading, isFetching, error, refetch } = useGetAdminVendorsQuery(queryParams);
  const [approveVendor, { isLoading: isApproving }] = useApproveVendorMutation();
  const [suspendVendor, { isLoading: isSuspending }] = useSuspendVendorMutation();

  // Debug: Log API state
  console.log("[VendorsPage] API State:", { 
    isLoading, 
    isFetching, 
    hasData: !!data, 
    itemsCount: data?.items?.length,
    error: error ? (error as any)?.status || "unknown" : null,
    queryParams 
  });

  const vendors = data?.items || [];
  const total = data?.total || 0;

  // Show error if API failed
  if (error && !isLoading) {
    const errData = error as any;
    console.error("Vendors API Error:", errData);
  }

  // Calculate counts (simplified - in production, get from API)
  const counts = {
    all: total,
    pending: vendors.filter(v => !v.is_verified && v.is_active).length,
    verified: vendors.filter(v => v.is_verified && v.is_active).length,
    suspended: vendors.filter(v => !v.is_active).length,
  };

  const handleApprove = async (id: string) => {
    try {
      await approveVendor({ id, data: { is_verified: true } }).unwrap();
      toast.success("Vendor approved successfully!");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to approve vendor");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await approveVendor({ id, data: { is_verified: false, notes: "Application rejected" } }).unwrap();
      toast.success("Vendor rejected");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to reject vendor");
    }
  };

  const handleSuspend = async (id: string) => {
    try {
      await suspendVendor({ id, data: { is_active: false } }).unwrap();
      toast.success("Vendor suspended");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to suspend vendor");
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await suspendVendor({ id, data: { is_active: true } }).unwrap();
      toast.success("Vendor reactivated");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to reactivate vendor");
    }
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Vendors" subtitle="Manage vendor accounts" />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button
            variant="outline"
            leftIcon={<RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Refresh
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="mb-6">
          <StatusTabs active={activeStatus} onChange={setActiveStatus} counts={counts} />
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <div className="p-4 text-center">
              <p className="text-red-600 font-medium">Failed to load vendors</p>
              <p className="text-sm text-red-500 mt-1">
                {(error as any)?.data?.detail || (error as any)?.error || "Network error"}
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? null : vendors.length > 0 ? (
          <>
            {/* Vendors Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((vendor, index) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  index={index}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onSuspend={handleSuspend}
                  onReactivate={handleReactivate}
                />
              ))}
            </div>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {data.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === data.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="text-center py-12">
            <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No vendors found</p>
          </Card>
        )}
      </div>
    </div>
  );
}
