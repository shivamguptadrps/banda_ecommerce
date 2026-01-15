"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  Save,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Check,
  Info,
  Image as ImageIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { DashboardHeader } from "@/components/layout";
import { Card, Button, Spinner, ImageUpload, type UploadedImage } from "@/components/ui";
import { ROUTES } from "@/lib/constants";
import {
  useGetVendorProductQuery,
  useUpdateProductMutation,
  useAddSellUnitMutation,
  useUpdateSellUnitMutation,
  useDeleteSellUnitMutation,
  useUpdateInventoryMutation,
  useAddProductImagesBulkMutation,
} from "@/store/api/vendorProductApi";
import { useGetCategoryTreeQuery } from "@/store/api/categoryApi";
import { CategoryTreeNode } from "@/types";

// Stock unit options
const STOCK_UNITS = [
  { value: "piece", label: "Piece" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "liter", label: "Liter" },
  { value: "meter", label: "Meter" },
];

// Form schema
const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  stock_unit: z.string().min(1, "Stock unit is required"),
  is_active: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

/**
 * Category Selector Component
 */
function CategorySelector({
  categories,
  selectedId,
  onSelect,
}: {
  categories: CategoryTreeNode[];
  selectedId?: string;
  onSelect: (id: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const renderCategory = (node: CategoryTreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedId === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? "bg-primary/10 text-primary"
              : "hover:bg-gray-50 text-gray-700"
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <button
            type="button"
            onClick={() => onSelect(node.id, node.name)}
            className="flex-1 text-left text-sm"
          >
            {node.name}
          </button>
          {isSelected && <Check className="h-4 w-4 text-primary" />}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
      {categories.map((cat) => renderCategory(cat))}
    </div>
  );
}

/**
 * Edit Product Page
 */
export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  // Handle both sync and async params (Next.js 15+)
  const [productId, setProductId] = useState<string>("");
  
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = params instanceof Promise ? await params : params;
      const id = (resolvedParams as any).id as string;
      if (id) setProductId(id);
    };
    resolveParams();
  }, [params]);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [newSellUnit, setNewSellUnit] = useState({ label: "", unit_value: 1, price: 0 });
  const [showAddSellUnit, setShowAddSellUnit] = useState(false);
  const [productImages, setProductImages] = useState<UploadedImage[]>([]);

  // API hooks - skip if productId is not ready
  const { data: product, isLoading, isError, error, refetch } = useGetVendorProductQuery(productId || "", {
    skip: !productId,
  });
  const { data: categoryTree, isLoading: loadingCategories } = useGetCategoryTreeQuery();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [addSellUnit, { isLoading: isAddingSellUnit }] = useAddSellUnitMutation();
  const [updateSellUnit] = useUpdateSellUnitMutation();
  const [deleteSellUnit] = useDeleteSellUnitMutation();
  const [updateInventory, { isLoading: isUpdatingInventory }] = useUpdateInventoryMutation();

  // Local state for inventory form
  const [inventoryForm, setInventoryForm] = useState({
    available_quantity: 0,
    low_stock_threshold: 10,
  });

  // Initialize inventory form when product loads
  useEffect(() => {
    if (product?.inventory) {
      setInventoryForm({
        available_quantity: Number(product.inventory.available_quantity) || 0,
        low_stock_threshold: Number(product.inventory.low_stock_threshold) || 10,
      });
    }
  }, [product?.inventory]);

  // Handle inventory update
  const handleUpdateInventory = async () => {
    if (!productId || !product?.inventory) {
      toast.error("Product inventory not found");
      return;
    }

    try {
      await updateInventory({
        productId,
        data: {
          available_quantity: inventoryForm.available_quantity,
          low_stock_threshold: inventoryForm.low_stock_threshold,
        },
      }).unwrap();
      toast.success("Inventory updated successfully!");
      refetch(); // Refresh product data
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to update inventory");
    }
  };
  const [addProductImagesBulk, { isLoading: isAddingImages }] = useAddProductImagesBulkMutation();

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category_id: "",
      stock_unit: "piece",
      is_active: true,
    },
  });

  const stockUnit = watch("stock_unit");
  const selectedCategoryId = watch("category_id");

  // Get stock unit label for display
  const getStockUnitLabel = (unitValue: string) => {
    const unit = STOCK_UNITS.find((u) => u.value === unitValue);
    return unit ? unit.label : unitValue;
  };

  // Use product's stock_unit if available, otherwise use form value
  const displayStockUnit = product?.stock_unit || stockUnit || "piece";
  const stockUnitLabel = getStockUnitLabel(displayStockUnit);

  // Initialize form with product data
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description || "",
        category_id: product.category_id || "",
        stock_unit: product.stock_unit,
        is_active: product.is_active,
      });
      // Find category name
      if (product.category_id && categoryTree) {
        const findCategory = (nodes: CategoryTreeNode[]): string | null => {
          for (const node of nodes) {
            if (node.id === product.category_id) return node.name;
            if (node.children) {
              const found = findCategory(node.children);
              if (found) return found;
            }
          }
          return null;
        };
        const name = findCategory(categoryTree);
        if (name) setSelectedCategoryName(name);
      }

      // Initialize product images from existing product images
      if (product.images && product.images.length > 0) {
        const existingImages: UploadedImage[] = product.images.map((img, index) => ({
          id: `existing_${img.id}`, // Prefix with "existing_" to identify them
          url: img.image_url || img.url || "",
          publicId: img.id,
          isPrimary: img.is_primary || false,
          isUploading: false,
          progress: 100,
        }));
        setProductImages(existingImages);
      } else {
        setProductImages([]);
      }
    }
  }, [product, categoryTree, reset, setSelectedCategoryName]);

  // Handle category selection
  const handleCategorySelect = (id: string, name: string) => {
    setValue("category_id", id, { shouldDirty: true });
    setSelectedCategoryName(name);
    setShowCategoryPicker(false);
  };

  // Handle saving images
  const handleSaveImages = async () => {
    // Filter out blob URLs - only send images that have been uploaded to Cloudinary
    const validImages = productImages.filter(
      (img: UploadedImage) => !img.error && !img.isUploading && !img.url.startsWith("blob:")
    );

    if (validImages.length === 0) {
      toast.error("No valid images to save. Please ensure images are uploaded to Cloudinary.");
      return;
    }

    // Filter out existing images (those that already have an ID from the product)
    // Only include images that are new (don't start with "existing_")
    const newImages = validImages.filter((img: UploadedImage) => {
      // New images either don't have an ID or have an ID that doesn't start with "existing_"
      return !img.id || !img.id.startsWith("existing_");
    });

    if (newImages.length === 0) {
      toast.success("All images are already saved.");
      return;
    }

    try {
      await addProductImagesBulk({
        productId,
        images: newImages.map((img: UploadedImage, index: number) => ({
          image_url: img.url,
          is_primary: img.isPrimary && index === 0, // First new image becomes primary if marked
          display_order: productImages.length + index,
        })),
      }).unwrap();

      toast.success("Images added successfully!");
      refetch(); // Refresh product data to get updated images
    } catch (err: any) {
      console.error("Error adding images:", err);
      toast.error(err?.data?.detail || "Failed to add images");
    }
  };

  // Submit handler
  const onSubmit = async (data: ProductFormData) => {
    try {
      await updateProduct({
        id: productId,
        data: {
          name: data.name,
          description: data.description,
          category_id: data.category_id || undefined,
          stock_unit: data.stock_unit,
          is_active: data.is_active,
        },
      }).unwrap();

      toast.success("Product updated successfully!");
      refetch();
    } catch (err: any) {
      console.error("Error updating product:", err);
      toast.error(err?.data?.detail || "Failed to update product");
    }
  };

  // Add sell unit handler
  const handleAddSellUnit = async () => {
    if (!newSellUnit.label || newSellUnit.price <= 0) {
      toast.error("Please fill in all sell unit fields");
      return;
    }

    try {
      await addSellUnit({
        productId,
        data: newSellUnit,
      }).unwrap();

      toast.success("Sell unit added!");
      setNewSellUnit({ label: "", unit_value: 1, price: 0 });
      setShowAddSellUnit(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to add sell unit");
    }
  };

  // Delete sell unit handler
  const handleDeleteSellUnit = async (sellUnitId: string) => {
    if (!confirm("Are you sure you want to delete this sell unit?")) return;

    try {
      await deleteSellUnit({ productId, sellUnitId }).unwrap();
      toast.success("Sell unit deleted");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.detail || "Failed to delete sell unit");
    }
  };

  // Loading state
  if (!productId || isLoading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Edit Product" subtitle="Loading product..." />
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !product) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Edit Product" subtitle="Error loading product" />
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          <Card className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-2">Failed to load product</p>
            <p className="text-gray-500 text-sm mb-4">
              {(error as any)?.data?.detail || "Product not found"}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
              <Button onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Edit Product"
        subtitle={product.name}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Product Images Section */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Product Images</h2>
          <p className="text-sm text-gray-500 mb-6">
            Add or update product images. The first image will be the main display image.
          </p>

          <ImageUpload
            images={productImages}
            onChange={setProductImages}
            maxImages={5}
            minImages={0}
            folder="banda_products"
            aspectRatio="square"
          />

          {/* Save Images Button */}
          {productImages.length > 0 && (
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                onClick={handleSaveImages}
                isLoading={isAddingImages}
                disabled={productImages.some(img => img.isUploading || img.error)}
                leftIcon={<ImageIcon className="h-4 w-4" />}
              >
                Save Images
              </Button>
            </div>
          )}
        </Card>

        {/* Basic Info Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>

            <div className="space-y-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-error">*</span>
                </label>
                <input
                  {...register("name")}
                  type="text"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                {errors.name && (
                  <p className="text-error text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                    className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-left focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                  >
                    <span className={selectedCategoryName ? "text-gray-900" : "text-gray-400"}>
                      {selectedCategoryName || "Select a category"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </button>

                  {showCategoryPicker && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowCategoryPicker(false)}
                      />
                      <div className="absolute z-20 w-full mt-2 bg-white shadow-lg rounded-lg">
                        {loadingCategories ? (
                          <div className="p-4 text-center">
                            <Spinner size="sm" />
                          </div>
                        ) : categoryTree && categoryTree.length > 0 ? (
                          <CategorySelector
                            categories={categoryTree}
                            selectedId={selectedCategoryId}
                            onSelect={handleCategorySelect}
                          />
                        ) : (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            No categories available
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Stock Unit & Active Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Unit
                  </label>
                  <select
                    {...register("stock_unit")}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {STOCK_UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <label className="flex items-center gap-3 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("is_active")}
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Product is active and visible</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <Button
                type="submit"
                isLoading={isUpdating}
                disabled={!isDirty}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Changes
              </Button>
            </div>
          </Card>
        </form>

        {/* Sell Units Section */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Sell Units</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowAddSellUnit(true)}
            >
              Add Unit
            </Button>
          </div>

          {product.sell_units && product.sell_units.length > 0 ? (
            <div className="space-y-3">
              {product.sell_units.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{unit.label}</p>
                    <p className="text-sm text-gray-500">
                      {unit.unit_value} {stockUnit} = ₹{unit.price}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        unit.is_active
                          ? "bg-success/10 text-success"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {unit.is_active ? "Active" : "Inactive"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSellUnit(unit.id)}
                      className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>No sell units defined</p>
            </div>
          )}

          {/* Add Sell Unit Form */}
          {showAddSellUnit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 p-4 border border-primary/30 rounded-lg bg-primary/5"
            >
              <p className="font-medium text-gray-900 mb-4">Add New Sell Unit</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={newSellUnit.label}
                    onChange={(e) =>
                      setNewSellUnit({ ...newSellUnit, label: e.target.value })
                    }
                    placeholder="e.g., 500g, 1 pack"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Unit Value ({stockUnit})
                  </label>
                  <input
                    type="number"
                    value={newSellUnit.unit_value}
                    onChange={(e) =>
                      setNewSellUnit({
                        ...newSellUnit,
                        unit_value: parseFloat(e.target.value) || 0,
                      })
                    }
                    step="0.001"
                    min="0.001"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    value={newSellUnit.price}
                    onChange={(e) =>
                      setNewSellUnit({
                        ...newSellUnit,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    step="0.01"
                    min="0.01"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddSellUnit}
                  isLoading={isAddingSellUnit}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddSellUnit(false)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </Card>

        {/* Inventory Management Section */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Inventory Management</h2>

          {product.inventory ? (
            <>
              {/* Current Inventory Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Available</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {product.inventory.available_quantity} {stockUnitLabel}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Reserved</p>
                  <p className="text-xl font-semibold text-warning">
                    {product.inventory.reserved_quantity} {stockUnitLabel}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">In pending orders</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Stock</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {Number(product.inventory.available_quantity) + Number(product.inventory.reserved_quantity)} {stockUnitLabel}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Status</p>
                  <p
                    className={`text-xl font-semibold ${
                      product.is_in_stock ? "text-success" : "text-error"
                    }`}
                  >
                    {product.is_in_stock ? "In Stock" : "Out of Stock"}
                  </p>
                </div>
              </div>

              {/* Inventory Update Form */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Update Inventory</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Quantity ({stockUnitLabel})
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={inventoryForm.available_quantity}
                        onChange={(e) => {
                          const newQty = parseFloat(e.target.value) || 0;
                          setInventoryForm((prev) => ({
                            ...prev,
                            available_quantity: newQty,
                          }));
                        }}
                        className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <span className="px-3 py-2.5 bg-gray-100 rounded-lg text-sm text-gray-600 whitespace-nowrap">
                        {stockUnitLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {product.inventory.available_quantity} {stockUnitLabel}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Low Stock Threshold ({stockUnitLabel})
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={inventoryForm.low_stock_threshold}
                        onChange={(e) => {
                          const newThreshold = parseFloat(e.target.value) || 0;
                          setInventoryForm((prev) => ({
                            ...prev,
                            low_stock_threshold: newThreshold,
                          }));
                        }}
                        className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <span className="px-3 py-2.5 bg-gray-100 rounded-lg text-sm text-gray-600 whitespace-nowrap">
                        {stockUnitLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Alert when stock falls below this level
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleUpdateInventory}
                    isLoading={isUpdatingInventory}
                    leftIcon={<Save className="h-4 w-4" />}
                    disabled={
                      inventoryForm.available_quantity === Number(product.inventory.available_quantity) &&
                      inventoryForm.low_stock_threshold === Number(product.inventory.low_stock_threshold)
                    }
                  >
                    Save Inventory Changes
                  </Button>
                </div>

                {/* Stock Status Indicators */}
                {product.inventory.available_quantity <= (product.inventory.low_stock_threshold || 10) && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    product.inventory.available_quantity <= 0
                      ? "bg-error/10 border border-error/20"
                      : "bg-warning/10 border border-warning/20"
                  }`}>
                    <div className="flex items-center gap-2">
                      <AlertCircle className={`h-5 w-5 ${
                        product.inventory.available_quantity <= 0 ? "text-error" : "text-warning"
                      }`} />
                      <p className={`text-sm font-medium ${
                        product.inventory.available_quantity <= 0 ? "text-error" : "text-warning"
                      }`}>
                        {product.inventory.available_quantity <= 0
                          ? "Out of Stock - Product is not available for purchase"
                          : "Low Stock - Consider restocking soon"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Info Box */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="flex gap-2">
                    <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">How Inventory Works:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li><strong>Available:</strong> Stock ready for purchase</li>
                        <li><strong>Reserved:</strong> Stock reserved by pending orders (auto-released if order cancelled)</li>
                        <li><strong>Low Stock Alert:</strong> You'll be notified when stock falls below this threshold</li>
                        <li>Stock is automatically deducted when orders are confirmed</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No inventory data available</p>
              <p className="text-sm text-gray-400 mt-1">
                Inventory is created automatically when you create a product
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

