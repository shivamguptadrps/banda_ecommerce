"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Layers,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FolderTree,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Modal, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  useGetAdminCategoriesQuery,
  useGetCategorySegmentsQuery,
  useCreateSegmentMutation,
  useUpdateSegmentMutation,
  useDeleteSegmentMutation,
  useReorderSegmentsMutation,
} from "@/store/api/adminApi";
import {
  AttributeSegment,
  AttributeSegmentCreate,
  AttributeSegmentUpdate,
} from "@/types";

/**
 * Segment Form Schema
 */
const segmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
  is_collapsible: z.boolean().default(true),
});

type SegmentFormData = z.infer<typeof segmentSchema>;

/**
 * Segment Form Modal
 */
function SegmentFormModal({
  isOpen,
  onClose,
  categoryId,
  editingSegment,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  editingSegment?: AttributeSegment | null;
  onSuccess: () => void;
}) {
  const [createSegment, { isLoading: isCreating }] = useCreateSegmentMutation();
  const [updateSegment, { isLoading: isUpdating }] = useUpdateSegmentMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SegmentFormData>({
    resolver: zodResolver(segmentSchema),
    defaultValues: editingSegment
      ? {
          name: editingSegment.name,
          description: editingSegment.description || "",
          icon: editingSegment.icon || "",
          is_collapsible: editingSegment.is_collapsible,
        }
      : {
          name: "",
          description: "",
          icon: "",
          is_collapsible: true,
        },
  });

  const onSubmit = async (data: SegmentFormData) => {
    try {
      if (editingSegment) {
        const payload: AttributeSegmentUpdate = {
          name: data.name,
          description: data.description || undefined,
          icon: data.icon || undefined,
          is_collapsible: data.is_collapsible,
        };
        await updateSegment({
          id: editingSegment.id,
          data: payload,
        }).unwrap();
        toast.success("Segment updated!");
      } else {
        const payload: AttributeSegmentCreate = {
          category_id: categoryId,
          name: data.name,
          description: data.description || undefined,
          icon: data.icon || undefined,
          is_collapsible: data.is_collapsible,
        };
        await createSegment(payload).unwrap();
        toast.success("Segment created!");
      }

      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to save segment");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSegment ? "Edit Segment" : "Create Segment"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Segment Name *
          </label>
          <input
            {...register("name")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="e.g., Dimensions, Display Features, Camera"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            {...register("description")}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Brief description of what attributes belong in this segment"
          />
        </div>

        {/* Icon */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Icon Name <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <input
            {...register("icon")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="e.g., ruler, display, camera, battery"
          />
          <p className="mt-1 text-xs text-gray-500">
            Icon identifier for visual representation (Lucide icon name)
          </p>
        </div>

        {/* Collapsible */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register("is_collapsible")}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">Collapsible by default</span>
        </label>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button
            type="submit"
            fullWidth
            isLoading={isCreating || isUpdating}
          >
            {editingSegment ? "Update" : "Create"} Segment
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Segment Card Component
 */
function SegmentCard({
  segment,
  categoryName,
  onEdit,
  onDelete,
}: {
  segment: AttributeSegment;
  categoryName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 rounded-lg border bg-white border-gray-200 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
          <Layers className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{segment.name}</h4>
            {!segment.is_active && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                Inactive
              </span>
            )}
            {segment.is_collapsible && (
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                Collapsible
              </span>
            )}
          </div>
          {segment.description && (
            <p className="text-sm text-gray-500 mt-1">{segment.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Category: {categoryName} • {segment.attribute_count || 0} attributes
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Admin Segments Page
 */
export default function AdminSegmentsPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<AttributeSegment | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useGetAdminCategoriesQuery({
    include_inactive: false,
  });

  // Fetch segments for selected category
  const {
    data: segmentsData,
    isLoading: segmentsLoading,
    refetch: refetchSegments,
  } = useGetCategorySegmentsQuery(
    { categoryId: selectedCategoryId!, includeInactive: true, withAttributes: true },
    { skip: !selectedCategoryId }
  );

  const [deleteSegment] = useDeleteSegmentMutation();
  const [reorderSegments] = useReorderSegmentsMutation();

  const categories = categoriesData?.items || [];
  const segments = segmentsData || [];

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId(null);
      }
    } else {
      newExpanded.add(categoryId);
      setSelectedCategoryId(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAddSegment = () => {
    if (!selectedCategoryId) {
      toast.error("Please select a category first");
      return;
    }
    setEditingSegment(null);
    setIsModalOpen(true);
  };

  const handleEditSegment = (segment: AttributeSegment) => {
    setEditingSegment(segment);
    setIsModalOpen(true);
  };

  const handleDeleteSegment = async (segment: AttributeSegment) => {
    if (!confirm(`Delete segment "${segment.name}"? Attributes in this segment will become ungrouped.`)) {
      return;
    }

    try {
      await deleteSegment(segment.id).unwrap();
      toast.success("Segment deleted!");
      refetchSegments();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to delete segment");
    }
  };

  // Build category tree
  const categoryTree = categories.filter((cat) => !cat.parent_id);
  const subcategories = categories.filter((cat) => cat.parent_id);

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Attribute Segments"
        subtitle="Organize attributes into logical groups for better product display"
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Category Selector */}
          <div className="lg:col-span-1">
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Select Category</h3>

              {categoriesLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : (
                <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                  {categoryTree.map((cat) => {
                    const categorySubcats = subcategories.filter((sub) => sub.parent_id === cat.id);
                    const isExpanded = expandedCategories.has(cat.id);
                    const isSelected = selectedCategoryId === cat.id;

                    return (
                      <div key={cat.id}>
                        <button
                          onClick={() => toggleCategory(cat.id)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            isSelected
                              ? "bg-primary text-white"
                              : "hover:bg-gray-100 text-gray-700"
                          )}
                        >
                          {categorySubcats.length > 0 ? (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )
                          ) : (
                            <span className="w-4" />
                          )}
                          <FolderTree className="h-4 w-4" />
                          <span className="font-medium flex-1">{cat.name}</span>
                        </button>
                        {isExpanded && categorySubcats.length > 0 && (
                          <div className="ml-4 mt-1 space-y-1">
                            {categorySubcats.map((subcat) => {
                              const isSubSelected = selectedCategoryId === subcat.id;
                              return (
                                <button
                                  key={subcat.id}
                                  onClick={() => setSelectedCategoryId(subcat.id)}
                                  className={cn(
                                    "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                                    isSubSelected
                                      ? "bg-primary text-white"
                                      : "hover:bg-gray-100 text-gray-700"
                                  )}
                                >
                                  <span className="w-4" />
                                  <span className="text-sm">{subcat.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {categories.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      No categories found. Create categories first.
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Segments List */}
          <div className="lg:col-span-2">
            {selectedCategoryId ? (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    Segments
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({segments.length} total)
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<RefreshCw className={cn("h-4 w-4", segmentsLoading && "animate-spin")} />}
                      onClick={() => refetchSegments()}
                    >
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={handleAddSegment}
                    >
                      Add Segment
                    </Button>
                  </div>
                </div>

                {segmentsLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : segments.length > 0 ? (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {segments.map((segment) => {
                        const category = categories.find((c) => c.id === segment.category_id);
                        return (
                          <SegmentCard
                            key={segment.id}
                            segment={segment}
                            categoryName={category?.name || "Unknown"}
                            onEdit={() => handleEditSegment(segment)}
                            onDelete={() => handleDeleteSegment(segment)}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">
                      No segments defined for this category
                    </p>
                    <p className="text-sm text-gray-400 mb-4">
                      Create segments to group related attributes together (e.g., "Dimensions", "Display Features")
                    </p>
                    <Button onClick={handleAddSegment} leftIcon={<Plus className="h-4 w-4" />}>
                      Create First Segment
                    </Button>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="text-center py-16">
                <FolderTree className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Select a category from the left to manage its segments
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Segments help organize attributes into logical groups for better product display
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Segment Form Modal */}
      {selectedCategoryId && (
        <SegmentFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSegment(null);
          }}
          categoryId={selectedCategoryId}
          editingSegment={editingSegment}
          onSuccess={refetchSegments}
        />
      )}
    </div>
  );
}

