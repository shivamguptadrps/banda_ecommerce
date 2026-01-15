"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Tag,
  Calendar,
  Percent,
  DollarSign,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Input, Modal, ModalFooter } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { cn, formatPrice, formatDateTime } from "@/lib/utils";
import {
  useGetAdminCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
  Coupon,
  CouponCreate,
  CouponUpdate,
} from "@/store/api/adminApi";

// Form data type (uses date string for expiry_date input)
type CouponFormData = Omit<CouponCreate, "expiry_date"> & {
  expiry_date: string; // Date string for date input
};

/**
 * Coupon Modal Component
 */
function CouponModal({
  coupon,
  onClose,
  onSave,
  isLoading,
}: {
  coupon?: Coupon | null;
  onClose: () => void;
  onSave: (data: CouponCreate | CouponUpdate) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CouponFormData>({
    code: coupon?.code || "",
    description: coupon?.description || "",
    discount_type: coupon?.discount_type || "percentage",
    discount_value: coupon?.discount_value || 0,
    min_order_amount: coupon?.min_order_amount || 0,
    max_discount: coupon?.max_discount,
    expiry_date: coupon?.expiry_date ? coupon.expiry_date.split("T")[0] : "",
    usage_limit: coupon?.usage_limit,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.code || formData.code.length < 3) {
      toast.error("Coupon code must be at least 3 characters");
      return;
    }
    
    if (formData.discount_value <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }
    
    if (formData.discount_type === "percentage" && formData.discount_value > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    // Convert date string to datetime ISO string (end of day for expiry)
    const payload: CouponCreate | CouponUpdate = {
      ...formData,
      expiry_date: formData.expiry_date
        ? `${formData.expiry_date}T23:59:59.000Z` // End of day in ISO format
        : undefined,
    };

    onSave(payload);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={coupon ? "Edit Coupon" : "Create Coupon"} size="xl">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="flex-1 overflow-y-auto max-h-[60vh] -mx-6 px-6 space-y-4 py-2">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Coupon Code *
            </label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="SAVE20"
              disabled={!!coupon}
              required
            />
            {coupon && (
              <p className="text-xs text-gray-500 mt-1">Code cannot be changed after creation</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              rows={3}
            />
          </div>

          {/* Discount Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Discount Type *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, discount_type: "percentage" })}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all",
                  formData.discount_type === "percentage"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                <Percent className="h-4 w-4" />
                Percentage
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, discount_type: "flat" })}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all",
                  formData.discount_type === "flat"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                <DollarSign className="h-4 w-4" />
                Fixed Amount
              </button>
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {formData.discount_type === "percentage" ? "Discount Percentage *" : "Discount Amount *"}
            </label>
            <div className="relative">
              {formData.discount_type === "percentage" ? (
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  placeholder="20"
                  min="0"
                  max={formData.discount_type === "percentage" ? "100" : undefined}
                  required
                />
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    placeholder="100"
                    min="0"
                    className="pl-8"
                    required
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.discount_type === "percentage"
                ? "Enter percentage (e.g., 20 for 20%)"
                : "Enter fixed amount in ₹"}
            </p>
          </div>

          {/* Max Discount (for percentage) */}
          {formData.discount_type === "percentage" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Max Discount (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  type="number"
                  value={formData.max_discount || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_discount: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="100"
                  min="0"
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Maximum discount cap (e.g., ₹100)</p>
            </div>
          )}

          {/* Min Order Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Minimum Order Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <Input
                type="number"
                value={formData.min_order_amount}
                onChange={(e) =>
                  setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })
                }
                placeholder="500"
                min="0"
                className="pl-8"
              />
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Expiry Date (Optional)
            </label>
            <Input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            />
          </div>

          {/* Usage Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Usage Limit (Optional)
            </label>
            <Input
              type="number"
              value={formData.usage_limit || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  usage_limit: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="100"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">Total times this coupon can be used</p>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-gray-100 bg-white -mx-6 px-6 pb-0 flex-shrink-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            disabled={isLoading} 
            size="md"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading} 
            size="md"
          >
            {isLoading ? "Saving..." : coupon ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Coupon Card Component
 */
function CouponCard({
  coupon,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  coupon: Coupon;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  // Client-side only date check to avoid hydration errors
  const [isExpired, setIsExpired] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [expiryDateFormatted, setExpiryDateFormatted] = useState<string>("");

  useEffect(() => {
    setIsMounted(true);
    if (coupon.expiry_date) {
      setIsExpired(new Date(coupon.expiry_date) < new Date());
      setExpiryDateFormatted(formatDateTime(coupon.expiry_date).split(" ")[0]);
    }
  }, [coupon.expiry_date]);

  const isUsageLimitReached = coupon.usage_limit && coupon.used_count >= coupon.usage_limit;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-primary" />
            <span className="font-bold text-lg text-gray-900">{coupon.code}</span>
            {!coupon.is_active && (
              <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                Inactive
              </span>
            )}
            {isMounted && isExpired && (
              <span className="text-xs text-error bg-error/10 px-2 py-0.5 rounded-full">
                Expired
              </span>
            )}
            {isUsageLimitReached && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                Limit Reached
              </span>
            )}
          </div>

          {coupon.description && (
            <p className="text-sm text-gray-600 mb-3">{coupon.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Discount:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {coupon.discount_type === "percentage" ? (
                  `${coupon.discount_value}%`
                ) : (
                  `₹${coupon.discount_value}`
                )}
              </span>
              {coupon.max_discount && (
                <span className="ml-1 text-gray-500">(max ₹{coupon.max_discount})</span>
              )}
            </div>
            <div>
              <span className="text-gray-500">Min Order:</span>
              <span className="ml-2 font-semibold text-gray-900">₹{coupon.min_order_amount}</span>
            </div>
            <div>
              <span className="text-gray-500">Used:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {coupon.used_count}
                {coupon.usage_limit && ` / ${coupon.usage_limit}`}
              </span>
            </div>
            {coupon.expiry_date && isMounted && (
              <div>
                <span className="text-gray-500">Expires:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {expiryDateFormatted}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleActive}
            className={cn(
              "p-2 rounded-lg transition-colors",
              coupon.is_active
                ? "text-success hover:bg-success/10"
                : "text-gray-400 hover:bg-gray-100"
            )}
            title={coupon.is_active ? "Disable" : "Enable"}
          >
            {coupon.is_active ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-error hover:bg-error/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Admin Coupons Page
 */
export default function AdminCouponsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | undefined>();

  // Build query params
  const queryParams = {
    page,
    size: 20,
    search: searchQuery || undefined,
    is_active: activeStatus === "active" ? true : activeStatus === "inactive" ? false : undefined,
  };

  // Fetch coupons
  const { data, isLoading, isFetching, error, refetch } = useGetAdminCouponsQuery(queryParams, {
    // Refetch on mount and when filters change
    refetchOnMountOrArgChange: true,
  });
  const [createCoupon, { isLoading: isCreating }] = useCreateCouponMutation();
  const [updateCoupon, { isLoading: isUpdating }] = useUpdateCouponMutation();
  const [deleteCoupon, { isLoading: isDeleting }] = useDeleteCouponMutation();

  const coupons = data?.items || [];
  const total = data?.total || 0;

  // Helper function to extract error message
  const getErrorMessage = (error: any): string => {
    if (!error?.data) return "An unexpected error occurred";
    
    const detail = error.data.detail;
    
    // Handle array of validation errors (Pydantic)
    if (Array.isArray(detail)) {
      const messages = detail.map((err: any) => {
        const field = err.loc && err.loc.length > 0 
          ? err.loc[err.loc.length - 1] 
          : "field";
        return `${field}: ${err.msg}`;
      });
      return messages.join(", ");
    }
    
    // Handle string error
    if (typeof detail === "string") {
      return detail;
    }
    
    // Fallback
    return "An error occurred";
  };

  const handleCreate = async (data: CouponCreate | CouponUpdate) => {
    try {
      await createCoupon(data as CouponCreate).unwrap();
      toast.success("Coupon created successfully!");
      setIsModalOpen(false);
      setEditingCoupon(undefined);
      // Reset filters to show all coupons including the new one
      setActiveStatus("all");
      setSearchQuery("");
      setPage(1);
      // Refetch immediately and after a short delay to ensure backend has processed
      refetch();
      setTimeout(() => {
        refetch();
      }, 500);
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to create coupon");
      throw error;
    }
  };

  const handleUpdate = async (data: CouponCreate | CouponUpdate) => {
    if (!editingCoupon) return;
    try {
      await updateCoupon({ id: editingCoupon.id, data: data as CouponUpdate }).unwrap();
      toast.success("Coupon updated successfully!");
      setIsModalOpen(false);
      setEditingCoupon(undefined);
      setTimeout(() => {
        refetch();
      }, 500);
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to update coupon");
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to disable this coupon?")) {
      return;
    }
    try {
      await deleteCoupon(id).unwrap();
      toast.success("Coupon disabled successfully!");
      refetch();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to disable coupon");
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await updateCoupon({ id: coupon.id, data: { is_active: !coupon.is_active } }).unwrap();
      toast.success(coupon.is_active ? "Coupon disabled" : "Coupon enabled");
      refetch();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || "Failed to update coupon");
    }
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Coupons" subtitle="Manage discount coupons" />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code or description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              leftIcon={<RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Refresh
            </Button>
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              Create Coupon
            </Button>
          </div>
        </div>

        {/* Status Filters */}
        <div className="mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveStatus("all");
                setPage(1);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeStatus === "all"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              All
            </button>
            <button
              onClick={() => {
                setActiveStatus("active");
                setPage(1);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeStatus === "active"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Active
            </button>
            <button
              onClick={() => {
                setActiveStatus("inactive");
                setPage(1);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeStatus === "inactive"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && !isLoading && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <div className="p-4 text-center">
              <p className="text-red-600 font-medium">Failed to load coupons</p>
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
        ) : (
          <>
            {coupons.length === 0 ? (
              <Card className="p-12 text-center">
                <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No coupons found</p>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                  Create First Coupon
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {coupons.map((coupon) => (
                  <CouponCard
                    key={coupon.id}
                    coupon={coupon}
                    onEdit={() => {
                      setEditingCoupon(coupon);
                      setIsModalOpen(true);
                    }}
                    onDelete={() => handleDelete(coupon.id)}
                    onToggleActive={() => handleToggleActive(coupon)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} coupons
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * 20 >= total || isFetching}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <CouponModal
            coupon={editingCoupon}
            onClose={() => {
              setIsModalOpen(false);
              setEditingCoupon(undefined);
            }}
            onSave={editingCoupon ? handleUpdate : handleCreate}
            isLoading={isCreating || isUpdating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

