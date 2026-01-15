"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Truck,
  MoreVertical,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Phone,
  Mail,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Avatar, Input, Modal, Select } from "@/components/ui";
import { Spinner } from "@/components/ui/Spinner";
import { cn, formatDateTime } from "@/lib/utils";
import {
  useGetDeliveryPartnersQuery,
  useCreateDeliveryPartnerMutation,
  useUpdateDeliveryPartnerMutation,
  useDeleteDeliveryPartnerMutation,
  DeliveryPartner,
  DeliveryPartnerCreate,
} from "@/store/api/adminApi";

/**
 * Delivery Partner Form Schema
 */
const deliveryPartnerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Phone must be 10 digits starting with 6-9"),
  vehicle_type: z.string().optional(),
  vehicle_number: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
});

type DeliveryPartnerFormData = z.infer<typeof deliveryPartnerSchema>;

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
  counts: { all: number; active: number; inactive: number; available: number };
}) {
  const tabs = [
    { id: "all", label: "All", count: counts.all },
    { id: "active", label: "Active", count: counts.active },
    { id: "inactive", label: "Inactive", count: counts.inactive },
    { id: "available", label: "Available", count: counts.available },
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
 * Delivery Partner Card Component
 */
function DeliveryPartnerCard({
  partner,
  index,
  onEdit,
  onDelete,
}: {
  partner: DeliveryPartner;
  index: number;
  onEdit: (partner: DeliveryPartner) => void;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

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
            <Avatar name={partner.name} size="md" className="bg-blue-500" />
            <div>
              <h3 className="font-semibold text-gray-900">{partner.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Phone className="h-3 w-3" />
                {partner.phone}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {partner.is_active && (
                <span className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1 bg-success/10 text-success">
                  <CheckCircle className="h-3 w-3" />
                  Active
                </span>
              )}
              {!partner.is_active && (
                <span className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1 bg-gray-100 text-gray-500">
                  <XCircle className="h-3 w-3" />
                  Inactive
                </span>
              )}
              {partner.is_available && partner.is_active && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-600">
                  Available
                </span>
              )}
            </div>

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
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                    <button
                      onClick={() => {
                        onEdit(partner);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        onDelete(partner.id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {partner.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        {(partner.vehicle_type || partner.vehicle_number) && (
          <div className="mb-4 flex items-center gap-4 text-sm">
            {partner.vehicle_type && (
              <div className="flex items-center gap-1 text-gray-600">
                <Truck className="h-4 w-4" />
                <span className="capitalize">{partner.vehicle_type}</span>
              </div>
            )}
            {partner.vehicle_number && (
              <div className="text-gray-500">
                {partner.vehicle_number}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-right">
            <p className="text-xs text-gray-400">Created</p>
            <p className="text-sm text-gray-600">{formatDateTime(partner.created_at)}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Create/Edit Delivery Partner Modal
 */
function DeliveryPartnerModal({
  isOpen,
  onClose,
  partner,
  onCreate,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  partner?: DeliveryPartner;
  onCreate: (data: DeliveryPartnerCreate) => Promise<void>;
  onUpdate: (id: string, data: Partial<DeliveryPartnerCreate>) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeliveryPartnerFormData>({
    resolver: zodResolver(deliveryPartnerSchema),
    defaultValues: partner
      ? {
          name: partner.name,
          phone: partner.phone,
          vehicle_type: partner.vehicle_type || "",
          vehicle_number: partner.vehicle_number || "",
        }
      : {
          name: "",
          phone: "",
          vehicle_type: "",
          vehicle_number: "",
          email: "",
          password: "",
        },
  });

  const onSubmit = async (data: DeliveryPartnerFormData) => {
    try {
      const submitData: DeliveryPartnerCreate = {
        name: data.name,
        phone: data.phone,
        vehicle_type: data.vehicle_type || undefined,
        vehicle_number: data.vehicle_number || undefined,
        email: data.email || undefined,
        password: data.password || undefined,
      };

      if (partner) {
        await onUpdate(partner.id, submitData);
      } else {
        await onCreate(submitData);
      }
      reset();
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={partner ? "Edit Delivery Partner" : "Create Delivery Partner"}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto space-y-4 -mx-6 px-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              {...register("name")}
              placeholder="Enter full name"
              error={errors.name?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <Input
              {...register("phone")}
              placeholder="9876543210"
              maxLength={10}
              error={errors.phone?.message}
            />
            <p className="text-xs text-gray-500 mt-1">10 digits starting with 6-9</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Type
            </label>
            <Select
              {...register("vehicle_type")}
              options={[
                { value: "", label: "Select vehicle type" },
                { value: "bike", label: "Bike" },
                { value: "scooter", label: "Scooter" },
                { value: "car", label: "Car" },
                { value: "bicycle", label: "Bicycle" },
                { value: "auto", label: "Auto Rickshaw" },
              ]}
              placeholder="Select vehicle type"
              fullWidth
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Number
            </label>
            <Input
              {...register("vehicle_number")}
              placeholder="MH12AB1234"
              error={errors.vehicle_number?.message}
            />
          </div>

          {!partner && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Optional)
                </label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="delivery@example.com"
                  error={errors.email?.message}
                />
                <p className="text-xs text-gray-500 mt-1">Auto-generated if not provided</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password (Optional)
                </label>
                <Input
                  {...register("password")}
                  type="password"
                  placeholder="Auto-generated if not provided"
                  error={errors.password?.message}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4 flex-shrink-0 bg-white">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            {partner ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Admin Delivery Partners Page
 */
export default function AdminDeliveryPartnersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<DeliveryPartner | undefined>();

  // Build query params based on active status
  const queryParams = {
    page,
    size: 20,
    search: searchQuery || undefined,
    is_active: activeStatus === "active" ? true : activeStatus === "inactive" ? false : undefined,
    is_available: activeStatus === "available" ? true : undefined,
  };

  // Fetch delivery partners from API
  const { data, isLoading, isFetching, error, refetch } = useGetDeliveryPartnersQuery(queryParams);
  const [createPartner, { isLoading: isCreating }] = useCreateDeliveryPartnerMutation();
  const [updatePartner, { isLoading: isUpdating }] = useUpdateDeliveryPartnerMutation();
  const [deletePartner, { isLoading: isDeleting }] = useDeleteDeliveryPartnerMutation();

  const partners = data?.items || [];
  const total = data?.total || 0;

  // Calculate counts
  const counts = {
    all: total,
    active: partners.filter((p) => p.is_active).length,
    inactive: partners.filter((p) => !p.is_active).length,
    available: partners.filter((p) => p.is_available && p.is_active).length,
  };

  const handleCreate = async (data: DeliveryPartnerCreate) => {
    try {
      await createPartner(data).unwrap();
      toast.success("Delivery partner created successfully!");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to create delivery partner");
      throw error;
    }
  };

  const handleUpdate = async (id: string, data: Partial<DeliveryPartnerCreate>) => {
    try {
      await updatePartner({ id, data: data as any }).unwrap();
      toast.success("Delivery partner updated successfully!");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to update delivery partner");
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this delivery partner?")) return;

    try {
      const partner = partners.find((p) => p.id === id);
      if (partner?.is_active) {
        await updatePartner({ id, data: { is_active: false } }).unwrap();
        toast.success("Delivery partner deactivated successfully!");
      } else {
        await updatePartner({ id, data: { is_active: true } }).unwrap();
        toast.success("Delivery partner activated successfully!");
      }
      refetch();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to update delivery partner");
    }
  };

  const handleEdit = (partner: DeliveryPartner) => {
    setEditingPartner(partner);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingPartner(undefined);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Delivery Partners" />

      <div className="container-app py-6">
        {/* Header Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, phone, or vehicle number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>

          <Button onClick={handleCreateNew} leftIcon={<Plus className="h-4 w-4" />}>
            Add Delivery Partner
          </Button>
        </div>

        {/* Status Tabs */}
        <StatusTabs active={activeStatus} onChange={setActiveStatus} counts={counts} />

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="p-8 text-center">
            <p className="text-red-600 mb-4">Failed to load delivery partners</p>
            <Button onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Retry
            </Button>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && partners.length === 0 && (
          <Card className="p-12 text-center">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No delivery partners found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? "Try adjusting your search filters"
                : "Get started by adding your first delivery partner"}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateNew} leftIcon={<Plus className="h-4 w-4" />}>
                Add Delivery Partner
              </Button>
            )}
          </Card>
        )}

        {/* Delivery Partners Grid */}
        {!isLoading && !error && partners.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {partners.map((partner, index) => (
                <DeliveryPartnerCard
                  key={partner.id}
                  partner={partner}
                  index={index}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Pagination */}
            {total > 20 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} partners
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
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

        {/* Create/Edit Modal */}
        <DeliveryPartnerModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPartner(undefined);
          }}
          partner={editingPartner}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
}

