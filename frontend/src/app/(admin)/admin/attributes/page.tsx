"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  Type,
  Hash,
  List,
  CheckSquare,
  ToggleLeft,
  ArrowDown,
  Layers,
  RefreshCw,
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
  useGetCategoryAttributesQuery,
  useCreateAttributeMutation,
  useUpdateAttributeMutation,
  useDeleteAttributeMutation,
  useGetCategorySegmentsQuery,
} from "@/store/api/adminApi";
import {
  CategoryAttribute,
  CategoryAttributeCreate,
  CategoryAttributeUpdate,
  AttributeType,
  ATTRIBUTE_TYPE_INFO,
} from "@/types";

/**
 * Attribute Type Icon Component
 */
function AttributeTypeIcon({ type }: { type: AttributeType }) {
  const icons = {
    text: Type,
    number: Hash,
    select: List,
    multi_select: CheckSquare,
    boolean: ToggleLeft,
  };
  const Icon = icons[type];
  return <Icon className="h-4 w-4" />;
}

/**
 * Attribute Form Schema
 */
const attributeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  attribute_type: z.enum(["text", "number", "select", "multi_select", "boolean"]),
  options: z.string().optional(), // Comma-separated for form
  unit: z.string().optional(),
  segment_id: z.string().optional(), // Segment assignment
  is_required: z.boolean().default(false),
  is_inherited: z.boolean().default(true),
  is_filterable: z.boolean().default(true),
  show_in_listing: z.boolean().default(false),
  show_in_details: z.boolean().default(true),
});

type AttributeFormData = z.infer<typeof attributeSchema>;

/**
 * Attribute Form Modal
 */
function AttributeFormModal({
  isOpen,
  onClose,
  categoryId,
  editingAttribute,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  editingAttribute?: CategoryAttribute | null;
  onSuccess: () => void;
}) {
  const [createAttribute, { isLoading: isCreating }] = useCreateAttributeMutation();
  const [updateAttribute, { isLoading: isUpdating }] = useUpdateAttributeMutation();

  // Fetch segments for the selected category
  const { data: segmentsData } = useGetCategorySegmentsQuery(
    { categoryId: categoryId, includeInactive: false },
    { skip: !categoryId }
  );
  const segments = segmentsData?.items || [];

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<AttributeFormData>({
    resolver: zodResolver(attributeSchema),
    defaultValues: editingAttribute
      ? {
          name: editingAttribute.name,
          description: editingAttribute.description || "",
          attribute_type: editingAttribute.attribute_type,
          options: editingAttribute.options?.join(", ") || "",
          unit: editingAttribute.unit || "",
          segment_id: editingAttribute.segment_id || "",
          is_required: editingAttribute.is_required,
          is_inherited: editingAttribute.is_inherited,
          is_filterable: editingAttribute.is_filterable,
          show_in_listing: editingAttribute.show_in_listing,
          show_in_details: editingAttribute.show_in_details,
        }
      : {
          name: "",
          description: "",
          attribute_type: "text",
          options: "",
          unit: "",
          segment_id: "",
          is_required: false,
          is_inherited: true,
          is_filterable: true,
          show_in_listing: false,
          show_in_details: true,
        },
  });

  const attributeType = watch("attribute_type");
  const showOptions = attributeType === "select" || attributeType === "multi_select";
  const showUnit = attributeType === "number";

  const onSubmit = async (data: AttributeFormData) => {
    try {
      const payload: CategoryAttributeCreate = {
        category_id: categoryId,
        name: data.name,
        description: data.description || undefined,
        attribute_type: data.attribute_type as AttributeType,
        options: showOptions && data.options
          ? data.options.split(",").map((o) => o.trim()).filter(Boolean)
          : undefined,
        unit: showUnit ? data.unit || undefined : undefined,
        segment_id: data.segment_id || undefined,
        is_required: data.is_required,
        is_inherited: data.is_inherited,
        is_filterable: data.is_filterable,
        show_in_listing: data.show_in_listing,
        show_in_details: data.show_in_details,
      };

      if (editingAttribute) {
        // For update, use CategoryAttributeUpdate which doesn't require category_id
        const updatePayload: CategoryAttributeUpdate = {
          name: data.name,
          description: data.description || undefined,
          attribute_type: data.attribute_type as AttributeType,
          options: showOptions && data.options
            ? data.options.split(",").map((o) => o.trim()).filter(Boolean)
            : undefined,
          unit: showUnit ? data.unit || undefined : undefined,
          segment_id: data.segment_id || undefined,
          is_required: data.is_required,
          is_inherited: data.is_inherited,
          is_filterable: data.is_filterable,
          show_in_listing: data.show_in_listing,
          show_in_details: data.show_in_details,
        };
        await updateAttribute({
          id: editingAttribute.id,
          data: updatePayload,
        }).unwrap();
        toast.success("Attribute updated!");
      } else {
        await createAttribute(payload).unwrap();
        toast.success("Attribute created!");
      }

      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to save attribute");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingAttribute ? "Edit Attribute" : "Add Attribute"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attribute Name *
          </label>
          <input
            {...register("name")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="e.g., RAM, Color, Brand"
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
          <input
            {...register("description")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Help text for vendors"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attribute Type *
          </label>
          <select
            {...register("attribute_type")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {Object.entries(ATTRIBUTE_TYPE_INFO).map(([key, info]) => (
              <option key={key} value={key}>
                {info.label} - {info.description}
              </option>
            ))}
          </select>
        </div>

        {/* Options (for select types) */}
        {showOptions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Options (comma-separated) *
            </label>
            <input
              {...register("options")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="4GB, 6GB, 8GB, 12GB"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter options separated by commas
            </p>
          </div>
        )}

        {/* Unit (for number type) */}
        {showUnit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <input
              {...register("unit")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="e.g., GB, mAh, MP"
            />
          </div>
        )}

        {/* Segment Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attribute Segment <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <select
            {...register("segment_id")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">No Segment (Ungrouped)</option>
            {segments.map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.name}
                {segment.description && ` - ${segment.description}`}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Group this attribute under a segment for better organization in product details
          </p>
        </div>

        {/* Checkboxes Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register("is_required")}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Required</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register("is_inherited")}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Inherit to subcategories</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register("is_filterable")}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Show in filters</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register("show_in_listing")}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Show in product cards</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer col-span-2">
            <input
              type="checkbox"
              {...register("show_in_details")}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Show in product details</span>
          </label>
        </div>

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
            {editingAttribute ? "Update" : "Create"} Attribute
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Attribute Card Component
 */
function AttributeCard({
  attribute,
  onEdit,
  onDelete,
}: {
  attribute: CategoryAttribute;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border",
        attribute.is_own
          ? "bg-white border-gray-200"
          : "bg-gray-50 border-dashed border-gray-300"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center",
            attribute.is_own ? "bg-primary/10 text-primary" : "bg-gray-200 text-gray-500"
          )}
        >
          <AttributeTypeIcon type={attribute.attribute_type} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{attribute.name}</h4>
            {!attribute.is_own && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ArrowDown className="h-3 w-3" />
                from {attribute.category_name}
              </span>
            )}
            {attribute.segment_name && (
              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                {attribute.segment_name}
              </span>
            )}
            {attribute.is_required && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                Required
              </span>
            )}
            {attribute.is_inherited && attribute.is_own && (
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Layers className="h-3 w-3" />
                Inherited
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {ATTRIBUTE_TYPE_INFO[attribute.attribute_type].label}
            {attribute.options && ` • ${attribute.options.length} options`}
            {attribute.unit && ` • Unit: ${attribute.unit}`}
            {attribute.segment_name && ` • Segment: ${attribute.segment_name}`}
          </p>
        </div>
      </div>

      {attribute.is_own && (
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
      )}
    </motion.div>
  );
}

/**
 * Admin Attributes Page
 */
export default function AdminAttributesPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<CategoryAttribute | null>(null);

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useGetAdminCategoriesQuery({
    include_inactive: false,
  });

  // Fetch attributes for selected category
  const {
    data: attributesData,
    isLoading: attributesLoading,
    refetch: refetchAttributes,
  } = useGetCategoryAttributesQuery(
    { categoryId: selectedCategoryId!, includeInactive: true },
    { skip: !selectedCategoryId }
  );

  const [deleteAttribute] = useDeleteAttributeMutation();

  const categories = categoriesData?.items || [];
  const attributes = attributesData?.items || [];

  const handleAddAttribute = () => {
    setEditingAttribute(null);
    setIsModalOpen(true);
  };

  const handleEditAttribute = (attr: CategoryAttribute) => {
    setEditingAttribute(attr);
    setIsModalOpen(true);
  };

  const handleDeleteAttribute = async (attr: CategoryAttribute) => {
    if (!confirm(`Delete attribute "${attr.name}"? This will remove it from all products.`)) {
      return;
    }

    try {
      await deleteAttribute({ id: attr.id, hardDelete: true }).unwrap();
      toast.success("Attribute deleted!");
      refetchAttributes();
    } catch (error: any) {
      toast.error(error.data?.detail || "Failed to delete attribute");
    }
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Category Attributes"
        subtitle="Define dynamic attributes for product categories"
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
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg transition-colors",
                        selectedCategoryId === cat.id
                          ? "bg-primary text-white"
                          : "hover:bg-gray-100 text-gray-700"
                      )}
                    >
                      <span className="font-medium">{cat.name}</span>
                      {cat.parent_id && (
                        <span className={cn(
                          "text-xs ml-2",
                          selectedCategoryId === cat.id ? "text-white/70" : "text-gray-400"
                        )}>
                          (subcategory)
                        </span>
                      )}
                    </button>
                  ))}

                  {categories.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      No categories found. Create categories first.
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Attributes List */}
          <div className="lg:col-span-2">
            {selectedCategoryId ? (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    Attributes
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({attributes.length} total)
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<RefreshCw className={cn("h-4 w-4", attributesLoading && "animate-spin")} />}
                      onClick={() => refetchAttributes()}
                    >
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={handleAddAttribute}
                    >
                      Add Attribute
                    </Button>
                  </div>
                </div>

                {attributesLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : attributes.length > 0 ? (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {attributes.map((attr) => (
                        <AttributeCard
                          key={attr.id}
                          attribute={attr}
                          onEdit={() => handleEditAttribute(attr)}
                          onDelete={() => handleDeleteAttribute(attr)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">
                      No attributes defined for this category
                    </p>
                    <Button onClick={handleAddAttribute} leftIcon={<Plus className="h-4 w-4" />}>
                      Add First Attribute
                    </Button>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="text-center py-16">
                <ChevronDown className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Select a category from the left to manage its attributes
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Attribute Form Modal */}
      {selectedCategoryId && (
        <AttributeFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAttribute(null);
          }}
          categoryId={selectedCategoryId}
          editingAttribute={editingAttribute}
          onSuccess={refetchAttributes}
        />
      )}
    </div>
  );
}


